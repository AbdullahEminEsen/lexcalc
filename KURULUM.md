# LexCalc — Kurulum Rehberi

## 1. Supabase Veritabanı Kurulumu

1. https://supabase.com adresine gidin ve projenizi açın
2. Sol menüden **SQL Editor** tıklayın
3. **+ New Query** butonuna tıklayın
4. `supabase_setup.sql` dosyasının tüm içeriğini yapıştırın
5. **Run** (▶) butonuna tıklayın
6. En altta `LexCalc veritabanı başarıyla kuruldu!` mesajını görmelisiniz

### Supabase Auth Ayarları
Sol menüden **Authentication > Email Templates** gidin:
- "Confirm signup" şablonunu Türkçe'ye çevirebilirsiniz
- Site URL: `lexcalc://` olarak ayarlayın (Authentication > URL Configuration)

---

## 2. Bilgisayara Gereksinimler

### Node.js Kurulumu
- https://nodejs.org adresine gidin
- **LTS** versiyonunu indirin ve kurun
- Terminal açın: `node -v` yazın, versiyon görünüyorsa kuruldu

### Expo CLI
```bash
npm install -g expo-cli
```

---

## 3. Projeyi Çalıştırma

```bash
# Proje klasörüne girin
cd lexcalc-expo

# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın
npx expo start
```

Terminalde bir QR kodu görünecek.

---

## 4. Telefonunuzda Test Etme

### iOS
1. App Store'dan **"Expo Go"** uygulamasını indirin
2. iPhone kameranızla QR kodu tarayın
3. Uygulama doğrudan telefonda açılır

### Android
1. Play Store'dan **"Expo Go"** uygulamasını indirin
2. Expo Go içindeki "Scan QR Code" ile tarayın

> Not: Telefon ve bilgisayarın aynı Wi-Fi ağında olması gerekir.

---

## 5. Mağazaya Çıkma (Hazır Olduğunuzda)

### EAS Build Kurulumu
```bash
npm install -g eas-cli
eas login
eas build:configure
```

### Android APK/AAB Oluşturma
```bash
eas build --platform android
```

### iOS IPA Oluşturma
```bash
eas build --platform ios
```

> iOS için Apple Developer hesabı ($99/yıl) gereklidir.
> Android için Google Play Console hesabı ($25 tek seferlik) gereklidir.

---

## Proje Klasör Yapısı

```
lexcalc-expo/
├── app/
│   ├── _layout.tsx          # Kök layout + auth yönlendirme
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx        # Giriş ekranı
│   │   ├── register.tsx     # Kayıt ekranı
│   │   └── verify.tsx       # E-posta doğrulama
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar
│   │   ├── home.tsx         # Ana sayfa
│   │   ├── history.tsx      # Kayıtlı işlemler
│   │   ├── analytics.tsx    # Analiz & grafikler
│   │   ├── variables.tsx    # Değişkenler
│   │   └── profile.tsx      # Profil
│   └── calc/
│       ├── [type].tsx       # Dinamik hesaplama ekranı
│       └── custom.tsx       # Özel formül ekranı
├── components/
│   └── ui.tsx               # Paylaşılan UI bileşenleri
├── context/
│   └── AuthContext.tsx      # Auth state yönetimi
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── theme.ts             # Renk & tasarım sabitleri
│   └── calculations.ts      # Hesaplama mantığı
├── supabase_setup.sql       # Veritabanı kurulum scripti
├── app.json                 # Expo konfigürasyonu
└── package.json             # Bağımlılıklar
```

---

## Sorun Giderme

**"Metro bundler başlamıyor"**
```bash
npx expo start --clear
```

**"Module not found" hatası**
```bash
rm -rf node_modules
npm install
```

**Supabase bağlantı hatası**
- `lib/supabase.ts` içindeki URL ve Key'i kontrol edin
- Supabase projesinin "Paused" durumda olmadığından emin olun

---

## Destek
Herhangi bir sorun yaşarsanız, hata mesajını paylaşın.
