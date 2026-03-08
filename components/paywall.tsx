import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, Linking, ActivityIndicator, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';

const MONTHLY_VARIANT_ID = 'f751782b-53da-4581-9952-4469b1aa0bdb';
const YEARLY_VARIANT_ID  = 'f9ba65e1-250c-4b74-8326-ff2a44fe4f52';

export const FREE_MONTHLY_LIMIT = 10;

const PLANS = [
  { key: 'monthly', label: 'Aylık',  price: '₺200',   period: '/ ay',  desc: 'İstediğin zaman iptal et', badge: null },
  { key: 'yearly',  label: 'Yıllık', price: '₺2.000', period: '/ yıl', desc: 'Aylık ₺167 — %17 indirim', badge: '%17 İndirim' },
];

const FEATURES = [
  { icon: '🚫', label: 'Reklamsız kullanım',                         free: false },
  { icon: '💾', label: 'Sınırsız hesaplama kaydı',                   free: false },
  { icon: '📋', label: 'Hesaplama geçmişi',                          free: false },
  { icon: '🔔', label: 'Vergi & harç güncelleme bildirimleri',        free: false },
  { icon: '🧾', label: 'Tüm hesaplama türleri',                      free: true  },
  { icon: '📈', label: 'Faiz hesaplayıcı',                           free: true  },
  { icon: '🛂', label: 'Pasaport & MTV harcı',                       free: true  },
  { icon: '📦', label: `Aylık ${FREE_MONTHLY_LIMIT} hesaplama kaydı`, free: true  },
];

