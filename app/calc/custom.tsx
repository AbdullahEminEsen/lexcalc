import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, GoldButton, Input } from '../../components/ui';
import { theme } from '../../lib/theme';
import { formatTL } from '../../lib/calculations';

// ─── Variable Picker Modal ─────────────────────────────────────
function VariablePickerModal({
  visible, onClose, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (v: any) => void;
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
          <Text style={modalStyles.hint}>
            Seçilen değişken formüle ve değişkenler listesine otomatik eklenir.
          </Text>
          {variables.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center' }}>
                Henüz değişken yok.{'\n'}Değişkenler sekmesinden ekleyebilirsiniz.
              </Text>
            </View>
          ) : (
            <FlatList
              data={variables}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { onSelect(item); onClose(); }}
                  style={modalStyles.varItem}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={modalStyles.varName}>{item.name}</Text>
                    <Text style={modalStyles.varHint}>
                      Formülde: <Text style={{ fontFamily: 'monospace', color: theme.accent }}>{item.name.toLowerCase().replace(/\s+/g, '_')}</Text>
                    </Text>
                  </View>
                  <Text style={modalStyles.varValue}>
                    {item.value}<Text style={{ fontSize: 13 }}>{item.unit}</Text>
                  </Text>
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
  sheet: { backgroundColor: theme.surface, borderRadius: 20, maxHeight: '70%', paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { fontSize: 17, fontWeight: '600', color: theme.text },
  closeBtn: { width: 30, height: 30, backgroundColor: theme.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, color: theme.textMuted, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  varItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  varName: { fontSize: 14, fontWeight: '500', color: theme.text },
  varHint: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  varValue: { fontSize: 20, fontWeight: '700', color: theme.accent },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function CustomCalcScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [title, setTitle] = useState('');
  const [formula, setFormula] = useState('');
  const [vars, setVars] = useState([{ name: 'tutar', value: '' }, { name: 'oran', value: '' }]);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [varPickerVisible, setVarPickerVisible] = useState(false);

  useEffect(() => {
    if (id) {
      supabase.from('calculations').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setTitle(data.title);
          setFormula(data.formula || data.notes || '');
          if (data.extras?.length) {
            setVars(data.extras.map((e: any) => ({ name: e.label, value: e.rate })));
          }
        }
      });
    }
  }, [id]);

  // Değişken seçilince hem vars listesine ekle hem de formüle ekle
  const handleSelectVariable = (variable: any) => {
    const varName = variable.name.toLowerCase().replace(/\s+/g, '_');
    // Zaten ekli mi kontrol et
    const alreadyAdded = vars.find(v => v.name === varName);
    if (!alreadyAdded) {
      setVars(prev => [...prev, { name: varName, value: variable.value }]);
    }
    // Formüle de ekle (imlecin sonuna)
    setFormula(prev => prev ? `${prev} ${varName}` : varName);
  };

  const calculate = () => {
    if (!formula.trim()) {
      setError('Formül boş olamaz.');
      return;
    }
    try {
      let expr = formula;
      vars.forEach(v => {
        const val = parseFloat(v.value.replace(',', '.')) || 0;
        // Kelime sınırı ile replace yap
        expr = expr.replace(new RegExp(`\\b${v.name}\\b`, 'g'), val.toString());
      });
      const res = Function('"use strict"; return (' + expr + ')')();
      if (typeof res !== 'number' || isNaN(res)) throw new Error('Geçersiz sonuç');
      setResult(res);
      setError('');
    } catch {
      setError('Formül hatası. Sözdizimini kontrol edin.');
      setResult(null);
    }
  };

  const handleSave = async () => {
    if (result === null) {
      Alert.alert('Önce hesaplayın', 'Kaydetmek için önce hesapla butonuna basın.');
      return;
    }
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();

    const rec = {
      user_id: session?.user?.id,
      title: title || 'Özel Formül',
      type: 'custom',
      amount: 0,
      result,
      notes: formula,
      formula,
      overrides: {},
      extras: vars.map(v => ({ id: v.name, label: v.name, rate: v.value, isFlat: false })),
    };

    let saveError;
    if (id) {
      const { error } = await supabase.from('calculations').update(rec).eq('id', id);
      saveError = error;
    } else {
      const { error } = await supabase.from('calculations').insert(rec);
      saveError = error;
    }

    setSaving(false);

    if (saveError) {
      Alert.alert('Hata', 'Kaydedilemedi: ' + saveError.message);
      return;
    }

    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1000);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Özel Formül</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Değişken adlarını kullanarak formül yazın.{'\n'}
              Örnek: <Text style={{ fontFamily: 'monospace', color: '#fff' }}>tutar * oran / 100</Text>
            </Text>
          </View>

          <Input label="Hesaplama Başlığı" value={title} onChangeText={setTitle} placeholder="Özel hesaplama adı" />

          {/* Variables */}
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Değişkenler</Text>
              <TouchableOpacity onPress={() => setVarPickerVisible(true)} style={styles.pickVarBtn}>
                <Text style={styles.pickVarText}>🔢 Kayıtlıdan Seç</Text>
              </TouchableOpacity>
            </View>

            {vars.map((v, i) => (
              <View key={i} style={styles.varRow}>
                <TextInput
                  value={v.name}
                  onChangeText={txt => { const n = [...vars]; n[i].name = txt.replace(/\s/g, '_'); setVars(n); }}
                  style={[styles.varInput, styles.varNameInput]}
                  placeholderTextColor={theme.textDim}
                  placeholder="ad"
                  autoCapitalize="none"
                />
                <TextInput
                  value={v.value}
                  onChangeText={txt => { const n = [...vars]; n[i].value = txt; setVars(n); }}
                  placeholder="değer"
                  placeholderTextColor={theme.textDim}
                  keyboardType="numeric"
                  style={[styles.varInput, styles.varValueInput]}
                />
                {vars.length > 1 && (
                  <TouchableOpacity onPress={() => setVars(vars.filter((_, j) => j !== i))}>
                    <Text style={styles.removeVar}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setVars([...vars, { name: `degisken${vars.length + 1}`, value: '' }])}
              style={styles.addVarBtn}
            >
              <Text style={styles.addVarText}>+ Manuel Değişken Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Formula */}
          <View>
            <Text style={styles.sectionLabel}>Formül</Text>
            <TextInput
              value={formula}
              onChangeText={setFormula}
              placeholder="ör: tutar * oran / 100 + 500"
              placeholderTextColor={theme.textDim}
              multiline
              numberOfLines={3}
              style={styles.formulaInput}
              autoCapitalize="none"
            />
            {/* Quick insert buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {vars.map((v, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setFormula(prev => prev ? `${prev} ${v.name}` : v.name)}
                    style={styles.quickInsert}
                  >
                    <Text style={styles.quickInsertText}>{v.name}</Text>
                  </TouchableOpacity>
                ))}
                {['*', '/', '+', '-', '(', ')', '100'].map(op => (
                  <TouchableOpacity
                    key={op}
                    onPress={() => setFormula(prev => `${prev} ${op} `)}
                    style={[styles.quickInsert, styles.quickInsertOp]}
                  >
                    <Text style={[styles.quickInsertText, { color: theme.textMuted }]}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          {result !== null && !error && (
            <Card style={styles.resultCard}>
              <Text style={styles.resultLabel}>Sonuç</Text>
              <Text style={styles.resultVal}>{formatTL(result)}</Text>
            </Card>
          )}

          <View style={styles.actions}>
            <GoldButton onPress={calculate} style={{ flex: 2 }}>Hesapla</GoldButton>
            <GoldButton variant="outline" onPress={handleSave} loading={saving} style={{ flex: 1 }}>
              {saved ? '✓' : 'Kaydet'}
            </GoldButton>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <VariablePickerModal
        visible={varPickerVisible}
        onClose={() => setVarPickerVisible(false)}
        onSelect={handleSelectVariable}
      />
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
  infoBanner: { backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 12, padding: 12 },
  infoText: { fontSize: 12, color: theme.accent, lineHeight: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500' },
  pickVarBtn: { backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  pickVarText: { fontSize: 11, color: theme.accent, fontWeight: '600' },
  varRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  varInput: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: theme.text, fontSize: 14 },
  varNameInput: { flex: 1, color: theme.accent },
  varValueInput: { flex: 2 },
  removeVar: { fontSize: 18, color: theme.danger, paddingHorizontal: 4 },
  addVarBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 4 },
  addVarText: { fontSize: 12, color: theme.textMuted },
  formulaInput: {
    backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border,
    borderRadius: 10, padding: 12, color: theme.text, fontSize: 14,
    minHeight: 80, textAlignVertical: 'top',
  },
  quickInsert: { backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  quickInsertOp: { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
  quickInsertText: { fontSize: 12, color: theme.accent, fontWeight: '600' },
  errorBox: { backgroundColor: '#E0525222', borderWidth: 1, borderColor: theme.danger, borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: theme.danger },
  resultCard: { alignItems: 'center', padding: 24 },
  resultLabel: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 },
  resultVal: { fontSize: 32, fontWeight: '700', color: theme.accent },
  actions: { flexDirection: 'row', gap: 10 },
});
