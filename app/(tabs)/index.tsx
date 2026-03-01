import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, SafeAreaView, Image, Alert } from 'react-native';
import { Redirect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { Send, UserCircle } from 'lucide-react-native';

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
            const text = item.claimedByUserId === currentUser.id
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
                <UserCircle size={32} color={isDark ? '#ccc' : '#555'} />
                <View style={styles.postMeta}>
                    <Text style={[styles.authorName, isDark && styles.textLight]}>{item.authorName}</Text>
                    <Text style={styles.timestamp}>
                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </Text>
                </View>
                <View style={[styles.tagBadge, item.isOffer ? styles.badgeOffer : styles.badgeRequest]}>
                    <Text style={styles.tagText}>{item.isOffer ? 'OFFER' : 'REQUEST'}</Text>
                </View>
            </View>
            {isRemoteImageUrl(item.imageUrl) ? <Image source={{ uri: item.imageUrl }} style={styles.postImage} /> : null}
            <Text style={[styles.postContent, isDark && styles.textLight]}>{item.content}</Text>
            {renderOfferStatus(item)}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <View style={styles.header}>
                <Text style={[styles.title, isDark && styles.textLight]}>The Hallway</Text>
                <Text style={styles.subtitle}>Building Feed & Quick Needs</Text>
            </View>

            <FlatList
                data={feedPosts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                contentContainerStyle={styles.feedContainer}
                showsVerticalScrollIndicator={false}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.inputContainer, isDark && styles.inputContainerDark]}
            >
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, !isOffer && styles.toggleBtnActiveRequest]}
                        onPress={() => setIsOffer(false)}
                    >
                        <Text style={[styles.toggleText, !isOffer && styles.toggleBtnTextActive]}>I need</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, isOffer && styles.toggleBtnActiveOffer]}
                        onPress={() => setIsOffer(true)}
                    >
                        <Text style={[styles.toggleText, isOffer && styles.toggleBtnTextActive]}>I have</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.row}>
                    <TextInput
                        style={[styles.input, isDark && styles.inputDark]}
                        placeholder="Ask the building..."
                        placeholderTextColor="#888"
                        value={newPostContent}
                        onChangeText={setNewPostContent}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={() => void handlePost()} disabled={isPosting}>
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    feedContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    postCardDark: {
        backgroundColor: '#1a1a1a',
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    postMeta: {
        marginLeft: 10,
        flex: 1,
    },
    authorName: {
        fontWeight: '600',
        fontSize: 15,
        color: '#222',
    },
    timestamp: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    tagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeOffer: {
        backgroundColor: '#e6f4ea',
    },
    badgeRequest: {
        backgroundColor: '#fae3e5',
    },
    tagText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#111',
    },
    postContent: {
        fontSize: 15,
        lineHeight: 22,
        color: '#333',
        marginBottom: 10,
    },
    postImage: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: '#eee',
    },
    claimBtn: {
        backgroundColor: '#20c997',
        borderRadius: 10,
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    claimBtnText: {
        color: '#fff',
        fontWeight: '700',
    },
    offerStatusOpen: {
        color: '#20c997',
        fontWeight: '700',
    },
    offerStatusClaimed: {
        color: '#f59f00',
        fontWeight: '700',
    },
    offerStatusReturned: {
        color: '#2f95dc',
        fontWeight: '700',
    },
    inputContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderColor: '#eee',
    },
    inputContainerDark: {
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
    },
    toggleContainer: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 16,
    },
    toggleBtnActiveRequest: {
        backgroundColor: '#ff6b6b',
    },
    toggleBtnActiveOffer: {
        backgroundColor: '#20c997',
    },
    toggleText: {
        fontWeight: '600',
        fontSize: 13,
        color: '#555',
    },
    toggleBtnTextActive: {
        color: '#fff',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#f4f4f4',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        maxHeight: 100,
    },
    inputDark: {
        backgroundColor: '#2c2c2c',
        color: '#eee',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2f95dc',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
});
