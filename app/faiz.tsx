import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card, GoldButton, Input, DateInput } from '../components/ui';
import { theme } from '../lib/theme';
import { formatTL } from '../lib/calculations';
import { shareViaWhatsApp } from '../lib/whatsapp';

// ─── Faiz Türleri ─────────────────────────────────────────────
const FAIZ_TURLERI = [
  {
    key: 'yasal',
    label: 'Yasal Faiz',
    icon: '⚖️',
    defaultRate: 24,
    unit: '%',
    desc: "3095 sayılı Kanun — CB Kararı ile 01.06.2024'ten itibaren %24",
    color: '#6366f1',
  },
  {
    key: 'ticari',
    label: 'Ticari Temerrüt',
    icon: '🏦',
    defaultRate: 43,
    unit: '%',
    desc: "TTK md.1530 — 01.01.2026'dan itibaren yıllık %43 (RG 33125)",
    color: '#0891b2',
  },
  {
    key: 'gecikme',
    label: 'Gecikme Zammı',
    icon: '📋',
    defaultRate: 3.7,
    unit: '% aylık',
    desc: "6183 sayılı Kanun md.51 — aylık %3,7 (13.11.2025'ten itibaren, CB Kararı 10556)",
    color: '#dc2626',
    monthlyRate: true,
  },
  {
    key: 'avans',
    label: 'Avans Faizi',
    icon: '💳',
    defaultRate: 9.75,
    unit: '%',
    desc: "TCMB — 20.12.2025'ten itibaren yıllık %9,75 (Reeskont: %8,75)",
    color: '#d97706',
  },
];

type FaizKey = 'yasal' | 'ticari' | 'gecikme' | 'avans';
type HesapTipi = 'basit' | 'bilesik';

