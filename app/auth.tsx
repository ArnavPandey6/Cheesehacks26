import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore } from '@/store/useStore';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { hasHydrated, currentUser, signIn, signUp, backendConfigured, backendError } = useStore();

    const [mode, setMode] = useState<AuthMode>('signin');
    const [name, setName] = useState('');
    const [apartment, setApartment] = useState('');
    const [unit, setUnit] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const title = useMemo(() => (mode === 'signin' ? 'Sign In' : 'Create Account'), [mode]);
    const actionText = useMemo(() => (mode === 'signin' ? 'Sign In' : 'Create Account'), [mode]);

    if (!hasHydrated) {
        return (
            <SafeAreaView style={[styles.container, isDark && styles.bgDark, styles.centerAll]}>
                <Text style={[styles.title, isDark && styles.textLight]}>Loading Relay...</Text>
            </SafeAreaView>
        );
    }

    if (currentUser) {
        return <Redirect href="/(tabs)" />;
    }

    const handleSubmit = async () => {
        if (!backendConfigured) {
            Alert.alert('Supabase Not Configured', backendError ?? 'Missing Supabase environment variables.');
            return;
        }

        setIsSubmitting(true);
        if (mode === 'signup') {
            if (password !== confirmPassword) {
                Alert.alert('Password Mismatch', 'Passwords do not match.');
                setIsSubmitting(false);
                return;
            }
            const result = await signUp({ name, apartment, unit, email, password });
            if (!result.ok) {
                Alert.alert('Sign Up Failed', result.reason);
                setIsSubmitting(false);
                return;
            }
            setIsSubmitting(false);
            return;
        }

        const result = await signIn({ email, password });
        if (!result.ok) {
            Alert.alert('Sign In Failed', result.reason);
        }
        setIsSubmitting(false);
    };

    return (
        <SafeAreaView style={[styles.container, isDark && styles.bgDark]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
                <View style={styles.content}>
                    <Text style={[styles.brand, isDark && styles.textLight]}>Relay</Text>
                    <Text style={styles.subtitle}>Community exchange for your building.</Text>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>{title}</Text>

                        {mode === 'signup' ? (
                            <>
                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Full name"
                                    placeholderTextColor="#777"
                                />
                                <TextInput
                                    style={styles.input}
                                    value={apartment}
                                    onChangeText={setApartment}
                                    placeholder="Apartment"
                                    placeholderTextColor="#777"
                                />
                                <TextInput
                                    style={styles.input}
                                    value={unit}
                                    onChangeText={setUnit}
                                    placeholder="Unit / floor"
                                    placeholderTextColor="#777"
                                />
                            </>
                        ) : null}

                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Email"
                            placeholderTextColor="#777"
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            placeholderTextColor="#777"
                            secureTextEntry
                        />

                        {mode === 'signup' ? (
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Confirm password"
                                placeholderTextColor="#777"
                                secureTextEntry
                            />
                        ) : null}

                        {!backendConfigured ? (
                            <Text style={styles.backendErrorText}>
                                {backendError ?? 'Supabase configuration missing.'}
                            </Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.primaryBtnText}>{isSubmitting ? 'Please wait...' : actionText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.switchBtn}
                            onPress={() => setMode((previous) => (previous === 'signin' ? 'signup' : 'signin'))}
                        >
                            <Text style={styles.switchBtnText}>
                                {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f6f8',
    },
    bgDark: {
        backgroundColor: '#0d0f12',
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    centerAll: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    textLight: {
        color: '#f5f7fa',
    },
    brand: {
        fontSize: 40,
        fontWeight: '800',
        color: '#111',
        marginBottom: 4,
    },
    subtitle: {
        color: '#666',
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 10,
        color: '#111',
    },
    primaryBtn: {
        backgroundColor: '#2f95dc',
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
        marginTop: 4,
    },
    primaryBtnDisabled: {
        backgroundColor: '#89bce3',
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 15,
    },
    backendErrorText: {
        color: '#b00020',
        marginBottom: 10,
        fontWeight: '600',
    },
    switchBtn: {
        marginTop: 12,
        alignItems: 'center',
    },
    switchBtnText: {
        color: '#2f95dc',
        fontWeight: '600',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111',
    },
});
