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

// 2926 Trafik Cezası Tutarları (Karayolları Trafik Kanunu + 2026 yeniden değerleme)
const CEZALAR = [
  {
    kategori: 'Hız İhlali',
    icon: '🚗💨',
    color: '#dc2626',
    items: [
      { label: 'Hız sınırı %10-%30 aşma', madde: 'KTK 51/1-a', tutar: 2436, ehliyetPuan: 10 },
      { label: 'Hız sınırı %30-%50 aşma', madde: 'KTK 51/1-b', tutar: 4872, ehliyetPuan: 15 },
      { label: 'Hız sınırı %50 ve üzeri aşma', madde: 'KTK 51/1-c', tutar: 9744, ehliyetPuan: 20, surusTakasi: true },
    ],
  },
  {
    kategori: 'Emniyet Kemeri & Telefon',
    icon: '📵',
    color: '#d97706',
    items: [
      { label: 'Emniyet kemeri takmama (sürücü)', madde: 'KTK 67/1-a', tutar: 855, ehliyetPuan: 5 },
      { label: 'Emniyet kemeri takmama (yolcu)', madde: 'KTK 67/1-b', tutar: 855, ehliyetPuan: 5 },
      { label: 'Seyir halinde telefon kullanma', madde: 'KTK 67/3', tutar: 2436, ehliyetPuan: 10 },
    ],
  },
  {
    kategori: 'Alkol & Uyuşturucu',
    icon: '🍺',
    color: '#7c3aed',
    items: [
      { label: 'Alkollü araç kullanma (0.50‰ altı — hafif)', madde: 'KTK 48/5', tutar: 4872, ehliyetPuan: 20, surusTakasi: true },
      { label: 'Alkollü araç kullanma (0.50‰ ve üzeri)', madde: 'KTK 48/5', tutar: 9744, ehliyetPuan: 0, surusTakasi: true, ehliyetIptal: true },
      { label: 'Uyuşturucu ile araç kullanma', madde: 'KTK 48/6', tutar: 9744, ehliyetPuan: 0, ehliyetIptal: true },
    ],
  },
  {
    kategori: 'Park & Yol İhlali',
    icon: '🅿️',
    color: '#0891b2',
    items: [
      { label: 'Yasak yere park etme', madde: 'KTK 61', tutar: 855, ehliyetPuan: 5 },
      { label: 'Kırmızı ışık ihlali', madde: 'KTK 52/1-a', tutar: 2436, ehliyetPuan: 15 },
      { label: 'Şerit ihlali', madde: 'KTK 52/1-c', tutar: 2436, ehliyetPuan: 10 },
      { label: 'Geçiş üstünlüğü ihlali', madde: 'KTK 56', tutar: 2436, ehliyetPuan: 15 },
      { label: 'Sollama ihlali', madde: 'KTK 53', tutar: 2436, ehliyetPuan: 10 },
    ],
  },
  {
    kategori: 'Araç Belgeleri',
    icon: '📋',
    color: '#059669',
    items: [
      { label: 'Muayene süresini geçirme', madde: 'KTK 35/2', tutar: 2436, ehliyetPuan: 0 },
      { label: 'Sigortasız araç kullanma', madde: 'KTK 91', tutar: 9744, ehliyetPuan: 0 },
      { label: 'Sürücü belgesi olmadan araç kullanma', madde: 'KTK 36/1', tutar: 9744, ehliyetPuan: 0 },
      { label: 'Çocuk koltuğu kullanmama', madde: 'KTK 67/2', tutar: 855, ehliyetPuan: 5 },
    ],
  },
];

type CezaItem = typeof CEZALAR[0]['items'][0];

