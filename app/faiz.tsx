import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card, GoldButton } from '../components/ui';
import { theme } from '../lib/theme';
import { formatTL } from '../lib/calculations';
import { PaywallModal, checkMonthlyLimit } from '../components/paywall';
import { useSubscription } from '../context/SubscriptionContext';

const FAIZ_TURLERI = [
  {
    key: 'yasal',
    label: 'Yasal Faiz',
    icon: '⚖️',
    color: '#6366f1',
    oran: 0.09,     // %9 yıllık — 2026 güncel
    desc: 'Medeni borçlarda uygulanan devlet faizi',
    kanun: '3095 sayılı Kanun — 2026 oranı %9',
  },
  {
    key: 'ticari',
    label: 'Ticari Faiz',
    icon: '🏦',
    color: '#0891b2',
    oran: 0.12,     // %12 yıllık — 2026 güncel
    desc: 'Ticari işlemlerde uygulanan faiz',
    kanun: '3095 sayılı Kanun — 2026 ticari oran %12',
  },
  {
    key: 'gecikme',
    label: 'Gecikme Zammı',
    icon: '📋',
    color: '#dc2626',
    oran: 0.024,    // aylık %2,4 — vergi gecikme zammı
    desc: 'Vergi borçlarına uygulanan gecikme zammı',
    kanun: '6183 sayılı AATUHK — aylık %2,4',
    aylik: true,
  },
  {
    key: 'avans',
    label: 'Avans Faizi',
    icon: '💳',
    color: '#d97706',
    oran: 0.09,     // Merkez Bankası avans faizi baz alınır
    desc: 'Merkez Bankası avans faizi baz alınarak hesaplanır',
    kanun: 'TCMB Avans Faiz Oranı — 2026',
  },
];

type FaizKey = 'yasal' | 'ticari' | 'gecikme' | 'avans';

