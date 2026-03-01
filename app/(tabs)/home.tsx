import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, Badge } from '../../components/ui';
import { theme, TYPE_LABELS, TYPE_COLORS, TYPE_ICONS } from '../../lib/theme';
import { formatTL, shortTL } from '../../lib/calculations';
import { useSubscription } from '../../context/SubscriptionContext';
import { TrialBanner, PaywallModal } from '../../components/paywall';

const QUICK_ACTIONS = [
  { icon: '🏠', label: 'Tapu Harcı', type: 'tapu', route: '/calc/tapu' },
  { icon: '📄', label: 'Damga Vergisi', type: 'damga', route: '/calc/damga' },
  { icon: '🧾', label: 'KDV %20', type: 'kdv', route: '/calc/kdv' },
  { icon: '📝', label: 'Noter Harcı', type: 'noter', route: '/calc/noter' },
  { icon: '⚖️', label: 'Avukatlık Ücreti', type: 'avukatlik', route: '/calc/avukatlik' },
  { icon: '🔢', label: 'Özel Formül', type: 'custom', route: '/calc/custom' },
];

const HARC_ACTIONS = [
  { icon: '⚡', label: 'İlamsız İcra', color: '#dc2626', harcKey: 'icra_ilamsiz' },
  { icon: '📜', label: 'İlamlı İcra', color: '#7c3aed', harcKey: 'icra_ilamli' },
  { icon: '⚖️', label: 'Nispi Harç', color: '#0891b2', harcKey: 'dava_nispi' },
  { icon: '🏛️', label: 'Karar Harcı', color: '#d97706', harcKey: 'karar_ilam' },
];

const FAIZ_ACTIONS = [
  { icon: '⚖️', label: 'Yasal Faiz', color: '#6366f1', faizKey: 'yasal' },
  { icon: '🏦', label: 'Ticari Faiz', color: '#0891b2', faizKey: 'ticari' },
  { icon: '📋', label: 'Gecikme Zammı', color: '#dc2626', faizKey: 'gecikme' },
  { icon: '💳', label: 'Avans Faizi', color: '#d97706', faizKey: 'avans' },
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hoş geldiniz,</Text>
          <Text style={styles.name}>{profile?.full_name || 'Avukat'}</Text>
          {profile?.firm_name ? <Text style={styles.firm}>{profile.firm_name}</Text> : null}
        </View>

        {/* Trial Banner */}
        {isTrialActive && (
          <TrialBanner daysLeft={daysLeft} onUpgrade={() => setShowPaywall(true)} />
        )}
        {!isPremium && !isTrialActive && (
          <TouchableOpacity
            onPress={() => setShowPaywall(true)}
            style={styles.expiredBanner}
          >
            <Text style={styles.expiredBannerText}>
              🔒 Deneme süreniz doldu — Premium'a geç
            </Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Bu Ay', value: thisMonthCalcs.length.toString(), sub: 'hesaplama' },
            { label: 'Toplam', value: calcs.length.toString(), sub: 'kayıt' },
            { label: 'Toplam', value: shortTL(totalResult), sub: 'vergi/harç' },
          ].map((s, i) => (
            <Card key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </Card>
          ))}
        </View>

        {/* Hızlı İşlemler */}
        <Text style={styles.sectionLabel}>Hızlı İşlem</Text>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.7}
              style={styles.actionCard}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <View>
                <Text style={styles.actionLabel}>{a.label}</Text>
                <Text style={styles.actionSub}>Hesapla →</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Faiz Hesaplayıcı */}
        <Text style={styles.sectionLabel}>Faiz Hesaplayıcı</Text>
        <View style={styles.faizGrid}>
          {FAIZ_ACTIONS.map((f, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push(`/faiz?faizKey=${f.faizKey}` as any)}
              activeOpacity={0.7}
              style={[styles.faizCard, { borderColor: f.color + '44', backgroundColor: f.color + '12' }]}
            >
              <Text style={styles.faizIcon}>{f.icon}</Text>
              <Text style={[styles.faizLabel, { color: f.color }]}>{f.label}</Text>
              <Text style={[styles.faizArrow, { color: f.color }]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* İcra & Yargı Harcı */}
        <Text style={styles.sectionLabel}>İcra & Yargı Harcı</Text>
        <View style={styles.faizGrid}>
          {HARC_ACTIONS.map((h, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => router.push(`/harc?harcKey=${h.harcKey}` as any)}
              activeOpacity={0.7}
              style={[styles.faizCard, { borderColor: h.color + '44', backgroundColor: h.color + '12' }]}
            >
              <Text style={styles.faizIcon}>{h.icon}</Text>
              <Text style={[styles.faizLabel, { color: h.color }]}>{h.label}</Text>
              <Text style={[styles.faizArrow, { color: h.color }]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Son İşlemler */}
        <Text style={styles.sectionLabel}>Son İşlemler</Text>
        {calcs.slice(0, 4).map(c => (
          <TouchableOpacity
            key={c.id}
            onPress={() => router.push(
              c.type === 'custom' ? `/calc/custom?id=${c.id}` : `/calc/${c.type}?id=${c.id}` as any
            )}
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
        ))}

        {calcs.length === 0 && (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Henüz hesaplama yok. Yukarıdan başlayın!</Text>
          </Card>
        )}

      </ScrollView>
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 12, color: theme.textMuted },
  name: { fontSize: 22, fontWeight: '700', color: theme.text, marginTop: 2 },
  firm: { fontSize: 12, color: theme.accent, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.accent },
  statSub: { fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  sectionLabel: { fontSize: 11, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '500', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionCard: {
    width: '48%', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { fontSize: 13, fontWeight: '500', color: theme.text },
  actionSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  faizGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  faizCard: {
    width: '48%', borderWidth: 1, borderRadius: 16,
    padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  faizIcon: { fontSize: 20 },
  faizLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  faizArrow: { fontSize: 16, fontWeight: '700' },
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
