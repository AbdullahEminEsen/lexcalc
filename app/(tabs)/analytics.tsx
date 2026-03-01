import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui';
import { theme, TYPE_LABELS, TYPE_COLORS } from '../../lib/theme';
import { formatTL, shortTL } from '../../lib/calculations';

const SCREEN_W = Dimensions.get('window').width;

function BarChart({ data }: { data: { label: string; value: number; isActive?: boolean }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const BAR_H = 100;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: BAR_H + 52 }}>
      {data.map((d, i) => {
        const fillH = d.value > 0 ? Math.max((d.value / max) * BAR_H, 8) : 3;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            {d.value > 0 && (
              <Text style={{ fontSize: 9, color: d.isActive ? theme.accent : theme.textMuted, marginBottom: 4, textAlign: 'center' }}>
                {shortTL(d.value)}
              </Text>
            )}
            <View style={{ height: BAR_H, width: '100%', justifyContent: 'flex-end' }}>
              <View style={{
                width: '100%', height: fillH, borderRadius: 6,
                backgroundColor: d.isActive ? '#C9A96E' : theme.surfaceAlt,
                borderWidth: 1, borderColor: d.isActive ? theme.accentMuted : theme.border,
              }} />
            </View>
            <Text style={{ fontSize: 11, color: d.isActive ? theme.accent : theme.textMuted, marginTop: 6, fontWeight: d.isActive ? '600' : '400', textAlign: 'center' }}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ProgressRow({ label, count, value, pct, color }: { label: string; count: number; value: number; pct: number; color: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ fontSize: 13, color: theme.text }}>{label}</Text>
          <Text style={{ fontSize: 11, color: theme.textMuted }}>{count} işlem</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color }}>{formatTL(value)}</Text>
          <Text style={{ fontSize: 11, color: theme.textDim }}>{pct.toFixed(0)}%</Text>
        </View>
      </View>
      <View style={{ height: 5, backgroundColor: theme.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${Math.min(pct, 100)}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [calcs, setCalcs] = React.useState<any[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchCalcs = async () => {
    const { data } = await supabase.from('calculations').select('*').order('created_at', { ascending: false });
    if (data) setCalcs(data);
  };

  useFocusEffect(useCallback(() => { fetchCalcs(); }, []));
  const onRefresh = async () => { setRefreshing(true); await fetchCalcs(); setRefreshing(false); };

  const monthMap: Record<string, { total: number; count: number }> = {};
  calcs.forEach(c => {
    const d = new Date(c.created_at);
    const key = d.toLocaleDateString('tr-TR', { month: 'short' });
    if (!monthMap[key]) monthMap[key] = { total: 0, count: 0 };
    monthMap[key].total += c.result || 0;
    monthMap[key].count += 1;
  });
  const monthEntries = Object.entries(monthMap).slice(-5);
  const barData = monthEntries.map(([label, v], i) => ({ label, value: v.total, isActive: i === monthEntries.length - 1 }));

  const grandTotal = calcs.reduce((s, c) => s + (c.result || 0), 0);
  const grandAmount = calcs.reduce((s, c) => s + (c.amount || 0), 0);
  const avgResult = calcs.length > 0 ? grandTotal / calcs.length : 0;

  const typeBreakdown = Object.entries(TYPE_LABELS)
    .map(([k, label]) => {
      const items = calcs.filter(c => c.type === k);
      return { key: k, label, color: TYPE_COLORS[k] || theme.textMuted, total: items.reduce((s, c) => s + (c.result || 0), 0), count: items.length };
    })
    .filter(t => t.count > 0)
    .sort((a, b) => b.total - a.total);

  const now = new Date();
  const thisMonthCalcs = calcs.filter(c => { const d = new Date(c.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}>
        <Text style={styles.pageTitle}>Analiz & Raporlar</Text>

        <View style={styles.kpiGrid}>
          {[
            { label: 'Toplam Vergi/Harç', val: formatTL(grandTotal), sub: `${calcs.length} işlem` },
            { label: 'Toplam İşlem Bedeli', val: shortTL(grandAmount), sub: 'tüm zamanlar' },
            { label: 'İşlem Başı Ort.', val: formatTL(avgResult), sub: 'ortalama harç' },
            { label: 'Bu Ay', val: formatTL(thisMonthCalcs.reduce((s,c)=>s+(c.result||0),0)), sub: `${thisMonthCalcs.length} işlem` },
          ].map((k, i) => (
            <Card key={i} style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiVal}>{k.val}</Text>
              <Text style={styles.kpiSub}>{k.sub}</Text>
            </Card>
          ))}
        </View>

        {barData.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>Aylık Vergi / Harç Toplamı</Text>
            <BarChart data={barData} />
          </Card>
        )}

        {typeBreakdown.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>İşlem Türüne Göre Dağılım</Text>
            {typeBreakdown.map(t => (
              <ProgressRow key={t.key} label={t.label} count={t.count} value={t.total} pct={grandTotal > 0 ? (t.total / grandTotal) * 100 : 0} color={t.color} />
            ))}
          </Card>
        )}

        {calcs.length > 0 && (
          <Card>
            <Text style={styles.sectionLabel}>En Yüksek 5 İşlem</Text>
            {[...calcs].sort((a,b)=>(b.result||0)-(a.result||0)).slice(0,5).map((c,i) => {
              const color = TYPE_COLORS[c.type] || theme.textMuted;
              return (
                <View key={c.id} style={[styles.topItem, i < 4 && styles.topItemBorder]}>
                  <View style={[styles.rankBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.rankText, { color }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topTitle} numberOfLines={1}>{c.title}</Text>
                    <Text style={styles.topDate}>{new Date(c.created_at).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  <Text style={[styles.topVal, { color }]}>{formatTL(c.result)}</Text>
                </View>
              );
            })}
          </Card>
        )}

        {calcs.length === 0 && (
          <Card style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>📊</Text>
            <Text style={{ color: theme.textMuted, fontSize: 14, textAlign: 'center' }}>Henüz hesaplama kaydı yok.{'\n'}Ana sayfadan bir hesaplama yapın!</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: theme.text },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: (SCREEN_W - 50) / 2, padding: 14 },
  kpiLabel: { fontSize: 10, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  kpiVal: { fontSize: 15, fontWeight: '700', color: theme.accent },
  kpiSub: { fontSize: 10, color: theme.textDim, marginTop: 4 },
  sectionLabel: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', marginBottom: 16 },
  topItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  topItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  rankBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '700' },
  topTitle: { fontSize: 13, fontWeight: '500', color: theme.text },
  topDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  topVal: { fontSize: 13, fontWeight: '600' },
});
