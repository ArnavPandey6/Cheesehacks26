import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, SafeAreaView, TextInput } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Redirect } from 'expo-router';
import { Sparkles, X, Camera as CameraIcon, LogOut } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

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
    const isDark = colorScheme === 'dark';

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
                <SafeAreaView style={[styles.container, styles.centerAll]}>
                    <Text style={[styles.title, { marginBottom: 20 }]}>Camera Permission Required</Text>
                    <TouchableOpacity style={styles.actionGreenBtn} onPress={requestPermission}>
                        <Text style={styles.btnText}>Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cancelScanBtn, { marginTop: 20 }]} onPress={() => setScanTarget(null)}>
                        <Text style={styles.cancelScanText}>Cancel</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            );
        }

        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    facing="back"
                    onBarcodeScanned={handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                >
                    <View style={styles.scannerOverlay}>
                        <View style={styles.scannerHeader}>
                            <TouchableOpacity onPress={() => setScanTarget(null)} style={styles.closeBtn}>
                                <X size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.scannerTitle}>Scan Return QR</Text>
                        </View>
                        <View style={styles.scannerTargetBox}>
                            <View style={styles.cornerTL} />
                            <View style={styles.cornerTR} />
                            <View style={styles.cornerBL} />
                            <View style={styles.cornerBR} />
                        </View>
                        <Text style={styles.scannerInstruct}>Scan the QR shown by the building hub or item owner.</Text>
                    </View>
                </CameraView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[styles.title, isDark && styles.textLight]}>Profile</Text>
                        <Text style={styles.subtitle}>Trust & Verification</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.signOutBtn}
                        onPress={async () => {
                            setIsSigningOut(true);
                            await signOut();
                            setIsSigningOut(false);
                        }}
                        disabled={isSigningOut}
                    >
                        <LogOut size={16} color="#fff" />
                        <Text style={styles.signOutText}>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, styles.gradientCard]}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{currentUser.name.charAt(0)}</Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{currentUser.name}</Text>
                            <Text style={styles.userMeta}>{`Apartment ${currentUser.apartment} | Unit ${currentUser.unit}`}</Text>
                            <View style={styles.karmaBadge}>
                                <Sparkles size={14} color="#fff" />
                                <Text style={styles.karmaText}>{currentUser.karma} Karma Power</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.trustText}>
                        {`Your borrowing power is based on Karma. Successful hallway returns and donations increase trust.`}
                    </Text>
                </View>

                <Text style={[styles.sectionTitle, isDark && styles.textLight]}>My Active Vault Loans</Text>
                {myVaultReservations.length === 0 ? (
                    <View style={[styles.emptyBox, isDark && styles.emptyBoxDark]}>
                        <Text style={styles.emptyText}>No active Vault items.</Text>
                    </View>
                ) : (
                    myVaultReservations.map((item) => (
                        <View key={item.id} style={[styles.card, isDark && styles.cardDark]}>
                            <View style={styles.itemRow}>
                                <Text style={[styles.itemName, isDark && styles.textLight]}>{item.name}</Text>
                                <Text style={styles.itemStatus}>VAULT</Text>
                            </View>
                            <Text style={styles.instructions}>
                                {`Scan the building hub return QR to complete this return.`}
                            </Text>

                            <TouchableOpacity
                                style={styles.actionGreenBtn}
                                onPress={() => openScanner({ kind: 'vault', itemId: item.id })}
                            >
                                <CameraIcon size={20} color="#fff" />
                                <Text style={styles.btnText}>Scan Hub QR</Text>
                            </TouchableOpacity>

                            <Text style={styles.manualLabel}>Or paste return code:</Text>
                            <TextInput
                                style={[styles.manualInput, isDark && styles.manualInputDark]}
                                value={manualVaultCodes[item.id] ?? ''}
                                onChangeText={(value) => setManualVaultCodes((previous) => ({ ...previous, [item.id]: value }))}
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="relay-return-v1|item|issued|expires|sig"
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity style={styles.verifyBtn} onPress={() => void verifyVaultReturn(item.id, manualVaultCodes[item.id] ?? '')}>
                                <Text style={styles.verifyBtnText}>Verify Vault Code</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <Text style={[styles.sectionTitle, isDark && styles.textLight]}>My Hallway Borrows</Text>
                {myHallwayBorrows.length === 0 ? (
                    <View style={[styles.emptyBox, isDark && styles.emptyBoxDark]}>
                        <Text style={styles.emptyText}>You have no claimed hallway offers.</Text>
                    </View>
                ) : (
                    myHallwayBorrows.map((post) => (
                        <View key={post.id} style={[styles.card, isDark && styles.cardDark]}>
                            <View style={styles.itemRow}>
                                <Text style={[styles.itemName, isDark && styles.textLight]} numberOfLines={1}>
                                    {post.content}
                                </Text>
                                <Text style={styles.itemStatus}>BORROWED</Text>
                            </View>
                            <Text style={styles.instructions}>{`Owner: ${post.authorName}`}</Text>

                            <TouchableOpacity
                                style={styles.actionGreenBtn}
                                onPress={() => openScanner({ kind: 'hallway', postId: post.id })}
                            >
                                <CameraIcon size={20} color="#fff" />
                                <Text style={styles.btnText}>Scan Owner QR</Text>
                            </TouchableOpacity>

                            <Text style={styles.manualLabel}>Or paste owner code:</Text>
                            <TextInput
                                style={[styles.manualInput, isDark && styles.manualInputDark]}
                                value={manualHallwayCodes[post.id] ?? ''}
                                onChangeText={(value) => setManualHallwayCodes((previous) => ({ ...previous, [post.id]: value }))}
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="owner return token"
                                placeholderTextColor="#999"
                            />
                            <TouchableOpacity style={styles.verifyBtn} onPress={() => void verifyHallwayReturn(post, manualHallwayCodes[post.id] ?? '')}>
                                <Text style={styles.verifyBtnText}>Verify Owner Code</Text>
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <Text style={[styles.sectionTitle, isDark && styles.textLight]}>My Lent-Out Offers</Text>
                {myLentOutPosts.length === 0 ? (
                    <View style={[styles.emptyBox, isDark && styles.emptyBoxDark]}>
                        <Text style={styles.emptyText}>No active lent offers.</Text>
                    </View>
                ) : (
                    myLentOutPosts.map((post) => {
                        const qrValue = ownerHallwayCodes[post.id];

                        return (
                            <View key={post.id} style={[styles.card, isDark && styles.cardDark]}>
                                <Text style={[styles.itemName, isDark && styles.textLight]} numberOfLines={2}>
                                    {post.content}
                                </Text>
                                <Text style={styles.instructions}>{`Claimed by ${post.claimedByName ?? 'neighbor'}`}</Text>

                                <TouchableOpacity
                                    style={styles.generateQrBtn}
                                    onPress={() => void generateOwnerReturnCode(post.id)}
                                >
                                    <Text style={styles.generateQrText}>
                                        {qrValue ? 'Regenerate Owner QR' : 'Generate Owner QR'}
                                    </Text>
                                </TouchableOpacity>

                                {qrValue ? (
                                    <>
                                        <View style={styles.qrBox}>
                                            <QRCode
                                                value={qrValue}
                                                size={180}
                                                color={isDark ? '#fff' : '#000'}
                                                backgroundColor={isDark ? '#0a0a0a' : '#f8f9fa'}
                                            />
                                        </View>
                                        <Text style={styles.qrHint}>Show this QR to verify the person-to-person return.</Text>
                                    </>
                                ) : (
                                    <Text style={styles.qrHint}>Generate a fresh QR right before handoff.</Text>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    bgDark: {
        backgroundColor: '#0a0a0a',
    },
    centerAll: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 40,
        paddingBottom: 70,
    },
    headerRow: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111',
    },
    textLight: {
        color: '#eee',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    signOutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ff6b6b',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    signOutText: {
        color: '#fff',
        fontWeight: '700',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
    },
    cardDark: {
        backgroundColor: '#1a1a1a',
    },
    gradientCard: {
        backgroundColor: '#111',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2f95dc',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
    },
    userInfo: {
        marginLeft: 16,
        flex: 1,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    userMeta: {
        color: '#bbb',
        marginBottom: 6,
    },
    karmaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9c27b0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    karmaText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
        marginLeft: 4,
    },
    trustText: {
        color: '#aaa',
        fontSize: 13,
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111',
        marginBottom: 16,
    },
    emptyBox: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyBoxDark: {
        borderColor: '#333',
    },
    emptyText: {
        color: '#888',
        fontSize: 15,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    itemName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
        flex: 1,
        marginRight: 8,
    },
    itemStatus: {
        fontSize: 10,
        fontWeight: '800',
        color: '#2f95dc',
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    instructions: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    actionGreenBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#20c997',
        paddingVertical: 14,
        borderRadius: 12,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
    manualLabel: {
        marginTop: 14,
        marginBottom: 8,
        color: '#888',
        fontSize: 13,
        fontWeight: '600',
    },
    manualInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#222',
        backgroundColor: '#fff',
    },
    manualInputDark: {
        backgroundColor: '#0f0f0f',
        borderColor: '#333',
        color: '#f2f2f2',
    },
    verifyBtn: {
        marginTop: 10,
        backgroundColor: '#2f95dc',
        borderRadius: 10,
        paddingVertical: 11,
        alignItems: 'center',
    },
    verifyBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    qrBox: {
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 5,
        alignItems: 'center',
    },
    qrHint: {
        marginTop: 12,
        color: '#666',
        fontSize: 13,
    },
    generateQrBtn: {
        marginTop: 4,
        backgroundColor: '#2f95dc',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    generateQrText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerHeader: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 20,
    },
    closeBtn: {
        padding: 10,
    },
    scannerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
    },
    scannerTargetBox: {
        width: 250,
        height: 250,
        backgroundColor: 'transparent',
    },
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderColor: '#20c997', borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderColor: '#20c997', borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderColor: '#20c997', borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderColor: '#20c997', borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
    scannerInstruct: {
        color: '#eee',
        marginTop: 40,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    cancelScanBtn: {
        padding: 12,
    },
    cancelScanText: {
        color: '#ff6b6b',
        fontWeight: 'bold',
    },
});

