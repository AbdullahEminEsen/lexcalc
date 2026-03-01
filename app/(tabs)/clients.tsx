import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Card, GoldButton, Input } from '../../components/ui';
import { theme, TYPE_LABELS, TYPE_COLORS } from '../../lib/theme';
import { formatTL } from '../../lib/calculations';
import { useSubscription } from '../../context/SubscriptionContext';
import { PremiumGate, PaywallModal } from '../../components/paywall';
import { shareViaWhatsApp } from '../../lib/whatsapp';

interface Client {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  calc_count?: number;
  total_result?: number;
}

// ─── Müvekkil Detay Modal ─────────────────────────────────────
function ClientDetailModal({ client, visible, onClose, onEdit, onDelete }: {
  client: Client | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [calcs, setCalcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible && client) {
      setLoading(true);
      supabase
        .from('calculations')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setCalcs(data || []);
          setLoading(false);
        });
    }
  }, [visible, client]);

  if (!client) return null;

  const initials = client.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.sheet}>
          {/* Header */}
          <View style={detailStyles.header}>
            <View style={detailStyles.avatar}>
              <Text style={detailStyles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={detailStyles.name}>{client.full_name}</Text>
              {client.phone ? <Text style={detailStyles.phone}>📞 {client.phone}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={detailStyles.statsRow}>
            <View style={detailStyles.statBox}>
              <Text style={detailStyles.statValue}>{client.calc_count || 0}</Text>
              <Text style={detailStyles.statLabel}>İşlem</Text>
            </View>
            <View style={[detailStyles.statBox, { borderLeftWidth: 1, borderLeftColor: theme.border }]}>
              <Text style={[detailStyles.statValue, { color: theme.accent }]}>
                {formatTL(client.total_result || 0)}
              </Text>
              <Text style={detailStyles.statLabel}>Toplam Vergi/Harç</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={detailStyles.actions}>
            <TouchableOpacity onPress={() => { onEdit(client); onClose(); }} style={detailStyles.editBtn}>
              <Text style={detailStyles.editBtnText}>✎ Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onDelete(client.id); onClose(); }} style={detailStyles.deleteBtn}>
              <Text style={detailStyles.deleteBtnText}>Sil</Text>
            </TouchableOpacity>
          </View>

          {/* Calculation History */}
          <Text style={detailStyles.sectionTitle}>Hesaplama Geçmişi</Text>
          {loading ? (
            <Text style={detailStyles.emptyText}>Yükleniyor...</Text>
          ) : calcs.length === 0 ? (
            <Text style={detailStyles.emptyText}>Bu müvekkile ait hesaplama yok.</Text>
          ) : (
            <FlatList
              data={calcs}
              keyExtractor={item => item.id}
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={detailStyles.calcItem}
                  onPress={() => {
                    onClose();
                    router.push(item.type === 'custom' ? `/calc/custom?id=${item.id}` : `/calc/${item.type}?id=${item.id}`);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={detailStyles.calcTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={detailStyles.calcDate}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={detailStyles.calcResult}>{formatTL(item.result)}</Text>
                    <Text style={[detailStyles.calcType, { color: TYPE_COLORS[item.type] || theme.textMuted }]}>
                      {TYPE_LABELS[item.type] || item.type}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      shareViaWhatsApp({
                        title: item.title,
                        type: item.type,
                        amount: item.amount,
                        result: item.result,
                        breakdown: [],
                        clientName: client?.full_name || '',
                        date: new Date(item.created_at).toLocaleDateString('tr-TR'),
                      });
                    }}
                    style={detailStyles.waBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 16 }}>💬</Text>
                  </TouchableOpacity>
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

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.accent },
  name: { fontSize: 17, fontWeight: '700', color: theme.text },
  phone: { fontSize: 13, color: theme.textMuted, marginTop: 3 },
  closeBtn: { width: 30, height: 30, backgroundColor: theme.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.text },
  statLabel: { fontSize: 11, color: theme.textMuted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  editBtn: { flex: 1, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, borderRadius: 10, padding: 10, alignItems: 'center' },
  editBtnText: { fontSize: 13, color: theme.accent, fontWeight: '600' },
  deleteBtn: { flex: 1, backgroundColor: '#E0525214', borderWidth: 1, borderColor: '#E0525244', borderRadius: 10, padding: 10, alignItems: 'center' },
  deleteBtnText: { fontSize: 13, color: theme.danger },
  sectionTitle: { fontSize: 11, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  emptyText: { fontSize: 13, color: theme.textDim, textAlign: 'center', padding: 20 },
  calcItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  calcTitle: { fontSize: 13, fontWeight: '500', color: theme.text },
  calcDate: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  calcResult: { fontSize: 14, fontWeight: '700', color: theme.accent },
  calcType: { fontSize: 10, marginTop: 2 },
  waBtn: { padding: 6, backgroundColor: '#25D36614', borderRadius: 8, borderWidth: 1, borderColor: '#25D36644' },
});

// ─── Form Modal ───────────────────────────────────────────────
function ClientFormModal({ visible, onClose, onSave, editClient }: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editClient: Client | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(editClient?.full_name || '');
      setPhone(editClient?.phone || '');
    }
  }, [visible, editClient]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Hata', 'Ad Soyad zorunludur.'); return; }
    setSaving(true);

    if (editClient) {
      await supabase.from('clients').update({ full_name: name.trim(), phone: phone.trim() }).eq('id', editClient.id);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      const { error } = await supabase.from('clients').insert({
        user_id: session?.user?.id,
        full_name: name.trim(),
        phone: phone.trim(),
      });
      if (error) { Alert.alert('Hata', error.message); setSaving(false); return; }
    }

    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={formStyles.overlay}>
        <View style={formStyles.sheet}>
          <View style={formStyles.header}>
            <Text style={formStyles.title}>{editClient ? 'Müvekkili Düzenle' : 'Yeni Müvekkil'}</Text>
            <TouchableOpacity onPress={onClose} style={formStyles.closeBtn}>
              <Text style={{ color: theme.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 12 }}>
            <Input label="Ad Soyad *" value={name} onChangeText={setName} placeholder="Av. Müvekkil Ad Soyad" />
            <Input label="Telefon" value={phone} onChangeText={setPhone} placeholder="0530 000 00 00" keyboardType="phone-pad" />
            <GoldButton onPress={handleSave} loading={saving}>
              {editClient ? 'Güncelle' : 'Müvekkil Ekle'}
            </GoldButton>
            <GoldButton variant="outline" onPress={onClose}>İptal</GoldButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const formStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { fontSize: 17, fontWeight: '600', color: theme.text },
  closeBtn: { width: 30, height: 30, backgroundColor: theme.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────
export default function ClientsScreen() {
  
  const routerNav = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);
  const { premium: isPremium } = useSubscription();

  const fetchClients = async () => {
    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .order('full_name');

    if (!clientData) return;

    // Her müvekkil için hesaplama sayısı ve toplam harç
    const enriched = await Promise.all(clientData.map(async (c) => {
      const { data: calcs } = await supabase
        .from('calculations')
        .select('result')
        .eq('client_id', c.id);

      return {
        ...c,
        calc_count: calcs?.length || 0,
        total_result: calcs?.reduce((s, r) => s + (r.result || 0), 0) || 0,
      };
    }));

    setClients(enriched);
  };

  useFocusEffect(useCallback(() => { fetchClients(); }, []));

  const onRefresh = async () => { setRefreshing(true); await fetchClients(); setRefreshing(false); };

  const handleDelete = (id: string) => {
    Alert.alert('Müvekkili Sil', 'Bu müvekkili silmek istiyor musunuz? Hesaplamalar silinmez, sadece bağlantısı kopar.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          await supabase.from('clients').delete().eq('id', id);
          await fetchClients();
        },
      },
    ]);
  };

  const handleEdit = (c: Client) => {
    setEditClient(c);
    setShowForm(true);
  };

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  if (!isPremium) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 }}>
          <Text style={{ fontSize: 52 }}>🔒</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, textAlign: 'center' }}>
            Müvekkil Yönetimi
          </Text>
          <Text style={{ fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22 }}>
            Müvekkillerinizi yönetmek, dosya bazlı hesaplama geçmişi görmek ve raporlar oluşturmak için Premium abonelik gereklidir.
          </Text>
          <TouchableOpacity
            onPress={() => routerNav.push('/paywall' as any)}
            style={{ backgroundColor: theme.accent, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0D0F14' }}>Premium Al →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Müvekkiller</Text>
          <Text style={styles.subtitle}>{clients.length} müvekkil</Text>
        </View>
        <TouchableOpacity onPress={() => { setEditClient(null); setShowForm(true); }} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+ Yeni</Text>
        </TouchableOpacity>
      </View>

      {!isPremium && (
        <TouchableOpacity
          onPress={() => setShowPaywall(true)}
          style={styles.premiumGate}
          activeOpacity={0.8}
        >
          <Text style={styles.premiumGateIcon}>🔒</Text>
          <Text style={styles.premiumGateTitle}>Müvekkil Yönetimi — Premium</Text>
          <Text style={styles.premiumGateSub}>Müvekkil kayıtları oluşturmak ve yönetmek için abone olun.</Text>
          <View style={styles.premiumGateBtn}><Text style={styles.premiumGateBtnText}>Premium'a Geç →</Text></View>
        </TouchableOpacity>
      )}

      {/* Search */}
      <View style={[styles.searchRow, !isPremium && { opacity: 0.3, pointerEvents: 'none' }]}>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="🔍  Müvekkil ara..."
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>
              {search ? 'Müvekkil bulunamadı' : 'Henüz müvekkil yok'}
            </Text>
            <Text style={styles.emptyDesc}>
              {search ? 'Farklı bir arama deneyin.' : '+ Yeni butonuyla müvekkil ekleyin.'}
            </Text>
          </View>
        )}

        {filtered.map(client => {
          const initials = client.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
          return (
            <TouchableOpacity
              key={client.id}
              onPress={() => { setSelectedClient(client); setShowDetail(true); }}
              activeOpacity={0.7}
            >
              <Card style={styles.clientCard}>
                {/* Avatar + Info */}
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clientName}>{client.full_name}</Text>
                    {client.phone ? (
                      <Text style={styles.clientPhone}>📞 {client.phone}</Text>
                    ) : (
                      <Text style={styles.clientPhone}>Telefon eklenmemiş</Text>
                    )}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>

                {/* Stats */}
                <View style={styles.cardStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{client.calc_count}</Text>
                    <Text style={styles.statLabel}>işlem</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.accent }]}>
                      {formatTL(client.total_result || 0)}
                    </Text>
                    <Text style={styles.statLabel}>toplam vergi/harç</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ClientFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={fetchClients}
        editClient={editClient}
      />

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
      <ClientDetailModal
        client={selectedClient}
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  addBtn: {
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, marginTop: 4,
  },
  addBtnText: { fontSize: 13, color: theme.accent, fontWeight: '600' },
  searchRow: { paddingHorizontal: 20, marginBottom: 10 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  premiumGate: {
    margin: 20, backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.accentMuted, borderRadius: 16, padding: 24, alignItems: 'center', gap: 8,
  },
  premiumGateIcon: { fontSize: 36, marginBottom: 4 },
  premiumGateTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  premiumGateSub: { fontSize: 13, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
  premiumGateBtn: { backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 6 },
  premiumGateBtnText: { fontSize: 13, fontWeight: '700', color: '#0D0F14' },
  clientCard: { padding: 0, overflow: 'hidden' },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: theme.accent },
  clientName: { fontSize: 15, fontWeight: '600', color: theme.text },
  clientPhone: { fontSize: 12, color: theme.textMuted, marginTop: 3 },
  chevron: { fontSize: 20, color: theme.textDim },
  cardStats: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statValue: { fontSize: 15, fontWeight: '700', color: theme.text },
  statLabel: { fontSize: 11, color: theme.textMuted },
  statDivider: { width: 1, height: 20, backgroundColor: theme.border, marginHorizontal: 12 },
});
