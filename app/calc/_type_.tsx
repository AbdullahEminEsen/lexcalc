import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, GoldButton, Input } from '../../components/ui';
import { theme } from '../../lib/theme';
import { computeBreakdown, formatTL, Extra } from '../../lib/calculations';
import { useSubscription } from '../../context/SubscriptionContext';
import { PaywallModal } from '../../components/paywall';

// ─── Tip bilgileri ─────────────────────────────────────────────
const TYPE_INFO: Record<string, { label: string; icon: string; desc: string; detail?: string }> = {
  tapu: {
    label: 'Tapu Harcı',
    icon: '🏠',
    desc: 'Her taraf için %2 — toplam %4 (2026)',
    detail: 'Tapu harcı, taşınmaz alım-satım işlemlerinde alıcı ve satıcının her biri tarafından ayrı ayrı ödenir. 2026 yılında oran %2+%2 olarak uygulanmaktadır. Harç, tapu dairesine başvuru sırasında peşin ödenir.',
  },
  damga: {
    label: 'Damga Vergisi',
    icon: '📄',
    desc: 'Sözleşme bedelinin ‰9,48\'i (2026)',
    detail: 'Damga vergisi, kâğıt üzerinde düzenlenen sözleşmelere uygulanan bir vergidir. 2026 yılı için oran binde 9,48\'dir. Sözleşmenin imzalandığı tarihten itibaren 15 gün içinde ödenmesi gerekmektedir.',
  },
  kdv: {
    label: 'KDV %20',
    icon: '🧾',
    desc: 'Genel KDV oranı — 2023\'ten itibaren %20',
    detail: 'Türkiye\'de genel KDV oranı 10 Temmuz 2023 tarihinden itibaren %18\'den %20\'ye yükseltilmiştir. Gıda, ilaç ve bazı temel ürünlerde indirimli oranlar uygulanmaktadır.',
  },
  kdv10: {
    label: 'KDV %10',
    icon: '🧾',
    desc: 'İndirimli KDV oranı %10',
    detail: 'İndirimli %10 KDV oranı; konut teslimlerinde (net 150m²\'ye kadar), bazı gıda maddelerinde ve tekstil ürünlerinde uygulanmaktadır.',
  },
  kdv1: {
    label: 'KDV %1',
    icon: '🧾',
    desc: 'İndirimli KDV oranı %1',
    detail: '%1 KDV oranı; temel gıda maddeleri, bazı tarım ürünleri ve net 150m²\'nin altındaki konut teslimlerinde uygulanmaktadır.',
  },
  noter: {
    label: 'Noter Harcı',
    icon: '📝',
    desc: 'İşlem bedelinin ‰2,69\'u — min ₺1.790 (2026)',
    detail: '2026 yılı noter harcı tarifesine göre nispi harç binde 2,69\'dur. Hesaplanan tutar 1.790 TL\'nin altında kalırsa asgari harç uygulanır. Harç, noter işlemi sırasında tahsil edilir.',
  },
  veraset: {
    label: 'Veraset & İntikal Vergisi',
    icon: '🏦',
    desc: 'Miras ve karşılıksız kazanımlarda dilimli vergi',
    detail: 'Veraset yoluyla intikalde %1-10, ivazsız (karşılıksız) intikalde %10-30 oranında dilimli vergi uygulanır. Vergi, miras ilamının kesinleşmesinden itibaren 3 ay içinde beyan edilmelidir.',
  },
  kira_stopaj: {
    label: 'Kira Stopaj Vergisi',
    icon: '🏢',
    desc: 'Brüt kira bedelinin %20\'si stopaj kesilir',
    detail: 'Ticari amaçlı kiralamalar ile işyeri kiralarında kiraya ödenirken %20 oranında gelir vergisi stopajı kesilir ve vergi dairesine yatırılır. Konut kiralarında stopaj uygulanmaz.',
  },
  serbest_meslek: {
    label: 'Serbest Meslek Stopajı',
    icon: '💼',
    desc: 'Hizmet bedeline %17 stopaj + %20 KDV',
    detail: 'Serbest meslek makbuzunda hizmet bedeli üzerinden %17 gelir vergisi stopajı hesaplanır. Ayrıca %20 KDV eklenir. Ödeme yapan kurum, stopajı keserek vergi dairesine yatırır.',
  },
  mtv: {
    label: 'MTV Hesabı',
    icon: '🚗',
    desc: '2026 yıllık motorlu taşıtlar vergisi',
    detail: 'MTV, araç motor hacmi ve yaşına göre hesaplanır. Yılda iki eşit taksitte ödenir: Ocak ve Temmuz. Araç 2026 yılında tescil edilmişse tam yıl vergi ödenir.',
  },
  muayene: {
    label: 'Araç Muayene Ücreti',
    icon: '🔧',
    desc: '2026 TÜVTÜRK muayene ücret tarifesi',
    detail: 'Araç muayene ücretleri TÜVTÜRK tarafından belirlenir ve araç tipine göre değişir. Muayene süresi geçmiş araçlara ek gecikme zammı uygulanabilir.',
  },
  trafik_ceza: {
    label: 'Trafik Cezası',
    icon: '🚨',
    desc: 'Erken ödeme ile %25 indirim',
    detail: 'Trafik cezaları tebliğ tarihinden itibaren 15 gün içinde ödenirse %25 indirim uygulanır. 15 günden sonra tam tutar ödenir. 1 yıl içinde ödenmezse icra yoluna gidilir.',
  },
  pasaport: {
    label: 'Pasaport / Kimlik Harcı',
    icon: '🪪',
    desc: '2026 belge harç tarifesi',
    detail: 'Pasaport ve kimlik belgelerinin harçları, 492 sayılı Harçlar Kanunu\'na göre her yıl yeniden değerleme oranında güncellenmektedir. 2026 tarifesi esas alınmıştır.',
  },
};

