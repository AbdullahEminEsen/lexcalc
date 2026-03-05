import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui';
import { theme } from '../../lib/theme';
import { formatTL } from '../../lib/calculations';
import { useSubscription } from '../../context/SubscriptionContext';
import { PaywallModal } from '../../components/paywall';
import { AdBanner } from '../../components/AdBanner';

// ─── Kategoriler ───────────────────────────────────────────────
const CATEGORIES = [
  {
    title: '🏠 Gayrimenkul',
    color: '#C9A96E',
    items: [
      { icon: '🏠', label: 'Tapu Harcı', sub: 'Alım-satım harcı', route: '/calc/tapu' },
      { icon: '📄', label: 'Damga Vergisi', sub: 'Sözleşme vergisi', route: '/calc/damga' },
      { icon: '🏢', label: 'Kira Stopajı', sub: 'Kira vergisi kesintisi', route: '/calc/kira_stopaj' },
    ],
  },
  {
    title: '🚗 Araç & Trafik',
    color: '#6366f1',
    items: [
      { icon: '🚗', label: 'MTV', sub: 'Motorlu Taşıtlar Vergisi', route: '/calc/mtv' },
      { icon: '🔧', label: 'Araç Muayene', sub: '2026 muayene ücreti', route: '/calc/muayene' },
      { icon: '🚨', label: 'Trafik Cezası', sub: 'Erken ödeme indirimi', route: '/calc/trafik_ceza' },
    ],
  },
  {
    title: '⚖️ Hukuki & Resmi',
    color: '#0891b2',
    items: [
      { icon: '📝', label: 'Noter Harcı', sub: 'İşlem bedeli harcı', route: '/calc/noter' },
      { icon: '🪪', label: 'Pasaport / Kimlik', sub: 'Belge harçları', route: '/calc/pasaport' },
      { icon: '🏛️', label: 'Yargı Harcı', sub: 'İcra & dava harcı', route: '/harc' },
    ],
  },
  {
    title: '💰 Vergi',
    color: '#22c55e',
    items: [
      { icon: '🧾', label: 'KDV %20', sub: 'Genel oran', route: '/calc/kdv' },
      { icon: '🧾', label: 'KDV %10', sub: 'İndirimli oran', route: '/calc/kdv10' },
      { icon: '🧾', label: 'KDV %1', sub: 'İndirimli oran', route: '/calc/kdv1' },
      { icon: '💼', label: 'Serbest Meslek', sub: 'Stopaj + KDV hesabı', route: '/calc/serbest_meslek' },
      { icon: '🏦', label: 'Veraset Vergisi', sub: 'Miras & intikal vergisi', route: '/calc/veraset' },
      { icon: '📊', label: 'Faiz Hesabı', sub: 'Yasal, ticari, gecikme', route: '/faiz' },
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
    if (!isPremium && !isTrialActive) return;
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setCalcs(data);
  };

  useFocusEffect(useCallback(() => { fetchCalcs(); }, [isPremium, isTrialActive]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCalcs();
    setRefreshing(false);
  };

  const firstName = profile?.full_name?.split(' ')[0] || null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{firstName ? `Merhaba, ${firstName} 👋` : 'Merhaba 👋'}</Text>
            <Text style={styles.subtitle}>Hangi hesabı yapmak istersiniz?</Text>
          </View>
          <TouchableOpacity
            onPress={() => !isPremium && setShowPaywall(true)}
            style={[styles.premiumBadge, isPremium && styles.premiumBadgeActive]}
          >
            <Text style={styles.premiumBadgeText}>{isPremium ? '👑 Premium' : '⭐ Ücretsiz'}</Text>
          </TouchableOpacity>
        </View>

        {/* Trial / Premium banner */}
        {isTrialActive && (
          <TouchableOpacity onPress={() => setShowPaywall(true)} style={styles.trialBanner}>
            <Text style={styles.trialBannerText}>⏳ Deneme süreniz: {daysLeft} gün kaldı — Premium'a geç →</Text>
          </TouchableOpacity>
        )}
        {!isPremium && !isTrialActive && (
          <TouchableOpacity onPress={() => setShowPaywall(true)} style={styles.expiredBanner}>
            <Text style={styles.expiredBannerText}>🔒 Reklamsız kullanım için Premium'a geç →</Text>
          </TouchableOpacity>
        )}

        {/* Kategoriler */}
        {CATEGORIES.map((cat, ci) => (
          <View key={ci} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: cat.color }]}>{cat.title}</Text>
            <View style={styles.grid}>
              {cat.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                  style={[styles.actionCard, { borderColor: cat.color + '33' }]}
                >
                  <Text style={styles.actionIcon}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionLabel}>{item.label}</Text>
                    <Text style={styles.actionSub}>{item.sub}</Text>
                  </View>
                  <Text style={[styles.actionArrow, { color: cat.color }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Son İşlemler — sadece premium */}
        {(isPremium || isTrialActive) ? (
          <View style={styles.categorySection}>
            <Text style={styles.sectionLabel}>Son İşlemler</Text>
            {calcs.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>Henüz hesaplama kaydınız yok.</Text>
              </Card>
            ) : (
              calcs.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => router.push(`/calc/${c.type}?id=${c.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.recentCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentTitle} numberOfLines={1}>{c.title}</Text>
                      <Text style={styles.recentDate}>{new Date(c.created_at).toLocaleDateString('tr-TR')}</Text>
                    </View>
                    <Text style={styles.recentResult}>{formatTL(c.result)}</Text>
                  </Card>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowPaywall(true)} style={styles.historyLock}>
            <Text style={styles.historyLockIcon}>🔒</Text>
            <Text style={styles.historyLockText}>Hesaplama geçmişi Premium özelliğidir</Text>
            <Text style={styles.historyLockSub}>Abone ol →</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
      <AdBanner />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 60 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  premiumBadge: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  premiumBadgeActive: { borderColor: theme.accentMuted, backgroundColor: theme.accentDim },
  premiumBadgeText: { fontSize: 12, fontWeight: '600', color: theme.accent },

  trialBanner: {
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center',
  },
  trialBannerText: { fontSize: 13, fontWeight: '600', color: theme.accent },
  expiredBanner: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center',
  },
  expiredBannerText: { fontSize: 13, color: theme.textMuted },

  categorySection: { marginBottom: 24 },
  categoryTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },
  grid: { gap: 8 },
  actionCard: {
    backgroundColor: theme.surface, borderWidth: 1,
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  actionIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '600', color: theme.text },
  actionSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  actionArrow: { fontSize: 20, fontWeight: '700' },

  sectionLabel: { fontSize: 11, color: theme.textMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '500', marginBottom: 10 },
  recentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  recentTitle: { fontSize: 13, fontWeight: '500', color: theme.text },
  recentDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  recentResult: { fontSize: 14, color: theme.accent, fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 24 },
  emptyText: { color: theme.textMuted, fontSize: 13 },

  historyLock: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 6, marginBottom: 24,
  },
  historyLockIcon: { fontSize: 28 },
  historyLockText: { fontSize: 14, fontWeight: '600', color: theme.text },
  historyLockSub: { fontSize: 12, color: theme.accent },
});
