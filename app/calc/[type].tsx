import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Modal,
  FlatList, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, GoldButton, Input } from '../../components/ui';
import { theme, TYPE_ICONS } from '../../lib/theme';
import { computeBreakdown, formatTL, Extra } from '../../lib/calculations';
import { generateAndSharePDF } from '../../lib/pdf';
import { shareViaWhatsApp } from '../../lib/whatsapp';
import { useSubscription } from '../../context/SubscriptionContext';
import { PaywallModal } from '../../components/paywall';

const TYPE_INFO: Record<string, { label: string; desc: string }> = {
  tapu: { label: 'Tapu Harcı', desc: 'Her taraf için %2 (toplam %4) — 2026 oranı değişmedi' },
  damga: { label: 'Damga Vergisi', desc: "Sözleşme bedelinin ‰9,48'i — 2026 güncel (RG 33124)" },
  kdv: { label: 'KDV Hesabı', desc: 'Genel oran %20 — değişmedi' },
  kdv10: { label: 'KDV %10', desc: 'İndirimli oran %10 — değişmedi' },
  noter: { label: 'Noter Harcı', desc: "İşlem bedelinin ‰2,69'u (min 1.790₺) — 2026 güncel" },
  avukatlik: { label: 'Avukatlık Ücreti', desc: 'AAÜT 2025-2026 tarifesine göre (RG 33067, 4.11.2025)' },
};

// ─── Client Picker Modal ───────────────────────────────────────
function ClientPickerModal({ visible, onClose, onSelect, selectedId }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (client: any) => void;
  selectedId: string | null;
}) {
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      supabase.from('clients').select('*').order('full_name').then(({ data }) => {
        if (data) setClients(data);
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Müvekkil Seç</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Müvekkil yok seçeneği */}
          <TouchableOpacity
            onPress={() => { onSelect(null); onClose(); }}
            style={[modalStyles.clientItem, !selectedId && { backgroundColor: theme.accentDim }]}
          >
            <Text style={[modalStyles.clientName, { color: theme.textMuted }]}>— Müvekkil seçme</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: theme.border }} />

          {clients.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center' }}>
                Henüz müvekkil yok.{'\n'}Müvekkiller sekmesinden ekleyebilirsiniz.
              </Text>
            </View>
          ) : (
            <FlatList
              data={clients}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedId === item.id;
                const initials = item.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <TouchableOpacity
                    onPress={() => { onSelect(item); onClose(); }}
                    style={[modalStyles.clientItem, isSelected && { backgroundColor: theme.accentDim }]}
                  >
                    <View style={modalStyles.clientAvatar}>
                      <Text style={modalStyles.clientAvatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[modalStyles.clientName, isSelected && { color: theme.accent }]}>
                        {item.full_name}
                      </Text>
                      {item.phone ? <Text style={modalStyles.clientPhone}>{item.phone}</Text> : null}
                    </View>
                    {isSelected && <Text style={{ color: theme.accent, fontSize: 16 }}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border }} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Variable Picker Modal ─────────────────────────────────────
function VariablePickerModal({ visible, onClose, onSelect }: {
  visible: boolean; onClose: () => void; onSelect: (v: any) => void;
}) {
  const [variables, setVariables] = useState<any[]>([]);
  useEffect(() => {
    if (visible) {
      supabase.from('variables').select('*').order('created_at').then(({ data }) => {
        if (data) setVariables(data);
      });
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Değişken Seç</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {variables.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center' }}>
                Henüz değişken yok.
              </Text>
            </View>
          ) : (
            <FlatList
              data={variables}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { onSelect(item); onClose(); }} style={modalStyles.varItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.varName}>{item.name}</Text>
                    <Text style={modalStyles.varHint}>{item.unit === '₺' ? 'Sabit tutar' : `Oran (${item.unit})`}</Text>
                  </View>
                  <Text style={modalStyles.varValue}>{item.value}<Text style={{ fontSize: 13 }}>{item.unit}</Text></Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.border }} />}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { fontSize: 17, fontWeight: '600', color: theme.text },
  closeBtn: { width: 30, height: 30, backgroundColor: theme.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  clientItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  clientAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, alignItems: 'center', justifyContent: 'center' },
  clientAvatarText: { fontSize: 13, fontWeight: '700', color: theme.accent },
  clientName: { fontSize: 14, fontWeight: '500', color: theme.text },
  clientPhone: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  varItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  varName: { fontSize: 14, fontWeight: '500', color: theme.text },
  varHint: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  varValue: { fontSize: 20, fontWeight: '700', color: theme.accent },
});

