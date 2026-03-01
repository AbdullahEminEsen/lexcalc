import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, GoldButton, Input } from '../../components/ui';
import { theme } from '../../lib/theme';

const UNITS = ['%', '‰', '₺', 'x'];

const DEFAULT_VARS = [
  { name: 'KDV Oranı', value: '20', unit: '%' },
  { name: 'Tapu Harcı (Alıcı)', value: '2', unit: '%' },
  { name: 'Damga Oranı', value: '0.759', unit: '‰' },
  { name: 'Asgari Avukatlık Ücreti', value: '7550', unit: '₺' },
];

export default function VariablesScreen() {
  const [variables, setVariables] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState({ name: '', value: '', unit: '%' });
  const [adding, setAdding] = useState(false);
  const [newVar, setNewVar] = useState({ name: '', value: '', unit: '%' });
  const [refreshing, setRefreshing] = useState(false);

  const fetchVars = async () => {
    const { data } = await supabase.from('variables').select('*').order('created_at');
    if (data) setVariables(data);
  };

  const seedDefaults = async (userId: string) => {
    const { data } = await supabase.from('variables').select('id').limit(1);
    if (data && data.length === 0) {
      for (const v of DEFAULT_VARS) {
        await supabase.from('variables').insert({ ...v, user_id: userId });
      }
      await fetchVars();
    }
  };

  useFocusEffect(useCallback(() => {
    const init = async () => {
      await fetchVars();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) await seedDefaults(session.user.id);
    };
    init();
  }, []));

  const onRefresh = async () => { setRefreshing(true); await fetchVars(); setRefreshing(false); };

  const startEdit = (v: any) => {
    setEditId(v.id);
    setEditState({ name: v.name, value: v.value, unit: v.unit });
    setAdding(false);
  };

  const saveEdit = async () => {
    await supabase.from('variables').update(editState).eq('id', editId);
    setEditId(null);
    await fetchVars();
  };

  const deleteVar = (id: string) => {
    Alert.alert('Sil', 'Bu değişkeni silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          await supabase.from('variables').delete().eq('id', id);
          setEditId(null);
          await fetchVars();
        },
      },
    ]);
  };

  const addVar = async () => {
    if (!newVar.name || !newVar.value) {
      Alert.alert('Hata', 'Ad ve değer zorunludur.');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('variables').insert({ ...newVar, user_id: session?.user?.id });
    if (error) {
      Alert.alert('Hata', 'Değişken kaydedilemedi: ' + error.message);
      return;
    }
    setNewVar({ name: '', value: '', unit: '%' });
    setAdding(false);
    await fetchVars();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Değişkenler</Text>
        <TouchableOpacity onPress={() => { setAdding(!adding); setEditId(null); }} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Yeni Ekle</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.desc}>
        Kayıtlı değişkenleri Özel Formül hesaplamalarında ve Ek Kalem eklerken kullanabilirsiniz.
      </Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {/* Add Form */}
        {adding && (
          <Card style={[styles.card, styles.accentCard]}>
            <Text style={styles.editLabel}>Yeni Değişken</Text>
            <Input small label="Ad" value={newVar.name} onChangeText={v => setNewVar(p => ({ ...p, name: v }))} placeholder="ör. Özel Harç Oranı" />
            <View style={styles.valueRow}>
              <View style={{ flex: 2 }}>
                <Input small label="Değer" value={newVar.value} onChangeText={v => setNewVar(p => ({ ...p, value: v }))} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={styles.unitPicker}>
                <Text style={styles.inputLabel}>Birim</Text>
                <View style={styles.unitBtns}>
                  {UNITS.map(u => (
                    <TouchableOpacity key={u} onPress={() => setNewVar(p => ({ ...p, unit: u }))}
                      style={[styles.unitBtn, newVar.unit === u && styles.unitBtnActive]}>
                      <Text style={[styles.unitBtnText, newVar.unit === u && styles.unitBtnTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <View style={styles.actionRow}>
              <GoldButton small onPress={addVar} style={{ flex: 1 }}>Kaydet</GoldButton>
              <GoldButton small variant="outline" onPress={() => setAdding(false)} style={{ flex: 1 }}>İptal</GoldButton>
            </View>
          </Card>
        )}

        {variables.length === 0 && !adding && (
          <Card style={{ alignItems: 'center', padding: 32 }}>
            <Text style={{ fontSize: 28, marginBottom: 10 }}>🔢</Text>
            <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center' }}>
              Henüz değişken yok.{'\n'}+ Yeni Ekle butonuyla başlayın.
            </Text>
          </Card>
        )}

        {variables.map(v => (
          <Card key={v.id} style={styles.card}>
            {editId === v.id ? (
              <View>
                <Text style={styles.editLabel}>Düzenleniyor</Text>
                <Input small label="Ad" value={editState.name} onChangeText={val => setEditState(p => ({ ...p, name: val }))} placeholder="Değişken adı" />
                <View style={styles.valueRow}>
                  <View style={{ flex: 2 }}>
                    <Input small label="Değer" value={editState.value} onChangeText={val => setEditState(p => ({ ...p, value: val }))} placeholder="0" keyboardType="numeric" />
                  </View>
                  <View style={styles.unitPicker}>
                    <Text style={styles.inputLabel}>Birim</Text>
                    <View style={styles.unitBtns}>
                      {UNITS.map(u => (
                        <TouchableOpacity key={u} onPress={() => setEditState(p => ({ ...p, unit: u }))}
                          style={[styles.unitBtn, editState.unit === u && styles.unitBtnActive]}>
                          <Text style={[styles.unitBtnText, editState.unit === u && styles.unitBtnTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <GoldButton small onPress={saveEdit} style={{ flex: 1 }}>💾 Kaydet</GoldButton>
                  <GoldButton small variant="outline" onPress={() => setEditId(null)} style={{ flex: 1 }}>İptal</GoldButton>
                  <TouchableOpacity onPress={() => deleteVar(v.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.varRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.varName}>{v.name}</Text>
                  <Text style={styles.varHint}>Formüllerde ve ek kalemlerde kullanılabilir</Text>
                </View>
                <View style={styles.varRight}>
                  <Text style={styles.varValue}>
                    {v.value}<Text style={styles.varUnit}>{v.unit}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => startEdit(v)} style={styles.editIconBtn}>
                    <Text style={styles.editIconText}>✎</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: theme.text },
  addBtn: { backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { fontSize: 12, color: theme.accent, fontWeight: '600' },
  desc: { fontSize: 12, color: theme.textMuted, paddingHorizontal: 20, marginBottom: 14, lineHeight: 18 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  card: {},
  accentCard: { borderColor: theme.accentMuted },
  editLabel: { fontSize: 11, color: theme.accent, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 },
  valueRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  unitPicker: { flex: 1 },
  inputLabel: { fontSize: 11, color: theme.textMuted, fontWeight: '500', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 6 },
  unitBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  unitBtn: { paddingHorizontal: 8, paddingVertical: 5, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 6 },
  unitBtnActive: { backgroundColor: theme.accentDim, borderColor: theme.accentMuted },
  unitBtnText: { fontSize: 12, color: theme.textMuted },
  unitBtnTextActive: { color: theme.accent },
  actionRow: { flexDirection: 'row', gap: 8 },
  deleteBtn: { backgroundColor: '#E0525214', borderWidth: 1, borderColor: '#E0525244', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  deleteBtnText: { fontSize: 12, color: theme.danger },
  varRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  varName: { fontSize: 14, fontWeight: '500', color: theme.text },
  varHint: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  varRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  varValue: { fontSize: 20, fontWeight: '700', color: theme.accent },
  varUnit: { fontSize: 13, fontWeight: '400' },
  editIconBtn: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editIconText: { fontSize: 14, color: theme.textMuted },
});
