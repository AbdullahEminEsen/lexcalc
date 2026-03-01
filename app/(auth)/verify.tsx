import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoldButton } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { theme } from '../../lib/theme';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      Alert.alert('Hata', 'E-posta tekrar gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    } else {
      Alert.alert('Gönderildi', 'Doğrulama e-postası tekrar gönderildi.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        <View style={styles.iconBox}>
          <Text style={styles.icon}>📧</Text>
        </View>

        <Text style={styles.title}>E-postanızı Doğrulayın</Text>
        <Text style={styles.subtitle}>
          <Text style={{ color: theme.accent }}>{email}</Text>
          {' '}adresine bir doğrulama bağlantısı gönderdik.
        </Text>

        <View style={styles.steps}>
          {[
            'Gelen kutunuzu kontrol edin',
            '"LexCalc E-posta Doğrulama" mailini açın',
            '"Doğrula" butonuna tıklayın',
            'Uygulama otomatik olarak açılacak',
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.spamNote}>
          <Text style={styles.spamText}>
            📁 Mail gelmedi mi? Spam / Gereksiz klasörünü kontrol edin.
          </Text>
        </View>

        <GoldButton onPress={handleResend} loading={resending} variant="outline" style={{ marginBottom: 12 }}>
          Tekrar Gönder
        </GoldButton>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.backText}>← Giriş sayfasına dön</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, padding: 28, justifyContent: 'center' },
  iconBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: theme.accentDim,
    borderWidth: 1, borderColor: theme.accentMuted,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 24,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  steps: { gap: 14, marginBottom: 28 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accentMuted, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '700', color: theme.accent },
  stepText: { fontSize: 14, color: theme.textMuted, flex: 1 },
  spamNote: { backgroundColor: theme.surfaceAlt, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 28 },
  spamText: { fontSize: 12, color: theme.textDim, textAlign: 'center', lineHeight: 18 },
  backText: { fontSize: 13, color: theme.textMuted, textAlign: 'center', marginTop: 12 },
});
