import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Send } from 'lucide-react-native';

import { fonts, getTheme, radii } from '@/components/ui/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getSupabaseClient, isSupabaseConfigured } from '@/store/supabaseClient';
import { FeedPostMessage, useStore } from '@/store/useStore';

export default function PostChatScreen() {
  const router = useRouter();
  const { postId: postIdParam } = useLocalSearchParams<{ postId?: string }>();
  const postId = typeof postIdParam === 'string' ? postIdParam : '';

  const {
    hasHydrated,
    currentUser,
    backendError,
    feedPosts,
    postMessagesByPostId,
    fetchFeedPostMessages,
    sendFeedPostMessage,
    markFeedPostChatRead,
    setActiveChatPost,
  } = useStore();

  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const listRef = useRef<FlatList<FeedPostMessage>>(null);

  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  const post = useMemo(
    () => (postId ? feedPosts.find((item) => item.id === postId) ?? null : null),
    [feedPosts, postId]
  );
  const messages = useMemo(
    () => (postId ? postMessagesByPostId[postId] ?? [] : []),
    [postId, postMessagesByPostId]
  );

  useEffect(() => {
    if (!postId || !currentUser) return;
    void fetchFeedPostMessages(postId);
  }, [currentUser, fetchFeedPostMessages, postId]);

  useEffect(() => {
    if (!postId || !currentUser) return;
    setActiveChatPost(postId);
    return () => setActiveChatPost(null);
  }, [currentUser, postId, setActiveChatPost]);

  useEffect(() => {
    if (!postId || !currentUser || !isSupabaseConfigured) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`feed-post-chat-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feed_post_messages',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          void fetchFeedPostMessages(postId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser, fetchFeedPostMessages, postId]);

  useEffect(() => {
    if (!messages.length) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 20);
    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    if (!postId || !currentUser || !messages.length) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.senderUserId !== currentUser.id) {
      void markFeedPostChatRead(postId);
    }
  }, [currentUser, markFeedPostChatRead, messages, postId]);

  if (!hasHydrated) return null;
  if (!currentUser) return <Redirect href="/auth" />;

  const handleSend = async () => {
    if (!postId) return;
    const pendingDraft = draft;
    if (!pendingDraft.trim()) return;

    setDraft('');
    setIsSending(true);
    const result = await sendFeedPostMessage(postId, pendingDraft);
    setIsSending(false);

    if (!result.ok) {
      setDraft(pendingDraft);
      Alert.alert('Unable to Send', result.reason);
      return;
    }
  };

  const renderMessage = ({ item }: { item: FeedPostMessage }) => {
    const isMine = item.senderUserId === currentUser.id;
    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
        {!isMine ? (
          <Text style={[styles.senderText, { color: theme.textSoft, fontFamily: fonts.mono }]}>{item.senderName}</Text>
        ) : null}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isMine ? theme.accentDeep : theme.surfaceStrong,
              borderColor: isMine ? theme.accentDeep : theme.border,
            },
          ]}>
          <Text style={[styles.bubbleText, { color: theme.text, fontFamily: fonts.body }]}>{item.body}</Text>
        </View>
        <Text style={[styles.timeText, { color: theme.textSoft, fontFamily: fonts.mono }]}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: theme.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: fonts.display }]}>Post Chat</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textMuted, fontFamily: fonts.body }]} numberOfLines={1}>
            {post ? `${post.authorName}: ${post.content}` : 'Coordinate pickup details here'}
          </Text>
        </View>
      </View>

      {backendError ? (
        <View style={[styles.errorCard, { borderColor: theme.borderStrong, backgroundColor: theme.surfaceStrong }]}>
          <Text style={[styles.errorText, { color: theme.danger, fontFamily: fonts.body }]}>{backendError}</Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}>
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: fonts.display }]}>No messages yet</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted, fontFamily: fonts.body }]}>
              Start the conversation to decide when and where to meet.
            </Text>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.composerWrap, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <View style={[styles.composer, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message about meetup location/time..."
            placeholderTextColor={theme.textSoft}
            style={[styles.input, { color: theme.text, fontFamily: fonts.body }]}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.accentDeep }]}
            onPress={() => void handleSend()}
            disabled={isSending}>
            <Send size={16} color={theme.text} />
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
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    marginRight: 12,
    width: 36,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 24,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  errorCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 18,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: 10,
    padding: 16,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 24,
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  messageRow: {
    marginBottom: 12,
    maxWidth: '88%',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
  },
  senderText: {
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  bubble: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  composerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
  },
  composer: {
    alignItems: 'flex-end',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 120,
    paddingRight: 8,
    paddingTop: 8,
  },
  sendBtn: {
    alignItems: 'center',
    borderRadius: 11,
    height: 38,
    justifyContent: 'center',
    marginLeft: 8,
    width: 38,
  },
});
