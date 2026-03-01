import React, { useState } from 'react';
import {
  Alert,
  Animated,
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

import { Atmosphere } from '@/components/ui/atmosphere';
import { LoopHeader } from '@/components/ui/loop-header';
import { fonts, getTheme, radii } from '@/components/ui/theme';
import { useEntranceAnimation } from '@/components/ui/use-entrance-animation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FeedPost, useStore } from '@/store/useStore';

const isRemoteImageUrl = (value: string | undefined) => Boolean(value && /^https?:\/\//i.test(value));

export default function HallwayScreen() {
  const { feedPosts, addFeedPost, currentUser, claimFeedOffer, hasHydrated, backendError } = useStore();
  const [newPostContent, setNewPostContent] = useState('');
  const [isOffer, setIsOffer] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const entranceStyle = useEntranceAnimation(420, 16);

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
    if (item.offerState === 'returned') {
      return <Text style={[styles.metaText, { color: theme.danger, fontFamily: fonts.mono }]}>Returned</Text>;
    }

    if (item.offerState === 'claimed') {
      const text =
        item.claimedByUserId === currentUser.id
          ? 'Claimed by you'
          : `Claimed by ${item.claimedByName ?? 'neighbor'}`;
      return <Text style={[styles.metaText, { color: theme.warning, fontFamily: fonts.mono }]}>{text}</Text>;
    }

    if (item.authorUserId === currentUser.id) {
      return <Text style={[styles.metaText, { color: theme.success, fontFamily: fonts.mono }]}>Open offer (your post)</Text>;
    }

    return (
      <TouchableOpacity style={[styles.claimBtn, { backgroundColor: theme.accentDeep }]} onPress={() => void handleClaim(item.id)}>
        <Text style={[styles.claimBtnText, { color: theme.text, fontFamily: fonts.mono }]}>Claim Offer</Text>
      </TouchableOpacity>
    );
  };

  const renderPost = ({ item }: { item: FeedPost }) => {
    const isOfferPost = item.isOffer;
    return (
      <View style={[styles.postCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.postHeader}>
          <View style={[styles.avatarWrap, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}>
            <UserCircle size={24} color={theme.textMuted} />
          </View>
          <View style={styles.postMeta}>
            <Text style={[styles.authorName, { color: theme.text, fontFamily: fonts.body }]}>{item.authorName}</Text>
            <Text style={[styles.timestamp, { color: theme.textSoft, fontFamily: fonts.mono }]}>
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </Text>
          </View>
          <View
            style={[
              styles.tagBadge,
              {
                backgroundColor: isOfferPost ? theme.successSoft : theme.accentSoft,
                borderColor: theme.border,
              },
            ]}>
            <Text
              style={[
                styles.tagText,
                {
                  color: isOfferPost ? theme.success : theme.accentDeep,
                  fontFamily: fonts.mono,
                },
              ]}>
              {isOfferPost ? 'offer' : 'request'}
            </Text>
          </View>
        </View>
        {isRemoteImageUrl(item.imageUrl) ? <Image source={{ uri: item.imageUrl }} style={styles.postImage} /> : null}
        <Text style={[styles.postContent, { color: theme.textMuted, fontFamily: fonts.body }]}>{item.content}</Text>
        {renderOfferStatus(item)}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Atmosphere colorScheme={colorScheme} />

      <LoopHeader
        colorScheme={colorScheme}
        karma={currentUser.karma}
        rightIcon={<Bell size={15} color={theme.textMuted} />}
        subtitle="hallway exchange"
      />

      <Animated.View style={[styles.feedWrap, entranceStyle]}>
        <FlatList
          data={feedPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.feedContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={[styles.triageBanner, { backgroundColor: theme.surfaceInverted, borderColor: theme.borderStrong }]}>
                <View style={[styles.triageIconBox, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                  <Sparkles size={14} color={theme.accentDeep} />
                </View>
                <View style={styles.bannerBody}>
                  <Text style={[styles.triageBannerTitle, { color: theme.text, fontFamily: fonts.display }]}>
                    Triage Mode Live
                  </Text>
                  <Text style={[styles.triageBannerSub, { color: theme.textMuted, fontFamily: fonts.body }]}>
                    Move-out season relay is active across your building.
                  </Text>
                </View>
                <Text style={[styles.triageBannerCount, { color: theme.text, fontFamily: fonts.display }]}>
                  {feedPosts.length}
                </Text>
              </View>
              <Text style={[styles.sectionHead, { color: theme.textSoft, fontFamily: fonts.mono }]}>Live Feed</Text>
            </>
          }
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.inputContainer, { backgroundColor: theme.tabGlass, borderColor: theme.border }]}>
        <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                backgroundColor: !isOffer ? theme.surfaceStrong : 'transparent',
                borderColor: !isOffer ? theme.borderStrong : 'transparent',
              },
            ]}
            onPress={() => setIsOffer(false)}>
            <Text
              style={[
                styles.toggleText,
                {
                  color: !isOffer ? theme.text : theme.textMuted,
                  fontFamily: fonts.mono,
                },
              ]}>
              I need
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              {
                backgroundColor: isOffer ? theme.surfaceStrong : 'transparent',
                borderColor: isOffer ? theme.borderStrong : 'transparent',
              },
            ]}
            onPress={() => setIsOffer(true)}>
            <Text
              style={[
                styles.toggleText,
                {
                  color: isOffer ? theme.text : theme.textMuted,
                  fontFamily: fonts.mono,
                },
              ]}>
              I have
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
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
            placeholder="Ask your neighbors..."
            placeholderTextColor={theme.textSoft}
            value={newPostContent}
            onChangeText={setNewPostContent}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.accentDeep }]}
            onPress={() => void handlePost()}
            disabled={isPosting}>
            <Send size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedWrap: {
    flex: 1,
  },
  feedContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  triageBanner: {
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triageIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginRight: 11,
    width: 38,
  },
  bannerBody: {
    flex: 1,
  },
  triageBannerTitle: {
    fontSize: 16,
    lineHeight: 18,
  },
  triageBannerSub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  triageBannerCount: {
    fontSize: 38,
    lineHeight: 40,
    marginLeft: 12,
  },
  sectionHead: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  postCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    elevation: 2,
    marginBottom: 10,
    padding: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
  },
  postHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  avatarWrap: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginRight: 8,
    width: 32,
  },
  postMeta: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 1,
  },
  tagBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  postImage: {
    borderRadius: 12,
    height: 190,
    marginBottom: 12,
    width: '100%',
  },
  postContent: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  claimBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  claimBtnText: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  inputContainer: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 16 : 12,
  },
  toggleContainer: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 4,
  },
  toggleBtn: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 7,
  },
  toggleText: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sendBtn: {
    alignItems: 'center',
    borderRadius: 13,
    height: 44,
    justifyContent: 'center',
    marginLeft: 10,
    width: 44,
  },
});
