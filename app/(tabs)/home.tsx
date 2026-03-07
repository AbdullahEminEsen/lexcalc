import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, Badge } from '../../components/ui';
import { theme, TYPE_LABELS, TYPE_COLORS } from '../../lib/theme';
import { formatTL, shortTL } from '../../lib/calculations';
import { useSubscription } from '../../context/SubscriptionContext';
import { TrialBanner, PaywallModal } from '../../components/paywall';
import { AdBanner } from '../../components/AdBanner';

const CALC_CATEGORIES = [
  {
    label: 'Gayrimenkul',
    icon: '🏠',
    items: [
      { icon: '🏠', label: 'Tapu Harcı', route: '/calc/tapu' },
      { icon: '📄', label: 'Damga Vergisi', route: '/calc/damga' },
    ],
  },
  {
    label: 'Vergi',
    icon: '🧾',
    items: [
      { icon: '🧾', label: 'KDV %20', route: '/calc/kdv' },
      { icon: '🧾', label: 'KDV %10', route: '/calc/kdv10' },
      { icon: '📊', label: 'Motorlu Taşıtlar Vergisi', route: '/mtv' },
    ],
  },
  {
    label: 'Hukuki İşlemler',
    icon: '⚖️',
    items: [
      { icon: '📝', label: 'Noter Harcı', route: '/calc/noter' },
      { icon: '⚖️', label: 'Avukatlık Ücreti', route: '/calc/avukatlik' },
      { icon: '🛂', label: 'Pasaport Harcı', route: '/pasaport' },
    ],
  },
  {
    label: 'Faiz Hesabı',
    icon: '📈',
    items: [
      { icon: '⚖️', label: 'Yasal Faiz', route: '/faiz?faizKey=yasal' },
      { icon: '🏦', label: 'Ticari Faiz', route: '/faiz?faizKey=ticari' },
      { icon: '📋', label: 'Gecikme Zammı', route: '/faiz?faizKey=gecikme' },
      { icon: '💳', label: 'Avans Faizi', route: '/faiz?faizKey=avans' },
    ],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [calcs, setCalcs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium, isTrialActive, daysLeft } = useSubscription();

  const fetchCalcs = async () => {
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setCalcs(data);
  };

  useFocusEffect(useCallback(() => { fetchCalcs(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCalcs();
    setRefreshing(false);
  };

  const thisMonthCalcs = calcs.filter(c => {
    const d = new Date(c.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalResult = calcs.reduce((s, c) => s + (c.result || 0), 0);
  const firstName = profile?.full_name?.split(' ')[0] || 'Kullanıcı';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.name}>{firstName} 👋</Text>
          <Text style={styles.subtitle}>Ne hesaplamak istersiniz?</Text>
        </View>

        {isTrialActive && (
          <TrialBanner daysLeft={daysLeft} onUpgrade={() => setShowPaywall(true)} />
        )}
        {!isPremium && !isTrialActive && (
          <TouchableOpacity onPress={() => setShowPaywall(true)} style={styles.expiredBanner}>
            <Text style={styles.expiredBannerText}>🔒 Premium&apos;a geç — reklamsız kullan</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { value: thisMonthCalcs.length.toString(), sub: 'bu ay' },
            { value: calcs.length.toString(), sub: 'toplam' },
            { value: shortTL(totalResult), sub: 'sonuç' },
          ].map((s, i) => (
            <Card key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </Card>
          ))}
        </View>

        {/* Kategoriler */}
        {CALC_CATEGORIES.map((cat, ci) => (
          <View key={ci} style={styles.categoryBlock}>
            <Text style={styles.sectionLabel}>{cat.icon}  {cat.label.toUpperCase()}</Text>
            <View style={styles.grid}>
              {cat.items.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => router.push(a.route as any)}
                  activeOpacity={0.7}
                  style={styles.actionCard}
                >
                  <Text style={styles.actionIcon}>{a.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionLabel}>{a.label}</Text>
                    <Text style={styles.actionSub}>Hesapla →</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Son İşlemler */}
        <Text style={styles.sectionLabel}>📋  SON İŞLEMLER</Text>
        {calcs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Henüz hesaplama yok. Yukarıdan başlayın!</Text>
          </Card>
        ) : (
          calcs.slice(0, 5).map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => {
                if (!isPremium && !isTrialActive) { setShowPaywall(true); return; }
                router.push((`/calc/${c.type}?id=${c.id}`) as any);
              }}
              activeOpacity={0.7}
            >
              <Card style={styles.recentCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentTitle} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.recentDate}>{new Date(c.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.recentResult}>{formatTL(c.result)}</Text>
                  <Badge color={TYPE_COLORS[c.type] || theme.textMuted}>{TYPE_LABELS[c.type] || c.type}</Badge>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>

      <AdBanner />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 20 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 13, color: theme.textMuted },
  name: { fontSize: 24, fontWeight: '700', color: theme.text, marginTop: 2 },
  subtitle: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.accent },
  statSub: { fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  categoryBlock: { marginBottom: 22 },
  sectionLabel: { fontSize: 10, color: theme.textMuted, letterSpacing: 1, fontWeight: '600', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '48%', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 13, fontWeight: '500', color: theme.text },
  actionSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  recentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  recentTitle: { fontSize: 13, fontWeight: '500', color: theme.text, flex: 1 },
  recentDate: { fontSize: 11, color: theme.textMuted, marginTop: 3 },
  recentResult: { fontSize: 14, color: theme.accent, fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 32 },
  emptyText: { color: theme.textMuted, fontSize: 14 },
  expiredBanner: {
    backgroundColor: '#E0525214', borderWidth: 1, borderColor: '#E0525244',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 12, alignItems: 'center',
  },
  expiredBannerText: { fontSize: 13, fontWeight: '600', color: theme.danger },
});
