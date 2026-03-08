import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Input, GoldButton } from '../../components/ui';
import { theme } from '../../lib/theme';

type Step = 'form' | 'success';

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);

    if (error) {
      Alert.alert('Kayıt Hatası', error.message);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName.trim(),
      });
    }

    // Başarı ekranına geç
    setStep('success');
  };

  // ─── Başarı Ekranı ─────────────────────────────────────────
  if (step === 'success') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <Text style={styles.successIcon}>📧</Text>
          </View>
          <Text style={styles.successTitle}>E-postanızı Doğrulayın</Text>
          <Text style={styles.successDesc}>
            <Text style={{ color: theme.accent, fontWeight: '600' }}>{email}</Text>
            {' '}adresine bir doğrulama bağlantısı gönderdik.{'\n\n'}
            Lütfen gelen kutunuzu kontrol edin ve bağlantıya tıklayarak hesabınızı aktive edin.
          </Text>

          <View style={styles.stepsBox}>
            {[
              { n: '1', text: 'E-posta gelen kutunuzu açın' },
              { n: '2', text: '"LexCalc\'tan" gelen maili bulun' },
              { n: '3', text: '"Hesabı Doğrula" butonuna tıklayın' },
              { n: '4', text: 'Giriş yapın ve kullanmaya başlayın' },
            ].map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.n}</Text>
                </View>
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>

          <GoldButton onPress={() => router.replace('/(auth)/login' as any)} style={{ marginTop: 8 }}>
            Giriş Ekranına Git
          </GoldButton>

          <Text style={styles.spamNote}>
            Mail görünmüyorsa spam/gereksiz klasörünü kontrol edin.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Kayıt Formu ───────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Ücretsiz kayıt olun, hemen kullanmaya başlayın</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Ad Soyad"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ad Soyad"
              autoCapitalize="words"
            />
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              placeholder="En az 6 karakter"
              secureTextEntry
            />
            <Input
              label="Şifre Tekrar"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              secureTextEntry
            />

            <GoldButton onPress={handleRegister} loading={loading} style={{ marginTop: 8 }}>
              Kayıt Ol
            </GoldButton>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
                <Text style={styles.loginLink}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.kvkkBox}>
            <Text style={styles.kvkkText}>
              🔒 Kayıt olarak KVKK kapsamındaki Gizlilik Politikası'nı kabul etmiş sayılırsınız.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  // Success
  successContainer: { flex: 1, paddingHorizontal: 28, paddingTop: 60, alignItems: 'center' },
  successIconBox: {
    width: 90, height: 90, borderRadius: 24,
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  successIcon: { fontSize: 44 },
  successTitle: { fontSize: 24, fontWeight: '800', color: theme.text, marginBottom: 16, textAlign: 'center' },
  successDesc: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  stepsBox: {
    width: '100%', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, padding: 18, gap: 14, marginBottom: 24,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: 13, fontWeight: '700', color: theme.accent },
  stepText: { fontSize: 14, color: theme.text, flex: 1 },
  spamNote: { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 16 },

  // Form
  header: { paddingTop: 16, marginBottom: 8 },
  backBtn: {
    width: 36, height: 36, backgroundColor: theme.surface,
    borderRadius: 10, borderWidth: 1, borderColor: theme.border,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 22, color: theme.text },
  titleSection: { paddingTop: 24, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textMuted, marginTop: 8 },
  form: { gap: 12 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  loginText: { fontSize: 14, color: theme.textMuted },
  loginLink: { fontSize: 14, color: theme.accent, fontWeight: '600' },
  kvkkBox: {
    marginTop: 24, backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 14,
  },
  kvkkText: { fontSize: 12, color: theme.textMuted, textAlign: 'center', lineHeight: 18 },
});
