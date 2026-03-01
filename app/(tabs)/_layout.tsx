import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Home, Library, Camera, User } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { fonts, getTheme } from '@/components/ui/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore } from '@/store/useStore';

export default function TabLayout() {
  const { hasHydrated, currentUser } = useStore();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  if (!hasHydrated) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accentDeep} />
      </View>
    );
  }

  if (!currentUser) {
    return <Redirect href="../auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSoft,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarButton: HapticTab,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.tabGlass,
            borderColor: theme.border,
            shadowColor: theme.shadow,
          },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: [styles.tabLabel, { fontFamily: fonts.mono }],
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'hallway',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPip,
                focused && { backgroundColor: theme.accentSoft },
              ]}>
              <Home size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'vault',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPip,
                focused && { backgroundColor: theme.accentSoft },
              ]}>
              <Library size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'post',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPip,
                focused && { backgroundColor: theme.accentSoft },
              ]}>
              <Camera size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.iconPip,
                focused && { backgroundColor: theme.accentSoft },
              ]}>
              <User size={18} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  tabBar: {
    borderTopWidth: 1,
    elevation: 0,
    height: 70,
    paddingBottom: 8,
    paddingHorizontal: 0,
    paddingTop: 6,
    position: 'relative',
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.4,
    marginTop: 1,
    textTransform: 'lowercase',
  },
  iconPip: {
    alignItems: 'center',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    width: 34,
  },
});
