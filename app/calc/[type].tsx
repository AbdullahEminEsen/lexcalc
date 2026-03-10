import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, GoldButton, Input } from '../../components/ui';
import { theme, TYPE_ICONS } from '../../lib/theme';
import { computeBreakdown, formatTL, Extra } from '../../lib/calculations';
import { AdBanner } from '../../components/AdBanner';
import { useSubscription } from '../../context/SubscriptionContext';
import { PaywallModal, checkMonthlyLimit } from '../../components/paywall';


const TYPE_INFO: Record<string, { label: string; desc: string }> = {
  tapu:      { label: 'Tapu Harcı',       desc: 'Her taraf için %2 (toplam %4) — 2026 oranı' },
  damga:     { label: 'Damga Vergisi',    desc: "Sözleşme bedelinin ‰9,48'i — 2026 (RG 33124)" },
  kdv:       { label: 'KDV %20',          desc: 'Genel KDV oranı %20' },
  kdv10:     { label: 'KDV %10',          desc: 'İndirimli KDV oranı %10' },
  noter:     { label: 'Noter Harcı',      desc: "İşlem bedelinin ‰2,69'u (min 1.790₺) — 2026" },
  avukatlik: { label: 'Avukatlık Ücreti', desc: 'AAÜT 2025-2026 tarifesine göre (RG 33067, 4.11.2025)' },
};

