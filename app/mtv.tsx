import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card, GoldButton } from '../components/ui';
import { theme } from '../lib/theme';
import { formatTL } from '../lib/calculations';
import { PaywallModal, checkMonthlyLimit } from '../components/paywall';
import { useSubscription } from '../context/SubscriptionContext';

// 2026 MTV Tarifeleri (Resmi Gazete — 01.01.2026)
// I. TARİFE: Otomobil, kaptıkaçtı, arazi taşıtı, benzerler
const MTV_TARIFE: Record<string, { label: string; bands: { max: number; yil: number[]; vergi: number[] }[] }> = {
  benzin_dizel: {
    label: 'Otomobil / SUV (Benzin & Dizel)',
    bands: [
      {
        max: 1300,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [3640, 6066, 4245, 3029, 1817, 1211, 909, 727, 545],
      },
      {
        max: 1600,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [6066, 9697, 7271, 4845, 3029, 1817, 1211, 1211, 727],
      },
      {
        max: 1800,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [12131, 18196, 14557, 10918, 7271, 3640, 2424, 2424, 1211],
      },
      {
        max: 2000,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [19401, 29107, 24255, 18196, 12131, 6066, 3640, 3640, 1817],
      },
      {
        max: 2500,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [30319, 45479, 37899, 30319, 22739, 9697, 6066, 6066, 3029],
      },
      {
        max: 9999,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [45479, 68218, 56849, 45479, 34109, 15160, 9091, 9091, 4545],
      },
    ],
  },
  elektrik: {
    label: 'Elektrikli Otomobil',
    bands: [
      {
        max: 85,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [3640, 6066, 4245, 3029, 1817, 1211, 909, 727, 545],
      },
      {
        max: 120,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [6066, 9697, 7271, 4845, 3029, 1817, 1211, 1211, 727],
      },
      {
        max: 150,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [12131, 18196, 14557, 10918, 7271, 3640, 2424, 2424, 1211],
      },
      {
        max: 9999,
        yil: [1, 3, 4, 7, 8, 11, 12, 15, 16],
        vergi: [19401, 29107, 24255, 18196, 12131, 6066, 3640, 3640, 1817],
      },
    ],
  },
};

// Yaş kategorisi indeksini bul
function yasIndex(yas: number): number {
  if (yas <= 2) return 0;  // 1-2 yaş
  if (yas <= 3) return 1;  // 3 yaş
  if (yas <= 6) return 2;  // 4-6 yaş
  if (yas <= 7) return 3;  // 7 yaş
  if (yas <= 11) return 4; // 8-11 yaş
  if (yas <= 12) return 5; // 12 yaş (tam ortası)
  if (yas <= 15) return 6; // 12-15 yaş
  if (yas <= 16) return 7; // 16 yaş
  return 8;                // 16+ yaş
}

function hesaplaMtv(tip: string, hacimKw: number, yas: number): { vergi: number; band: string } | null {
  const tarife = MTV_TARIFE[tip];
  if (!tarife) return null;

  const band = tarife.bands.find(b => hacimKw <= b.max);
  if (!band) return null;

  const idx = yasIndex(yas);
  const vergi = band.vergi[idx] || band.vergi[band.vergi.length - 1];

  const bandLabel = tip === 'elektrik'
    ? `${band.max === 9999 ? '150+ kW' : `${band.max} kW'a kadar`}`
    : `${band.max === 9999 ? '2500+ cc' : `${band.max} cc'ye kadar`}`;

  return { vergi, band: bandLabel };
}

