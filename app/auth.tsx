import React, { useMemo, useState } from 'react';
import {
  Alert,
  Animated,
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

import { Atmosphere } from '@/components/ui/atmosphere';
import { LoopLogo } from '@/components/ui/loop-logo';
import { fonts, getTheme, radii } from '@/components/ui/theme';
import { useEntranceAnimation } from '@/components/ui/use-entrance-animation';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore } from '@/store/useStore';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { hasHydrated, currentUser, signIn, signUp, backendConfigured, backendError } = useStore();
  const entranceStyle = useEntranceAnimation(500, 20);

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }, styles.centerAll]}>
        <Atmosphere colorScheme={colorScheme} />
        <Text style={[styles.title, { color: theme.text, fontFamily: fonts.display }]}>Loading Loop...</Text>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Atmosphere colorScheme={colorScheme} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <Animated.View style={[styles.content, entranceStyle]}>
          <View style={styles.logoWrap}>
            <LoopLogo colorScheme={colorScheme} size="lg" showSubtitle />
            <Text style={[styles.authCaption, { color: theme.textMuted, fontFamily: fonts.body }]}>
              Trusted exchange for your building community
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>
            <View style={[styles.modeSwitchWrap, { backgroundColor: theme.backgroundMuted, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.modeSwitchBtn,
                  mode === 'signin' && { backgroundColor: theme.surfaceStrong, borderColor: theme.borderStrong },
                ]}
                onPress={() => setMode('signin')}>
                <Text
                  style={[
                    styles.modeSwitchText,
                    {
                      color: mode === 'signin' ? theme.text : theme.textMuted,
                      fontFamily: fonts.mono,
                    },
                  ]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeSwitchBtn,
                  mode === 'signup' && { backgroundColor: theme.surfaceStrong, borderColor: theme.borderStrong },
                ]}
                onPress={() => setMode('signup')}>
                <Text
                  style={[
                    styles.modeSwitchText,
                    {
                      color: mode === 'signup' ? theme.text : theme.textMuted,
                      fontFamily: fonts.mono,
                    },
                  ]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: fonts.display }]}>{title}</Text>

            {mode === 'signup' ? (
              <>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                      fontFamily: fonts.body,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor={theme.textSoft}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                      fontFamily: fonts.body,
                    },
                  ]}
                  value={apartment}
                  onChangeText={setApartment}
                  placeholder="Apartment"
                  placeholderTextColor={theme.textSoft}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                      fontFamily: fonts.body,
                    },
                  ]}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="Unit / floor"
                  placeholderTextColor={theme.textSoft}
                />
              </>
            ) : null}

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: fonts.body,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.textSoft}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.text,
                  fontFamily: fonts.body,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.textSoft}
              secureTextEntry
            />

            {mode === 'signup' ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                    fontFamily: fonts.body,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={theme.textSoft}
                secureTextEntry
              />
            ) : null}

            {!backendConfigured ? (
              <Text style={[styles.backendErrorText, { color: theme.danger }]}>{backendError ?? 'Supabase configuration missing.'}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.accentDeep },
                isSubmitting && { backgroundColor: theme.borderStrong },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              <Text style={[styles.primaryBtnText, { color: theme.text, fontFamily: fonts.mono }]}>
                {isSubmitting ? 'Please wait...' : actionText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setMode((previous) => (previous === 'signin' ? 'signup' : 'signin'))}>
              <Text style={[styles.switchBtnText, { color: theme.textMuted, fontFamily: fonts.body }]}>
                {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
  },
  centerAll: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    marginBottom: 22,
  },
  authCaption: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 18,
  },
  modeSwitchWrap: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 4,
  },
  modeSwitchBtn: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  modeSwitchText: {
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 26,
    marginBottom: 14,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 13,
  },
  primaryBtnText: {
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  backendErrorText: {
    fontSize: 12,
    marginBottom: 10,
  },
  switchBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  switchBtnText: {
    fontSize: 12,
  },
  title: {
    fontSize: 24,
  },
});
