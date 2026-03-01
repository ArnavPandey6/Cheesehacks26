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
import { computeDonationKarma, ConditionLevel, UtilityLevel } from '@/store/karma';
import { deriveBorrowRequirement } from '@/store/karmaEvaluator';
import { useStore, VaultItem } from '@/store/useStore';

export default function TriageScreen() {
  const { addKarma, adoptItemToVault, addFeedPost, currentUser, hasHydrated, backendError } = useStore();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const entranceStyle = useEntranceAnimation(440, 20);

  const [step, setStep] = useState<'INPUT' | 'EVALUATED'>('INPUT');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [utility, setUtility] = useState<UtilityLevel>('medium');
  const [condition, setCondition] = useState<ConditionLevel>('good');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [calculatedKarma, setCalculatedKarma] = useState(0);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

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
      const b64 = result.assets[0].base64;
      setImageDataUri(b64 ? `data:image/jpeg;base64,${b64}` : result.assets[0].uri);
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
      const b64 = result.assets[0].base64;
      setImageDataUri(b64 ? `data:image/jpeg;base64,${b64}` : result.assets[0].uri);
    }
  };

  const handleEvaluate = () => {
    const price = parseFloat(estimatedPrice);
    if (!itemName.trim() || !imageUri || isNaN(price) || price <= 0) {
      Alert.alert('Missing Info', 'Please provide a name, photo, and estimated value before evaluating.');
      return;
    }
    const evaluatedKarma = computeDonationKarma({
      estimatedPrice: price,
      utility,
      condition,
      isTriageMode: true,
    });
    setCalculatedKarma(evaluatedKarma);
    setStep('EVALUATED');
  };

  const resetFlow = () => {
    setItemName('');
    setItemDesc('');
    setEstimatedPrice('');
    setUtility('medium');
    setCondition('good');
    setImageUri(null);
    setImageDataUri(null);
    setCalculatedKarma(0);
    setStep('INPUT');
  };

  const handleDonateToLibrary = async () => {
    const uploadUri = imageDataUri ?? imageUri!;
    const newItem: VaultItem = {
      id: `item_${Date.now()}`,
      name: itemName,
      description: itemDesc || 'A community donated item.',
      imageUrl: uploadUri,
      status: 'available',
      minKarmaRequired: deriveBorrowRequirement(calculatedKarma),
    };
    setIsSubmittingAction(true);
    const adoptResult = await adoptItemToVault(newItem);
    if (!adoptResult.ok) {
      Alert.alert('Unable to Add Item', adoptResult.reason ?? backendError ?? 'Please try again.');
      setIsSubmittingAction(false);
      return;
    }

    const karmaResult = await addKarma(calculatedKarma);
    if (!karmaResult.ok) {
      Alert.alert('Item Added, Karma Failed', karmaResult.reason);
      setIsSubmittingAction(false);
      resetFlow();
      return;
    }

    setIsSubmittingAction(false);
    Alert.alert('Adopted!', `Item added to The Vault. You earned +${calculatedKarma} Karma!`, [{ text: 'OK', onPress: resetFlow }]);
  };

  const handleGiveToNeighbor = async () => {
    const uploadUri = imageDataUri ?? imageUri!;
    const partialKarma = Math.floor(calculatedKarma / 2);
    setIsSubmittingAction(true);
    const post = await addFeedPost({
      content: itemDesc
        ? `Offering ${itemName}: ${itemDesc}`
        : `Offering ${itemName}. Message me if you want to claim it.`,
      isOffer: true,
      imageUrl: uploadUri,
    });
    if (!post) {
      Alert.alert('Unable to Post Offer', backendError ?? 'Please try again.');
      setIsSubmittingAction(false);
      return;
    }

    const karmaResult = await addKarma(partialKarma);
    if (!karmaResult.ok) {
      Alert.alert('Offer Posted, Karma Failed', karmaResult.reason);
      setIsSubmittingAction(false);
      resetFlow();
      return;
    }

    setIsSubmittingAction(false);
    Alert.alert('Relayed!', `Item posted to Hallway as an offer. You earned +${partialKarma} Karma.`, [{ text: 'OK', onPress: resetFlow }]);
  };

  const utilityOptions: { label: string; value: UtilityLevel }[] = [
    { label: 'High', value: 'high' },
    { label: 'Med', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  const conditionOptions: { label: string; value: ConditionLevel }[] = [
    { label: 'New', value: 'new' },
    { label: 'Good', value: 'good' },
    { label: 'Worn', value: 'worn' },
  ];

  const canEvaluate = Boolean(itemName.trim()) && Boolean(imageUri) && Boolean(estimatedPrice) && parseFloat(estimatedPrice) > 0;

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
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Item Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, fontFamily: fonts.body }]}
                    placeholder="e.g. IKEA floor lamp"
                    placeholderTextColor={theme.textSoft}
                    value={itemName}
                    onChangeText={setItemName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Estimated Value ($)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, fontFamily: fonts.body }]}
                    placeholder="e.g. 40"
                    placeholderTextColor={theme.textSoft}
                    value={estimatedPrice}
                    onChangeText={setEstimatedPrice}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Utility</Text>
                  <View style={styles.segmentRow}>
                    {utilityOptions.map((opt) => {
                      const active = utility === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.segmentBtn,
                            {
                              backgroundColor: active ? theme.accentDeep : theme.surfaceStrong,
                              borderColor: active ? theme.accentDeep : theme.border,
                            },
                          ]}
                          onPress={() => setUtility(opt.value)}>
                          <Text style={[styles.segmentText, { color: active ? theme.text : theme.textMuted, fontFamily: fonts.mono }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Condition</Text>
                  <View style={styles.segmentRow}>
                    {conditionOptions.map((opt) => {
                      const active = condition === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.segmentBtn,
                            {
                              backgroundColor: active ? theme.accentDeep : theme.surfaceStrong,
                              borderColor: active ? theme.accentDeep : theme.border,
                            },
                          ]}
                          onPress={() => setCondition(opt.value)}>
                          <Text style={[styles.segmentText, { color: active ? theme.text : theme.textMuted, fontFamily: fonts.mono }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.textMuted, fontFamily: fonts.mono }]}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, color: theme.text, fontFamily: fonts.body }]}
                    placeholder="Extra details, included accessories, etc."
                    placeholderTextColor={theme.textSoft}
                    value={itemDesc}
                    onChangeText={setItemDesc}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.evaluateBtn, { backgroundColor: canEvaluate ? theme.accentDeep : theme.borderStrong }]}
                  onPress={handleEvaluate}>
                  <Sparkles size={18} color={theme.text} />
                  <Text style={[styles.evaluateBtnText, { color: theme.text, fontFamily: fonts.mono }]}>
                    Evaluate Karma Value
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.sectionHead, { color: theme.textSoft, fontFamily: fonts.mono }]}>Karma Estimate</Text>
                <View style={[styles.detectedRow, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                  <View style={[styles.detectedImageWrap, { backgroundColor: theme.accentSoft }]}>
                    <Image source={{ uri: imageUri! }} style={styles.previewImage} />
                  </View>
                  <View style={styles.detectedBody}>
                    <Text style={[styles.detectedTag, { color: theme.accentDeep, fontFamily: fonts.mono }]}>
                      {condition} · {utility} utility · ×2 triage
                    </Text>
                    <Text style={[styles.detectedName, { color: theme.text, fontFamily: fonts.body }]}>{itemName}</Text>
                    {itemDesc ? <Text style={[styles.detectedSub, { color: theme.textMuted, fontFamily: fonts.body }]}>{itemDesc}</Text> : null}
                    <View style={styles.karmaRow}>
                      <Text style={[styles.karmaNumber, { color: theme.text, fontFamily: fonts.display }]}>+{calculatedKarma}</Text>
                      <Text style={[styles.karmaLabel, { color: theme.textSoft, fontFamily: fonts.mono }]}>karma pts</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.relayPair}>
                  <TouchableOpacity
                    style={[styles.relayBtn, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, opacity: isSubmittingAction ? 0.7 : 1 }]}
                    onPress={() => void handleGiveToNeighbor()}
                    disabled={isSubmittingAction}>
                    <Users size={19} color={theme.text} />
                    <Text style={[styles.relayTitle, { color: theme.text, fontFamily: fonts.body }]}>Give to Neighbor</Text>
                    <Text style={[styles.relaySub, { color: theme.textSoft, fontFamily: fonts.body }]}>Post to Hallway, half karma.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.relayBtn, { backgroundColor: theme.accentSoft, borderColor: theme.accent, opacity: isSubmittingAction ? 0.7 : 1 }]}
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
  textArea: {
    height: 98,
    textAlignVertical: 'top',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  segmentText: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