export default function CalcScreen() {
  const router = useRouter();
  const { type, id } = useLocalSearchParams<{ type: string; id?: string }>();
  const info = TYPE_INFO[type] || { label: 'Hesaplama', desc: '' };

  const [title, setTitle]         = useState('');
  const [amount, setAmount]       = useState('');
  const [notes, setNotes]         = useState('');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [extras, setExtras]       = useState<Extra[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editVal, setEditVal]     = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [newExtra, setNewExtra]   = useState({ label: '', rate: '', isFlat: false });
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'limit' | 'premium'>('premium');
  const { isPremium, isTrialActive } = useSubscription();

  useEffect(() => {
    if (id) {
      supabase.from('calculations').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setAmount(data.amount?.toString() || '');
          setNotes(data.notes || '');
          setOverrides(data.overrides || {});
          setExtras(data.extras || []);
        }
      });
    }
  }, [id]);

  const { breakdown, result } = computeBreakdown(type, amount, overrides, extras);

  const applyRowEdit = (key: string) => {
    const v = parseFloat(editVal);
    if (!isNaN(v)) setOverrides(prev => ({ ...prev, [key]: v }));
    setEditingRow(null);
  };

  const addExtra = () => {
    if (!newExtra.label || !newExtra.rate) { Alert.alert('Hata', 'Açıklama ve oran/tutar zorunludur.'); return; }
    setExtras(prev => [...prev, { id: Date.now().toString(), ...newExtra }]);
    setNewExtra({ label: '', rate: '', isFlat: false });
    setAddingExtra(false);
  };

  const handleSave = async () => {
    if (!isPremium && !isTrialActive) {
      const { allowed } = await checkMonthlyLimit();
      if (!allowed) { setPaywallReason('limit'); setShowPaywall(true); return; }
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const rec = {
      user_id: session?.user?.id,
      title: title || `${info.label} - ${new Date().toLocaleDateString('tr-TR')}`,
      type,
      amount: parseFloat(amount) || 0,
      result,
      notes,
      overrides,
      extras,
    };
    const { error } = id
      ? await supabase.from('calculations').update(rec).eq('id', id)
      : await supabase.from('calculations').insert(rec);
    setSaving(false);
    if (error) { Alert.alert('Hata', error.message); return; }
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: info.label }} />

      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{info.label}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>{TYPE_ICONS[type] || '🔢'}</Text>
            <Text style={styles.infoText}>{info.desc}</Text>
          </View>

          <Input label="İşlem Başlığı (isteğe bağlı)" value={title} onChangeText={setTitle}
            placeholder={`${info.label} - ${new Date().toLocaleDateString('tr-TR')}`} />
          <Input label="İşlem Tutarı" value={amount} onChangeText={setAmount}
            placeholder="0" keyboardType="numeric" prefix="₺" />
          <Input label="Notlar (isteğe bağlı)" value={notes} onChangeText={setNotes}
            placeholder="Notlarınız..." multiline numberOfLines={2} />

          {parseFloat(amount) > 0 && (
            <Card style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Hesaplama Detayı</Text>
              {breakdown.map((row, i) => (
                <View key={row.key}>
                  <TouchableOpacity
                    onPress={() => row.editable && (setEditingRow(row.key), setEditVal(row.rate!.toString()))}
                    style={styles.breakdownRow}
                    activeOpacity={row.editable ? 0.6 : 1}
                  >
                    <View style={styles.breakdownLeft}>
                      <Text style={[styles.breakdownLabel, row.bold && styles.breakdownLabelBold]}>{row.label}</Text>
                      {row.editable && !row.bold && (
                        <View style={styles.editTag}><Text style={styles.editTagText}>✎</Text></View>
                      )}
                    </View>
                    <Text style={[styles.breakdownVal, row.bold && styles.breakdownValBold]}>{formatTL(row.val)}</Text>
                  </TouchableOpacity>

                  {editingRow === row.key && (
                    <View style={styles.inlineEdit}>
                      <Text style={styles.inlineEditLabel}>Oranı düzenle ({row.unit})</Text>
                      <View style={styles.inlineEditRow}>
                        <TextInput value={editVal} onChangeText={setEditVal} keyboardType="numeric"
                          style={styles.inlineInput} autoFocus />
                        <TouchableOpacity onPress={() => applyRowEdit(row.key)} style={styles.applyBtn}>
                          <Text style={styles.applyBtnText}>Uygula</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingRow(null)} style={styles.cancelBtn}>
                          <Text style={styles.cancelBtnText}>İptal</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {i < breakdown.length - 1 && <View style={styles.divider} />}
                </View>
              ))}

              {extras.length > 0 && (
                <View style={styles.extrasSection}>
                  <Text style={styles.extrasTitle}>Ek Kalemler</Text>
                  {extras.map(ex => (
                    <View key={ex.id} style={styles.extraRow}>
                      <Text style={styles.extraLabel}>{ex.label} ({ex.isFlat ? 'sabit' : `%${ex.rate}`})</Text>
                      <View style={styles.extraRight}>
                        <Text style={styles.extraVal}>
                          {formatTL(ex.isFlat ? parseFloat(ex.rate) : ((parseFloat(amount) || 0) * parseFloat(ex.rate) / 100))}
                        </Text>
                        <TouchableOpacity onPress={() => setExtras(prev => prev.filter(e => e.id !== ex.id))}>
                          <Text style={styles.removeExtra}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          )}

          {!addingExtra ? (
            <TouchableOpacity onPress={() => setAddingExtra(true)} style={styles.addExtraBtn}>
              <Text style={styles.addExtraText}>+ Ek Kalem Ekle</Text>
            </TouchableOpacity>
          ) : (
            <Card style={[styles.breakdownCard, { borderColor: theme.accentMuted }]}>
              <Text style={styles.extraFormTitle}>Ek Kalem</Text>
              <Input label="Açıklama" value={newExtra.label}
                onChangeText={v => setNewExtra(p => ({ ...p, label: v }))} placeholder="ör. Damga Pulu" />
              <View style={styles.extraFormRow}>
                <View style={{ flex: 2 }}>
                  <Input label={newExtra.isFlat ? 'Tutar (₺)' : 'Oran (%)'}
                    value={newExtra.rate} onChangeText={v => setNewExtra(p => ({ ...p, rate: v }))}
                    placeholder="0" keyboardType="numeric" />
                </View>
                <TouchableOpacity onPress={() => setNewExtra(p => ({ ...p, isFlat: !p.isFlat }))}
                  style={[styles.typeToggle, newExtra.isFlat && styles.typeToggleActive]}>
                  <Text style={[styles.typeToggleText, newExtra.isFlat && styles.typeToggleTextActive]}>
                    {newExtra.isFlat ? 'Sabit ₺' : 'Oran %'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.extraFormActions}>
                <GoldButton onPress={addExtra} style={{ flex: 1 }}>Ekle</GoldButton>
                <TouchableOpacity onPress={() => setAddingExtra(false)}
                  style={[styles.cancelBtn, { flex: 1, alignItems: 'center', paddingVertical: 12 }]}>
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

          <GoldButton onPress={handleSave} loading={saving} style={{ marginTop: 8 }}>
            {saved ? '✓ Kaydedildi!' : id ? 'Güncelle' : '💾 Kaydet'}
          </GoldButton>

        </ScrollView>
      </KeyboardAvoidingView>


      <AdBanner />
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} reason={paywallReason} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: theme.text },
  navTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 12, padding: 12 },
  infoIcon: { fontSize: 20 },
  infoText: { fontSize: 12, color: theme.accent, flex: 1 },
  breakdownCard: {},
  breakdownTitle: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', marginBottom: 14 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  breakdownLabel: { fontSize: 13, color: theme.textMuted },
  breakdownLabelBold: { fontSize: 14, color: theme.text, fontWeight: '600' },
  breakdownVal: { fontSize: 13, color: theme.text },
  breakdownValBold: { fontSize: 16, color: theme.accent, fontWeight: '700' },
  editTag: { backgroundColor: theme.accentDim, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  editTagText: { fontSize: 11, color: theme.accentMuted },
  divider: { height: 1, backgroundColor: theme.border },
  inlineEdit: { backgroundColor: theme.surfaceAlt, borderRadius: 10, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: theme.accentMuted },
  inlineEditLabel: { fontSize: 11, color: theme.accent, marginBottom: 8 },
  inlineEditRow: { flexDirection: 'row', gap: 8 },
  inlineInput: { flex: 1, backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: theme.text, fontSize: 14 },
  applyBtn: { backgroundColor: '#C9A96E', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  applyBtnText: { fontSize: 13, fontWeight: '600', color: '#0D0F14' },
  cancelBtn: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' },
  cancelBtnText: { fontSize: 12, color: theme.textMuted },
  extrasSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  extrasTitle: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  extraLabel: { fontSize: 13, color: theme.textMuted, flex: 1 },
  extraRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  extraVal: { fontSize: 13, color: theme.text },
  removeExtra: { fontSize: 16, color: theme.danger },
  addExtraBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  addExtraText: { fontSize: 12, color: theme.textMuted },
  extraFormTitle: { fontSize: 12, color: theme.accent, fontWeight: '600', marginBottom: 12 },
  extraFormRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 10 },
  typeToggle: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 10, marginBottom: 10 },
  typeToggleActive: { backgroundColor: theme.accentDim, borderColor: theme.accentMuted },
  typeToggleText: { fontSize: 12, color: theme.textMuted },
  typeToggleTextActive: { color: theme.accent },
  extraFormActions: { flexDirection: 'row', gap: 8 },
});
