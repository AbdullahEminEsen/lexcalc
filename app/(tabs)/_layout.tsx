import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../lib/theme';
import { AdBanner } from '../../components/AdBanner';
import { useSubscription } from '../../context/SubscriptionContext';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

// Tab bar'ın arka planı olarak render edilir — banner + arka plan
function CustomTabBackground() {
  const { isPremium, isTrialActive } = useSubscription();
  const showAd = !isPremium && !isTrialActive;

  return (
    <View style={styles.bgContainer}>
      {showAd && (
        <View style={styles.adSlot}>
          <AdBanner />
        </View>
      )}
      <View style={styles.tabBg} />
    </View>
  );
}

export default function TabsLayout() {
  const { isPremium, isTrialActive } = useSubscription();
  const showAd = !isPremium && !isTrialActive;
  const insets = useSafeAreaInsets();

  // Tab bar yüksekliği: ikon+label + safe area + reklam alanı (50px sabit)
  const adHeight = showAd ? 50 : 0;
  const tabBarHeight = 62 + adHeight;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingBottom: 10,
          paddingTop: adHeight + 6,
          elevation: 0,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarBackground: () => <CustomTabBackground />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Geçmiş',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bgContainer: {
    flex: 1,
    backgroundColor: theme.surface,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  adSlot: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
  tabBg: {
    flex: 1,
    backgroundColor: theme.surface,
  },
});
