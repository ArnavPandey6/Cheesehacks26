import React, { useState } from 'react';
import {
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Redirect } from 'expo-router';
import { Camera as CameraIcon, LogOut, ScanQrCode, Sparkles, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { Atmosphere } from '@/components/ui/atmosphere';
import { LoopHeader } from '@/components/ui/loop-header';
import { fonts, getTheme, radii } from '@/components/ui/theme';
import { useEntranceAnimation } from '@/components/ui/use-entrance-animation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { validateHubReturnPayload } from '@/store/returnQr';
import { FeedPost, useStore } from '@/store/useStore';

type ScanTarget =
  | { kind: 'vault'; itemId: string }
  | { kind: 'hallway'; postId: string };

export default function ProfileScreen() {
  const {
    hasHydrated,
    currentUser,
    vaultItems,
    feedPosts,
    returnItem,
    markFeedOfferReturned,
    createHallwayReturnCode,
    signOut,
  } = useStore();

  const [scanTarget, setScanTarget] = useState<ScanTarget | null>(null);
  const [manualVaultCodes, setManualVaultCodes] = useState<Record<string, string>>({});
  const [manualHallwayCodes, setManualHallwayCodes] = useState<Record<string, string>>({});
  const [ownerHallwayCodes, setOwnerHallwayCodes] = useState<Record<string, string>>({});
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const entranceStyle = useEntranceAnimation(440, 18);

  if (!hasHydrated) return null;
  if (!currentUser) return <Redirect href="../auth" />;

  const myVaultReservations = vaultItems.filter(
    (item) => item.reservedByUserId === currentUser.id && item.status !== 'available'
  );

  const myHallwayBorrows = feedPosts.filter(
    (post) => post.isOffer && post.offerState === 'claimed' && post.claimedByUserId === currentUser.id
  );

  const myLentOutPosts = feedPosts.filter(
    (post) => post.isOffer && post.offerState === 'claimed' && post.authorUserId === currentUser.id
  );

  const openScanner = async (target: ScanTarget) => {
    let granted = Boolean(permission?.granted);
    if (!granted) {
      const response = await requestPermission();
      granted = response.granted;
    }

    if (!granted) {
      Alert.alert('Camera Permission Required', 'Enable camera access to scan return QR codes.');
      return;
    }

    setScanTarget(target);
  };

  const completeVaultReturn = async (itemId: string) => {
    const result = await returnItem(itemId);
    if (!result.ok) {
      Alert.alert('Unable to Return', result.reason);
      return;
    }
    setManualVaultCodes((previous) => ({ ...previous, [itemId]: '' }));
    Alert.alert('Vault Return Confirmed', 'Item has been returned to The Vault.');
  };

  const verifyVaultReturn = async (itemId: string, payload: string) => {
    const validation = validateHubReturnPayload(payload, itemId);
    if (!validation.ok) {
      Alert.alert('Invalid Hub QR', validation.reason);
      return;
    }
    await completeVaultReturn(itemId);
  };

  const completeHallwayReturn = async (postId: string, returnToken: string) => {
    const result = await markFeedOfferReturned(postId, returnToken);
    if (!result.ok) {
      Alert.alert('Unable to Complete Return', result.reason);
      return;
    }

    setManualHallwayCodes((previous) => ({ ...previous, [postId]: '' }));
    Alert.alert('Transfer Complete', 'Return verified. Karma updated for both neighbors.');
  };

  const verifyHallwayReturn = async (post: FeedPost, payload: string) => {
    if (!post.claimedByUserId) {
      Alert.alert('Invalid Transfer', 'This post has no active borrower.');
      return;
    }

    const token = payload.trim();
    if (!token) {
      Alert.alert('Invalid Owner QR', 'Owner return token is empty.');
      return;
    }

    await completeHallwayReturn(post.id, token);
  };

  const generateOwnerReturnCode = async (postId: string) => {
    const result = await createHallwayReturnCode(postId);
    if (!result.ok) {
      Alert.alert('Unable to Generate QR', result.reason);
      return;
    }

    setOwnerHallwayCodes((previous) => ({ ...previous, [postId]: result.code }));
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanTarget || isProcessingScan) return;
    setIsProcessingScan(true);

    const activeTarget = scanTarget;
    setScanTarget(null);

    if (activeTarget.kind === 'vault') {
      await verifyVaultReturn(activeTarget.itemId, data);
    } else {
      const hallwayPost = myHallwayBorrows.find((post) => post.id === activeTarget.postId);
      if (!hallwayPost) {
        Alert.alert('Offer Not Found', 'This hallway transfer is no longer active.');
      } else {
        await verifyHallwayReturn(hallwayPost, data);
      }
    }

    setIsProcessingScan(false);
  };

  if (scanTarget) {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={[styles.container, styles.centerAll, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.text, fontFamily: fonts.display, marginBottom: 20 }]}>
            Camera Permission Required
          </Text>
          <TouchableOpacity style={[styles.actionPrimaryBtn, { backgroundColor: theme.accentDeep }]} onPress={requestPermission}>
            <Text style={[styles.btnText, { color: theme.text, fontFamily: fonts.mono }]}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cancelScanBtn, { marginTop: 20 }]} onPress={() => setScanTarget(null)}>
            <Text style={[styles.cancelScanText, { color: theme.textMuted, fontFamily: fonts.mono }]}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}>
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity onPress={() => setScanTarget(null)} style={styles.closeBtn}>
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={[styles.scannerTitle, { fontFamily: fonts.display }]}>Scan Return QR</Text>
            </View>
            <View style={styles.scannerTargetBox}>
              <View style={[styles.cornerTL, { borderColor: theme.accentDeep }]} />
              <View style={[styles.cornerTR, { borderColor: theme.accentDeep }]} />
              <View style={[styles.cornerBL, { borderColor: theme.accentDeep }]} />
              <View style={[styles.cornerBR, { borderColor: theme.accentDeep }]} />
            </View>
            <Text style={[styles.scannerInstruct, { fontFamily: fonts.body }]}>
              Scan the QR shown by the building hub or item owner.
            </Text>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Atmosphere colorScheme={colorScheme} />

      <LoopHeader
        colorScheme={colorScheme}
        karma={currentUser.karma}
        rightIcon={<ScanQrCode size={15} color={theme.textMuted} />}
        subtitle="trust profile"
      />

      <Animated.View style={[styles.scrollWrap, entranceStyle]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.title, { color: theme.text, fontFamily: fonts.display }]}>Profile</Text>
              <Text style={[styles.subtitle, { color: theme.textSoft, fontFamily: fonts.mono }]}>Returns & verification</Text>
            </View>
            <TouchableOpacity
              style={[styles.signOutBtn, { backgroundColor: theme.accentDeep }]}
              onPress={async () => {
                setIsSigningOut(true);
                await signOut();
                setIsSigningOut(false);
              }}
              disabled={isSigningOut}>
              <LogOut size={16} color={theme.text} />
              <Text style={[styles.signOutText, { color: theme.text, fontFamily: fonts.mono }]}>
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surfaceInverted, borderColor: theme.borderStrong }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
                <Text style={[styles.avatarText, { color: theme.accentDeep, fontFamily: fonts.display }]}>
                  {currentUser.name.charAt(0)}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text, fontFamily: fonts.display }]}>{currentUser.name}</Text>
                <Text style={[styles.userMeta, { color: theme.textMuted, fontFamily: fonts.body }]}>
                  {`Apartment ${currentUser.apartment} | Unit ${currentUser.unit}`}
                </Text>
                <View style={[styles.karmaBadge, { backgroundColor: theme.accentDeep }]}>
                  <Sparkles size={14} color={theme.text} />
                  <Text style={[styles.karmaText, { color: theme.text, fontFamily: fonts.mono }]}>
                    {currentUser.karma} Karma Power
                  </Text>
                </View>
              </View>
            </View>
            <Text style={[styles.trustText, { color: theme.textMuted, fontFamily: fonts.body }]}>
              Your borrowing power is based on Karma. Successful hallway returns and donations increase trust.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSoft, fontFamily: fonts.mono }]}>My Active Vault Loans</Text>
          {myVaultReservations.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}>
              <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: fonts.body }]}>No active Vault items.</Text>
            </View>
          ) : (
            myVaultReservations.map((item) => (
              <View key={item.id} style={[styles.card, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: theme.text, fontFamily: fonts.body }]}>{item.name}</Text>
                  <Text style={[styles.itemStatus, { color: theme.accentDeep, backgroundColor: theme.accentSoft, fontFamily: fonts.mono }]}>
                    VAULT
                  </Text>
                </View>
                <Text style={[styles.instructions, { color: theme.textMuted, fontFamily: fonts.body }]}>
                  Scan the building hub return QR to complete this return.
                </Text>

                <TouchableOpacity
                  style={[styles.actionPrimaryBtn, { backgroundColor: theme.accentDeep }]}
                  onPress={() => openScanner({ kind: 'vault', itemId: item.id })}>
                  <CameraIcon size={18} color={theme.text} />
                  <Text style={[styles.btnText, { color: theme.text, fontFamily: fonts.mono }]}>Scan Hub QR</Text>
                </TouchableOpacity>

                <Text style={[styles.manualLabel, { color: theme.textSoft, fontFamily: fonts.mono }]}>Or paste return code:</Text>
                <TextInput
                  style={[
                    styles.manualInput,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.backgroundMuted,
                      fontFamily: fonts.body,
                    },
                  ]}
                  value={manualVaultCodes[item.id] ?? ''}
                  onChangeText={(value) => setManualVaultCodes((previous) => ({ ...previous, [item.id]: value }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="relay-return-v1|item|issued|expires|sig"
                  placeholderTextColor={theme.textSoft}
                />
                <TouchableOpacity
                  style={[styles.verifyBtn, { backgroundColor: theme.surfaceInverted }]}
                  onPress={() => void verifyVaultReturn(item.id, manualVaultCodes[item.id] ?? '')}>
                  <Text style={[styles.verifyBtnText, { color: theme.text, fontFamily: fonts.mono }]}>Verify Vault Code</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: theme.textSoft, fontFamily: fonts.mono }]}>My Hallway Borrows</Text>
          {myHallwayBorrows.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}>
              <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: fonts.body }]}>
                You have no claimed hallway offers.
              </Text>
            </View>
          ) : (
            myHallwayBorrows.map((post) => (
              <View key={post.id} style={[styles.card, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: theme.text, fontFamily: fonts.body }]} numberOfLines={1}>
                    {post.content}
                  </Text>
                  <Text style={[styles.itemStatus, { color: theme.success, backgroundColor: theme.successSoft, fontFamily: fonts.mono }]}>
                    BORROWED
                  </Text>
                </View>
                <Text style={[styles.instructions, { color: theme.textMuted, fontFamily: fonts.body }]}>{`Owner: ${post.authorName}`}</Text>

                <TouchableOpacity
                  style={[styles.actionPrimaryBtn, { backgroundColor: theme.accentDeep }]}
                  onPress={() => openScanner({ kind: 'hallway', postId: post.id })}>
                  <CameraIcon size={18} color={theme.text} />
                  <Text style={[styles.btnText, { color: theme.text, fontFamily: fonts.mono }]}>Scan Owner QR</Text>
                </TouchableOpacity>

                <Text style={[styles.manualLabel, { color: theme.textSoft, fontFamily: fonts.mono }]}>Or paste owner code:</Text>
                <TextInput
                  style={[
                    styles.manualInput,
                    {
                      borderColor: theme.border,
                      color: theme.text,
                      backgroundColor: theme.backgroundMuted,
                      fontFamily: fonts.body,
                    },
                  ]}
                  value={manualHallwayCodes[post.id] ?? ''}
                  onChangeText={(value) => setManualHallwayCodes((previous) => ({ ...previous, [post.id]: value }))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="owner return token"
                  placeholderTextColor={theme.textSoft}
                />
                <TouchableOpacity
                  style={[styles.verifyBtn, { backgroundColor: theme.surfaceInverted }]}
                  onPress={() => void verifyHallwayReturn(post, manualHallwayCodes[post.id] ?? '')}>
                  <Text style={[styles.verifyBtnText, { color: theme.text, fontFamily: fonts.mono }]}>Verify Owner Code</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: theme.textSoft, fontFamily: fonts.mono }]}>My Lent-Out Offers</Text>
          {myLentOutPosts.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}>
              <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: fonts.body }]}>No active lent offers.</Text>
            </View>
          ) : (
            myLentOutPosts.map((post) => {
              const qrValue = ownerHallwayCodes[post.id];

              return (
                <View key={post.id} style={[styles.card, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                  <Text style={[styles.itemName, { color: theme.text, fontFamily: fonts.body }]} numberOfLines={2}>
                    {post.content}
                  </Text>
                  <Text style={[styles.instructions, { color: theme.textMuted, fontFamily: fonts.body }]}>
                    {`Claimed by ${post.claimedByName ?? 'neighbor'}`}
                  </Text>

                  <TouchableOpacity
                    style={[styles.generateQrBtn, { backgroundColor: theme.surfaceInverted }]}
                    onPress={() => void generateOwnerReturnCode(post.id)}>
                    <Text style={[styles.generateQrText, { color: theme.text, fontFamily: fonts.mono }]}>
                      {qrValue ? 'Regenerate Owner QR' : 'Generate Owner QR'}
                    </Text>
                  </TouchableOpacity>

                  {qrValue ? (
                    <>
                      <View style={[styles.qrBox, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}>
                        <QRCode value={qrValue} size={180} color={theme.text} backgroundColor={theme.backgroundMuted} />
                      </View>
                      <Text style={[styles.qrHint, { color: theme.textMuted, fontFamily: fonts.body }]}>
                        Show this QR to verify the person-to-person return.
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.qrHint, { color: theme.textMuted, fontFamily: fonts.body }]}>
                      Generate a fresh QR right before handoff.
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerAll: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollWrap: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headerRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.9,
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  signOutBtn: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  avatarText: {
    fontSize: 28,
    lineHeight: 30,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 22,
    lineHeight: 24,
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 11,
    marginBottom: 6,
  },
  karmaBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  karmaText: {
    fontSize: 11,
    letterSpacing: 0.7,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  trustText: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  emptyBox: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  emptyText: {
    fontSize: 13,
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
  },
  itemStatus: {
    borderRadius: 999,
    fontSize: 10,
    letterSpacing: 0.7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  instructions: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  actionPrimaryBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  btnText: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  manualLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  manualInput: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  verifyBtn: {
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 10,
  },
  verifyBtnText: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  qrBox: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  qrHint: {
    fontSize: 11,
    marginTop: 8,
  },
  generateQrBtn: {
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 10,
  },
  generateQrText: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  scannerOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
    flex: 1,
    justifyContent: 'center',
  },
  scannerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    left: 0,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
    top: 60,
  },
  closeBtn: {
    padding: 10,
  },
  scannerTitle: {
    color: '#ffffff',
    fontSize: 20,
    left: 0,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
  },
  scannerTargetBox: {
    backgroundColor: 'transparent',
    height: 250,
    width: 250,
  },
  cornerTL: {
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
    borderTopWidth: 4,
    height: 40,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 40,
  },
  cornerTR: {
    borderRightWidth: 4,
    borderTopRightRadius: 16,
    borderTopWidth: 4,
    height: 40,
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
  },
  cornerBL: {
    borderBottomLeftRadius: 16,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    bottom: 0,
    height: 40,
    left: 0,
    position: 'absolute',
    width: 40,
  },
  cornerBR: {
    borderBottomRightRadius: 16,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    bottom: 0,
    height: 40,
    position: 'absolute',
    right: 0,
    width: 40,
  },
  scannerInstruct: {
    color: '#eeeeee',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 40,
    paddingHorizontal: 30,
    textAlign: 'center',
  },
  cancelScanBtn: {
    padding: 12,
  },
  cancelScanText: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
