import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useStore, VaultItem } from '../../store/useStore';
import { AlertCircle, Library, Lock, Search, Sparkles, Unlock } from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';

const isRemoteImageUrl = (value: string) => /^https?:\/\//i.test(value);
const categories = ['All', 'Cleaning', 'Tools', 'Kitchen', 'Moving', 'Furniture'];

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
    const statusLabel = isAvailable ? 'Free' : item.status === 'reserved' ? 'Reserved' : 'On Loan';

    return (
      <View style={[styles.card, isDark && styles.cardDark]}>
        {canRenderImage ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Library size={22} color="#C5050C" />
            <Text style={styles.imageFallbackText}>Image unavailable</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.itemName, isDark && styles.textLight]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.statusChip, isAvailable ? styles.statusFree : styles.statusLoan]}>
              <Text style={[styles.statusChipText, isAvailable ? styles.statusChipFreeText : styles.statusChipLoanText]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.bottomRow}>
            <View style={styles.karmaRow}>
              <AlertCircle size={14} color={hasEnoughKarma ? '#2A6B3C' : '#C5050C'} />
              <Text style={[styles.karmaText, !hasEnoughKarma && styles.karmaMissing]}>
                Requires {item.minKarmaRequired} Karma
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.reserveBtn, (!isAvailable || !hasEnoughKarma) && styles.reserveBtnDisabled]}
              onPress={() => void handleReserve(item)}
              disabled={!isAvailable || !hasEnoughKarma}>
              {isAvailable && hasEnoughKarma ? <Unlock size={14} color="#fff" /> : <Lock size={14} color="#aaa" />}
              <Text style={[styles.reserveText, (!isAvailable || !hasEnoughKarma) && styles.reserveTextDisabled]}>
                {!isAvailable ? 'In Use' : !hasEnoughKarma ? 'Karma Locked' : 'Reserve'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
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
          <Library size={14} color={isDark ? '#B5ACA7' : '#9C9692'} />
        </View>
      </View>

      <FlatList
        data={vaultItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
              <Search size={14} color="#9C9692" />
              <TextInput
                editable={false}
                placeholder="Search building inventory..."
                placeholderTextColor="#9C9692"
                style={styles.searchInput}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}>
              {categories.map((chip, index) => (
                <View key={chip} style={[styles.chip, index === 0 && styles.chipActive]}>
                  <Text style={[styles.chipText, index === 0 && styles.chipTextActive]}>{chip}</Text>
                </View>
              ))}
            </ScrollView>

            <Text style={styles.sectionHead}>Building Library - {vaultItems.length} items</Text>
          </>
        }
      />
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
  listContainer: {
    padding: 14,
    paddingBottom: 28,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    borderColor: '#EDE8E3',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  searchBarDark: {
    borderColor: '#2B2724',
  },
  searchInput: {
    color: '#9C9692',
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  chipsRow: {
    gap: 6,
    marginBottom: 12,
    paddingBottom: 2,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: '#343330',
    borderColor: '#343330',
  },
  chipText: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sectionHead: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
  },
  image: {
    backgroundColor: '#FFD9DA',
    height: 108,
    width: 82,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  imageFallbackText: {
    color: '#9C9692',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  cardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    color: '#343330',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  statusChip: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusFree: {
    backgroundColor: 'rgba(42,107,60,0.1)',
  },
  statusLoan: {
    backgroundColor: '#FFD9DA',
  },
  statusChipText: {
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    fontWeight: '600',
  },
  statusChipFreeText: {
    color: '#2A6B3C',
  },
  statusChipLoanText: {
    color: '#C5050C',
  },
  description: {
    color: '#5C5956',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 8,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  karmaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  karmaText: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    marginLeft: 5,
  },
  karmaMissing: {
    color: '#C5050C',
  },
  reserveBtn: {
    alignItems: 'center',
    backgroundColor: '#C5050C',
    borderRadius: 8,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reserveBtnDisabled: {
    backgroundColor: '#EFEAE6',
  },
  reserveText: {
    color: '#fff',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 5,
  },
  reserveTextDisabled: {
    color: '#AAA',
  },
});
