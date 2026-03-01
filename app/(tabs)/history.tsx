import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, Badge, EmptyState } from '../../components/ui';
import { theme, TYPE_LABELS, TYPE_COLORS } from '../../lib/theme';
import { formatTL } from '../../lib/calculations';
import { shareViaWhatsApp } from '../../lib/whatsapp';

const FILTERS = [
  ['all', 'Tümü'], ['tapu', 'Tapu'], ['damga', 'Damga'],
  ['kdv', 'KDV'], ['noter', 'Noter'], ['avukatlik', 'Avukatlık'], ['custom', 'Özel'],
];

export default function HistoryScreen() {
  const router = useRouter();
  const [calcs, setCalcs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalcs = async () => {
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCalcs(data);
  };

  useFocusEffect(useCallback(() => { fetchCalcs(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCalcs();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Sil', 'Bu kaydı silmek istediğinizden emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          await supabase.from('calculations').delete().eq('id', id);
          setCalcs(prev => prev.filter(c => c.id !== id));
        },
      },
    ]);
  };

  const filtered = calcs.filter(c =>
    (filter === 'all' || c.type === filter) &&
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Kayıtlı İşlemler</Text>
        <Text style={styles.count}>{filtered.length} kayıt</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="🔍  İşlem ara..."
          placeholderTextColor={theme.textDim}
          style={styles.searchInput}
        />
      </View>

      {/* Filters — fixed height chips */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(([k, v]) => (
            <TouchableOpacity
              key={k}
              onPress={() => setFilter(k)}
              style={[styles.filterChip, filter === k && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, filter === k && styles.filterTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {filtered.length === 0 && <EmptyState message="Kayıt bulunamadı" />}

        {filtered.map(c => (
          <Card key={c.id} style={styles.calcCard}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.calcTitle} numberOfLines={1}>{c.title}</Text>
                <Text style={styles.calcDate}>{new Date(c.created_at).toLocaleDateString('tr-TR')}</Text>
                {c.notes ? <Text style={styles.calcNotes} numberOfLines={1}>{c.notes}</Text> : null}
              </View>
              <Badge color={TYPE_COLORS[c.type] || theme.textMuted}>
                {TYPE_LABELS[c.type] || c.type}
              </Badge>
            </View>

            <View style={styles.amounts}>
              <View>
                <Text style={styles.amountLabel}>İşlem Bedeli</Text>
                <Text style={styles.amountValue}>{formatTL(c.amount)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amountLabel}>Vergi / Harç</Text>
                <Text style={styles.resultValue}>{formatTL(c.result)}</Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => router.push(
                  c.type === 'custom'
                    ? `/calc/custom?id=${c.id}`
                    : `/calc/${c.type}?id=${c.id}`
                )}
                style={styles.editBtn}
              >
                <Text style={styles.editBtnText}>✎  Düzenle / Aç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => shareViaWhatsApp({
                  title: c.title,
                  type: c.type,
                  amount: c.amount,
                  result: c.result,
                  breakdown: [],
                  clientName: c.client_name || '',
                  date: new Date(c.created_at).toLocaleDateString('tr-TR'),
                })}
                style={styles.waBtn}
              >
                <Text style={styles.waBtnText}>💬</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(c.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.text },
  count: { fontSize: 12, color: theme.textMuted },
  searchRow: { paddingHorizontal: 20, marginBottom: 10 },
  searchInput: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11,
    color: theme.text, fontSize: 14,
  },
  filterWrapper: { height: 44, marginBottom: 12 },
  filterRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  filterChip: {
    height: 32,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 8, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: theme.accentDim, borderColor: theme.accentMuted },
  filterText: { fontSize: 12, color: theme.textMuted },
  filterTextActive: { color: theme.accent, fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  calcCard: { marginBottom: 12 },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  calcTitle: { fontSize: 14, fontWeight: '600', color: theme.text },
  calcDate: { fontSize: 11, color: theme.textMuted, marginTop: 3 },
  calcNotes: { fontSize: 11, color: theme.textDim, marginTop: 3, fontStyle: 'italic' },
  amounts: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: theme.border, marginBottom: 12,
  },
  amountLabel: { fontSize: 11, color: theme.textMuted },
  amountValue: { fontSize: 13, fontWeight: '500', color: theme.text, marginTop: 2 },
  resultValue: { fontSize: 16, fontWeight: '700', color: theme.accent, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 2, backgroundColor: theme.accentDim, borderWidth: 1,
    borderColor: theme.accentMuted, borderRadius: 8, padding: 9, alignItems: 'center',
  },
  editBtnText: { fontSize: 12, color: theme.accent, fontWeight: '600' },
  deleteBtn: {
    flex: 1, backgroundColor: '#E0525214', borderWidth: 1,
    borderColor: '#E0525244', borderRadius: 8, padding: 9, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 12, color: theme.danger },
  waBtn: { backgroundColor: '#25D36614', borderWidth: 1, borderColor: '#25D36644', borderRadius: 8, padding: 9, alignItems: 'center', paddingHorizontal: 14 },
  waBtnText: { fontSize: 14 },
});
