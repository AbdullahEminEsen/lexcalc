import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { GoldButton, Input } from '../../components/ui';
import { theme } from '../../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre zorunludur.');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      Alert.alert('Giriş Hatası', 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>⚖</Text>
            </View>
            <Text style={styles.logoTitle}>LexCalc</Text>
            <Text style={styles.logoSub}>Hukuki Hesaplama Platformu</Text>
          </View>

          {/* Form */}
          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="avukat@hukuk.av.tr"
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

          <TouchableOpacity style={styles.forgotWrapper}>
            <Text style={styles.forgotText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <GoldButton onPress={handleLogin} loading={loading}>
            Giriş Yap
          </GoldButton>

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Hesabınız yok mu? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>

          {/* KVKK Note */}
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
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoContainer: { alignItems: 'center', marginBottom: 44 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#C9A96E', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoIcon: { fontSize: 28 },
  logoTitle: { fontSize: 28, fontWeight: '700', color: theme.text },
  logoSub: { fontSize: 13, color: theme.textMuted, marginTop: 6 },
  forgotWrapper: { alignItems: 'flex-end', marginBottom: 22 },
  forgotText: { fontSize: 13, color: theme.accent },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  registerText: { fontSize: 13, color: theme.textMuted },
  registerLink: { fontSize: 13, color: theme.accent },
  kvkkBox: {
    marginTop: 40, padding: 14,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12, borderWidth: 1, borderColor: theme.border,
  },
  kvkkText: { fontSize: 11, color: theme.textMuted, textAlign: 'center', lineHeight: 18 },
});