// ─── Açıklama paneli (premium) ────────────────────────────────
function DetailPanel({ type, isPremium, onUpgrade }: {
  type: string;
  isPremium: boolean;
  onUpgrade: () => void;
}) {
  const info = TYPE_INFO[type];
  if (!info?.detail) return null;

  if (!isPremium) {
    return (
      <TouchableOpacity onPress={onUpgrade} style={styles.detailLock}>
        <Text style={styles.detailLockIcon}>🔒</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailLockText}>Detaylı açıklama Premium özelliğidir</Text>
          <Text style={styles.detailLockSub}>Abone olarak tüm açıklamalara eriş</Text>
        </View>
        <Text style={{ color: theme.accent }}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Card style={styles.detailCard}>
      <Text style={styles.detailTitle}>ℹ️ Bilgi</Text>
      <Text style={styles.detailText}>{info.detail}</Text>
    </Card>
  );
}

// ─── Ana hesaplama ekranı ─────────────────────────────────────
export default function CalcScreen() {
  const router = useRouter();
  const { type, id } = useLocalSearchParams<{ type: string; id?: string }>();
  const info = TYPE_INFO[type] || { label: 'Hesaplama', icon: '🔢', desc: '' };

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<Extra[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [newExtra, setNewExtra] = useState({ label: '', rate: '', isFlat: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium, isTrialActive } = useSubscription();
  const canSave = isPremium || isTrialActive;

  useEffect(() => {
    if (id) {
      supabase.from('calculations').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setAmount(data.amount?.toString() || '');
          setOverrides(data.overrides || {});
          setExtras(data.extras || []);
        }
      });
    }
  }, [id]);

  const { breakdown, result } = computeBreakdown(type, amount, overrides, extras);

  const handleRowEdit = (key: string, currentRate: number) => {
    setEditingRow(key);
    setEditVal(currentRate.toString());
  };

  const applyRowEdit = (key: string) => {
    const v = parseFloat(editVal);
    if (!isNaN(v)) setOverrides(prev => ({ ...prev, [key]: v }));
    setEditingRow(null);
  };

  const addExtra = () => {
    if (!newExtra.label || !newExtra.rate) { Alert.alert('Hata', 'Açıklama ve tutar zorunludur.'); return; }
    setExtras(prev => [...prev, { id: Date.now().toString(), ...newExtra }]);
    setNewExtra({ label: '', rate: '', isFlat: false });
    setAddingExtra(false);
  };

  const handleSave = async () => {
    if (!canSave) { setShowPaywall(true); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const rec = {
      user_id: session?.user?.id,
      title: title || `${info.label} - ${new Date().toLocaleDateString('tr-TR')}`,
      type,
      amount: parseFloat(amount) || 0,
      result,
      overrides,
      extras,
    };
    const { error } = id
      ? await supabase.from('calculations').update(rec).eq('id', id)
      : await supabase.from('calculations').insert(rec);
    setSaving(false);
    if (error) { Alert.alert('Hata', 'Kaydedilemedi: ' + error.message); return; }
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

          {/* Bilgi Banner */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>{info.icon}</Text>
            <Text style={styles.infoText}>{info.desc}</Text>
          </View>

          {/* Tutar girişi */}
          <Input
            label="Tutar"
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
            prefix="₺"
          />

          {/* Hesaplama Detayı */}
          {parseFloat(amount) > 0 && (
            <Card style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Hesaplama Detayı</Text>
              {breakdown.map((row, i) => (
                <View key={row.key}>
                  <TouchableOpacity
                    onPress={() => row.editable && row.rate !== undefined && handleRowEdit(row.key, row.rate)}
                    style={styles.breakdownRow}
                    activeOpacity={row.editable ? 0.6 : 1}
                  >
                    <View style={styles.breakdownLeft}>
                      <Text style={[styles.breakdownLabel, row.bold && styles.breakdownLabelBold]}>
                        {row.label}
                        {row.unit && !row.bold && row.val > 0 ? ` (${row.unit})` : ''}
                      </Text>
                      {row.editable && !row.bold && (
                        <View style={styles.editTag}><Text style={styles.editTagText}>✎</Text></View>
                      )}
                    </View>
                    {row.val > 0 && (
                      <Text style={[styles.breakdownVal, row.bold && styles.breakdownValBold]}>
                        {formatTL(row.val)}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {editingRow === row.key && (
                    <View style={styles.inlineEdit}>
                      <Text style={styles.inlineEditLabel}>Oranı düzenle ({row.unit})</Text>
                      <View style={styles.inlineEditRow}>
                        <TextInput
                          value={editVal}
                          onChangeText={setEditVal}
                          keyboardType="numeric"
                          style={styles.inlineInput}
                          autoFocus
                        />
                        <TouchableOpacity onPress={() => applyRowEdit(row.key)} style={styles.applyBtn}>
                          <Text style={styles.applyBtnText}>Uygula</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingRow(null)} style={styles.cancelEditBtn}>
                          <Text style={styles.cancelEditBtnText}>İptal</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {i < breakdown.length - 1 && <View style={styles.divider} />}
                </View>
              ))}

              {/* Ek Kalemler */}
              {extras.length > 0 && (
                <View style={styles.extrasSection}>
                  <Text style={styles.extrasTitle}>Ek Kalemler</Text>
                  {extras.map(ex => (
                    <View key={ex.id} style={styles.extraRow}>
                      <Text style={styles.extraLabel}>
                        {ex.label} ({ex.isFlat ? 'sabit' : `%${ex.rate}`})
                      </Text>
                      <View style={styles.extraRight}>
                        <Text style={styles.extraVal}>
                          {formatTL(ex.isFlat
                            ? parseFloat(ex.rate)
                            : ((parseFloat(amount) || 0) * parseFloat(ex.rate) / 100)
                          )}
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

          {/* Ek Kalem Ekle */}
          {parseFloat(amount) > 0 && (
            !addingExtra ? (
              <TouchableOpacity onPress={() => setAddingExtra(true)} style={styles.addExtraBtn}>
                <Text style={styles.addExtraText}>+ Ek Kalem Ekle</Text>
              </TouchableOpacity>
            ) : (
              <Card style={[styles.breakdownCard, { borderColor: theme.accentMuted }]}>
                <Text style={styles.extraFormTitle}>Ek Kalem</Text>
                <Input small label="Açıklama" value={newExtra.label} onChangeText={v => setNewExtra(p => ({ ...p, label: v }))} placeholder="ör. Diğer masraf" />
                <View style={styles.extraFormRow}>
                  <View style={{ flex: 2 }}>
                    <Input small label={newExtra.isFlat ? 'Tutar (₺)' : 'Oran (%)'}
                      value={newExtra.rate} onChangeText={v => setNewExtra(p => ({ ...p, rate: v }))}
                      placeholder="0" keyboardType="numeric" />
                  </View>
                  <TouchableOpacity
                    onPress={() => setNewExtra(p => ({ ...p, isFlat: !p.isFlat }))}
                    style={[styles.typeToggle, newExtra.isFlat && styles.typeToggleActive]}
                  >
                    <Text style={[styles.typeToggleText, newExtra.isFlat && styles.typeToggleTextActive]}>
                      {newExtra.isFlat ? 'Sabit ₺' : 'Oran %'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.extraFormActions}>
                  <GoldButton small onPress={addExtra} style={{ flex: 1 }}>Ekle</GoldButton>
                  <GoldButton small variant="outline" onPress={() => setAddingExtra(false)} style={{ flex: 1 }}>İptal</GoldButton>
                </View>
              </Card>
            )
          )}

          {/* Detaylı Açıklama */}
          <DetailPanel type={type} isPremium={isPremium || isTrialActive} onUpgrade={() => setShowPaywall(true)} />

          {/* Kaydet */}
          {parseFloat(amount) > 0 && (
            <GoldButton onPress={handleSave} loading={saving} style={{ marginTop: 8 }}>
              {!canSave ? '🔒 Kaydetmek için Premium\'a Geç' : saved ? '✓ Kaydedildi!' : id ? 'Güncelle' : 'Hesaplamayı Kaydet'}
            </GoldButton>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
  infoIcon: { fontSize: 22 },
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
  applyBtn: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  applyBtnText: { fontSize: 13, fontWeight: '600', color: '#0D0F14' },
  cancelEditBtn: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' },
  cancelEditBtnText: { fontSize: 12, color: theme.textMuted },

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

  detailCard: { gap: 8 },
  detailTitle: { fontSize: 12, fontWeight: '700', color: theme.accent },
  detailText: { fontSize: 13, color: theme.textMuted, lineHeight: 20 },
  detailLock: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 14,
  },
  detailLockIcon: { fontSize: 20 },
  detailLockText: { fontSize: 13, fontWeight: '600', color: theme.text },
  detailLockSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
});
