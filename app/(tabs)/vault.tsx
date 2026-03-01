import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
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
import { AlertCircle, Library, Lock, Search, Unlock } from 'lucide-react-native';

import { Atmosphere } from '@/components/ui/atmosphere';
import { LoopHeader } from '@/components/ui/loop-header';
import { fonts, getTheme, radii } from '@/components/ui/theme';
import { useEntranceAnimation } from '@/components/ui/use-entrance-animation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore, VaultItem } from '@/store/useStore';

const isRemoteImageUrl = (value: string) => /^https?:\/\//i.test(value);

const normalizeCategory = (value: string) => value.trim().toLowerCase();

export default function VaultScreen() {
  const { vaultItems, reserveItem, currentUser, hasHydrated } = useStore();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const entranceStyle = useEntranceAnimation(420, 16);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const unique = new Set<string>();
    vaultItems.forEach((item) => {
      if (item.productCategory?.trim()) unique.add(item.productCategory.trim());
    });
    return ['All', ...Array.from(unique).sort((a, b) => a.localeCompare(b))];
  }, [vaultItems]);

  const filteredVaultItems = useMemo(() => {
    if (selectedCategory === 'All') return vaultItems;
    const selected = normalizeCategory(selectedCategory);
    return vaultItems.filter((item) => normalizeCategory(item.productCategory) === selected);
  }, [selectedCategory, vaultItems]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [categories, selectedCategory]);

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
    const statusLabel = isAvailable ? 'Available' : item.status === 'reserved' ? 'Reserved' : 'On Loan';

    return (
      <View style={[styles.card, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, shadowColor: theme.shadow }]}>
        {canRenderImage ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback, { backgroundColor: theme.accentSoft }]}>
            <Library size={22} color={theme.accentDeep} />
            <Text style={[styles.imageFallbackText, { color: theme.textMuted, fontFamily: fonts.mono }]}>No image</Text>
          </View>
        )}

          <View style={styles.cardBody}>
            <View style={styles.cardTopRow}>
              <Text style={[styles.itemName, { color: theme.text, fontFamily: fonts.body }]} numberOfLines={1}>
                {item.name}
              </Text>
            <View
              style={[
                styles.statusChip,
                {
                  backgroundColor: isAvailable ? theme.successSoft : theme.accentSoft,
                  borderColor: isAvailable ? theme.success : theme.accentDeep,
                },
              ]}>
              <Text
                style={[
                  styles.statusChipText,
                  {
                    color: isAvailable ? theme.success : theme.accentDeep,
                    fontFamily: fonts.mono,
                  },
                ]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.itemMetaRow}>
            <View style={[styles.categoryChip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
              <Text style={[styles.categoryChipText, { color: theme.accentDeep, fontFamily: fonts.mono }]}>
                {item.productCategory}
              </Text>
            </View>
          </View>

          <Text style={[styles.description, { color: theme.textMuted, fontFamily: fonts.body }]} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.bottomRow}>
            <View style={styles.karmaRow}>
              <AlertCircle size={14} color={hasEnoughKarma ? theme.success : theme.danger} />
              <Text
                style={[
                  styles.karmaText,
                  {
                    color: hasEnoughKarma ? theme.textSoft : theme.danger,
                    fontFamily: fonts.mono,
                  },
                ]}>
                Requires {item.minKarmaRequired}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.reserveBtn,
                {
                  backgroundColor: isAvailable && hasEnoughKarma ? theme.accentDeep : theme.backgroundMuted,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => void handleReserve(item)}
              disabled={!isAvailable || !hasEnoughKarma}>
              {isAvailable && hasEnoughKarma ? (
                <Unlock size={14} color={theme.text} />
              ) : (
                <Lock size={14} color={theme.textSoft} />
              )}
              <Text
                style={[
                  styles.reserveText,
                  {
                    color: isAvailable && hasEnoughKarma ? theme.text : theme.textSoft,
                    fontFamily: fonts.mono,
                  },
                ]}>
                {!isAvailable ? 'In Use' : !hasEnoughKarma ? 'Locked' : 'Reserve'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Atmosphere colorScheme={colorScheme} />

      <LoopHeader
        colorScheme={colorScheme}
        karma={currentUser.karma}
        rightIcon={<Library size={15} color={theme.textMuted} />}
        subtitle="vault inventory"
      />

      <Animated.View style={[styles.listWrap, entranceStyle]}>
        <FlatList
          data={filteredVaultItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={[styles.searchBar, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
                <Search size={14} color={theme.textSoft} />
                <TextInput
                  editable={false}
                  placeholder="Search building inventory..."
                  placeholderTextColor={theme.textSoft}
                  style={[styles.searchInput, { color: theme.textSoft, fontFamily: fonts.body }]}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {categories.map((chip) => {
                  const isActive = chip === selectedCategory;
                  return (
                    <TouchableOpacity
                      key={chip}
                      onPress={() => setSelectedCategory(chip)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isActive ? theme.surfaceInverted : theme.surfaceStrong,
                          borderColor: isActive ? theme.surfaceInverted : theme.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: isActive ? theme.text : theme.textMuted,
                            fontFamily: fonts.mono,
                          },
                        ]}>
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.sectionHead, { color: theme.textSoft, fontFamily: fonts.mono }]}>
                Building Library - {filteredVaultItems.length} items
              </Text>
            </>
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  searchBar: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === 'ios' ? 10 : 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  chipsRow: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
  },
  sectionHead: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    marginBottom: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  image: {
    height: 114,
    width: 88,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  imageFallbackText: {
    fontSize: 9,
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
    flex: 1,
    fontSize: 14,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusChipText: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 9,
  },
  itemMetaRow: {
    marginBottom: 7,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryChipText: {
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
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
    fontSize: 10,
    marginLeft: 5,
  },
  reserveBtn: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reserveText: {
    fontSize: 10,
    marginLeft: 5,
    textTransform: 'uppercase',
  },
});
