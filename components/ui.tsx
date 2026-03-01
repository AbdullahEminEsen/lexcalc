import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../lib/theme';

// ─── CARD ────────────────────────────────────────────────────
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}
        style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── GOLD BUTTON ─────────────────────────────────────────────
export function GoldButton({
  children,
  onPress,
  variant = 'primary',
  small,
  loading,
  style,
  textStyle,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'outline';
  small?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonOutline,
        small && styles.buttonSmall,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#0D0F14' : theme.accent} />
      ) : (
        <Text style={[
          styles.buttonText,
          isPrimary ? styles.buttonTextPrimary : styles.buttonTextOutline,
          small && styles.buttonTextSmall,
          textStyle,
        ]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── INPUT ───────────────────────────────────────────────────
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  prefix,
  suffix,
  small,
  multiline,
  numberOfLines,
  autoCapitalize,
}: {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  prefix?: string;
  suffix?: string;
  small?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: any;
}) {
  return (
    <View style={{ marginBottom: small ? 10 : 16 }}>
      {label && (
        <Text style={styles.inputLabel}>{label}</Text>
      )}
      <View style={styles.inputWrapper}>
        {prefix && <Text style={styles.inputAffix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textDim}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          style={[
            styles.input,
            small && styles.inputSmall,
            prefix ? { paddingLeft: 32 } : {},
            suffix ? { paddingRight: 40 } : {},
            multiline ? { minHeight: 80, textAlignVertical: 'top' } : {},
          ]}
        />
        {suffix && <Text style={[styles.inputAffix, { left: undefined, right: 12 }]}>{suffix}</Text>}
      </View>
    </View>
  );
}

// ─── BADGE ───────────────────────────────────────────────────
export function Badge({ children, color = theme.accent }: { children: React.ReactNode; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }]}>
      <Text style={[styles.badgeText, { color }]}>{children as string}</Text>
    </View>
  );
}

// ─── SCREEN HEADER ───────────────────────────────────────────
export function ScreenHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.screenHeader}>
      <Text style={styles.screenTitle}>{title}</Text>
      {action}
    </View>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────
export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 18,
  },
  button: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#C9A96E',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.accent,
  },
  buttonSmall: {
    padding: 10,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonTextPrimary: {
    color: '#0D0F14',
  },
  buttonTextOutline: {
    color: theme.accent,
  },
  buttonTextSmall: {
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 15,
  },
  inputSmall: {
    paddingVertical: 9,
    fontSize: 13,
  },
  inputAffix: {
    position: 'absolute',
    left: 12,
    color: theme.textMuted,
    fontSize: 14,
    zIndex: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    color: theme.textMuted,
    fontSize: 14,
  },
});

// ─── DATE INPUT ──────────────────────────────────────────────
// Otomatik GG.AA.YYYY maskesi — kullanıcı sadece rakam girer
export function DateInput({
  label,
  value,
  onChangeText,
  placeholder = 'GG.AA.YYYY',
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const handleChange = (raw: string) => {
    // Sadece rakamları al
    const digits = raw.replace(/\D/g, '').slice(0, 8);

    // GG.AA.YYYY formatına dönüştür
    let masked = '';
    if (digits.length <= 2) {
      masked = digits;
    } else if (digits.length <= 4) {
      masked = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    } else {
      masked = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
    }

    onChangeText(masked);
  };

  const isValid = value.length === 10;
  const isEmpty = value.length === 0;

  return (
    <View style={dateStyles.wrapper}>
      {label && <Text style={dateStyles.label}>{label}</Text>}
      <View style={[
        dateStyles.inputRow,
        isValid && dateStyles.inputValid,
      ]}>
        <Text style={dateStyles.calIcon}>📅</Text>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textDim}
          keyboardType="numeric"
          style={dateStyles.input}
          maxLength={10}
        />
        {isValid && <Text style={dateStyles.checkIcon}>✓</Text>}
        {!isEmpty && !isValid && (
          <Text style={dateStyles.formatHint}>
            {value.length < 10 ? `${10 - value.length} karakter kaldı` : ''}
          </Text>
        )}
      </View>
      {!isEmpty && !isValid && (
        <Text style={dateStyles.hint}>GG.AA.YYYY formatında girin</Text>
      )}
    </View>
  );
}

const dateStyles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: 11,
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputValid: {
    borderColor: '#22c55e66',
    backgroundColor: '#22c55e08',
  },
  calIcon: { fontSize: 16 },
  input: {
    flex: 1,
    color: theme.text,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  checkIcon: { fontSize: 16, color: '#22c55e' },
  formatHint: { fontSize: 11, color: theme.textDim },
  hint: { fontSize: 11, color: theme.textDim, marginTop: -2 },
});
