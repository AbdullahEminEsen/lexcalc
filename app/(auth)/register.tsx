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

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Hata', 'Ad soyad, e-posta ve şifre zorunludur.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, fullName, firmName);
    setLoading(false);

    if (error) {
      Alert.alert('Kayıt Hatası', error.message);
    } else {
      router.push({ pathname: '/(auth)/verify', params: { email } });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Kayıt Ol</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.logoMini}>
            <View style={styles.logoBox}><Text style={{ fontSize: 22 }}>⚖</Text></View>
            <View>
              <Text style={styles.logoTitle}>LexCalc'e Hoş Geldiniz</Text>
              <Text style={styles.logoSub}>Avukat hesabı oluşturun</Text>
            </View>
          </View>

          <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Av. Mehmet Yılmaz" />
          <Input label="Büro / Firma Adı (İsteğe Bağlı)" value={firmName} onChangeText={setFirmName} placeholder="Yılmaz Hukuk Bürosu" />
          <Input label="E-posta" value={email} onChangeText={setEmail} placeholder="avukat@hukuk.av.tr" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry />
          <Input label="Şifre Tekrar" value={passwordConfirm} onChangeText={setPasswordConfirm} placeholder="••••••••" secureTextEntry />

          <GoldButton onPress={handleRegister} loading={loading} style={{ marginTop: 8 }}>
            Hesap Oluştur
          </GoldButton>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Zaten hesabınız var mı? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.kvkkBox}>
            <Text style={styles.kvkkText}>
              Kayıt olarak Gizlilik Politikamızı ve KVKK kapsamındaki haklarınızı kabul etmiş olursunuz.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flexGrow: 1, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 38, height: 38, backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: theme.text },
  title: { fontSize: 17, fontWeight: '600', color: theme.text },
  logoMini: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#C9A96E', alignItems: 'center', justifyContent: 'center' },
  logoTitle: { fontSize: 16, fontWeight: '700', color: theme.text },
  logoSub: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { fontSize: 13, color: theme.textMuted },
  loginLink: { fontSize: 13, color: theme.accent },
  kvkkBox: { marginTop: 24, padding: 14, backgroundColor: theme.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
  kvkkText: { fontSize: 11, color: theme.textDim, textAlign: 'center', lineHeight: 17 },
});
