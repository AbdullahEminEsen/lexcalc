import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Linking, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { useSubscription } from '../context/SubscriptionContext';

const PLANS = [
  {
    key: 'monthly',
    label: 'Aylık',
    price: '₺149',
    period: '/ ay',
    desc: 'İstediğin zaman iptal et',
    badge: null,
  },
  {
    key: 'yearly',
    label: 'Yıllık',
    price: '₺990',
    period: '/ yıl',
    desc: "Aylık ₺82,50 — 2 ay bedava",
    badge: '%45 İndirim',
  },
];

const FEATURES = [
  { icon: '📄', label: 'PDF Rapor Oluştur & Paylaş', free: false },
  { icon: '📊', label: 'Excel Dışa Aktarma', free: false },
  { icon: '👥', label: 'Müvekkil Yönetimi', free: false },
  { icon: '💬', label: 'WhatsApp Paylaşımı', free: false },
  { icon: '📂', label: 'Sınırsız Hesaplama Kaydı', free: true },
  { icon: '⚖️', label: 'Faiz & Harç Hesaplayıcı', free: true },
  { icon: '🔢', label: 'Tüm Hesaplama Türleri', free: true },
  { icon: '☁️', label: 'Bulut Yedekleme', free: true },
];

// ─── Paywall Modal ─────────────────────────────────────────────
export function PaywallModal({ visible, onClose }: {
  visible: boolean;
  onClose: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Hata', 'Giriş yapmanız gerekiyor.'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      const { data, error } = await supabase.functions.invoke('create-iyzico-payment', {
        body: {
          plan: selectedPlan,
          userId: session.user.id,
          userEmail: session.user.email,
          userName: profile?.full_name || '',
        },
      });

      if (error || !data?.checkoutFormContent) {
        throw new Error(error?.message || 'Ödeme başlatılamadı.');
      }

      // iyzico ödeme sayfasını WebView veya browser ile aç
      // Şimdilik derin link ile lexcalc.net/odeme sayfasına yönlendiriyoruz
      const payUrl = `https://lexcalc.net/odeme?plan=${selectedPlan}&token=${data.token}`;
      await Linking.openURL(payUrl);
      onClose();
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Ödeme başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>⚖️</Text>
            <Text style={styles.headerTitle}>LexCalc Premium</Text>
            <Text style={styles.headerDesc}>
              Profesyonel hukuki hesaplama aracının tüm özelliklerine erişin.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Özellik Listesi */}
            <View style={styles.featureList}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={[styles.featureLabel, !f.free && { color: theme.accent }]}>
                    {f.label}
                  </Text>
                  <View style={[styles.featureBadge, f.free ? styles.featureBadgeFree : styles.featureBadgePremium]}>
                    <Text style={[styles.featureBadgeText, f.free ? styles.featureBadgeTextFree : styles.featureBadgeTextPremium]}>
                      {f.free ? 'Ücretsiz' : 'Premium'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Plan Seçimi */}
            <Text style={styles.sectionLabel}>Plan Seç</Text>
            <View style={styles.planRow}>
              {PLANS.map(plan => (
                <TouchableOpacity
                  key={plan.key}
                  onPress={() => setSelectedPlan(plan.key as 'monthly' | 'yearly')}
                  style={[styles.planCard, selectedPlan === plan.key && styles.planCardActive]}
                >
                  {plan.badge && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <Text style={[styles.planLabel, selectedPlan === plan.key && { color: theme.accent }]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.planPrice, selectedPlan === plan.key && { color: theme.accent }]}>
                    {plan.price}
                  </Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                  <Text style={styles.planDesc}>{plan.desc}</Text>
                  {selectedPlan === plan.key && (
                    <View style={styles.planCheck}><Text style={{ color: theme.accent }}>✓</Text></View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* CTA */}
            <TouchableOpacity
              onPress={handleSubscribe}
              style={styles.ctaBtn}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#0D0F14" />
                : <Text style={styles.ctaBtnText}>
                    {selectedPlan === 'yearly' ? 'Yıllık Başla — ₺990' : 'Aylık Başla — ₺149'}
                  </Text>
              }
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Ödeme tamamlandıktan sonra hesabınız anında aktive edilir.
              İstediğiniz zaman iptal edebilirsiniz. Mevcut dönem ücreti iade edilmez.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Premium Gate (özellik kilidi) ────────────────────────────
// Kullanım: <PremiumGate feature="PDF"> ... </PremiumGate>
export function PremiumGate({
  children,
  feature,
  isPremium,
}: {
  children: React.ReactNode;
  feature: string;
  isPremium: boolean;
}) {
  const [showPaywall, setShowPaywall] = useState(false);

  if (isPremium) return <>{children}</>;

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowPaywall(true)}
        style={gateStyles.lockOverlay}
        activeOpacity={0.8}
      >
        <View style={gateStyles.lockBadge}>
          <Text style={gateStyles.lockIcon}>🔒</Text>
          <Text style={gateStyles.lockText}>{feature} — Premium</Text>
          <Text style={gateStyles.lockSub}>Abone olmak için dokun</Text>
        </View>
      </TouchableOpacity>
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </>
  );
}

// ─── Trial Banner ──────────────────────────────────────────────
export function TrialBanner({ daysLeft, onUpgrade }: {
  daysLeft: number;
  onUpgrade: () => void;
}) {
  if (daysLeft <= 0) return null;

  const urgent = daysLeft <= 2;

  return (
    <TouchableOpacity
      onPress={onUpgrade}
      style={[bannerStyles.banner, urgent && bannerStyles.bannerUrgent]}
      activeOpacity={0.8}
    >
      <Text style={bannerStyles.icon}>{urgent ? '⚠️' : '⏳'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[bannerStyles.text, urgent && bannerStyles.textUrgent]}>
          {urgent
            ? `Deneme süreniz bitiyor! Son ${daysLeft} gün.`
            : `Deneme süresi: ${daysLeft} gün kaldı`}
        </Text>
        <Text style={bannerStyles.sub}>Premium'a geç →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', paddingBottom: 40,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    width: 30, height: 30, backgroundColor: theme.surfaceAlt,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: theme.textMuted, fontSize: 14 },
  header: { alignItems: 'center', padding: 28, paddingBottom: 16 },
  headerIcon: { fontSize: 40, marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 8 },
  headerDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  featureList: {
    paddingHorizontal: 20, gap: 4,
    borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginBottom: 20,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  featureIcon: { fontSize: 16, width: 24 },
  featureLabel: { flex: 1, fontSize: 13, color: theme.text },
  featureBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  featureBadgeFree: { backgroundColor: '#22c55e14', borderWidth: 1, borderColor: '#22c55e44' },
  featureBadgePremium: { backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted },
  featureBadgeText: { fontSize: 10, fontWeight: '700' },
  featureBadgeTextFree: { color: '#22c55e' },
  featureBadgeTextPremium: { color: theme.accent },
  sectionLabel: {
    fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, fontWeight: '500', paddingHorizontal: 20, marginBottom: 10,
  },
  planRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  planCard: {
    flex: 1, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, padding: 16, alignItems: 'center', position: 'relative', overflow: 'hidden',
  },
  planCardActive: { borderColor: theme.accent, backgroundColor: theme.accentDim },
  planBadge: {
    position: 'absolute', top: 8, right: -12,
    backgroundColor: theme.accent, paddingHorizontal: 14, paddingVertical: 3,
    transform: [{ rotate: '30deg' }],
  },
  planBadgeText: { fontSize: 9, fontWeight: '800', color: '#0D0F14' },
  planLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '600', marginBottom: 6 },
  planPrice: { fontSize: 26, fontWeight: '800', color: theme.text },
  planPeriod: { fontSize: 11, color: theme.textMuted, marginBottom: 4 },
  planDesc: { fontSize: 10, color: theme.textDim, textAlign: 'center' },
  planCheck: { marginTop: 8 },
  ctaBtn: {
    marginHorizontal: 20, backgroundColor: theme.accent,
    borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#0D0F14' },
  disclaimer: {
    fontSize: 10, color: theme.textDim, textAlign: 'center',
    paddingHorizontal: 24, lineHeight: 16, marginBottom: 8,
  },
});

const gateStyles = StyleSheet.create({
  lockOverlay: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, padding: 20, alignItems: 'center', gap: 6,
  },
  lockBadge: { alignItems: 'center', gap: 6 },
  lockIcon: { fontSize: 28 },
  lockText: { fontSize: 14, fontWeight: '600', color: theme.text },
  lockSub: { fontSize: 12, color: theme.accent },
});

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 20, marginBottom: 12,
  },
  bannerUrgent: { backgroundColor: '#E0525214', borderColor: '#E0525244' },
  icon: { fontSize: 20 },
  text: { fontSize: 13, fontWeight: '600', color: theme.accent },
  textUrgent: { color: theme.danger },
  sub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
});