// ─── Aylık limit kontrolü ──────────────────────────────────────
export async function checkMonthlyLimit(): Promise<{ allowed: boolean; count: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { allowed: false, count: 0 };

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { count } = await supabase
    .from('calculations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .gte('created_at', startOfMonth);

  const currentCount = count || 0;
  return { allowed: currentCount < FREE_MONTHLY_LIMIT, count: currentCount };
}

// ─── PaywallModal ──────────────────────────────────────────────
export function PaywallModal({ visible, onClose, reason }: {
  visible: boolean;
  onClose: () => void;
  reason?: 'limit' | 'premium';
}) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert('Hata', 'Giriş yapmanız gerekiyor.'); setLoading(false); return; }
      const variantId = selectedPlan === 'yearly' ? YEARLY_VARIANT_ID : MONTHLY_VARIANT_ID;
      const url = `https://lexcalc.lemonsqueezy.com/checkout/buy/${variantId}?checkout[custom][user_id]=${user.id}&checkout[email]=${user.email}`;
      await Linking.openURL(url);
      onClose();
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Ödeme başlatılamadı.');
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

          <View style={styles.header}>
            <Text style={styles.headerIcon}>⭐</Text>
            <Text style={styles.headerTitle}>LexCalc Premium</Text>
            <Text style={styles.headerDesc}>
              {reason === 'limit'
                ? `Bu ay ${FREE_MONTHLY_LIMIT} ücretsiz kayıt hakkınızı kullandınız. Sınırsız kullanım için Premium'a geçin.`
                : 'Reklamları kaldırın, sınırsız hesaplama yapın.'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.featureList}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={[styles.featureLabel, !f.free && { color: theme.accent }]}>{f.label}</Text>
                  <View style={[styles.badge, f.free ? styles.badgeFree : styles.badgePremium]}>
                    <Text style={[styles.badgeText, f.free ? styles.badgeTextFree : styles.badgeTextPremium]}>
                      {f.free ? 'Ücretsiz' : 'Premium'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

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
                  <Text style={[styles.planLabel, selectedPlan === plan.key && { color: theme.accent }]}>{plan.label}</Text>
                  <Text style={[styles.planPrice, selectedPlan === plan.key && { color: theme.accent }]}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                  <Text style={styles.planDesc}>{plan.desc}</Text>
                  {selectedPlan === plan.key && <Text style={{ color: theme.accent, marginTop: 6 }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleSubscribe} style={styles.ctaBtn} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#0D0F14" />
                : <Text style={styles.ctaBtnText}>
                    {selectedPlan === 'yearly' ? 'Yıllık Başla — ₺2.000' : 'Aylık Başla — ₺200'}
                  </Text>
              }
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Ödeme tamamlandıktan sonra hesabınız anında aktive edilir. İstediğiniz zaman iptal edebilirsiniz.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── TrialBanner ───────────────────────────────────────────────
export function TrialBanner({ daysLeft, onUpgrade }: { daysLeft: number; onUpgrade: () => void }) {
  if (daysLeft <= 0) return null;
  const urgent = daysLeft <= 2;
  return (
    <TouchableOpacity onPress={onUpgrade} style={[bannerStyles.banner, urgent && bannerStyles.bannerUrgent]} activeOpacity={0.8}>
      <Text style={bannerStyles.icon}>{urgent ? '⚠️' : '⏳'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[bannerStyles.text, urgent && bannerStyles.textUrgent]}>
          {urgent ? `Deneme süreniz bitiyor! Son ${daysLeft} gün.` : `Deneme süresi: ${daysLeft} gün kaldı`}
        </Text>
        <Text style={bannerStyles.sub}>Premium'a geç →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── FreeLimitBanner ── 5 veya altında kaldığında göster ──────
export function FreeLimitBanner({ count, onUpgrade }: { count: number; onUpgrade: () => void }) {
  const remaining = FREE_MONTHLY_LIMIT - count;
  if (remaining > 5 || remaining <= 0) return null;
  return (
    <TouchableOpacity onPress={onUpgrade} style={bannerStyles.limitBanner} activeOpacity={0.8}>
      <Text style={bannerStyles.icon}>📦</Text>
      <View style={{ flex: 1 }}>
        <Text style={bannerStyles.limitText}>Bu ay {remaining} ücretsiz kayıt hakkınız kaldı</Text>
        <Text style={bannerStyles.sub}>Sınırsız için Premium'a geç →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: 40 },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 30, height: 30, backgroundColor: theme.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: theme.textMuted, fontSize: 14 },
  header: { alignItems: 'center', padding: 28, paddingBottom: 16 },
  headerIcon: { fontSize: 40, marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 8 },
  headerDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  featureList: { paddingHorizontal: 20, gap: 4, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  featureIcon: { fontSize: 16, width: 24 },
  featureLabel: { flex: 1, fontSize: 13, color: theme.text },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeFree: { backgroundColor: '#22c55e14', borderWidth: 1, borderColor: '#22c55e44' },
  badgePremium: { backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextFree: { color: '#22c55e' },
  badgeTextPremium: { color: theme.accent },
  sectionLabel: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', paddingHorizontal: 20, marginBottom: 10 },
  planRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  planCard: { flex: 1, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16, alignItems: 'center', position: 'relative', overflow: 'hidden' },
  planCardActive: { borderColor: theme.accent, backgroundColor: theme.accentDim },
  planBadge: { position: 'absolute', top: 8, right: -12, backgroundColor: theme.accent, paddingHorizontal: 14, paddingVertical: 3, transform: [{ rotate: '30deg' }] },
  planBadgeText: { fontSize: 9, fontWeight: '800', color: '#0D0F14' },
  planLabel: { fontSize: 12, color: theme.textMuted, fontWeight: '600', marginBottom: 6 },
  planPrice: { fontSize: 26, fontWeight: '800', color: theme.text },
  planPeriod: { fontSize: 11, color: theme.textMuted, marginBottom: 4 },
  planDesc: { fontSize: 10, color: theme.textDim, textAlign: 'center' },
  ctaBtn: { marginHorizontal: 20, backgroundColor: theme.accent, borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 12 },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#0D0F14' },
  disclaimer: { fontSize: 10, color: theme.textDim, textAlign: 'center', paddingHorizontal: 24, lineHeight: 16, marginBottom: 8 },
});

const bannerStyles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  bannerUrgent: { backgroundColor: '#E0525214', borderColor: '#E0525244' },
  limitBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#d9770614', borderWidth: 1, borderColor: '#d9770644', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12 },
  icon: { fontSize: 20 },
  text: { fontSize: 13, fontWeight: '600', color: theme.accent },
  textUrgent: { color: theme.danger },
  limitText: { fontSize: 13, fontWeight: '600', color: '#d97706' },
  sub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
});
