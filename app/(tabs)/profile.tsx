import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, GoldButton, Input, Badge } from '../../components/ui';
import { theme } from '../../lib/theme';
import { useSubscription } from '../../context/SubscriptionContext';
import { PaywallModal } from '../../components/paywall';

// ─── Şifre Değiştirme Modal ───────────────────────────────────
function PasswordModal({ visible, onClose, userEmail }: {
  visible: boolean;
  onClose: () => void;
  userEmail: string;
}) {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState<'verify' | 'change'>('verify');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setOldPass(''); setNewPass(''); setConfirm('');
    setStep('verify');
    onClose();
  };

  const handleVerifyOld = async () => {
    if (!oldPass) { Alert.alert('Hata', 'Mevcut şifrenizi girin.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: userEmail, password: oldPass });
    setLoading(false);
    if (error) {
      Alert.alert('Hata', 'Mevcut şifreniz yanlış.');
    } else {
      setStep('change');
    }
  };

  const handleChange = async () => {
    if (newPass.length < 6) { Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.'); return; }
    if (newPass !== confirm) { Alert.alert('Hata', 'Şifreler eşleşmiyor.'); return; }
    if (newPass === oldPass) { Alert.alert('Hata', 'Yeni şifre eski şifreyle aynı olamaz.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Başarılı', 'Şifreniz güncellendi.');
      handleClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>
            {step === 'verify' ? 'Mevcut Şifreyi Doğrula' : 'Yeni Şifre Belirle'}
          </Text>
          {step === 'verify' ? (
            <>
              <Input label="Mevcut Şifre" value={oldPass} onChangeText={setOldPass} secureTextEntry placeholder="••••••" />
              <GoldButton onPress={handleVerifyOld} loading={loading}>Doğrula</GoldButton>
            </>
          ) : (
            <>
              <Input label="Yeni Şifre" value={newPass} onChangeText={setNewPass} secureTextEntry placeholder="En az 6 karakter" />
              <Input label="Yeni Şifre (Tekrar)" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••" />
              <GoldButton onPress={handleChange} loading={loading}>Şifreyi Güncelle</GoldButton>
            </>
          )}
          <TouchableOpacity onPress={handleClose} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── KVKK Modal ───────────────────────────────────────────────
function KVKKModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
          <Text style={styles.modalTitle}>KVKK & Gizlilik Politikası</Text>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.kvkkText}>
              LexCalc uygulaması, kullanıcılarına ait kişisel verileri yalnızca uygulamanın işlevselliği için kullanmaktadır.{'\n\n'}
              Toplanan veriler: Ad soyad, e-posta adresi ve hesaplama kayıtları.{'\n\n'}
              Verileriniz Supabase altyapısında güvenli şekilde saklanır ve üçüncü taraflarla paylaşılmaz.{'\n\n'}
              Verilerinizin silinmesini talep etmek için destek@lexcalc.tr adresine yazabilirsiniz.{'\n\n'}
              Bu politika 6698 sayılı KVKK kapsamında hazırlanmıştır.
            </Text>
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
            <Text style={styles.modalCancelText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Ana Ekran ─────────────────────────────────────────────────
export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showKVKK, setShowKVKK] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { subscription, isPremium, isTrialActive, daysLeft, refresh: refreshSub } = useSubscription();

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (data) {
      setProfile({ ...data, email: session.user.email });
      setFullName(data.full_name || '');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
    }).eq('id', profile?.id);
    setSaving(false);
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      setProfile((p: any) => ({ ...p, full_name: fullName.trim() }));
      setEditing(false);
    }
  };

  const handleSupport = () => {
    const subject = encodeURIComponent('LexCalc Destek Talebi');
    const body = encodeURIComponent(`Uygulama: LexCalc\nKullanıcı: ${profile?.full_name || ''}\n\nSorun / Öneri:\n`);
    Linking.openURL(`mailto:destek@lexcalc.tr?subject=${subject}&body=${body}`);
  };

  const handleRate = () => {
    Alert.alert('Uygulamayı Değerlendir', 'Play Store sayfamıza yönlendirileceksiniz.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Değerlendir', onPress: () => Linking.openURL('market://details?id=com.lexcalc.app') },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Hesabı Sil', 'Tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabı Sil', style: 'destructive',
        onPress: async () => {
          await supabase.from('calculations').delete().eq('user_id', profile?.id);
          await supabase.from('profiles').delete().eq('id', profile?.id);
          await signOut();
        },
      },
    ]);
  };

  const menuItems = [
    { icon: '🔒', label: 'Güvenlik & Şifre Değiştir', onPress: () => setShowPassword(true) },
    { icon: '💬', label: 'Destek & Geri Bildirim', sub: 'destek@lexcalc.tr', onPress: handleSupport },
    { icon: '📋', label: 'KVKK & Gizlilik Politikası', onPress: () => setShowKVKK(true) },
    { icon: '⭐', label: 'Uygulamayı Değerlendir', onPress: handleRate },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Kullanıcı'}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        {/* Abonelik Kartı */}
        <TouchableOpacity
          onPress={() => !isPremium && setShowPaywall(true)}
          activeOpacity={isPremium ? 1 : 0.7}
        >
          <Card style={[styles.card, isPremium ? { borderColor: theme.accentMuted } : { borderColor: '#E0525244' }]}>
            <View style={styles.subRow}>
              <Text style={styles.subIcon}>{isPremium ? '👑' : '🔒'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subStatus, { color: isPremium ? theme.accent : theme.danger }]}>
                  {isPremium
                    ? isTrialActive ? `Deneme Süresi — ${daysLeft} gün kaldı` : 'Premium Aktif'
                    : 'Ücretsiz Plan'}
                </Text>
                <Text style={styles.subDetail}>
                  {isPremium
                    ? isTrialActive
                      ? 'Premium özelliklere deneme erişiminiz var'
                      : subscription?.plan === 'yearly' ? 'Yıllık Plan' : 'Aylık Plan'
                    : 'Reklamsız kullanım için Premium\'a geçin'}
                </Text>
              </View>
              {!isPremium && (
                <View style={styles.upgradeBadge}>
                  <Text style={styles.upgradeBadgeText}>Premium</Text>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>

        {/* Profil Düzenle */}
        {editing ? (
          <Card style={[styles.card, { borderColor: theme.accentMuted }]}>
            <Text style={styles.editTitle}>Profili Düzenle</Text>
            <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" />
            <View style={styles.editBtns}>
              <GoldButton onPress={handleSave} loading={saving} style={{ flex: 1 }}>Kaydet</GoldButton>
              <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          <Card style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ad Soyad</Text>
              <Text style={styles.infoValue}>{profile?.full_name || '—'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={styles.infoValue}>{profile?.email || '—'}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>✎ Profili Düzenle</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Menü */}
        <Card style={styles.card}>
          {menuItems.map((item, i) => (
            <View key={i}>
              <TouchableOpacity onPress={item.onPress} style={styles.menuItem}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.sub && <Text style={styles.menuSub}>{item.sub}</Text>}
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
              {i < menuItems.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>

        <GoldButton onPress={signOut} style={{ marginBottom: 8 }}>Çıkış Yap</GoldButton>
        <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Hesabı Sil</Text>
        </TouchableOpacity>

        <Text style={styles.version}>LexCalc v1.0.0</Text>

      </ScrollView>

      <PasswordModal visible={showPassword} onClose={() => setShowPassword(false)} userEmail={profile?.email || ''} />
      <KVKKModal visible={showKVKK} onClose={() => setShowKVKK(false)} />
      <PaywallModal visible={showPaywall} onClose={() => { setShowPaywall(false); refreshSub(); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarIcon: { fontSize: 32 },
  name: { fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 4 },
  email: { fontSize: 13, color: theme.textMuted },
  card: { gap: 0 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subIcon: { fontSize: 24 },
  subStatus: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  subDetail: { fontSize: 12, color: theme.textMuted },
  upgradeBadge: { backgroundColor: theme.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  upgradeBadgeText: { fontSize: 11, fontWeight: '700', color: '#0D0F14' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabel: { fontSize: 13, color: theme.textMuted },
  infoValue: { fontSize: 13, color: theme.text, fontWeight: '500', flex: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: theme.border },
  editBtn: { marginTop: 14, alignSelf: 'flex-end' },
  editBtnText: { fontSize: 13, color: theme.accent, fontWeight: '600' },
  editTitle: { fontSize: 13, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '500', marginBottom: 14 },
  editBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, color: theme.textMuted, fontWeight: '600' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  menuIcon: { fontSize: 18, width: 28 },
  menuLabel: { fontSize: 14, color: theme.text, fontWeight: '500' },
  menuSub: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
  menuArrow: { fontSize: 18, color: theme.textMuted },
  deleteBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteBtnText: { fontSize: 13, color: theme.danger },
  version: { fontSize: 11, color: theme.textMuted, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { fontSize: 14, color: theme.textMuted },
  kvkkText: { fontSize: 13, color: theme.textMuted, lineHeight: 22 },
});