// ─── Main Calc Screen ──────────────────────────────────────────
export default function CalcScreen() {
  const router = useRouter();
  const { type, id } = useLocalSearchParams<{ type: string; id?: string }>();
  const info = TYPE_INFO[type] || { label: 'Hesaplama', desc: '' };

  const [title, setTitle] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<Extra[]>([]);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [addingExtra, setAddingExtra] = useState(false);
  const [newExtra, setNewExtra] = useState({ label: '', rate: '', isFlat: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  const [clientPickerVisible, setClientPickerVisible] = useState(false);
  const [varPickerVisible, setVarPickerVisible] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { isPremium, premium } = useSubscription();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) setProfile(data);
        });
      }
    });

    if (id) {
      supabase.from('calculations').select('*, clients(id, full_name, phone)').eq('id', id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setAmount(data.amount?.toString() || '');
          setNotes(data.notes || '');
          setOverrides(data.overrides || {});
          setExtras(data.extras || []);
          if (data.clients) setSelectedClient(data.clients);
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
    if (!newExtra.label || !newExtra.rate) { Alert.alert('Hata', 'Açıklama ve oran/tutar zorunludur.'); return; }
    setExtras(prev => [...prev, { id: Date.now().toString(), ...newExtra }]);
    setNewExtra({ label: '', rate: '', isFlat: false });
    setAddingExtra(false);
  };

  const handleSelectVariable = (variable: any) => {
    const isFlat = variable.unit === '₺';
    setExtras(prev => [...prev, { id: Date.now().toString(), label: variable.name, rate: variable.value, isFlat }]);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    const rec = {
      user_id: session?.user?.id,
      title: title || `${info.label} - ${new Date().toLocaleDateString('tr-TR')}`,
      client_id: selectedClient?.id || null,
      client_name: selectedClient?.full_name || '',
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
    if (error) { Alert.alert('Hata', 'Kaydedilemedi: ' + error.message); return; }
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1000);
  };

  const handlePDF = async () => {
    if (!premium) {
      Alert.alert('Premium Gerekli', 'PDF oluşturmak için premium abonelik gereklidir.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Premium Al', onPress: () => router.push('/paywall' as any) },
      ]);
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Hata', 'PDF oluşturmak için önce bir tutar girin.');
      return;
    }
    setGeneratingPDF(true);
    try {
      await generateAndSharePDF({
        title: title || `${info.label} - ${new Date().toLocaleDateString('tr-TR')}`,
        type,
        amount: parseFloat(amount) || 0,
        result,
        breakdown: breakdown.map(r => ({ label: r.label, val: r.val, bold: r.bold })),
        clientName: selectedClient?.full_name || '',
        notes,
        lawyerName: profile?.full_name || 'Avukat',
        firmName: profile?.firm_name || '',
        referenceNo: `LC-${Date.now().toString().slice(-8)}`,
        date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
      });
    } catch {
      Alert.alert('Hata', 'PDF oluşturulamadı.');
    }
    setGeneratingPDF(false);
  };

  const handleWhatsApp = async () => {
    if (!premium) {
      Alert.alert('Premium Gerekli', "WhatsApp paylaşımı için premium abonelik gereklidir.", [
        { text: 'İptal', style: 'cancel' },
        { text: 'Premium Al', onPress: () => router.push('/paywall' as any) },
      ]);
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Hata', "WhatsApp'ta paylaşmak için önce bir tutar girin.");
      return;
    }
    await shareViaWhatsApp({
      title: title || `${info.label}`,
      type,
      amount: parseFloat(amount) || 0,
      result,
      breakdown: breakdown.map(r => ({ label: r.label, val: r.val, bold: r.bold })),
      clientName: selectedClient?.full_name || '',
      lawyerName: profile?.full_name || 'Avukat',
      firmName: profile?.firm_name || '',
      date: new Date().toLocaleDateString('tr-TR'),
    });
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

          <Input label="İşlem Başlığı" value={title} onChangeText={setTitle} placeholder={`${info.label} - Dosya Adı`} />

          {/* Müvekkil Dropdown */}
          <View>
            <Text style={styles.fieldLabel}>Müvekkil</Text>
            <TouchableOpacity
              onPress={() => setClientPickerVisible(true)}
              style={[styles.clientSelector, selectedClient && styles.clientSelectorActive]}
            >
              {selectedClient ? (
                <View style={styles.clientSelectorContent}>
                  <View style={styles.clientSelectorAvatar}>
                    <Text style={styles.clientSelectorAvatarText}>
                      {selectedClient.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientSelectorName}>{selectedClient.full_name}</Text>
                    {selectedClient.phone ? <Text style={styles.clientSelectorPhone}>{selectedClient.phone}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => setSelectedClient(null)} style={styles.clearClientBtn}>
                    <Text style={{ color: theme.textMuted, fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.clientSelectorContent}>
                  <Text style={styles.clientSelectorPlaceholder}>👥 Müvekkil seç...</Text>
                  <Text style={styles.clientSelectorArrow}>›</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Input label="İşlem Bedeli" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" prefix="₺" />
          <Input label="Notlar" value={notes} onChangeText={setNotes} placeholder="Belge no, notlar..." multiline numberOfLines={2} />

          {/* Breakdown */}
          {parseFloat(amount) > 0 && (
            <Card style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Hesaplama Detayı</Text>
              {breakdown.map((row, i) => (
                <View key={row.key}>
                  <TouchableOpacity
                    onPress={() => row.editable && handleRowEdit(row.key, row.rate!)}
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
                        <TextInput value={editVal} onChangeText={setEditVal} keyboardType="numeric" style={styles.inlineInput} autoFocus />
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

          {/* Add Extra */}
          {!addingExtra ? (
            <View style={styles.addExtraGroup}>
              <TouchableOpacity onPress={() => setAddingExtra(true)} style={[styles.addExtraBtn, { flex: 1 }]}>
                <Text style={styles.addExtraText}>+ Ek Kalem Ekle</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVarPickerVisible(true)} style={[styles.addExtraBtn, styles.addExtraBtnAccent, { flex: 1 }]}>
                <Text style={[styles.addExtraText, { color: theme.accent }]}>🔢 Değişkenden Seç</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Card style={[styles.breakdownCard, { borderColor: theme.accentMuted }]}>
              <Text style={styles.extraFormTitle}>Ek Kalem</Text>
              <Input small label="Açıklama" value={newExtra.label} onChangeText={v => setNewExtra(p => ({ ...p, label: v }))} placeholder="ör. Tercüme Ücreti" />
              <View style={styles.extraFormRow}>
                <View style={{ flex: 2 }}>
                  <Input small label={newExtra.isFlat ? 'Tutar (₺)' : 'Oran (%)'}
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
                <GoldButton small onPress={addExtra} style={{ flex: 1 }}>Ekle</GoldButton>
                <GoldButton small variant="outline" onPress={() => setAddingExtra(false)} style={{ flex: 1 }}>İptal</GoldButton>
              </View>
            </Card>
          )}

          <GoldButton onPress={handleSave} loading={saving} style={{ marginTop: 8 }}>
            {saved ? '✓ Kaydedildi!' : id ? 'Güncelle' : 'Kaydet'}
          </GoldButton>

          {parseFloat(amount) > 0 && (
            <View style={styles.shareRow}>
              <TouchableOpacity
                onPress={() => isPremium ? handlePDF() : setShowPaywall(true)}
                style={[styles.shareBtn, styles.pdfBtn]}
                disabled={generatingPDF}
              >
                {generatingPDF
                  ? <ActivityIndicator color={theme.accent} size="small" />
                  : <Text style={styles.shareBtnText}>{premium ? '📄' : '🔒'} PDF</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => isPremium ? handleWhatsApp() : setShowPaywall(true)} style={[styles.shareBtn, styles.waBtn]}>
                <Text style={styles.shareBtnText}>{premium ? '💬' : '🔒'} WhatsApp</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <ClientPickerModal
        visible={clientPickerVisible}
        onClose={() => setClientPickerVisible(false)}
        onSelect={setSelectedClient}
        selectedId={selectedClient?.id || null}
      />
      <VariablePickerModal
        visible={varPickerVisible}
        onClose={() => setVarPickerVisible(false)}
        onSelect={handleSelectVariable}
      />
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
  infoIcon: { fontSize: 20 },
  infoText: { fontSize: 12, color: theme.accent, flex: 1 },
  fieldLabel: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', marginBottom: 8 },
  clientSelector: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 50,
  },
  clientSelectorActive: { borderColor: theme.accentMuted, backgroundColor: theme.accentDim },
  clientSelectorContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clientSelectorAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, alignItems: 'center', justifyContent: 'center' },
  clientSelectorAvatarText: { fontSize: 11, fontWeight: '700', color: theme.accent },
  clientSelectorName: { fontSize: 14, fontWeight: '600', color: theme.accent },
  clientSelectorPhone: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  clientSelectorPlaceholder: { fontSize: 14, color: theme.textDim, flex: 1 },
  clientSelectorArrow: { fontSize: 18, color: theme.textDim },
  clearClientBtn: { padding: 4 },
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
  addExtraGroup: { flexDirection: 'row', gap: 10 },
  addExtraBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  addExtraBtnAccent: { borderColor: theme.accentMuted, backgroundColor: theme.accentDim },
  addExtraText: { fontSize: 12, color: theme.textMuted },
  extraFormTitle: { fontSize: 12, color: theme.accent, fontWeight: '600', marginBottom: 12 },
  extraFormRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 10 },
  typeToggle: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 10, marginBottom: 10 },
  typeToggleActive: { backgroundColor: theme.accentDim, borderColor: theme.accentMuted },
  typeToggleText: { fontSize: 12, color: theme.textMuted },
  typeToggleTextActive: { color: theme.accent },
  extraFormActions: { flexDirection: 'row', gap: 8 },
  shareRow: { flexDirection: 'row', gap: 10 },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, padding: 14, gap: 8,
  },
  pdfBtn: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  waBtn: { borderWidth: 1, borderColor: '#25D36644', backgroundColor: '#25D36614' },
  shareBtnText: { fontSize: 13, color: theme.text, fontWeight: '600' },
});
