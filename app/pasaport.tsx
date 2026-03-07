import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card, GoldButton } from '../components/ui';
import { theme } from '../lib/theme';
import { formatTL } from '../lib/calculations';
import { AdBanner } from '../components/AdBanner';

// 2026 Pasaport Harç Tutarları (492 sayılı Harçlar Kanunu — 2026 tarifesi)
const PASAPORT_TURLERI = [
  {
    tur: 'Bordo Pasaport (Normal)',
    icon: '📗',
    color: '#7c3aed',
    aciklama: 'Standart pasaport — tüm vatandaşlar için',
    vadeSecenekleri: [
      { sure: '3 Yıl', tutar: 1645, damga: 0 },
      { sure: '5 Yıl', tutar: 2135, damga: 0 },
      { sure: '10 Yıl', tutar: 3265, damga: 0 },
    ],
  },
  {
    tur: 'Yeşil Pasaport (Özel)',
    icon: '📘',
    color: '#059669',
    aciklama: 'İhracatçılar, kamu görevlileri (emekli) — ücretsiz değil, harç ödenir',
    vadeSecenekleri: [
      { sure: '3 Yıl', tutar: 0, damga: 0, notu: 'Harca tabi değil — bedelsiz' },
      { sure: '5 Yıl', tutar: 0, damga: 0, notu: 'Harca tabi değil — bedelsiz' },
    ],
  },
  {
    tur: 'Gri Pasaport (Hizmet)',
    icon: '📔',
    color: '#0891b2',
    aciklama: 'Kamuda görevli memur ve kamu çalışanları',
    vadeSecenekleri: [
      { sure: '5 Yıl', tutar: 0, damga: 0, notu: 'Harca tabi değil — bedelsiz' },
    ],
  },
  {
    tur: 'Siyah Pasaport (Diplomatik)',
    icon: '📓',
    color: '#374151',
    aciklama: 'Diplomatik personel',
    vadeSecenekleri: [
      { sure: '5 Yıl', tutar: 0, damga: 0, notu: 'Harca tabi değil — bedelsiz' },
    ],
  },
];

const DAMGA_VERGISI = 405.10; // 2026 pasaport damga vergisi

type Secim = { tur: string; sure: string; tutar: number; notu?: string };

