import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle, Image as ImageIcon, MessageCircle, Send, Sparkles, Trash2, UserCircle, X } from 'lucide-react-native';

import { Atmosphere } from '@/components/ui/atmosphere';
import { LoopHeader } from '@/components/ui/loop-header';
import { fonts, getTheme, radii } from '@/components/ui/theme';
import { useEntranceAnimation } from '@/components/ui/use-entrance-animation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FeedPost, useStore } from '@/store/useStore';

const isRemoteImageUrl = (value: string | undefined) => Boolean(value && /^https?:\/\//i.test(value));

const SWIPE_THRESHOLD = 72;

// ─── SwipeableRequestCard ──────────────────────────────────────────────────

type SwipeCardProps = {
  item: FeedPost;
  currentUserId: string;
  theme: ReturnType<typeof getTheme>;
  onFulfill: () => void;
  renderBody: () => React.ReactNode;
};

function SwipeableRequestCard({ item, currentUserId, theme, onFulfill, renderBody }: SwipeCardProps) {
  const canSwipe = !item.isOffer && item.authorUserId !== currentUserId;
  const translateX = useRef(new Animated.Value(0)).current;

  // Keep onFulfill ref stable so the closure inside panResponder always calls the latest version
  const onFulfillRef = useRef(onFulfill);
  onFulfillRef.current = onFulfill;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        canSwipe && Math.abs(dx) > Math.abs(dy) && dx > 8,
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) translateX.setValue(Math.min(dx, 110));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SWIPE_THRESHOLD || vx > 0.5) {
          onFulfillRef.current();
        }
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 9,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const revealOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[swipeStyles.wrapper, { borderRadius: radii.md }]}>
      {canSwipe && (
        <Animated.View
          style={[
            swipeStyles.fulfillReveal,
            { backgroundColor: theme.accentSoft, opacity: revealOpacity },
          ]}>
          <CheckCircle size={20} color={theme.accentDeep} />
          <Text style={[swipeStyles.fulfillRevealText, { color: theme.accentDeep, fontFamily: fonts.mono }]}>
            FULFILL
          </Text>
        </Animated.View>
      )}
      <Animated.View
        {...(canSwipe ? panResponder.panHandlers : {})}
        style={{ transform: [{ translateX }] }}>
        {renderBody()}
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  fulfillReveal: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    paddingLeft: 20,
    position: 'absolute',
    top: 0,
    width: '100%',
  },
  fulfillRevealText: {
    fontSize: 11,
    letterSpacing: 1.4,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────

export default function HallwayScreen() {
  const {
    feedPosts,
    addFeedPost,
    deleteFeedPost,
    currentUser,
    claimFeedOffer,
    hasHydrated,
    backendError,
    unreadChatCountsByPostId,
    refreshUnreadChatCounts,
  } = useStore();
  const router = useRouter();
  const [newPostContent, setNewPostContent] = useState('');
  const [isOffer, setIsOffer] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Fulfill modal
  const [fulfillTarget, setFulfillTarget] = useState<FeedPost | null>(null);
  const [fulfillImageUri, setFulfillImageUri] = useState<string | null>(null);   // local URI for preview
  const [fulfillImageBase64, setFulfillImageBase64] = useState<string | null>(null); // base64 for upload
  const [isFulfilling, setIsFulfilling] = useState(false);

  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const entranceStyle = useEntranceAnimation(420, 16);

  useEffect(() => {
    if (!currentUser) return;
    void refreshUnreadChatCounts();
  }, [currentUser, refreshUnreadChatCounts]);

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

  const handleDelete = (postId: string) => {
    Alert.alert('Remove Post', 'Are you sure you want to remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteFeedPost(postId);
          if (!result.ok) Alert.alert('Error', result.reason);
        },
      },
    ]);
  };

  const pickFulfillImage = async (fromCamera: boolean) => {
    if (fromCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission is required to take a photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8, base64: true });
      if (!result.canceled && result.assets[0]) {
        setFulfillImageUri(result.assets[0].uri);
        setFulfillImageBase64(result.assets[0].base64 ?? null);
      }
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setFulfillImageUri(result.assets[0].uri);
        setFulfillImageBase64(result.assets[0].base64 ?? null);
      }
    }
  };

  const handleFulfillSubmit = async () => {
    if (!fulfillTarget || !fulfillImageUri) return;
    setIsFulfilling(true);
    // Pass as a data URI so the store can decode it without reading the local file
    const imageUrl = fulfillImageBase64
      ? `data:image/jpeg;base64,${fulfillImageBase64}`
      : fulfillImageUri;
    const result = await addFeedPost({
      content: `Offering to help with: "${fulfillTarget.content}"`,
      isOffer: true,
      imageUrl,
    });
    setIsFulfilling(false);
    if (result) {
      setFulfillTarget(null);
      setFulfillImageUri(null);
      setFulfillImageBase64(null);
      Alert.alert('Offer Posted!', 'Your offer to help has been posted to the feed.');
    } else {
      Alert.alert('Error', backendError ?? 'Unable to post your offer. Please try again.');
    }
  };

  const closeFulfillModal = () => {
    setFulfillTarget(null);
    setFulfillImageUri(null);
    setFulfillImageBase64(null);
  };

  const openPostChat = (postId: string) => {
    router.push(`../chat/${postId}`);
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

  const renderPostBody = (item: FeedPost) => {
    const isOfferPost = item.isOffer;
    const isSwipeable = !item.isOffer && item.authorUserId !== currentUser.id;
    const isOwn = item.authorUserId === currentUser.id;
    const canDelete = isOwn && !(item.isOffer && item.offerState === 'claimed');
    const unreadCount = unreadChatCountsByPostId[item.id] ?? 0;
    return (
      <View style={[styles.postCard, { backgroundColor: theme.surfaceStrong, borderColor: theme.border, shadowColor: theme.shadow, marginBottom: 0 }]}>
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
          {canDelete && (
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: theme.backgroundMuted }]}
              onPress={() => handleDelete(item.id)}>
              <Trash2 size={13} color={theme.textSoft} />
            </TouchableOpacity>
          )}
        </View>
        {isRemoteImageUrl(item.imageUrl) ? <Image source={{ uri: item.imageUrl }} style={styles.postImage} /> : null}
        <Text style={[styles.postContent, { color: theme.textMuted, fontFamily: fonts.body }]}>{item.content}</Text>
        <View style={styles.postFooter}>
          <View style={styles.offerStateWrap}>{renderOfferStatus(item)}</View>
          <TouchableOpacity
            style={[styles.chatBtn, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}
            onPress={() => openPostChat(item.id)}>
            <MessageCircle size={14} color={theme.accentDeep} />
            <Text style={[styles.chatBtnText, { color: theme.accentDeep, fontFamily: fonts.mono }]}>Message</Text>
            {unreadCount > 0 ? (
              <View style={[styles.unreadPill, { backgroundColor: theme.accentDeep }]}>
                <Text style={[styles.unreadPillText, { color: theme.text, fontFamily: fonts.mono }]}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        {isSwipeable && (
          <Text style={[styles.swipeHint, { color: theme.textSoft, fontFamily: fonts.mono }]}>
            → swipe right to fulfill
          </Text>
        )}
      </View>
    );
  };

  const renderPost = ({ item }: { item: FeedPost }) => (
    <SwipeableRequestCard
      item={item}
      currentUserId={currentUser.id}
      theme={theme}
      onFulfill={() => setFulfillTarget(item)}
      renderBody={() => renderPostBody(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Atmosphere colorScheme={colorScheme} />

      <LoopHeader
        colorScheme={colorScheme}
        karma={currentUser.karma}
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

      {/* ── Fulfill Modal ── */}
      <Modal
        visible={fulfillTarget !== null}
        animationType="slide"
        transparent
        onRequestClose={closeFulfillModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderStrong }]}>

            {/* Header row */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: fonts.display }]}>
                Fulfill Request
              </Text>
              <TouchableOpacity
                onPress={closeFulfillModal}
                style={[styles.modalClose, { backgroundColor: theme.backgroundMuted }]}>
                <X size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* The request being fulfilled */}
            <View style={[styles.requestPreview, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}>
              <Text style={[styles.requestPreviewLabel, { color: theme.textSoft, fontFamily: fonts.mono }]}>
                REQUEST
              </Text>
              <Text style={[styles.requestPreviewContent, { color: theme.text, fontFamily: fonts.body }]}>
                {fulfillTarget?.content}
              </Text>
              <Text style={[styles.requestPreviewAuthor, { color: theme.textMuted, fontFamily: fonts.mono }]}>
                by {fulfillTarget?.authorName}
              </Text>
            </View>

            {/* Photo proof */}
            <Text style={[styles.modalSectionLabel, { color: theme.textSoft, fontFamily: fonts.mono }]}>
              PHOTO PROOF
            </Text>

            {fulfillImageUri ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: fulfillImageUri }} style={styles.proofImage} />
                <TouchableOpacity
                  style={[styles.rePickBtn, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}
                  onPress={() => { setFulfillImageUri(null); setFulfillImageBase64(null); }}>
                  <Text style={[styles.rePickBtnText, { color: theme.textMuted, fontFamily: fonts.mono }]}>
                    Re-pick
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickBtnsRow}>
                <TouchableOpacity
                  style={[styles.pickBtn, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}
                  onPress={() => void pickFulfillImage(true)}>
                  <Camera size={18} color={theme.accentDeep} />
                  <Text style={[styles.pickBtnText, { color: theme.accentDeep, fontFamily: fonts.mono }]}>
                    Camera
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickBtn, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}
                  onPress={() => void pickFulfillImage(false)}>
                  <ImageIcon size={18} color={theme.accentDeep} />
                  <Text style={[styles.pickBtnText, { color: theme.accentDeep, fontFamily: fonts.mono }]}>
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.fulfillSubmitBtn,
                {
                  backgroundColor: fulfillImageUri ? theme.accentDeep : theme.backgroundMuted,
                  opacity: isFulfilling ? 0.6 : 1,
                },
              ]}
              onPress={() => void handleFulfillSubmit()}
              disabled={!fulfillImageUri || isFulfilling}>
              <CheckCircle size={18} color={fulfillImageUri ? theme.text : theme.textMuted} />
              <Text style={[styles.fulfillSubmitText, { color: fulfillImageUri ? theme.text : theme.textMuted, fontFamily: fonts.mono }]}>
                {isFulfilling ? 'Posting...' : 'Post Offer to Help'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  postFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerStateWrap: {
    flex: 1,
    marginRight: 12,
  },
  chatBtn: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chatBtnText: {
    fontSize: 10,
    letterSpacing: 0.6,
    marginLeft: 5,
    textTransform: 'uppercase',
  },
  unreadPill: {
    borderRadius: 999,
    marginLeft: 7,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  unreadPillText: {
    fontSize: 9,
    textAlign: 'center',
  },
  swipeHint: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  deleteBtn: {
    alignItems: 'center',
    borderRadius: 8,
    height: 26,
    justifyContent: 'center',
    marginLeft: 6,
    width: 26,
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
  // ── Modal ──
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalClose: {
    alignItems: 'center',
    borderRadius: 20,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  requestPreview: {
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: 18,
    padding: 12,
  },
  requestPreviewLabel: {
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  requestPreviewContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  requestPreviewAuthor: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
  modalSectionLabel: {
    fontSize: 9,
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  pickBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  pickBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  pickBtnText: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  imagePreviewWrap: {
    marginBottom: 18,
    position: 'relative',
  },
  proofImage: {
    borderRadius: radii.md,
    height: 180,
    width: '100%',
  },
  rePickBtn: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rePickBtnText: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fulfillSubmitBtn: {
    alignItems: 'center',
    borderRadius: radii.md,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  fulfillSubmitText: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
