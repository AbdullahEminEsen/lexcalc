import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Linking, ActivityIndicator, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, SUPABASE_FUNCTIONS_URL } from '../lib/supabase';
import { theme } from '../lib/theme';
import { fetchSubscription, getSubscriptionStatus, type Subscription } from '../lib/subscription';

const PLANS = [
  {
    key: 'monthly',
    label: 'Aylık',
    price: '200',
    period: 'ay',
    badge: null,
  },
  {
    key: 'yearly',
    label: 'Yıllık',
    price: '2.000',
    period: 'yıl',
    badge: '%17 İndirim',
    perMonth: '167',
  },
];

const FEATURES = [
  { icon: '📄', label: 'PDF Rapor Oluştur & Paylaş', premium: true },
  { icon: '📊', label: 'Excel Dışa Aktarma', premium: true },
  { icon: '👥', label: 'Müvekkil Yönetimi', premium: true },
  { icon: '💬', label: 'WhatsApp ile Paylaş', premium: true },
  { icon: '⚖️', label: 'Faiz Hesaplayıcı', premium: false },
  { icon: '🏛️', label: 'İcra & Yargı Harcı', premium: false },
  { icon: '🔢', label: 'Tüm Hesaplama Türleri', premium: false },
  { icon: '💾', label: 'Sınırsız Hesaplama Kaydı', premium: false },
];

