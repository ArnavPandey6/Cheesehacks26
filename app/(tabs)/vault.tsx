import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Alert, SafeAreaView } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore, VaultItem } from '../../store/useStore';
import { Lock, Unlock, AlertCircle } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

const isRemoteImageUrl = (value: string) => /^https?:\/\//i.test(value);

export default function VaultScreen() {
    const { vaultItems, reserveItem, currentUser, hasHydrated } = useStore();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (!hasHydrated) return null;
    if (!currentUser) return <Redirect href="../auth" />;

    const handleReserve = async (item: VaultItem) => {
        if (item.status !== 'available') {
            Alert.alert('Unavailable', 'This item is currently locked or in use.');
            return;
        }

        if (currentUser.karma < item.minKarmaRequired) {
            Alert.alert(
                'Insufficient Karma',
                `You need ${item.minKarmaRequired} Karma to borrow this item. You have ${currentUser.karma}. Donate items to earn more!`
            );
            return;
        }

        const result = await reserveItem(item.id);
        if (result.ok) {
            Alert.alert('Reserved!', `You have reserved the ${item.name}. Pick it up from the building hub within 30 mins.`);
        } else {
            Alert.alert('Unavailable', result.reason);
        }
    };

    const renderItem = ({ item }: { item: VaultItem }) => {
        const isAvailable = item.status === 'available';
        const hasEnoughKarma = currentUser.karma >= item.minKarmaRequired;
        const canRenderImage = isRemoteImageUrl(item.imageUrl);

        return (
            <View style={[styles.card, isDark && styles.cardDark]}>
                {canRenderImage ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.image} />
                ) : (
                    <View style={[styles.image, styles.imageFallback]}>
                        <Text style={styles.imageFallbackText}>Image unavailable</Text>
                    </View>
                )}
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.itemName, isDark && styles.textLight]}>{item.name}</Text>
                        <View style={[styles.statusBadge, isAvailable ? styles.badgeAvailable : styles.badgeUnavailable]}>
                            <Text style={styles.statusText}>{isAvailable ? 'AVAILABLE' : item.status.toUpperCase()}</Text>
                        </View>
                    </View>

                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

                    <View style={styles.footer}>
                        <View style={styles.karmaReq}>
                            <AlertCircle size={16} color={hasEnoughKarma ? "#20c997" : "#ff6b6b"} />
                            <Text style={[styles.karmaText, !hasEnoughKarma && styles.karmaMissing]}>
                                Requires {item.minKarmaRequired} Karma
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.reserveBtn, (!isAvailable || !hasEnoughKarma) && styles.reserveBtnDisabled]}
                            onPress={() => void handleReserve(item)}
                            disabled={!isAvailable || !hasEnoughKarma}
                        >
                            {isAvailable && hasEnoughKarma ? <Unlock size={16} color="#fff" /> : <Lock size={16} color="#aaa" />}
                            <Text style={[styles.reserveText, (!isAvailable || !hasEnoughKarma) && styles.reserveTextDisabled]}>
                                {!isAvailable ? 'In Use' : (!hasEnoughKarma ? 'Karma Locked' : 'Reserve')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <View style={styles.header}>
                <Text style={[styles.title, isDark && styles.textLight]}>The Vault</Text>
                <Text style={styles.subtitle}>Building Library & Permanent Resources</Text>
            </View>

            <FlatList
                data={vaultItems}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
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
    header: {
        paddingHorizontal: 20,
        paddingTop: 40,
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
    listContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
        elevation: 4,
        overflow: 'hidden',
    },
    cardDark: {
        backgroundColor: '#1a1a1a',
    },
    image: {
        width: '100%',
        height: 180,
        backgroundColor: '#eee',
    },
    imageFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageFallbackText: {
        color: '#666',
        fontWeight: '600',
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#222',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 10,
    },
    badgeAvailable: {
        backgroundColor: '#e6f4ea',
    },
    badgeUnavailable: {
        backgroundColor: '#f1f3f4',
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#111',
    },
    description: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: '#f0f0f0',
        paddingTop: 12,
    },
    karmaReq: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    karmaText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555',
        marginLeft: 6,
    },
    karmaMissing: {
        color: '#ff6b6b',
    },
    reserveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2f95dc',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    reserveBtnDisabled: {
        backgroundColor: '#f0f0f0',
    },
    reserveText: {
        color: '#fff',
        fontWeight: '700',
        marginLeft: 6,
    },
    reserveTextDisabled: {
        color: '#aaa',
    },
});
