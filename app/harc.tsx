import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card, GoldButton, Input } from '../components/ui';
import { theme } from '../lib/theme';
import { formatTL } from '../lib/calculations';
import { shareViaWhatsApp } from '../lib/whatsapp';

// ─── Hesaplama Türleri ─────────────────────────────────────────
const HESAPLAMA_TURLERI = [
  {
    key: 'icra_ilamsiz',
    label: 'İlamsız İcra',
    icon: '⚡',
    color: '#dc2626',
    desc: 'Kambiyo ve genel ilamsız takip harcları',
    kanun: '492 sayılı Harçlar Kanunu',
  },
  {
    key: 'icra_ilamli',
    label: 'İlamlı İcra',
    icon: '📜',
    color: '#7c3aed',
    desc: 'İlama dayalı takip başlatma harcları',
    kanun: '492 sayılı Harçlar Kanunu',
  },
  {
    key: 'dava_nispi',
    label: 'Dava Harcı (Nispi)',
    icon: '⚖️',
    color: '#0891b2',
    desc: 'Dava değerine oranla hesaplanan harç',
    kanun: 'HMK md.30 — 492 sayılı Kanun',
  },
  {
    key: 'dava_maktu',
    label: 'Dava Harcı (Maktu)',
    icon: '📋',
    color: '#059669',
    desc: 'Sabit tutarlı dava açma harcı',
    kanun: '492 sayılı Kanun — 2024 Tarifesi',
  },
  {
    key: 'karar_ilam',
    label: 'Karar ve İlam Harcı',
    icon: '🏛️',
    color: '#d97706',
    desc: 'Hüküm sonrası ödenen harç',
    kanun: '492 sayılı Kanun Tarife 1',
  },
];

type HesapKey = 'icra_ilamsiz' | 'icra_ilamli' | 'dava_nispi' | 'dava_maktu' | 'karar_ilam';

// ─── Harç Hesaplama Fonksiyonları ─────────────────────────────
function hesaplaIcraIlamsiz(tutar: number) {
  const basvuruHarci = 615.40;               // 2026 güncel maktu harç
  const pesinHarc = tutar * 0.005;           // binde 5 peşin tahsil harcı
  const odemeHarci = tutar * 0.0455;         // %4,55 tahsil harcı (hacizden önce ödeme)
  const hacizSonrasiHarc = tutar * 0.091;    // %9,10 hacizden sonra satıştan önce
  const cezaeviHarci = tutar * 0.02;         // %2 cezaevi harcı (alacaklı öder)
  const toplam = basvuruHarci + pesinHarc;

  return {
    breakdown: [
      { label: 'Başvuru Harcı (maktu, 2026)', val: basvuruHarci },
      { label: 'Peşin Alınan Harç (‰5)', val: pesinHarc },
      { label: 'Tahsil Harcı — hacizden önce ödeme (%4,55)', val: odemeHarci, info: true },
      { label: 'Tahsil Harcı — haciz sonrası, satış öncesi (%9,10)', val: hacizSonrasiHarc, info: true },
      { label: 'Cezaevi Harcı (%2, alacaklıya yükletilemez)', val: cezaeviHarci, info: true },
      { label: 'Takip Açılışında Ödenen', val: toplam, bold: true },
    ],
    result: toplam,
    note: 'Tahsil harcı oranı borcun hangi aşamada ödendiğine göre değişir. Peşin harç karar sonrası tahsilden düşülür.',
  };
}

function hesaplaIcraIlamli(tutar: number) {
  const basvuruHarci = 615.40;               // 2026 güncel maktu harç
  // İlamlı takiplerde peşin harç alınmaz
  const tahsilHarci = tutar * 0.0455;        // %4,55 tahsil harcı (hacizden önce)
  const tahsilHarci2 = tutar * 0.091;        // %9,10 (hacizden sonra, satış öncesi)
  const toplam = basvuruHarci;               // Sadece başvuru harcı peşin ödenir

  return {
    breakdown: [
      { label: 'Başvuru Harcı (maktu, 2026)', val: basvuruHarci },
      { label: 'Peşin Harç', val: 0, info: true },
      { label: 'Tahsil Harcı — hacizden önce ödeme (%4,55)', val: tahsilHarci, info: true },
      { label: 'Tahsil Harcı — haciz sonrası, satış öncesi (%9,10)', val: tahsilHarci2, info: true },
      { label: 'Takip Açılışında Ödenen', val: toplam, bold: true },
    ],
    result: toplam,
    note: 'İlamlı takiplerde peşin harç alınmaz. Tahsil harcı borçludan tahsil aşamasında alınır.',
  };
}