export default function PasaportScreen() {
  const router = useRouter();
  const [secim, setSecim] = useState<Secim | null>(null);
  const [saving, setSaving] = useState(false);

  const toplamTutar = secim ? secim.tutar + (secim.tutar > 0 ? DAMGA_VERGISI : 0) : 0;

  const handleSave = async () => {
    if (!secim || secim.tutar === 0) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('calculations').insert({
      user_id: session?.user?.id,
      title: `Pasaport Harcı — ${secim.tur} ${secim.sure}`,
      type: 'custom',
      amount: 0,
      result: toplamTutar,
      notes: `Pasaport harcı 2026 | ${secim.tur} | ${secim.sure}`,
      overrides: {},
      extras: [],
    });
    setSaving(false);
    Alert.alert('Kaydedildi ✓', 'Pasaport harcı kayıtlara eklendi.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Pasaport Harcı</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🛂</Text>
          <Text style={styles.infoText}>
            2026 Pasaport Harç Tarifesi — 492 Sayılı Harçlar Kanunu
          </Text>
        </View>

        {/* Seçim Sonucu */}
        {secim && (
          <Card style={styles.seciliCard}>
            <Text style={styles.seciliTitle}>Hesaplama Sonucu</Text>
            <Text style={styles.seciliAciklama}>{secim.tur} — {secim.sure}</Text>

            {secim.tutar > 0 ? (
              <>
                <View style={styles.detayRow}>
                  <Text style={styles.detayLabel}>Pasaport Harcı</Text>
                  <Text style={styles.detayValue}>{formatTL(secim.tutar)}</Text>
                </View>
                <View style={styles.detayRow}>
                  <Text style={styles.detayLabel}>Damga Vergisi</Text>
                  <Text style={styles.detayValue}>{formatTL(DAMGA_VERGISI)}</Text>
                </View>
                <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Toplam Ödenecek</Text>
                  <Text style={styles.totalValue}>{formatTL(toplamTutar)}</Text>
                </View>
                <GoldButton onPress={handleSave} loading={saving} style={{ marginTop: 12 }}>
                  💾 Kayıtlara Ekle
                </GoldButton>
              </>
            ) : (
              <View style={styles.bedelsizBox}>
                <Text style={styles.bedelsizText}>
                  ✅ {secim.notu || 'Bu pasaport türü harca tabi değildir.'}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Pasaport Türleri */}
        {PASAPORT_TURLERI.map((pt, pi) => (
          <View key={pi} style={styles.turBlock}>
            <View style={styles.turHeader}>
              <Text style={styles.turIcon}>{pt.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.turLabel, { color: pt.color }]}>{pt.tur}</Text>
                <Text style={styles.turAciklama}>{pt.aciklama}</Text>
              </View>
            </View>

            <View style={styles.vadeRow}>
              {pt.vadeSecenekleri.map((v, vi) => (
                <TouchableOpacity
                  key={vi}
                  onPress={() => setSecim({ tur: pt.tur, sure: v.sure, tutar: v.tutar, notu: v.notu })}
                  style={[
                    styles.vadeCard,
                    { borderColor: pt.color + '44' },
                    secim?.tur === pt.tur && secim?.sure === v.sure && { borderColor: pt.color, backgroundColor: pt.color + '18' },
                  ]}
                >
                  <Text style={styles.vadeSure}>{v.sure}</Text>
                  <Text style={[styles.vadeTutar, { color: v.tutar > 0 ? pt.color : '#10b981' }]}>
                    {v.tutar > 0 ? formatTL(v.tutar) : 'Ücretsiz'}
                  </Text>
                  {v.tutar > 0 && (
                    <Text style={styles.vadeDamga}>+damga vergisi</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Card style={styles.bilgiCard}>
          <Text style={styles.bilgiTitle}>📌 Önemli Notlar</Text>
          <Text style={styles.bilgiText}>
            • Harç + damga vergisi nüfus müdürlüklerine ya da vergi dairelerine ödenir.{'\n'}
            • Pasaport başvurusu e-Devlet üzerinden yapılabilir.{'\n'}
            • Yeşil pasaport için ihracat belgesi, emeklilik belgesi gerekir.{'\n'}
            • 2026 harç tutarları yeniden değerleme oranına göre güncellenmiştir.
          </Text>
        </Card>
      </ScrollView>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: theme.text },
  navTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 12, padding: 12 },
  infoIcon: { fontSize: 20 },
  infoText: { fontSize: 12, color: theme.accent, flex: 1 },
  seciliCard: { borderColor: theme.accentMuted, gap: 10 },
  seciliTitle: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500' },
  seciliAciklama: { fontSize: 15, fontWeight: '700', color: theme.text },
  detayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  detayLabel: { fontSize: 13, color: theme.textMuted },
  detayValue: { fontSize: 13, color: theme.text, fontWeight: '500' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 12, padding: 14, marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: theme.text },
  totalValue: { fontSize: 20, fontWeight: '800', color: theme.accent },
  bedelsizBox: { backgroundColor: '#10b98120', borderWidth: 1, borderColor: '#10b98144', borderRadius: 10, padding: 12 },
  bedelsizText: { fontSize: 13, color: '#10b981', fontWeight: '600' },
  turBlock: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 16, padding: 16, gap: 12 },
  turHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  turIcon: { fontSize: 24 },
  turLabel: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  turAciklama: { fontSize: 12, color: theme.textMuted, lineHeight: 17 },
  vadeRow: { flexDirection: 'row', gap: 8 },
  vadeCard: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  vadeSure: { fontSize: 12, color: theme.textMuted, fontWeight: '500' },
  vadeTutar: { fontSize: 14, fontWeight: '700' },
  vadeDamga: { fontSize: 10, color: theme.textDim },
  bilgiCard: { gap: 8 },
  bilgiTitle: { fontSize: 13, fontWeight: '700', color: theme.text },
  bilgiText: { fontSize: 12, color: theme.textMuted, lineHeight: 20 },
});
