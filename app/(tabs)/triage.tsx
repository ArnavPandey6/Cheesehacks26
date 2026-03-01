import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore, VaultItem } from '../../store/useStore';
import { Camera, Image as ImageIcon, Sparkles, Building, Users } from 'lucide-react-native';
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
        let result = await ImagePicker.launchImageLibraryAsync({
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
            Alert.alert("Permission to access camera is required!");
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
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
        Alert.alert('Adopted!', `Item added to The Vault. You earned +${calculatedKarma} Karma!`, [
            { text: "OK", onPress: resetFlow }
        ]);
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
        Alert.alert('Relayed!', `Item posted to Hallway as an offer. You earned +${partialKarma} Karma.`, [
            { text: "OK", onPress: resetFlow }
        ]);
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <View style={styles.header}>
                <Text style={[styles.title, isDark && styles.textLight]}>The Triage</Text>
                <Text style={styles.subtitle}>Relay move-out items. Stop the waste.</Text>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    {step === 'INPUT' && (
                        <View style={styles.inputState}>

                            <View style={styles.photoContainer}>
                                {imageUri ? (
                                    <Image source={{ uri: imageUri }} style={styles.previewImageOnly} />
                                ) : (
                                    <View style={styles.cameraBox}>
                                        <Camera size={48} color={isDark ? "#555" : "#ccc"} />
                                        <Text style={styles.cameraText}>Add a photo to get a Karma estimate</Text>
                                    </View>
                                )}

                                <View style={styles.photoActions}>
                                    <TouchableOpacity style={[styles.photoBtn, isDark && styles.photoBtnDark]} onPress={takePhoto}>
                                        <Camera size={20} color={isDark ? "#eee" : "#555"} />
                                        <Text style={[styles.photoBtnText, isDark && styles.textLight]}>Take Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.photoBtn, isDark && styles.photoBtnDark]} onPress={pickImage}>
                                        <ImageIcon size={20} color={isDark ? "#eee" : "#555"} />
                                        <Text style={[styles.photoBtnText, isDark && styles.textLight]}>Library</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, isDark && styles.textLight]}>Item Name</Text>
                                <TextInput
                                    style={[styles.input, isDark && styles.inputDark]}
                                    placeholder="e.g. IKEA Floor Lamp"
                                    placeholderTextColor="#888"
                                    value={itemName}
                                    onChangeText={setItemName}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={[styles.label, isDark && styles.textLight]}>Description (Optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, isDark && styles.inputDark]}
                                    placeholder="Condition, details, etc."
                                    placeholderTextColor="#888"
                                    value={itemDesc}
                                    onChangeText={setItemDesc}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.evaluateBtn, (!itemName.trim() || !imageUri) && styles.evaluateBtnDisabled]}
                                onPress={handleEvaluate}
                            >
                                <Sparkles size={20} color="#fff" />
                                <Text style={styles.evaluateBtnText}>Evaluate Karma Value</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {step === 'EVALUATED' && (
                        <View style={styles.evaluatedState}>
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: imageUri! }} style={styles.previewImage} />
                                <View style={styles.karmaBadge}>
                                    <Sparkles size={16} color="#fff" />
                                    <Text style={styles.karmaBadgeText}>+{calculatedKarma} Karma</Text>
                                </View>
                            </View>

                            <View style={styles.detailsBox}>
                                <Text style={[styles.itemNameResult, isDark && styles.textLight]}>{itemName}</Text>
                                {itemDesc ? <Text style={styles.itemDescResult}>{itemDesc}</Text> : null}
                            </View>

                            <View style={styles.actionsBox}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.btnLibrary, isSubmittingAction && styles.actionBtnDisabled]}
                                    onPress={() => void handleDonateToLibrary()}
                                    disabled={isSubmittingAction}
                                >
                                    <Building size={24} color="#fff" style={styles.actionIcon} />
                                    <View>
                                        <Text style={styles.actionTitle}>Adopt to Library</Text>
                                        <Text style={styles.actionSub}>Give to the building. Max Karma.</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.btnNeighbor, isSubmittingAction && styles.actionBtnDisabled]}
                                    onPress={() => void handleGiveToNeighbor()}
                                    disabled={isSubmittingAction}
                                >
                                    <Users size={24} color="#333" style={styles.actionIcon} />
                                    <View>
                                        <Text style={[styles.actionTitle, { color: '#333' }]}>Give to Neighbor</Text>
                                        <Text style={[styles.actionSub, { color: '#666' }]}>Post to Hallway. Half Karma.</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.cancelBtn} onPress={resetFlow}>
                                    <Text style={styles.cancelBtnText}>Back to Edit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    keyboardView: {
        flex: 1,
    },
    bgDark: {
        backgroundColor: '#0a0a0a',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,
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
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    inputState: {
        flex: 1,
    },
    photoContainer: {
        marginBottom: 20,
    },
    cameraBox: {
        width: '100%',
        height: 200,
        borderWidth: 2,
        borderColor: '#e0e0e0',
        borderStyle: 'dashed',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    cameraText: {
        color: '#888',
        marginTop: 12,
        fontSize: 14,
        fontWeight: '500',
    },
    previewImageOnly: {
        width: '100%',
        height: 200,
        borderRadius: 16,
    },
    photoActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    photoBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        gap: 8,
    },
    photoBtnDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    photoBtnText: {
        color: '#333',
        fontWeight: '600',
        fontSize: 14,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111',
    },
    inputDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
        color: '#fff',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    evaluateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2f95dc',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 10,
        gap: 10,
    },
    evaluateBtnDisabled: {
        backgroundColor: '#999',
    },
    evaluateBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    evaluatedState: {
        flex: 1,
    },
    imageContainer: {
        width: '100%',
        height: 250,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    karmaBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#9c27b0',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    karmaBadgeText: {
        color: '#fff',
        fontWeight: '800',
        marginLeft: 6,
    },
    detailsBox: {
        marginBottom: 30,
    },
    itemNameResult: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111',
        marginBottom: 8,
    },
    itemDescResult: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    actionsBox: {
        gap: 16,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    actionBtnDisabled: {
        opacity: 0.6,
    },
    btnLibrary: {
        backgroundColor: '#2f95dc',
        borderColor: '#2f95dc',
    },
    btnNeighbor: {
        backgroundColor: '#fff',
        borderColor: '#ddd',
    },
    actionIcon: {
        marginRight: 16,
    },
    actionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    actionSub: {
        fontSize: 13,
        color: '#e0e0e0',
        marginTop: 2,
    },
    cancelBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#888',
        fontWeight: '600',
        fontSize: 16,
    },
});
