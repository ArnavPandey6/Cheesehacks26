import React, { useState } from 'react';
import {
  Alert,
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
import { useStore, VaultItem } from '../../store/useStore';
import { Building, Camera, Image as ImageIcon, MoreVertical, Sparkles, Users } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as ImagePicker from 'expo-image-picker';
import { deriveBorrowRequirement, evaluateKarmaValue } from '@/store/karmaEvaluator';

export default function TriageScreen() {
  const { addKarma, adoptItemToVault, addFeedPost, currentUser, hasHydrated, backendError } = useStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState<'INPUT' | 'EVALUATED'>('INPUT');
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [calculatedKarma, setCalculatedKarma] = useState(0);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  if (!hasHydrated) return null;
  if (!currentUser) return <Redirect href="../auth" />;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
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
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleEvaluate = () => {
    if (!itemName.trim() || !imageUri) {
      Alert.alert('Missing Info', 'Please provide a name and add a photo before evaluating.');
      return;
    }
    const evaluatedKarma = evaluateKarmaValue({
      itemName,
      itemDescription: itemDesc,
      hasPhoto: Boolean(imageUri),
    });
    setCalculatedKarma(evaluatedKarma);
    setStep('EVALUATED');
  };

  const resetFlow = () => {
    setItemName('');
    setItemDesc('');
    setImageUri(null);
    setCalculatedKarma(0);
    setStep('INPUT');
  };

  const handleDonateToLibrary = async () => {
    const newItem: VaultItem = {
      id: `item_${Date.now()}`,
      name: itemName,
      description: itemDesc || 'A community donated item.',
      imageUrl: imageUri!,
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
    const partialKarma = Math.floor(calculatedKarma / 2);
    setIsSubmittingAction(true);
    const post = await addFeedPost({
      content: itemDesc
        ? `Offering ${itemName}: ${itemDesc}`
        : `Offering ${itemName}. Message me if you want to claim it.`,
      isOffer: true,
      imageUrl: imageUri ?? undefined,
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

  return (
    <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
      <View style={[styles.topbar, isDark && styles.topbarDark]}>
        <Text style={[styles.wordmark, isDark && styles.textLight]}>
          l<Text style={styles.wordmarkEm}>oo</Text>p
        </Text>
        <View style={styles.karmaChip}>
          <Sparkles size={11} color="#C5050C" />
          <Text style={styles.karmaChipText}>{currentUser.karma} pts</Text>
        </View>
        <View style={[styles.iconBtn, isDark && styles.iconBtnDark]}>
          <MoreVertical size={14} color={isDark ? '#B5ACA7' : '#9C9692'} />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
            <Text style={styles.heroKicker}>Move-Out Mode Active</Text>
            <Text style={styles.heroTitle}>
              Relay it,{"\n"}
              <Text style={styles.heroTitleEm}>not the landfill.</Text>
            </Text>
            <Text style={styles.heroDesc}>Scan an item, evaluate with AI, then route it to the right home.</Text>
          </View>

          {step === 'INPUT' ? (
            <View>
              <View style={styles.photoContainer}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.previewImageOnly} />
                ) : (
                  <View style={[styles.cameraBox, isDark && styles.cameraBoxDark]}>
                    <Camera size={28} color={isDark ? '#B5ACA7' : '#9C9692'} />
                    <Text style={styles.cameraText}>tap to add a photo for karma estimate</Text>
                  </View>
                )}

                <View style={styles.photoActions}>
                  <TouchableOpacity style={[styles.photoBtn, isDark && styles.photoBtnDark]} onPress={takePhoto}>
                    <Camera size={18} color={isDark ? '#F9F3EF' : '#343330'} />
                    <Text style={[styles.photoBtnText, isDark && styles.textLight]}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.photoBtn, isDark && styles.photoBtnDark]} onPress={pickImage}>
                    <ImageIcon size={18} color={isDark ? '#F9F3EF' : '#343330'} />
                    <Text style={[styles.photoBtnText, isDark && styles.textLight]}>Library</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, isDark && styles.textLight]}>Item Name</Text>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  placeholder="e.g. IKEA Floor Lamp"
                  placeholderTextColor="#9C9692"
                  value={itemName}
                  onChangeText={setItemName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, isDark && styles.textLight]}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, isDark && styles.inputDark]}
                  placeholder="Condition, details, etc."
                  placeholderTextColor="#9C9692"
                  value={itemDesc}
                  onChangeText={setItemDesc}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.evaluateBtn, (!itemName.trim() || !imageUri) && styles.evaluateBtnDisabled]}
                onPress={handleEvaluate}>
                <Sparkles size={18} color="#fff" />
                <Text style={styles.evaluateBtnText}>Evaluate Karma Value</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.sectionHead}>AI Detected</Text>
              <View style={[styles.detectedRow, isDark && styles.detectedRowDark]}>
                <View style={styles.detectedImageWrap}>
                  <Image source={{ uri: imageUri! }} style={styles.previewImage} />
                </View>
                <View style={styles.detectedBody}>
                  <Text style={styles.detectedTag}>AI identified</Text>
                  <Text style={[styles.detectedName, isDark && styles.textLight]}>{itemName}</Text>
                  {itemDesc ? <Text style={styles.detectedSub}>{itemDesc}</Text> : null}
                  <View style={styles.karmaRow}>
                    <Text style={styles.karmaNumber}>+{calculatedKarma}</Text>
                    <Text style={styles.karmaLabel}>karma pts</Text>
                  </View>
                </View>
              </View>

              <View style={styles.relayPair}>
                <TouchableOpacity
                  style={[styles.relayBtn, styles.relayBtnNeighbor, isSubmittingAction && styles.actionBtnDisabled]}
                  onPress={() => void handleGiveToNeighbor()}
                  disabled={isSubmittingAction}>
                  <Users size={19} color="#343330" />
                  <Text style={styles.relayTitleDark}>Give to Neighbor</Text>
                  <Text style={styles.relaySubDark}>Post to Hallway. Half Karma.</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.relayBtn, styles.relayBtnLibrary, isSubmittingAction && styles.actionBtnDisabled]}
                  onPress={() => void handleDonateToLibrary()}
                  disabled={isSubmittingAction}>
                  <Building size={19} color="#C5050C" />
                  <Text style={styles.relayTitleRed}>Adopt to Library</Text>
                  <Text style={styles.relaySub}>Give to building. Max Karma.</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.cancelBtn} onPress={resetFlow}>
                <Text style={styles.cancelBtnText}>Back to Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5F0',
    flex: 1,
  },
  bgDark: {
    backgroundColor: '#171513',
  },
  textLight: {
    color: '#F9F3EF',
  },
  topbar: {
    alignItems: 'center',
    borderBottomColor: '#EDE8E3',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topbarDark: {
    borderBottomColor: '#2B2724',
  },
  wordmark: {
    color: '#343330',
    fontFamily: Platform.select({ ios: 'ui-serif', default: 'serif' }),
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
  },
  wordmarkEm: {
    color: '#C5050C',
    fontStyle: 'italic',
  },
  karmaChip: {
    alignItems: 'center',
    backgroundColor: '#FFD9DA',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  karmaChipText: {
    color: '#C5050C',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    fontWeight: '500',
  },
  iconBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 10,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconBtnDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 30,
  },
  heroCard: {
    backgroundColor: '#343330',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
  },
  heroCardDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
    borderWidth: 1,
  },
  heroKicker: {
    color: '#F5BB9A',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: Platform.select({ ios: 'ui-serif', default: 'serif' }),
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 30,
  },
  heroTitleEm: {
    color: '#FFD9DA',
    fontStyle: 'italic',
  },
  heroDesc: {
    color: 'rgba(255,217,218,0.75)',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    marginTop: 8,
  },
  photoContainer: {
    marginBottom: 12,
  },
  cameraBox: {
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderColor: '#EDE8E3',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    height: 180,
    justifyContent: 'center',
  },
  cameraBoxDark: {
    borderColor: '#2B2724',
  },
  cameraText: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    marginTop: 8,
  },
  previewImageOnly: {
    borderRadius: 14,
    height: 200,
    width: '100%',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  photoBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 11,
  },
  photoBtnDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
  },
  photoBtnText: {
    color: '#343330',
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#343330',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 12,
    borderWidth: 1,
    color: '#343330',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
    color: '#F9F3EF',
  },
  textArea: {
    height: 92,
    textAlignVertical: 'top',
  },
  evaluateBtn: {
    alignItems: 'center',
    backgroundColor: '#C5050C',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
    paddingVertical: 14,
  },
  evaluateBtnDisabled: {
    backgroundColor: '#CFA4A6',
  },
  evaluateBtnText: {
    color: '#fff',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHead: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  detectedRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
  },
  detectedRowDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
  },
  detectedImageWrap: {
    backgroundColor: '#FFD9DA',
    width: 94,
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
    color: '#C5050C',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  detectedName: {
    color: '#343330',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  detectedSub: {
    color: '#9C9692',
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
    color: '#343330',
    fontFamily: Platform.select({ ios: 'ui-serif', default: 'serif' }),
    fontSize: 25,
    fontWeight: '700',
  },
  karmaLabel: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
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
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  relayBtnNeighbor: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
  },
  relayBtnLibrary: {
    backgroundColor: '#FFD9DA',
    borderColor: 'rgba(197,5,12,0.3)',
  },
  relayTitleDark: {
    color: '#343330',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  relaySubDark: {
    color: '#5C5956',
    fontSize: 10,
  },
  relayTitleRed: {
    color: '#C5050C',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  relaySub: {
    color: '#9C9692',
    fontSize: 10,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
});
