import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Home, Library, Camera, User } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useStore } from '@/store/useStore';

const ACTIVE_COLOR = '#343330';
const INACTIVE_COLOR = '#9C9692';
const ACTIVE_PIP = '#C5050C';

export default function TabLayout() {
  const { hasHydrated, currentUser } = useStore();

  if (!hasHydrated) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator color="#C5050C" />
      </View>
    );
  }

  if (!currentUser) {
    return <Redirect href="../auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'hallway',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPip, focused && styles.iconPipActive]}>
              <Home size={16} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'vault',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPip, focused && styles.iconPipActive]}>
              <Library size={16} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="triage"
        options={{
          title: 'triage',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPip, focused && styles.iconPipActive]}>
              <Camera size={16} color={focused ? '#FFFFFF' : color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPip, focused && styles.iconPipActive]}>
              <User size={16} color={focused ? '#FFFFFF' : color} />
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
    backgroundColor: '#FFF5F0',
    flex: 1,
    justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopColor: '#EDE8E3',
    borderTopWidth: 1,
    elevation: 0,
    height: 78,
    paddingBottom: 10,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  tabItem: {
    paddingVertical: 0,
  },
  tabLabel: {
    fontFamily: 'Courier New',
    fontSize: 10,
    letterSpacing: 0.6,
    marginTop: 3,
    textTransform: 'lowercase',
  },
  iconPip: {
    alignItems: 'center',
    borderRadius: 8,
    height: 30,
    justifyContent: 'center',
    width: 36,
  },
  iconPipActive: {
    backgroundColor: ACTIVE_PIP,
  },
});