export default function FaizScreen() {
  const router = useRouter();
  const { faizKey } = useLocalSearchParams<{ faizKey?: string }>();
  const [seciliFaiz, setSeciliFaiz] = useState<FaizKey>((faizKey as FaizKey) || 'yasal');
  const [anapara, setAnapara] = useState('');
  const [gun, setGun] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium, isTrialActive } = useSubscription();

  const seciliTur = FAIZ_TURLERI.find(f => f.key === seciliFaiz)!;
  const anaparaSayi = parseFloat(anapara) || 0;
  const gunSayi = parseInt(gun) || 0;

  const hesapla = () => {
    if (anaparaSayi <= 0 || gunSayi <= 0) return null;

    let faizTutari: number;
    let gunlukOran: number;

    if (seciliTur.aylik) {
      // Gecikme zammı aylık olarak hesaplanır
      const aylar = gunSayi / 30;
      faizTutari = anaparaSayi * seciliTur.oran * aylar;
      gunlukOran = seciliTur.oran / 30;
    } else {
      gunlukOran = seciliTur.oran / 365;
      faizTutari = anaparaSayi * gunlukOran * gunSayi;
    }

    const toplam = anaparaSayi + faizTutari;
    const yil = gunSayi / 365;

    return {
      breakdown: [
        { label: 'Anapara', val: anaparaSayi },
        {
          label: seciliTur.aylik
            ? `Günlük Oran (aylık %${(seciliTur.oran * 100).toFixed(1)} / 30)`
            : `Günlük Oran (yıllık %${(seciliTur.oran * 100).toFixed(0)} / 365)`,
          val: gunlukOran * anaparaSayi,
          sub: `× ${gunSayi} gün`,
        },
        { label: 'Hesaplanan Faiz', val: faizTutari, bold: true },
        { label: 'Anapara + Faiz', val: toplam, bold: true, highlight: true },
      ],
      result: faizTutari,
      toplam,
      note: seciliTur.aylik
        ? `Gecikme zammı aylık bazda hesaplanır. ${gunSayi} gün = yaklaşık ${(gunSayi / 30).toFixed(1)} ay.`
        : `${gunSayi} gün = ${yil.toFixed(2)} yıl. Yıllık oran: %${(seciliTur.oran * 100).toFixed(0)}.`,
    };
  };

  const sonuc = hesapla();

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
      title: `${seciliTur.label} — ${formatTL(anaparaSayi)}, ${gunSayi} gün`,
      type: 'custom',
      amount: anaparaSayi,
      result: sonuc.result,
      notes: `${seciliTur.label} | ${gunSayi} gün | ${seciliTur.kanun}`,
      overrides: {},
      extras: [],
    });
    setSaving(false);
    Alert.alert('Kaydedildi ✓', 'Faiz hesaplaması kayıtlara eklendi.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Faiz Hesaplayıcı</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Faiz Türü Seçimi */}
          <Text style={styles.sectionLabel}>Faiz Türü</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
            {FAIZ_TURLERI.map(f => (
              <TouchableOpacity
                key={f.key}
                onPress={() => { setSeciliFaiz(f.key as FaizKey); }}
                style={[styles.chip, seciliFaiz === f.key && { borderColor: f.color, backgroundColor: f.color + '18' }]}
              >
                <Text style={styles.chipIcon}>{f.icon}</Text>
                <Text style={[styles.chipLabel, seciliFaiz === f.key && { color: f.color }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Bilgi Bandı */}
          <View style={[styles.infoBanner, { borderColor: seciliTur.color + '44', backgroundColor: seciliTur.color + '12' }]}>
            <Text style={styles.infoIcon}>{seciliTur.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: seciliTur.color }]}>{seciliTur.label}</Text>
              <Text style={styles.infoDesc}>{seciliTur.desc}</Text>
              <Text style={[styles.infoKanun, { color: seciliTur.color + 'aa' }]}>{seciliTur.kanun}</Text>
            </View>
          </View>

          {/* Girişler */}
          <Input
            label="Anapara Tutarı"
            value={anapara}
            onChangeText={setAnapara}
            placeholder="0"
            keyboardType="numeric"
            prefix="₺"
          />
          <Input
            label="Faiz Süresi"
            value={gun}
            onChangeText={setGun}
            placeholder="0"
            keyboardType="numeric"
            suffix="gün"
          />

          {/* Sonuç */}
          {sonuc && (
            <Card style={[styles.resultCard, { borderColor: seciliTur.color + '44' }]}>
              <Text style={styles.resultTitle}>Faiz Detayı</Text>

              {sonuc.breakdown.map((row, i) => (
                <View key={i}>
                  <View style={styles.resultRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resultLabel, row.bold && { color: theme.text, fontWeight: '600' }]}>
                        {row.label}
                      </Text>
                      {'sub' in row && row.sub ? (
                        <Text style={styles.resultSub}>{row.sub}</Text>
                      ) : null}
                    </View>
                    <Text style={[
                      styles.resultValue,
                      row.bold && { fontSize: 15, fontWeight: '700' },
                      'highlight' in row && row.highlight ? { color: seciliTur.color, fontSize: 17 } : {},
                    ]}>
                      {formatTL(row.val)}
                    </Text>
                  </View>
                  {i < sonuc.breakdown.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}

              {sonuc.note && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>💡 {sonuc.note}</Text>
                </View>
              )}

              <View style={[styles.totalBox, { borderColor: seciliTur.color + '44', backgroundColor: seciliTur.color + '10' }]}>
                <Text style={styles.totalLabel}>Hesaplanan Faiz</Text>
                <Text style={[styles.totalValue, { color: seciliTur.color }]}>
                  {formatTL(sonuc.result)}
                </Text>
              </View>
            </Card>
          )}

          {/* Kaydet */}
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  sectionLabel: {
    fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, fontWeight: '500',
  },
  chipScroll: { marginHorizontal: -20 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  infoIcon: { fontSize: 22, marginTop: 2 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  infoDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 17 },
  infoKanun: { fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  resultCard: { borderWidth: 1, gap: 0 },
  resultTitle: {
    fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, fontWeight: '500', marginBottom: 14,
  },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
  },
  resultLabel: { fontSize: 13, color: theme.textMuted },
  resultSub: { fontSize: 11, color: theme.textDim, marginTop: 2 },
  resultValue: { fontSize: 13, color: theme.text, fontWeight: '500' },
  rowDivider: { height: 1, backgroundColor: theme.border },
  noteBox: {
    backgroundColor: theme.surfaceAlt, borderRadius: 10,
    padding: 12, marginTop: 12,
  },
  noteText: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
  totalBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 14,
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
  totalValue: { fontSize: 22, fontWeight: '800' },
});