export default function PaywallScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription().then(s => { setSub(s); setLoading(false); });
  }, []);

  const { daysLeft, isPremium: premiumStatus } = getSubscriptionStatus(sub);
  const alreadyPremium = premiumStatus && sub?.status === 'active';

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ plan: selectedPlan }),
        }
      );
      const data = await response.json();
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        alert('Ödeme sayfası açılamadı. Lütfen tekrar deneyin.');
      }
    } catch (e) {
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={theme.accent} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (alreadyPremium) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>Abonelik</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.activeContainer}>
          <Text style={styles.activeIcon}>✓</Text>
          <Text style={styles.activeTitle}>Premium Aktif</Text>
          <Text style={styles.activeDesc}>
            {sub?.plan === 'yearly' ? 'Yıllık' : 'Aylık'} aboneliğiniz aktif.
            {sub?.current_period_end
              ? `\nBitiş: ${new Date(sub.current_period_end).toLocaleDateString('tr-TR')}`
              : ''}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Premium'a Geç</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>⚖️</Text>
          <Text style={styles.heroTitle}>LexCalc Premium</Text>
          <Text style={styles.heroDesc}>
            Hukuki hesaplamalarınızı profesyonelce yönetin.{'\n'}PDF, Excel, müvekkil yönetimi ve daha fazlası.
          </Text>
          {sub?.status === 'trial' && daysLeft > 0 && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>⏳ Deneme süreniz: {daysLeft} gün kaldı</Text>
            </View>
          )}
          {sub?.status === 'trial' && daysLeft === 0 && (
            <View style={[styles.trialBadge, styles.trialExpired]}>
              <Text style={styles.trialBadgeText}>❌ Deneme süreniz doldu</Text>
            </View>
          )}
        </View>

        {/* Plan Seçimi */}
        <View style={styles.plansRow}>
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
              <View style={styles.planPriceRow}>
                <Text style={[styles.planPrice, selectedPlan === plan.key && { color: theme.accent }]}>
                  ₺{plan.price}
                </Text>
                <Text style={styles.planPeriod}>/{plan.period}</Text>
              </View>
              {plan.perMonth && (
                <Text style={styles.planPerMonth}>aylık ₺{plan.perMonth}</Text>
              )}
              {selectedPlan === plan.key && (
                <View style={styles.planCheck}>
                  <Text style={{ color: theme.accent, fontSize: 14 }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* CTA Butonu */}
        <TouchableOpacity onPress={handleSubscribe} style={styles.ctaBtn}>
          <Text style={styles.ctaBtnText}>
            {selectedPlan === 'yearly' ? 'Yıllık ₺990 ile Başla' : 'Aylık ₺149 ile Başla'}
          </Text>
          <Text style={styles.ctaBtnSub}>Güvenli ödeme • İstediğinde iptal et</Text>
        </TouchableOpacity>

        {/* Özellik Listesi */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Neler Dahil?</Text>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureLabel, !f.premium && { color: theme.textMuted }]}>
                {f.label}
              </Text>
              <View style={[styles.featureTag, f.premium ? styles.featureTagPremium : styles.featureTagFree]}>
                <Text style={[styles.featureTagText, f.premium ? { color: theme.accent } : { color: theme.textDim }]}>
                  {f.premium ? '★ Premium' : 'Ücretsiz'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Güvence */}
        <View style={styles.guaranteeRow}>
          {[
            { icon: '🔒', text: 'Güvenli Ödeme\nStripe ile' },
            { icon: '↩️', text: 'İstediğin zaman\nİptal Et' },
            { icon: '📱', text: 'Anında\nAktivasyonn' },
          ].map((g, i) => (
            <View key={i} style={styles.guaranteeItem}>
              <Text style={styles.guaranteeIcon}>{g.icon}</Text>
              <Text style={styles.guaranteeText}>{g.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.legalText}>
          Aboneliğinizi istediğiniz zaman iptal edebilirsiniz. Ödeme Stripe altyapısı üzerinden güvenle gerçekleştirilir.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, backgroundColor: theme.surface, borderRadius: 10,
    borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 22, color: theme.text },
  navTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 8 },
  heroIcon: { fontSize: 52, marginBottom: 12 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: theme.text, marginBottom: 8 },
  heroDesc: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
  trialBadge: {
    marginTop: 14, backgroundColor: theme.accentDim, borderWidth: 1,
    borderColor: theme.accentMuted, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
  },
  trialExpired: { backgroundColor: '#E0525214', borderColor: '#E0525244' },
  trialBadgeText: { fontSize: 13, color: theme.accent, fontWeight: '600' },

  // Plans
  plansRow: { flexDirection: 'row', gap: 12 },
  planCard: {
    flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, padding: 16, alignItems: 'center', gap: 4,
  },
  planCardActive: { borderColor: theme.accent, borderWidth: 2, backgroundColor: theme.accentDim },
  planBadge: {
    position: 'absolute', top: -10, backgroundColor: theme.accent,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
  },
  planBadgeText: { fontSize: 11, color: '#0D0F14', fontWeight: '700' },
  planLabel: { fontSize: 13, color: theme.textMuted, fontWeight: '600', marginTop: 8 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  planPrice: { fontSize: 28, fontWeight: '800', color: theme.text },
  planPeriod: { fontSize: 13, color: theme.textMuted },
  planPerMonth: { fontSize: 11, color: theme.textDim },
  planCheck: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },

  // CTA
  ctaBtn: {
    backgroundColor: theme.accent, borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', gap: 4,
  },
  ctaBtnText: { fontSize: 17, fontWeight: '800', color: '#0D0F14' },
  ctaBtnSub: { fontSize: 12, color: '#0D0F14aa' },

  // Features
  featuresCard: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, padding: 20, gap: 0,
  },
  featuresTitle: {
    fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, fontWeight: '500', marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  featureIcon: { fontSize: 18, width: 28, textAlign: 'center' },
  featureLabel: { flex: 1, fontSize: 13, color: theme.text, fontWeight: '500' },
  featureTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  featureTagPremium: { backgroundColor: theme.accentDim, borderColor: theme.accentMuted },
  featureTagFree: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
  featureTagText: { fontSize: 10, fontWeight: '600' },

  // Guarantee
  guaranteeRow: { flexDirection: 'row', justifyContent: 'space-around' },
  guaranteeItem: { alignItems: 'center', gap: 6 },
  guaranteeIcon: { fontSize: 24 },
  guaranteeText: { fontSize: 11, color: theme.textMuted, textAlign: 'center', lineHeight: 16 },

  legalText: { fontSize: 11, color: theme.textDim, textAlign: 'center', lineHeight: 17 },

  // Active state
  activeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  activeIcon: { fontSize: 64 },
  activeTitle: { fontSize: 24, fontWeight: '700', color: theme.accent },
  activeDesc: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
  doneBtn: {
    backgroundColor: theme.accent, borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, marginTop: 8,
  },
  doneBtnText: { fontSize: 15, fontWeight: '700', color: '#0D0F14' },
});