export default function MTVScreen() {
  const router = useRouter();
  const [tip, setTip] = useState<'benzin_dizel' | 'elektrik'>('benzin_dizel');
  const [hacim, setHacim] = useState('');
  const [yas, setYas] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium, isTrialActive } = useSubscription();

  const hacimSayi = parseInt(hacim) || 0;
  const yasSayi = parseInt(yas) || 0;
  const sonuc = hacimSayi > 0 && yasSayi > 0 ? hesaplaMtv(tip, hacimSayi, yasSayi) : null;

  const handleSave = async () => {
    if (!sonuc) return;
    if (!isPremium && !isTrialActive) {
      const { allowed } = await checkMonthlyLimit();
      if (!allowed) { setShowPaywall(true); return; }
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('calculations').insert({
      user_id: session?.user?.id,
      title: `MTV — ${MTV_TARIFE[tip].label}, ${hacimSayi}${tip === 'elektrik' ? ' kW' : ' cc'}, ${yasSayi} yaş`,
      type: 'custom',
      amount: 0,
      result: sonuc.vergi,
      notes: `MTV 2026 | ${sonuc.band} | ${yasSayi} yaş`,
      overrides: {},
      extras: [],
    });
    setSaving(false);
    Alert.alert('Kaydedildi ✓', 'MTV hesaplaması kayıtlara eklendi.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Motorlu Taşıtlar Vergisi</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>📊</Text>
            <Text style={styles.infoText}>2026 MTV Tarifesi — I. Tarife (Otomobil, SUV, Arazi Taşıtı)</Text>
          </View>

          {/* Araç Tipi */}
          <Text style={styles.fieldLabel}>Araç Tipi</Text>
          <View style={styles.tipRow}>
            {([
              { key: 'benzin_dizel', label: '⛽ Benzin / Dizel', sub: 'Motor hacmi (cc)' },
              { key: 'elektrik', label: '⚡ Elektrikli', sub: 'Motor gücü (kW)' },
            ] as const).map(t => (
              <TouchableOpacity
                key={t.key}
                onPress={() => { setTip(t.key); setHacim(''); }}
                style={[styles.tipCard, tip === t.key && styles.tipCardActive]}
              >
                <Text style={[styles.tipLabel, tip === t.key && { color: theme.accent }]}>{t.label}</Text>
                <Text style={styles.tipSub}>{t.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hacim / Güç */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>
              {tip === 'elektrik' ? 'Motor Gücü (kW)' : 'Motor Hacmi (cc)'}
            </Text>
            <View style={styles.quickRow}>
              {(tip === 'elektrik'
                ? [75, 100, 130, 160]
                : [1200, 1400, 1600, 1800, 2000, 2500]
              ).map(v => (
                <TouchableOpacity key={v} onPress={() => setHacim(v.toString())}
                  style={[styles.quickBtn, hacimSayi === v && styles.quickBtnActive]}>
                  <Text style={[styles.quickBtnText, hacimSayi === v && { color: theme.accent }]}>
                    {v}{tip === 'elektrik' ? ' kW' : ' cc'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Araç Yaşı */}
          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Araç Yaşı</Text>
            <View style={styles.quickRow}>
              {[1, 2, 3, 5, 7, 10, 12, 15, 18].map(v => (
                <TouchableOpacity key={v} onPress={() => setYas(v.toString())}
                  style={[styles.quickBtn, yasSayi === v && styles.quickBtnActive]}>
                  <Text style={[styles.quickBtnText, yasSayi === v && { color: theme.accent }]}>
                    {v} yaş
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sonuç */}
          {sonuc && (
            <Card style={styles.resultCard}>
              <Text style={styles.resultTitle}>2026 MTV Hesabı</Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Araç Tipi</Text>
                <Text style={styles.resultValue}>{MTV_TARIFE[tip].label}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>
                  {tip === 'elektrik' ? 'Motor Gücü' : 'Motor Hacmi'}
                </Text>
                <Text style={styles.resultValue}>
                  {hacimSayi} {tip === 'elektrik' ? 'kW' : 'cc'} ({sonuc.band})
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Araç Yaşı</Text>
                <Text style={styles.resultValue}>{yasSayi} yaş</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Yıllık MTV (2026)</Text>
                <Text style={styles.totalValue}>{formatTL(sonuc.vergi)}</Text>
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteText}>
                  💡 MTV yılda 2 taksitte ödenir: Ocak ve Temmuz aylarında.
                  Her taksit tutarı: {formatTL(sonuc.vergi / 2)}
                </Text>
              </View>
            </Card>
          )}

          {sonuc && (
            <GoldButton onPress={handleSave} loading={saving}>
              💾 Kayıtlara Ekle
            </GoldButton>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason="limit" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: theme.text },
  navTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 12, padding: 12 },
  infoIcon: { fontSize: 20 },
  infoText: { fontSize: 12, color: theme.accent, flex: 1 },
  fieldLabel: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', marginBottom: 8 },
  tipRow: { flexDirection: 'row', gap: 10 },
  tipCard: { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14 },
  tipCardActive: { borderColor: theme.accent, backgroundColor: theme.accentDim },
  tipLabel: { fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 4 },
  tipSub: { fontSize: 11, color: theme.textMuted },
  inputGroup: { gap: 8 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputWrapper: { flex: 1 },
  inputText: { fontSize: 16, color: theme.text },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  quickBtnActive: { borderColor: theme.accent, backgroundColor: theme.accentDim },
  quickBtnText: { fontSize: 12, color: theme.textMuted, fontWeight: '500' },
  resultCard: { gap: 0 },
  resultTitle: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', marginBottom: 14 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  resultLabel: { fontSize: 13, color: theme.textMuted },
  resultValue: { fontSize: 13, color: theme.text, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 8 },
  divider: { height: 1, backgroundColor: theme.border },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 12, padding: 14, marginTop: 14 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
  totalValue: { fontSize: 22, fontWeight: '800', color: theme.accent },
  noteBox: { backgroundColor: theme.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 10 },
  noteText: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
});