function hesaplaDavaNispi(tutar: number) {
  const davacıBasv = 179.90;
  const nispiHarc = tutar * 0.06831;         // %6,831
  const pesinOrani = nispiHarc * 0.25;       // %25 peşin ödenir
  const kalanHarc = nispiHarc * 0.75;        // %75 karar sonrası
  const toplam = davacıBasv + pesinOrani;

  return {
    breakdown: [
      { label: 'Başvuru Harcı (sabit)', val: davacıBasv },
      { label: 'Toplam Nispi Harç (%6,831)', val: nispiHarc },
      { label: 'Peşin Ödenecek (%25)', val: pesinOrani },
      { label: 'Karar Sonrası Ödenecek (%75)', val: kalanHarc, info: true },
      { label: 'Dava Açarken Ödenecek', val: toplam, bold: true },
    ],
    result: toplam,
    note: 'Nispi harcın %25\'i dava açılışında, %75\'i karar sonrası ödenir.',
  };
}

function hesaplaDavaMaktu() {
  const basvuruHarci = 732.00;               // 2026 — Asliye/Aile Mahkemesi
  const maktuKararHarci = 732.00;            // Maktu karar harcı (karar aşamasında)
  const toplam = basvuruHarci;

  return {
    breakdown: [
      { label: 'Başvuru Harcı (2026, Asliye/Aile)', val: basvuruHarci },
      { label: 'Maktu Karar Harcı (karar aşamasında)', val: maktuKararHarci, info: true },
      { label: 'Sulh Mah. Başvuru Harcı (alternatif)', val: 335.20, info: true },
      { label: 'Dava Açarken Ödenecek', val: toplam, bold: true },
    ],
    result: toplam,
    note: "Maktu harç; boşanma, velayet, tespit, tahliye gibi değer biçilemeyen davalara uygulanır. Sulh mahkemesinde 335,20 TL'dir.",
  };
}

function hesaplaKararIlam(tutar: number) {
  const kararHarci = Math.max(tutar * 0.06831, 732.00); // ‰68,31, min 732 TL
  const dahaOncePesin = kararHarci * 0.25;   // Dava açılışında ödenen %25
  const kalanOdenecek = kararHarci * 0.75;   // Karar sonrası ödenen %75

  return {
    breakdown: [
      { label: 'Toplam Karar ve İlam Harcı (‰68,31)', val: kararHarci },
      { label: 'Dava Açılışında Ödenen Peşin (%25)', val: dahaOncePesin, info: true },
      { label: 'Şimdi Ödenecek (%75)', val: kalanOdenecek, bold: true },
    ],
    result: kalanOdenecek,
    note: 'Dava açılışında peşin ödenen %25 düşülerek kalan %75 karar sonrası tahsil edilir. Minimum 732 TL uygulanır.',
  };
}

