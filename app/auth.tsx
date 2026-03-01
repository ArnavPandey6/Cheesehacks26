import React, { useMemo, useState } from 'react';
import {
  Alert,
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
        <Text style={[styles.title, isDark && styles.textLight]}>Loading Loop...</Text>
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
          <Text style={[styles.brand, isDark && styles.textLight]}>
            l<Text style={styles.brandEm}>oo</Text>p
          </Text>
          <Text style={styles.subtitle}>Building circular economy</Text>

          <View style={[styles.card, isDark && styles.cardDark]}>
            <Text style={[styles.cardTitle, isDark && styles.textLight]}>{title}</Text>

            {mode === 'signup' ? (
              <>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor="#9C9692"
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={apartment}
                  onChangeText={setApartment}
                  placeholder="Apartment"
                  placeholderTextColor="#9C9692"
                />
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="Unit / floor"
                  placeholderTextColor="#9C9692"
                />
              </>
            ) : null}

            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#9C9692"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, isDark && styles.inputDark]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9C9692"
              secureTextEntry
            />

            {mode === 'signup' ? (
              <TextInput
                style={[styles.input, isDark && styles.inputDark]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor="#9C9692"
                secureTextEntry
              />
            ) : null}

            {!backendConfigured ? (
              <Text style={styles.backendErrorText}>{backendError ?? 'Supabase configuration missing.'}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, isSubmitting && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}>
              <Text style={styles.primaryBtnText}>{isSubmitting ? 'Please wait...' : actionText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setMode((previous) => (previous === 'signin' ? 'signup' : 'signin'))}>
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
    backgroundColor: '#FFF5F0',
    flex: 1,
  },
  bgDark: {
    backgroundColor: '#171513',
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
    color: '#F9F3EF',
  },
  brand: {
    color: '#343330',
    fontFamily: Platform.select({ ios: 'ui-serif', default: 'serif' }),
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
    lineHeight: 68,
    marginBottom: 6,
  },
  brandEm: {
    color: '#C5050C',
    fontStyle: 'italic',
  },
  subtitle: {
    color: '#9C9692',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 11,
    letterSpacing: 1.6,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EDE8E3',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardDark: {
    backgroundColor: '#1F1B18',
    borderColor: '#2B2724',
  },
  cardTitle: {
    color: '#343330',
    fontFamily: Platform.select({ ios: 'ui-serif', default: 'serif' }),
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFF5F0',
    borderColor: '#EDE8E3',
    borderRadius: 10,
    borderWidth: 1,
    color: '#343330',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  inputDark: {
    backgroundColor: '#171513',
    borderColor: '#2B2724',
    color: '#F9F3EF',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: '#C5050C',
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 13,
  },
  primaryBtnDisabled: {
    backgroundColor: '#CFA4A6',
  },
  primaryBtnText: {
    color: '#fff',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  backendErrorText: {
    color: '#C5050C',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  switchBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  switchBtnText: {
    color: '#C5050C',
    fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#343330',
  },
});
