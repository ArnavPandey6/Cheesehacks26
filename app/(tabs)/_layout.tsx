import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Home, Library, Camera, User } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore } from '@/store/useStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { hasHydrated, currentUser } = useStore();

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!currentUser) {
    return <Redirect href="../auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2f95dc', // A vibrant blue for interactive elements
        tabBarInactiveTintColor: '#888',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#121212' : '#ffffff',
          borderTopWidth: 0,
          elevation: 10,
          shadowOpacity: 0.1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hallway',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color }) => <Library size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="triage"
        options={{
          title: 'Triage',
          tabBarIcon: ({ color }) => <Camera size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
