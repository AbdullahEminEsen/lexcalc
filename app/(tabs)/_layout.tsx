import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { theme } from '../../lib/theme';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 20,
          height: 72,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '500', letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Ana Sayfa', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="history" options={{ title: 'Kayıtlar', tabBarIcon: ({ focused }) => <TabIcon emoji="📂" focused={focused} /> }} />
      <Tabs.Screen name="clients" options={{ title: 'Müvekkiller', tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analiz', tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="variables" options={{ title: 'Değişkenler', tabBarIcon: ({ focused }) => <TabIcon emoji="🔢" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tabs>
  );
}