export default function HarcScreen() {
  const router = useRouter();
  const { harcKey } = useLocalSearchParams<{ harcKey?: string }>();
  const [seciliHarc, setSeciliHarc] = useState<HesapKey>((harcKey as HesapKey) || 'icra_ilamsiz');
  const [tutar, setTutar] = useState('');
  const [saving, setSaving] = useState(false);

  const seciliTur = HESAPLAMA_TURLERI.find(h => h.key === seciliHarc)!;
  const tutarSayi = parseFloat(tutar) || 0;

  const hesapla = () => {
    switch (seciliHarc) {
      case 'icra_ilamsiz': return hesaplaIcraIlamsiz(tutarSayi);
      case 'icra_ilamli': return hesaplaIcraIlamli(tutarSayi);
      case 'dava_nispi': return hesaplaDavaNispi(tutarSayi);
      case 'dava_maktu': return hesaplaDavaMaktu();
      case 'karar_ilam': return hesaplaKararIlam(tutarSayi);
      default: return null;
    }
  };

  const isMaktu = seciliHarc === 'dava_maktu';
  const hazirMi = isMaktu || tutarSayi > 0;
  const sonuc = hazirMi ? hesapla() : null;

  const handleSave = async () => {
    if (!sonuc) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('calculations').insert({
      user_id: session?.user?.id,
      title: `${seciliTur.label}${!isMaktu ? ` — ${formatTL(tutarSayi)}` : ''}`,
      type: 'custom',
      amount: tutarSayi,
      result: sonuc.result,
      notes: `${seciliTur.label} | ${seciliTur.kanun}`,
      overrides: {},
      extras: [],
    });
    setSaving(false);
    Alert.alert('Kaydedildi ✓', 'Harç hesaplaması kayıtlara eklendi.');
  };

  const handleWhatsApp = async () => {
    if (!sonuc) return;
    await shareViaWhatsApp({
      title: seciliTur.label,
      type: 'custom',
      amount: tutarSayi,
      result: sonuc.result,
      breakdown: sonuc.breakdown.filter(r => !r.info),
      date: new Date().toLocaleDateString('tr-TR'),
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>İcra & Yargı Harcı</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Tür Seçimi */}
          <Text style={styles.sectionLabel}>Hesaplama Türü</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.turScroll} contentContainerStyle={styles.turRow}>
            {HESAPLAMA_TURLERI.map(h => (
              <TouchableOpacity
                key={h.key}
                onPress={() => { setSeciliHarc(h.key as HesapKey); setTutar(''); }}
                style={[styles.turChip, seciliHarc === h.key && { borderColor: h.color, backgroundColor: h.color + '18' }]}
              >
                <Text style={styles.turIcon}>{h.icon}</Text>
                <Text style={[styles.turLabel, seciliHarc === h.key && { color: h.color }]}>{h.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Seçili Tür Bilgisi */}
          <View style={[styles.infoBanner, { borderColor: seciliTur.color + '44', backgroundColor: seciliTur.color + '12' }]}>
            <Text style={styles.infoIcon}>{seciliTur.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: seciliTur.color }]}>{seciliTur.label}</Text>
              <Text style={styles.infoDesc}>{seciliTur.desc}</Text>
              <Text style={[styles.infoKanun, { color: seciliTur.color + 'aa' }]}>{seciliTur.kanun}</Text>
            </View>
          </View>

          {/* Tutar Girişi — maktu harca gerek yok */}
          {!isMaktu && (
            <Input
              label={seciliHarc.startsWith('icra') ? 'Takip Alacak Tutarı' : 'Dava Değeri'}
              value={tutar}
              onChangeText={setTutar}
              placeholder="0"
              keyboardType="numeric"
              prefix="₺"
            />
          )}

          {isMaktu && (
            <View style={styles.maktuBilgi}>
              <Text style={styles.maktuBilgiText}>
                📌 Maktu harç sabit tutarlıdır, dava değerine göre değişmez.
              </Text>
            </View>
          )}

          {/* Sonuç */}
          {hazirMi && sonuc && (
            <Card style={[styles.resultCard, { borderColor: seciliTur.color + '44' }]}>
              <Text style={styles.resultTitle}>Harç Detayı</Text>

              {sonuc.breakdown.map((row, i) => (
                <View key={i}>
                  <View style={[styles.resultRow, row.info && styles.infoRow]}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {row.info && <Text style={styles.infoTag}>ℹ</Text>}
                      <Text style={[
                        styles.resultLabel,
                        row.bold && { color: theme.text, fontWeight: '600' },
                        row.info && { color: theme.textDim, fontSize: 12 },
                      ]}>
                        {row.label}
                      </Text>
                    </View>
                    <Text style={[
                      styles.resultValue,
                      row.bold && { fontSize: 17, color: seciliTur.color, fontWeight: '700' },
                      row.info && { color: theme.textDim, fontSize: 12 },
                    ]}>
                      {formatTL(row.val)}
                    </Text>
                  </View>
                  {i < sonuc.breakdown.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ))}

              {/* Not */}
              {sonuc.note && (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>💡 {sonuc.note}</Text>
                </View>
              )}

              {/* Özet Kutusu */}
              <View style={[styles.totalBox, { borderColor: seciliTur.color + '44', backgroundColor: seciliTur.color + '10' }]}>
                <Text style={styles.totalLabel}>Şimdi Ödenecek</Text>
                <Text style={[styles.totalValue, { color: seciliTur.color }]}>
                  {formatTL(sonuc.result)}
                </Text>
              </View>
            </Card>
          )}

          {/* Aksiyonlar */}
          {hazirMi && sonuc && (
            <>
              <GoldButton onPress={handleSave} loading={saving}>
                💾 Kayıtlara Ekle
              </GoldButton>
              <TouchableOpacity onPress={handleWhatsApp} style={styles.waBtn}>
                <Text style={styles.waBtnText}>💬 WhatsApp'ta Paylaş</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
  turScroll: { marginHorizontal: -20 },
  turRow: { paddingHorizontal: 20, gap: 8 },
  turChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  turIcon: { fontSize: 16 },
  turLabel: { fontSize: 13, fontWeight: '500', color: theme.textMuted },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  infoIcon: { fontSize: 22, marginTop: 2 },
  infoTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  infoDesc: { fontSize: 12, color: theme.textMuted, lineHeight: 17 },
  infoKanun: { fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  maktuBilgi: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 14,
  },
  maktuBilgiText: { fontSize: 13, color: theme.textMuted, lineHeight: 20 },
  resultCard: { borderWidth: 1, gap: 0 },
  resultTitle: {
    fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, fontWeight: '500', marginBottom: 14,
  },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
  },
  infoRow: { opacity: 0.7 },
  infoTag: { fontSize: 12, color: theme.textDim },
  resultLabel: { fontSize: 13, color: theme.textMuted, flex: 1 },
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
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#25D36644', backgroundColor: '#25D36614',
    borderRadius: 14, padding: 14,
  },
  waBtnText: { fontSize: 14, color: theme.text, fontWeight: '600' },
});
