import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Send, Sparkles, UserCircle } from 'lucide-react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { FeedPost, useStore } from '@/store/useStore';

const isRemoteImageUrl = (value: string | undefined) => Boolean(value && /^https?:\/\//i.test(value));

export default function HallwayScreen() {
  const { feedPosts, addFeedPost, currentUser, claimFeedOffer, hasHydrated, backendError } = useStore();
  const [newPostContent, setNewPostContent] = useState('');
  const [isOffer, setIsOffer] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!hasHydrated) return null;
  if (!currentUser) return <Redirect href="../auth" />;

  const handlePost = async () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    const createdPost = await addFeedPost({
      content: newPostContent.trim(),
      isOffer,
    });
    if (!createdPost) {
      Alert.alert('Unable to Post', backendError ?? 'You must be signed in to post in the hallway.');
      setIsPosting(false);
      return;
    }
    setNewPostContent('');
    setIsPosting(false);
  };

  const handleClaim = async (postId: string) => {
    const result = await claimFeedOffer(postId);
    if (!result.ok) {
      Alert.alert('Unable to Claim', result.reason);
      return;
    }
    Alert.alert('Claimed', 'This item is now in your active hallway borrows.');
  };

  const renderOfferStatus = (item: FeedPost) => {
    if (!item.isOffer) return null;
    if (item.offerState === 'returned') return <Text style={styles.offerStatusReturned}>Returned</Text>;
    if (item.offerState === 'claimed') {
      const text =
        item.claimedByUserId === currentUser.id
          ? 'Claimed by you'
          : `Claimed by ${item.claimedByName ?? 'neighbor'}`;
      return <Text style={styles.offerStatusClaimed}>{text}</Text>;
    }

    if (item.authorUserId === currentUser.id) {
      return <Text style={styles.offerStatusOpen}>Open offer (your post)</Text>;
    }

    return (
      <TouchableOpacity style={styles.claimBtn} onPress={() => void handleClaim(item.id)}>
        <Text style={styles.claimBtnText}>Claim Offer</Text>
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <View style={[styles.postCard, isDark && styles.postCardDark]}>
      <View style={styles.postHeader}>
        <View style={styles.avatarWrap}>
          <UserCircle size={30} color={isDark ? '#D8CFC9' : '#9C9692'} />
        </View>
        <View style={styles.postMeta}>
          <Text style={[styles.authorName, isDark && styles.textLight]}>{item.authorName}</Text>
          <Text style={styles.timestamp}>{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</Text>
        </View>
        <View style={[styles.tagBadge, item.isOffer ? styles.badgeOffer : styles.badgeRequest]}>
          <Text style={[styles.tagText, item.isOffer ? styles.tagOfferText : styles.tagRequestText]}>
            {item.isOffer ? 'giving away' : 'looking for'}
          </Text>
        </View>
      </View>
      {isRemoteImageUrl(item.imageUrl) ? <Image source={{ uri: item.imageUrl }} style={styles.postImage} /> : null}
      <Text style={[styles.postContent, isDark && styles.textLight]}>{item.content}</Text>
      {renderOfferStatus(item)}
    </View>
  );

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
          <Bell size={14} color={isDark ? '#B5ACA7' : '#9C9692'} />
        </View>
      </View>

      <FlatList
        data={feedPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.triageBanner}>
              <View style={styles.triageIconBox}>
                <Sparkles size={15} color="#FFD9DA" />
              </View>
              <View>
                <Text style={styles.triageBannerTitle}>Triage Mode Active</Text>
                <Text style={styles.triageBannerSub}>Move-out season relay is live</Text>
              </View>
              <Text style={styles.triageBannerCount}>{feedPosts.length}</Text>
            </View>
            <Text style={styles.sectionHead}>Live Feed</Text>
          </>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.inputContainer, isDark && styles.inputContainerDark]}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, !isOffer && styles.toggleBtnRequest]}
            onPress={() => setIsOffer(false)}>
            <Text style={[styles.toggleText, !isOffer && styles.toggleTextActive]}>I need</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, isOffer && styles.toggleBtnOffer]}
            onPress={() => setIsOffer(true)}>
            <Text style={[styles.toggleText, isOffer && styles.toggleTextActive]}>I have</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, isDark && styles.inputDark]}
            placeholder="Ask the building..."
            placeholderTextColor="#9C9692"
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={() => void handlePost()} disabled={isPosting}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
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
  feedContainer: {
    padding: 14,
    paddingBottom: 28,
  },
  triageBanner: {
    alignItems: 'center',
    backgroundColor: '#C5050C',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triageIconBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,217,218,0.25)',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  triageBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  triageBannerSub: {
    color: '#FFD9DA',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    marginTop: 1,
  },
  triageBannerCount: {
    color: '#FFD9DA',
    fontFamily: Platform.select({ ios: 'ui-serif', default: 'serif' }),
    fontSize: 30,
    fontWeight: '700',
    marginLeft: 'auto',
  },
  sectionHead: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    letterSpacing: 1.3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    padding: 12,
  },
  postCardDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
  },
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  avatarWrap: {
    marginRight: 8,
  },
  postMeta: {
    flex: 1,
  },
  authorName: {
    color: '#343330',
    fontSize: 13,
    fontWeight: '600',
  },
  timestamp: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
    marginTop: 1,
  },
  tagBadge: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeOffer: {
    backgroundColor: 'rgba(42,107,60,0.1)',
  },
  badgeRequest: {
    backgroundColor: '#FFF5F0',
    borderColor: '#EDE8E3',
    borderWidth: 1,
  },
  tagText: {
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 10,
  },
  tagOfferText: {
    color: '#2A6B3C',
  },
  tagRequestText: {
    color: '#9C9692',
  },
  postImage: {
    backgroundColor: '#EDE8E3',
    borderRadius: 12,
    height: 180,
    marginBottom: 12,
    width: '100%',
  },
  postContent: {
    color: '#5C5956',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  claimBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#C5050C',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  claimBtnText: {
    color: '#fff',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    fontWeight: '700',
  },
  offerStatusOpen: {
    color: '#2A6B3C',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    fontWeight: '700',
  },
  offerStatusClaimed: {
    color: '#8C4A1A',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    fontWeight: '700',
  },
  offerStatusReturned: {
    color: '#C5050C',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    fontWeight: '700',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EDE8E3',
    borderTopWidth: 1,
    padding: 14,
  },
  inputContainerDark: {
    backgroundColor: '#1F1B18',
    borderTopColor: '#2B2724',
  },
  toggleContainer: {
    backgroundColor: '#FFF5F0',
    borderRadius: 18,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 4,
  },
  toggleBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    paddingVertical: 6,
  },
  toggleBtnRequest: {
    backgroundColor: '#343330',
  },
  toggleBtnOffer: {
    backgroundColor: '#C5050C',
  },
  toggleText: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#FFF5F0',
    borderColor: '#EDE8E3',
    borderRadius: 14,
    borderWidth: 1,
    color: '#343330',
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inputDark: {
    backgroundColor: '#171513',
    borderColor: '#2B2724',
    color: '#F9F3EF',
  },
  sendBtn: {
    alignItems: 'center',
    backgroundColor: '#C5050C',
    borderRadius: 11,
    height: 44,
    justifyContent: 'center',
    marginLeft: 10,
    width: 44,
  },
});
