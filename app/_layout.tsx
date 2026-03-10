import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '../lib/theme';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, segments[0]]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="calc/[type]" />
      <Stack.Screen name="calc/custom" />
      <Stack.Screen name="faiz" />
      <Stack.Screen name="mtv" />
      <Stack.Screen name="pasaport" />
      <Stack.Screen name="paywall" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <RootLayoutNav />
      </SubscriptionProvider>
    </AuthProvider>
  );
}