function gunFarki(baslangic: string, bitis: string): number {
  try {
    const [bg, bm, by] = baslangic.split('.').map(Number);
    const [sg, sm, sy] = bitis.split('.').map(Number);
    const d1 = new Date(by, bm - 1, bg);
    const d2 = new Date(sy, sm - 1, sg);
    const diff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

function hesaplaFaiz(
  anapara: number,
  yillikOran: number,
  gun: number,
  tip: HesapTipi,
  monthlyRate = false
): { faizTutari: number; toplamTutar: number; gunlukOran: number } {
  if (anapara <= 0 || gun <= 0 || yillikOran <= 0) {
    return { faizTutari: 0, toplamTutar: anapara, gunlukOran: 0 };
  }

  // Aylık oran girilmişse yıllığa çevir
  const yillikOranGercek = monthlyRate ? yillikOran * 12 : yillikOran;
  const gunlukOran = yillikOranGercek / 365 / 100;

  let faizTutari: number;
  if (tip === 'basit') {
    faizTutari = anapara * gunlukOran * gun;
  } else {
    faizTutari = anapara * (Math.pow(1 + gunlukOran, gun) - 1);
  }

  return {
    faizTutari,
    toplamTutar: anapara + faizTutari,
    gunlukOran: gunlukOran * 100,
  };
}

function bugun(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function FaizScreen() {
  const router = useRouter();
  const { faizKey } = useLocalSearchParams<{ faizKey?: string }>();
  const [seciliFaiz, setSeciliFaiz] = useState<FaizKey>((faizKey as FaizKey) || 'yasal');
  const [anapara, setAnapara] = useState('');
  const [baslangic, setBaslangic] = useState('');
  const [bitis, setBitis] = useState('');
  const [hesapTipi, setHesapTipi] = useState<HesapTipi>('basit');
  const [ozelOran, setOzelOran] = useState('');
  const [oranDuzenleniyor, setOranDuzenleniyor] = useState(false);
  const [saving, setSaving] = useState(false);

  const seciliTur = FAIZ_TURLERI.find(f => f.key === seciliFaiz)!;
  const aktifOran = ozelOran ? parseFloat(ozelOran) : seciliTur.defaultRate;
  const gun = gunFarki(baslangic, bitis);
  const { faizTutari, toplamTutar, gunlukOran } = hesaplaFaiz(
    parseFloat(anapara) || 0,
    aktifOran,
    gun,
    hesapTipi,
    seciliTur.monthlyRate
  );

  const tarihGecerli = baslangic.length === 10 && bitis.length === 10;
  const hazirMi = parseFloat(anapara) > 0 && tarihGecerli;

  const handleSave = async () => {
    if (!hazirMi) { Alert.alert('Hata', 'Hesaplama yapmak için tüm alanları doldurun.'); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('calculations').insert({
      user_id: session?.user?.id,
      title: `${seciliTur.label} — ${baslangic} / ${bitis}`,
      type: 'custom',
      amount: parseFloat(anapara) || 0,
      result: faizTutari,
      notes: `${seciliTur.label} | Oran: %${aktifOran} | ${gun} gün | ${hesapTipi === 'basit' ? 'Basit' : 'Bileşik'} faiz`,
      overrides: {},
      extras: [],
    });
    setSaving(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    Alert.alert('Kaydedildi ✓', 'Faiz hesaplaması kayıtlara eklendi.');
  };

  const handleWhatsApp = async () => {
    if (!hazirMi) return;
    await shareViaWhatsApp({
      title: `${seciliTur.label} Hesaplama`,
      type: 'custom',
      amount: parseFloat(anapara) || 0,
      result: faizTutari,
      breakdown: [
        { label: `Anapara`, val: parseFloat(anapara) || 0 },
        { label: `Süre`, val: gun },
        { label: `${seciliTur.label} (%${aktifOran})`, val: faizTutari },
        { label: `Toplam (Anapara + Faiz)`, val: toplamTutar, bold: true },
      ],
      date: new Date().toLocaleDateString('tr-TR'),
    });
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
          <View>
            <Text style={styles.sectionLabel}>Faiz Türü</Text>
            <View style={styles.faizGrid}>
              {FAIZ_TURLERI.map(f => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => { setSeciliFaiz(f.key as FaizKey); setOzelOran(''); setOranDuzenleniyor(false); }}
                  style={[styles.faizCard, seciliFaiz === f.key && { borderColor: f.color, backgroundColor: f.color + '14' }]}
                >
                  <Text style={styles.faizIcon}>{f.icon}</Text>
                  <Text style={[styles.faizLabel, seciliFaiz === f.key && { color: f.color }]}>{f.label}</Text>
                  <Text style={[styles.faizRate, seciliFaiz === f.key && { color: f.color }]}>
                    %{f.defaultRate}{f.monthlyRate ? '/ay' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Seçili Faiz Bilgisi */}
          <View style={[styles.infoBanner, { borderColor: seciliTur.color + '44', backgroundColor: seciliTur.color + '14' }]}>
            <Text style={styles.infoIcon}>{seciliTur.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: seciliTur.color }]}>{seciliTur.label}</Text>
              <Text style={styles.infoDesc}>{seciliTur.desc}</Text>
            </View>
            <TouchableOpacity onPress={() => setOranDuzenleniyor(!oranDuzenleniyor)} style={styles.editRateBtn}>
              <Text style={styles.editRateBtnText}>✎ Oran</Text>
            </TouchableOpacity>
          </View>

          {/* Özel Oran */}
          {oranDuzenleniyor && (
            <Card style={{ borderColor: seciliTur.color + '44' }}>
              <Text style={styles.customRateLabel}>Özel Oran ({seciliTur.monthlyRate ? 'aylık %' : 'yıllık %'})</Text>
              <Input
                value={ozelOran}
                onChangeText={setOzelOran}
                placeholder={`Varsayılan: ${seciliTur.defaultRate}`}
                keyboardType="numeric"
              />
              <Text style={styles.customRateHint}>
                Boş bırakırsanız varsayılan oran (%{seciliTur.defaultRate}) kullanılır.
              </Text>
            </Card>
          )}

          {/* Giriş Alanları */}
          <Input
            label="Anapara"
            value={anapara}
            onChangeText={setAnapara}
            placeholder="0"
            keyboardType="numeric"
            prefix="₺"
          />

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <DateInput
                label="Başlangıç Tarihi"
                value={baslangic}
                onChangeText={setBaslangic}
              />
            </View>
            <TouchableOpacity onPress={() => setBaslangic(bugun())} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Bugün</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <DateInput
                label="Bitiş Tarihi"
                value={bitis}
                onChangeText={setBitis}
              />
            </View>
            <TouchableOpacity onPress={() => setBitis(bugun())} style={styles.todayBtn}>
              <Text style={styles.todayBtnText}>Bugün</Text>
            </TouchableOpacity>
          </View>

          {/* Hesap Tipi */}
          <View>
            <Text style={styles.sectionLabel}>Faiz Tipi</Text>
            <View style={styles.tipRow}>
              {[
                { key: 'basit', label: 'Basit Faiz', desc: 'Her dönem sadece anapara üzerinden' },
                { key: 'bilesik', label: 'Bileşik Faiz', desc: 'Faiz üzerine faiz işler' },
              ].map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setHesapTipi(t.key as HesapTipi)}
                  style={[styles.tipCard, hesapTipi === t.key && styles.tipCardActive]}
                >
                  <Text style={[styles.tipLabel, hesapTipi === t.key && styles.tipLabelActive]}>{t.label}</Text>
                  <Text style={styles.tipDesc}>{t.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Gün Göstergesi */}
          {tarihGecerli && (
            <View style={styles.gunBadge}>
              <Text style={styles.gunBadgeText}>
                📅 {gun === 0 ? 'Aynı gün' : `${gun} gün`}
              </Text>
              <Text style={styles.gunBadgeDetail}>
                {baslangic} → {bitis}
              </Text>
            </View>
          )}

          {/* Sonuç */}
          {hazirMi && (
            <Card style={[styles.resultCard, { borderColor: seciliTur.color + '44' }]}>
              <Text style={styles.resultTitle}>Hesaplama Sonucu</Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Anapara</Text>
                <Text style={styles.resultValue}>{formatTL(parseFloat(anapara))}</Text>
              </View>
              <View style={styles.resultDivider} />

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Süre</Text>
                <Text style={styles.resultValue}>{gun} gün</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>
                  Uygulanan Oran ({seciliTur.monthlyRate ? 'aylık' : 'yıllık'})
                </Text>
                <Text style={styles.resultValue}>%{aktifOran}</Text>
              </View>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Günlük Oran</Text>
                <Text style={styles.resultValue}>%{gunlukOran.toFixed(6)}</Text>
              </View>

              <View style={[styles.resultDivider, { marginVertical: 12 }]} />

              <View style={styles.resultRow}>
                <Text style={[styles.resultLabel, { fontSize: 14, color: theme.text }]}>
                  {seciliTur.label} Tutarı
                </Text>
                <Text style={[styles.resultValue, { fontSize: 20, color: seciliTur.color, fontWeight: '700' }]}>
                  {formatTL(faizTutari)}
                </Text>
              </View>

              <View style={[styles.resultRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Toplam (Anapara + Faiz)</Text>
                <Text style={styles.totalValue}>{formatTL(toplamTutar)}</Text>
              </View>
            </Card>
          )}

          {/* Aksiyonlar */}
          {hazirMi && (
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
    letterSpacing: 0.8, fontWeight: '500', marginBottom: 10,
  },
  faizGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  faizCard: {
    width: '47%', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
  },
  faizIcon: { fontSize: 24, marginBottom: 4 },
  faizLabel: { fontSize: 12, fontWeight: '600', color: theme.text, textAlign: 'center' },
  faizRate: { fontSize: 13, fontWeight: '700', color: theme.textMuted },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  infoIcon: { fontSize: 22 },
  infoTitle: { fontSize: 13, fontWeight: '700' },
  infoDesc: { fontSize: 11, color: theme.textMuted, marginTop: 2, lineHeight: 16 },
  editRateBtn: {
    backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  editRateBtnText: { fontSize: 11, color: theme.textMuted, fontWeight: '600' },
  customRateLabel: { fontSize: 11, color: theme.accent, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },
  customRateHint: { fontSize: 11, color: theme.textDim, marginTop: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  todayBtn: {
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 2,
  },
  todayBtnText: { fontSize: 12, color: theme.accent, fontWeight: '600' },
  tipRow: { flexDirection: 'row', gap: 10 },
  tipCard: {
    flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 12,
  },
  tipCardActive: { borderColor: theme.accentMuted, backgroundColor: theme.accentDim },
  tipLabel: { fontSize: 13, fontWeight: '600', color: theme.textMuted, marginBottom: 4 },
  tipLabelActive: { color: theme.accent },
  tipDesc: { fontSize: 11, color: theme.textDim, lineHeight: 15 },
  gunBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
  },
  gunBadgeText: { fontSize: 15, fontWeight: '700', color: theme.accent },
  gunBadgeDetail: { fontSize: 12, color: theme.textMuted },
  resultCard: { borderWidth: 1 },
  resultTitle: {
    fontSize: 11, color: theme.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, fontWeight: '500', marginBottom: 16,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  resultLabel: { fontSize: 13, color: theme.textMuted },
  resultValue: { fontSize: 13, color: theme.text, fontWeight: '500' },
  resultDivider: { height: 1, backgroundColor: theme.border, marginVertical: 4 },
  totalRow: {
    backgroundColor: theme.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, marginTop: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: theme.text },
  totalValue: { fontSize: 18, fontWeight: '700', color: theme.accent },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#25D36644', backgroundColor: '#25D36614',
    borderRadius: 14, padding: 14,
  },
  waBtnText: { fontSize: 14, color: theme.text, fontWeight: '600' },
});