export default function TrafikCezaScreen() {
  const router = useRouter();
  const [secili, setSecili] = useState<CezaItem | null>(null);
  const [saving, setSaving] = useState(false);

  // %25 indirim: 15 gün içinde ödeme
  const indirimliTutar = secili ? Math.floor(secili.tutar * 0.75) : 0;

  const handleSave = async () => {
    if (!secili) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('calculations').insert({
      user_id: session?.user?.id,
      title: `Trafik Cezası — ${secili.label}`,
      type: 'custom',
      amount: secili.tutar,
      result: secili.tutar,
      notes: `${secili.madde} | Ehliyet puanı: ${secili.ehliyetPuan}`,
      overrides: {},
      extras: [],
    });
    setSaving(false);
    Alert.alert('Kaydedildi ✓', 'Ceza kaydı eklendi.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Trafik Cezası Sorgulama</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🚗</Text>
          <Text style={styles.infoText}>2026 KTK Trafik Cezası Tutarları — Tüm cezalar 15 gün içinde %25 indirimli ödenir.</Text>
        </View>

        {secili && (
          <Card style={styles.seciliCard}>
            <Text style={styles.seciliTitle}>Seçili Ceza</Text>
            <Text style={styles.seciliLabel}>{secili.label}</Text>
            <Text style={styles.seciliMadde}>{secili.madde}</Text>

            <View style={styles.tutarRow}>
              <View style={styles.tutarBox}>
                <Text style={styles.tutarLabel}>Tam Tutar</Text>
                <Text style={styles.tutarValue}>{formatTL(secili.tutar)}</Text>
              </View>
              <View style={[styles.tutarBox, styles.tutarBoxIndirim]}>
                <Text style={styles.tutarLabel}>15 Gün İndirimli (%25)</Text>
                <Text style={[styles.tutarValue, { color: '#10b981' }]}>{formatTL(indirimliTutar)}</Text>
              </View>
            </View>

            {secili.ehliyetPuan > 0 && (
              <View style={styles.puanBadge}>
                <Text style={styles.puanText}>⚠️ Ehliyet Puanı: -{secili.ehliyetPuan} puan</Text>
              </View>
            )}
            {secili.surusTakasi && (
              <View style={[styles.puanBadge, { backgroundColor: '#dc262620', borderColor: '#dc262644' }]}>
                <Text style={[styles.puanText, { color: '#dc2626' }]}>🚫 Sürüşten Men Uygulanabilir</Text>
              </View>
            )}
            {secili.ehliyetIptal && (
              <View style={[styles.puanBadge, { backgroundColor: '#dc262620', borderColor: '#dc262644' }]}>
                <Text style={[styles.puanText, { color: '#dc2626' }]}>❌ Ehliyet İptali Söz Konusu</Text>
              </View>
            )}

            <GoldButton onPress={handleSave} loading={saving} style={{ marginTop: 12 }}>
              💾 Kayıtlara Ekle
            </GoldButton>
          </Card>
        )}

        {CEZALAR.map((kat, ki) => (
          <View key={ki} style={styles.kategoriBlock}>
            <Text style={[styles.kategoriTitle, { color: kat.color }]}>
              {kat.icon}  {kat.kategori}
            </Text>
            {kat.items.map((item, ii) => (
              <TouchableOpacity
                key={ii}
                onPress={() => setSecili(item)}
                style={[
                  styles.cezaRow,
                  secili?.madde === item.madde && secili?.label === item.label && { borderColor: kat.color, backgroundColor: kat.color + '12' },
                ]}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cezaLabel}>{item.label}</Text>
                  <Text style={styles.cezaMadde}>{item.madde}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.cezaTutar, { color: kat.color }]}>{formatTL(item.tutar)}</Text>
                  {item.ehliyetPuan > 0 && (
                    <Text style={styles.cezaPuan}>-{item.ehliyetPuan} puan</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.noteBox}>
          <Text style={styles.noteText}>
            📌 Trafik cezaları tebliğ tarihinden itibaren 15 gün içinde %25 indirimli, 1 ay içinde tam olarak ödenebilir. Süre geçtikten sonra gecikme zammı eklenir.
          </Text>
        </View>
      </ScrollView>
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
  seciliCard: { borderColor: theme.accentMuted, gap: 8 },
  seciliTitle: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500' },
  seciliLabel: { fontSize: 15, fontWeight: '700', color: theme.text },
  seciliMadde: { fontSize: 12, color: theme.textMuted },
  tutarRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  tutarBox: { flex: 1, backgroundColor: theme.surfaceAlt, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border },
  tutarBoxIndirim: { borderColor: '#10b98144', backgroundColor: '#10b98112' },
  tutarLabel: { fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tutarValue: { fontSize: 16, fontWeight: '700', color: theme.accent },
  puanBadge: { backgroundColor: '#d9770620', borderWidth: 1, borderColor: '#d9770644', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  puanText: { fontSize: 12, color: '#d97706', fontWeight: '600' },
  kategoriBlock: { gap: 8 },
  kategoriTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  cezaRow: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  cezaLabel: { fontSize: 13, fontWeight: '500', color: theme.text, marginBottom: 3 },
  cezaMadde: { fontSize: 11, color: theme.textMuted },
  cezaTutar: { fontSize: 14, fontWeight: '700' },
  cezaPuan: { fontSize: 10, color: theme.textMuted },
  noteBox: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 14 },
  noteText: { fontSize: 12, color: theme.textMuted, lineHeight: 19 },
});
