import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { Building, Camera, Image as ImageIcon, MoreVertical, Sparkles, Users } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { Atmosphere } from '@/components/ui/atmosphere';
import { LoopHeader } from '@/components/ui/loop-header';
import { fonts, getTheme, radii } from '@/components/ui/theme';
import { useEntranceAnimation } from '@/components/ui/use-entrance-animation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { computeDonationKarma, type ConditionLevel, type UtilityLevel } from '@/store/karma';
import { deriveBorrowRequirement } from '@/store/karmaEvaluator';
import { useStore, VaultItem } from '@/store/useStore';
import { analyzeImageWithGoogleVision, isVisionConfigured } from '@/store/visionAssist';

const utilityOptions: { label: string; value: UtilityLevel }[] = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

const conditionOptions: { label: string; value: ConditionLevel }[] = [
  { label: 'New', value: 'new' },
  { label: 'Good', value: 'good' },
  { label: 'Worn', value: 'worn' },
];

const categorySuggestions = [
  'Electronics',
  'Furniture',
  'Kitchen',
  'Cleaning',
  'Tools',
  'Office',
  'Decor',
  'Clothing',
  'Other',
];

export default function TriageScreen() {
  const { adoptItemToVault, addFeedPost, currentUser, hasHydrated, backendError } = useStore();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const entranceStyle = useEntranceAnimation(440, 20);

  const [step, setStep] = useState<'INPUT' | 'EVALUATED'>('INPUT');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [estimatedPriceInput, setEstimatedPriceInput] = useState('');
  const [utilityLevel, setUtilityLevel] = useState<UtilityLevel>('medium');
  const [conditionLevel, setConditionLevel] = useState<ConditionLevel>('good');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [calculatedKarma, setCalculatedKarma] = useState(0);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isVisionAnalyzing, setIsVisionAnalyzing] = useState(false);
  const [visionPriceHint, setVisionPriceHint] = useState<string | null>(null);
  const normalizedEstimatedPrice = Number.parseFloat(estimatedPriceInput.replace(/[^0-9.]/g, ''));
  const hasValidEstimatedPrice = Number.isFinite(normalizedEstimatedPrice) && normalizedEstimatedPrice > 0;

  if (!hasHydrated) return null;
  if (!currentUser) return <Redirect href="../auth" />;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleVisionAssist = async () => {
    if (!isVisionConfigured) {
      Alert.alert(
        'Vision Not Configured',
        'Set EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY in your .env and restart Expo.'
      );
      return;
    }

    if (!imageBase64) {
      Alert.alert('No Image Data', 'Pick or capture a photo first, then run AI Assist.');
      return;
    }

    setIsVisionAnalyzing(true);
    try {
      const suggestion = await analyzeImageWithGoogleVision(imageBase64);
      const confidencePct = Math.round(suggestion.confidence * 100);
      const shouldForceAutofill = suggestion.confidence >= 0.55;

      if (shouldForceAutofill || !itemName.trim()) {
        setItemName(suggestion.itemName);
      }
      if (shouldForceAutofill || !itemDesc.trim()) {
        setItemDesc(suggestion.description);
      }
      if (shouldForceAutofill || !productCategory.trim()) {
        setProductCategory(suggestion.itemName);
      }
      if (shouldForceAutofill || !estimatedPriceInput.trim()) {
        setEstimatedPriceInput(String(suggestion.estimatedPrice));
      }
      if (shouldForceAutofill) {
        setUtilityLevel(suggestion.utilityLevel);
        setConditionLevel(suggestion.conditionLevel);
      }

      Alert.alert(
        'AI Suggestions Ready',
        confidencePct >= 55
          ? `Detected ${suggestion.itemName} (${confidencePct}% confidence).\nPrice range: $${suggestion.estimatedPriceLow}-$${suggestion.estimatedPriceHigh} (${Math.round(suggestion.priceConfidence * 100)}% price confidence).`
          : `Detected ${suggestion.itemName} (${confidencePct}% confidence).\nPrice range: $${suggestion.estimatedPriceLow}-$${suggestion.estimatedPriceHigh}. Low-confidence estimate, please review manually.`
      );
      setVisionPriceHint(`AI range: $${suggestion.estimatedPriceLow}-$${suggestion.estimatedPriceHigh} (${Math.round(suggestion.priceConfidence * 100)}% confidence)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to analyze image with Google Vision.';
      Alert.alert('Vision Analysis Failed', message);
    } finally {
      setIsVisionAnalyzing(false);
    }
  };

  const handleEvaluate = () => {
    if (!itemName.trim() || !imageUri || !productCategory.trim()) {
      Alert.alert('Missing Info', 'Please provide item name, category, and a photo before evaluating.');
      return;
    }
    if (!hasValidEstimatedPrice) {
      Alert.alert('Missing Info', 'Add a valid estimated price before evaluating.');
      return;
    }
    const evaluatedKarma = computeDonationKarma({
      estimatedPrice: normalizedEstimatedPrice,
      utility: utilityLevel,
      condition: conditionLevel,
      isTriageMode: true,
    });
    setCalculatedKarma(evaluatedKarma);
    setStep('EVALUATED');
  };

  const resetFlow = () => {
    setItemName('');
    setItemDesc('');
    setProductCategory('');
    setEstimatedPriceInput('');
    setUtilityLevel('medium');
    setConditionLevel('good');
    setImageUri(null);
    setImageBase64(null);
    setCalculatedKarma(0);
    setVisionPriceHint(null);
    setStep('INPUT');
  };

  const handleDonateToLibrary = async () => {
    if (!hasValidEstimatedPrice) {
      Alert.alert('Missing Info', 'Add a valid estimated price before donating.');
      return;
    }
    if (!productCategory.trim()) {
      Alert.alert('Missing Info', 'Add a product category before donating.');
      return;
    }

    const newItem: VaultItem = {
      id: `item_${Date.now()}`,
      name: itemName,
      description: itemDesc || 'A community donated item.',
      imageUrl: imageUri!,
      status: 'available',
      minKarmaRequired: deriveBorrowRequirement(calculatedKarma),
      productCategory,
      estimatedPrice: normalizedEstimatedPrice,
      utilityLevel,
      conditionLevel,
    };
    setIsSubmittingAction(true);
    const adoptResult = await adoptItemToVault(newItem, { isTriageMode: true });
    if (!adoptResult.ok) {
      Alert.alert('Unable to Add Item', adoptResult.reason ?? backendError ?? 'Please try again.');
      setIsSubmittingAction(false);
      return;
    }

    setIsSubmittingAction(false);
    Alert.alert('Adopted!', `Item added to The Vault. You earned +${adoptResult.awardedKarma} Karma!`, [{ text: 'OK', onPress: resetFlow }]);
  };

  const handleGiveToNeighbor = async () => {
    if (!productCategory.trim()) {
      Alert.alert('Missing Info', 'Add a product category before posting.');
      return;
    }
    setIsSubmittingAction(true);
    const post = await addFeedPost({
      content: itemDesc
        ? `Offering ${itemName} (${productCategory}): ${itemDesc}`
        : `Offering ${itemName} (${productCategory}). Message me if you want to claim it.`,
      isOffer: true,
      imageUrl: imageUri ?? undefined,
    });
    if (!post) {
      Alert.alert('Unable to Post Offer', backendError ?? 'Please try again.');
      setIsSubmittingAction(false);
      return;
    }

    setIsSubmittingAction(false);
    Alert.alert('Relayed!', 'Item posted to Hallway. Karma is awarded after successful return.', [{ text: 'OK', onPress: resetFlow }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Atmosphere colorScheme={colorScheme} />

      <LoopHeader
        colorScheme={colorScheme}
        karma={currentUser.karma}
        rightIcon={<MoreVertical size={15} color={theme.textMuted} />}
        subtitle="triage engine"
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <Animated.View style={[styles.contentWrap, entranceStyle]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.heroCard, { backgroundColor: theme.surfaceInverted, borderColor: theme.borderStrong }]}>
              <Text style={[styles.heroKicker, { color: theme.textSoft, fontFamily: fonts.mono }]}>Move-Out Mode</Text>
              <Text style={[styles.heroTitle, { color: theme.text, fontFamily: fonts.display }]}>
                Route it to a
                {'\n'}
                better home.
              </Text>
              <Text style={[styles.heroDesc, { color: theme.textMuted, fontFamily: fonts.body }]}>
                Scan an item, score its karma value, then relay it to neighbors or the building vault.
              </Text>
            </View>

            {step === 'INPUT' ? (
              <View>
                <View style={styles.photoContainer}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.previewImageOnly} />
                  ) : (
                    <View style={[styles.cameraBox, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                      <Camera size={28} color={theme.textMuted} />
                      <Text style={[styles.cameraText, { color: theme.textSoft, fontFamily: fonts.mono }]}>
                        add a photo for karma estimate
                      </Text>
                    </View>
                  )}

                  <View style={styles.photoActions}>
                    <TouchableOpacity
                      style={[styles.photoBtn, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}
                      onPress={takePhoto}>
                      <Camera size={18} color={theme.text} />
                      <Text style={[styles.photoBtnText, { color: theme.text, fontFamily: fonts.body }]}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoBtn, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}
                      onPress={pickImage}>
                      <ImageIcon size={18} color={theme.text} />
                      <Text style={[styles.photoBtnText, { color: theme.text, fontFamily: fonts.body }]}>Library</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.visionBtn,
                      {
                        backgroundColor: !imageBase64 || isVisionAnalyzing ? theme.borderStrong : theme.accentSoft,
                        borderColor: !imageBase64 || isVisionAnalyzing ? theme.border : theme.accent,
                      },
                    ]}
                    onPress={() => void handleVisionAssist()}
                    disabled={!imageBase64 || isVisionAnalyzing}>
                    <Sparkles size={16} color={!imageBase64 || isVisionAnalyzing ? theme.textSoft : theme.accentDeep} />
                    <Text
                      style={[
                        styles.visionBtnText,
                        {
                          color: !imageBase64 || isVisionAnalyzing ? theme.textSoft : theme.accentDeep,
                          fontFamily: fonts.mono,
                        },
                      ]}>
                      {isVisionAnalyzing ? 'Analyzing image...' : 'AI Assist with Google Vision'}
                    </Text>
                  </TouchableOpacity>

                  {!isVisionConfigured ? (
                    <Text style={[styles.visionHint, { color: theme.textSoft, fontFamily: fonts.body }]}>
                      Add `EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY` to enable AI assist.
                    </Text>
                  ) : null}
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Item Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surfaceStrong,
                        borderColor: theme.border,
                        color: theme.text,
                        fontFamily: fonts.body,
                      },
                    ]}
                    placeholder="e.g. IKEA floor lamp"
                    placeholderTextColor={theme.textSoft}
                    value={itemName}
                    onChangeText={setItemName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Description (Optional)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.textArea,
                      {
                        backgroundColor: theme.surfaceStrong,
                        borderColor: theme.border,
                        color: theme.text,
                        fontFamily: fonts.body,
                      },
                    ]}
                    placeholder="Condition, details, etc."
                    placeholderTextColor={theme.textSoft}
                    value={itemDesc}
                    onChangeText={setItemDesc}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Product Category</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surfaceStrong,
                        borderColor: theme.border,
                        color: theme.text,
                        fontFamily: fonts.body,
                      },
                    ]}
                    placeholder="e.g. Electronics, Furniture, Kitchen"
                    placeholderTextColor={theme.textSoft}
                    value={productCategory}
                    onChangeText={setProductCategory}
                  />
                  <View style={styles.categoryQuickWrap}>
                    {categorySuggestions.map((category) => {
                      const isActive = category.toLowerCase() === productCategory.trim().toLowerCase();
                      return (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryQuickChip,
                            {
                              backgroundColor: isActive ? theme.accentSoft : theme.surfaceStrong,
                              borderColor: isActive ? theme.accent : theme.border,
                            },
                          ]}
                          onPress={() => setProductCategory(category)}>
                          <Text
                            style={[
                              styles.categoryQuickChipText,
                              {
                                color: isActive ? theme.accentDeep : theme.textMuted,
                                fontFamily: fonts.mono,
                              },
                            ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Estimated Price (USD)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.surfaceStrong,
                        borderColor: theme.border,
                        color: theme.text,
                        fontFamily: fonts.body,
                      },
                    ]}
                    keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                    placeholder="e.g. 45"
                    placeholderTextColor={theme.textSoft}
                    value={estimatedPriceInput}
                    onChangeText={setEstimatedPriceInput}
                  />
                  <Text style={[styles.hintText, { color: theme.textSoft, fontFamily: fonts.body }]}>
                    Used for karma scoring only.
                  </Text>
                  {visionPriceHint ? (
                    <Text style={[styles.hintText, { color: theme.accentDeep, fontFamily: fonts.body }]}>
                      {visionPriceHint}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Utility Level</Text>
                  <View style={styles.choiceRow}>
                    {utilityOptions.map((option) => {
                      const isActive = utilityLevel === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.choiceChip,
                            {
                              backgroundColor: isActive ? theme.accentSoft : theme.surfaceStrong,
                              borderColor: isActive ? theme.accent : theme.border,
                            },
                          ]}
                          onPress={() => setUtilityLevel(option.value)}>
                          <Text
                            style={[
                              styles.choiceChipText,
                              {
                                color: isActive ? theme.accentDeep : theme.textMuted,
                                fontFamily: fonts.mono,
                              },
                            ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Condition</Text>
                  <View style={styles.choiceRow}>
                    {conditionOptions.map((option) => {
                      const isActive = conditionLevel === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.choiceChip,
                            {
                              backgroundColor: isActive ? theme.accentSoft : theme.surfaceStrong,
                              borderColor: isActive ? theme.accent : theme.border,
                            },
                          ]}
                          onPress={() => setConditionLevel(option.value)}>
                          <Text
                            style={[
                              styles.choiceChipText,
                              {
                                color: isActive ? theme.accentDeep : theme.textMuted,
                                fontFamily: fonts.mono,
                              },
                            ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.evaluateBtn,
                    { backgroundColor: !itemName.trim() || !imageUri || !productCategory.trim() || !hasValidEstimatedPrice ? theme.borderStrong : theme.accentDeep },
                  ]}
                  onPress={handleEvaluate}>
                  <Sparkles size={18} color={theme.text} />
                  <Text style={[styles.evaluateBtnText, { color: theme.text, fontFamily: fonts.mono }]}>
                    Evaluate Karma Value
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.sectionHead, { color: theme.textSoft, fontFamily: fonts.mono }]}>AI Detected</Text>
                <View style={[styles.detectedRow, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                  <View style={[styles.detectedImageWrap, { backgroundColor: theme.accentSoft }]}>
                    <Image source={{ uri: imageUri! }} style={styles.previewImage} />
                  </View>
                  <View style={styles.detectedBody}>
                    <Text style={[styles.detectedTag, { color: theme.accentDeep, fontFamily: fonts.mono }]}>AI identified</Text>
                    <Text style={[styles.detectedName, { color: theme.text, fontFamily: fonts.body }]}>{itemName}</Text>
                    {itemDesc ? <Text style={[styles.detectedSub, { color: theme.textMuted, fontFamily: fonts.body }]}>{itemDesc}</Text> : null}
                    <Text style={[styles.detectedMeta, { color: theme.textSoft, fontFamily: fonts.mono }]}>
                      {productCategory} | ${normalizedEstimatedPrice.toFixed(2)} | {utilityLevel} utility | {conditionLevel}
                    </Text>
                    <View style={styles.karmaRow}>
                      <Text style={[styles.karmaNumber, { color: theme.text, fontFamily: fonts.display }]}>+{calculatedKarma}</Text>
                      <Text style={[styles.karmaLabel, { color: theme.textSoft, fontFamily: fonts.mono }]}>karma pts</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.relayPair}>
                  <TouchableOpacity
                    style={[
                      styles.relayBtn,
                      {
                        backgroundColor: theme.surfaceStrong,
                        borderColor: theme.border,
                        opacity: isSubmittingAction ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => void handleGiveToNeighbor()}
                    disabled={isSubmittingAction}>
                    <Users size={19} color={theme.text} />
                    <Text style={[styles.relayTitle, { color: theme.text, fontFamily: fonts.body }]}>Give to Neighbor</Text>
                    <Text style={[styles.relaySub, { color: theme.textSoft, fontFamily: fonts.body }]}>Post to Hallway, reward on return.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.relayBtn,
                      {
                        backgroundColor: theme.accentSoft,
                        borderColor: theme.accent,
                        opacity: isSubmittingAction ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => void handleDonateToLibrary()}
                    disabled={isSubmittingAction}>
                    <Building size={19} color={theme.accentDeep} />
                    <Text style={[styles.relayTitle, { color: theme.accentDeep, fontFamily: fonts.body }]}>Adopt to Vault</Text>
                    <Text style={[styles.relaySub, { color: theme.warning, fontFamily: fonts.body }]}>Give to building, max karma.</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.cancelBtn} onPress={resetFlow}>
                  <Text style={[styles.cancelBtnText, { color: theme.textMuted, fontFamily: fonts.mono }]}>Back to Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  contentWrap: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  heroKicker: {
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 31,
    lineHeight: 33,
  },
  heroDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  photoContainer: {
    marginBottom: 12,
  },
  cameraBox: {
    alignItems: 'center',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 186,
    justifyContent: 'center',
  },
  cameraText: {
    fontSize: 11,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  previewImageOnly: {
    borderRadius: 14,
    height: 210,
    width: '100%',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  photoBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 11,
  },
  photoBtnText: {
    fontSize: 13,
  },
  visionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },
  visionBtnText: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  visionHint: {
    fontSize: 10,
    marginTop: 6,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  hintText: {
    fontSize: 10,
    marginTop: 4,
  },
  categoryQuickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryQuickChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryQuickChipText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  choiceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceChip: {
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  choiceChipText: {
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  textArea: {
    height: 98,
    textAlignVertical: 'top',
  },
  evaluateBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 14,
  },
  evaluateBtnText: {
    fontSize: 12,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  sectionHead: {
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detectedRow: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  detectedImageWrap: {
    width: 98,
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  detectedBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detectedTag: {
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  detectedName: {
    fontSize: 15,
    marginBottom: 2,
  },
  detectedSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  detectedMeta: {
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  karmaRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 4,
    marginTop: 7,
  },
  karmaNumber: {
    fontSize: 28,
    lineHeight: 30,
  },
  karmaLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  relayPair: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  relayBtn: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  relayTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  relaySub: {
    fontSize: 10,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
