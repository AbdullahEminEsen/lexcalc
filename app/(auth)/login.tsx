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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gereklidir.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) Alert.alert('Giriş Hatası', error.message);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Hata', 'Önce e-posta adresinizi girin.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Alert.alert('Gönderildi', 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>⚖️</Text>
            </View>
            <Text style={styles.appName}>LexCalc</Text>
            <Text style={styles.appSub}>Vergi & Harç Hesaplama</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
              placeholder="••••••••"
              secureTextEntry
            />

            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Şifremi Unuttum</Text>
            </TouchableOpacity>

            <GoldButton onPress={handleLogin} loading={loading}>
              Giriş Yap
            </GoldButton>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Hesabınız yok mu? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text style={styles.registerLink}>Kayıt Ol</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Alt bilgi */}
          <View style={styles.kvkkBox}>
            <Text style={styles.kvkkText}>
              🔒 Tüm veriler KVKK uyumlu şifreli bağlantı ile korunmaktadır
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
  logoSection: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logoBox: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: theme.accent,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 28, fontWeight: '800', color: theme.text, letterSpacing: 0.5 },
  appSub: { fontSize: 14, color: theme.textMuted, marginTop: 6 },
  form: { gap: 12 },
  forgotBtn: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, color: theme.accent, fontWeight: '500' },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  registerText: { fontSize: 14, color: theme.textMuted },
  registerLink: { fontSize: 14, color: theme.accent, fontWeight: '600' },
  kvkkBox: {
    marginTop: 32, backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  kvkkText: { fontSize: 12, color: theme.textMuted, textAlign: 'center', lineHeight: 18 },
});
