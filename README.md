# 🎈 Harf Balonu — iOS & Android

React Native + Expo + Skia oyunu.

---

## 📋 Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Lokal test (Expo Go ile)
npx expo start

# 3. Android emülatör
npx expo start --android

# 4. iOS simülatör (Mac gerekli)
npx expo start --ios
```

---

## 🏗️ APK / IPA Build

### Yöntem 1 — EAS Build (tavsiye)

```bash
# EAS CLI kur
npm install -g eas-cli

# Expo hesabına giriş
eas login

# EAS projesini bağla (ilk seferinde)
eas init

# APK (test için)
eas build --platform android --profile production-apk

# AAB (Play Store için)
eas build --platform android --profile production

# IPA (App Store için)
eas build --platform ios --profile production
```

### Yöntem 2 — CodeMagic CI/CD

1. GitHub'a push et
2. [codemagic.io](https://codemagic.io) → "Add application" → GitHub repo seç
3. `codemagic.yaml` otomatik algılanır
4. Environment Variables ekle (aşağıya bak)
5. Build başlat

---

## 🔑 CodeMagic Environment Variables

### Zorunlu (tüm buildler için)

| Değişken | Açıklama |
|----------|----------|
| `EAS_TOKEN` | [expo.dev](https://expo.dev) → Account → Access Tokens |

### Android APK/AAB için

| Değişken | Açıklama |
|----------|----------|
| `ANDROID_KEYSTORE` | Base64 encode edilmiş `.jks` dosyası |
| `KEY_ALIAS` | Keystore key alias |
| `KEY_PASSWORD` | Key şifresi |
| `STORE_PASSWORD` | Keystore şifresi |

Android keystore oluşturmak için:
```bash
keytool -genkey -v \
  -keystore harf-balonu.jks \
  -alias harf-balonu \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

### iOS için

| Değişken | Açıklama |
|----------|----------|
| `APPLE_ID` | Apple Developer hesabı e-posta |
| `APP_SPECIFIC_PASSWORD` | appleid.apple.com → App-Specific Password |
| `APPLE_TEAM_ID` | developer.apple.com → Membership |
| `APP_STORE_CONNECT_PRIVATE_KEY` | App Store Connect API key (.p8) |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | API Key ID |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID |

---

## 📁 Proje Yapısı

```
harf-balonu-app/
├── App.js                    # Ana ekran + oyun loop
├── index.js                  # Entry point
├── app.json                  # Expo config
├── eas.json                  # EAS build profilleri
├── codemagic.yaml            # CI/CD pipeline
├── src/
│   └── game/
│       ├── words.js          # Türkçe kelime listeleri
│       ├── physics.js        # Mermi fiziği, ghost line, küme şekilleri
│       └── colors.js         # Renk paleti
└── assets/
    ├── icon.png              # 1024×1024 uygulama ikonu
    ├── splash.png            # Splash screen
    └── adaptive-icon.png     # Android adaptive icon (foreground)
```

---

## 🖼️ Assets

`assets/` klasörüne şunları ekle:

| Dosya | Boyut | Açıklama |
|-------|-------|----------|
| `icon.png` | 1024×1024 | App Store / Play Store ikonu |
| `splash.png` | 1284×2778 | Splash screen (iPhone 14 Pro Max) |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |

Hızlı oluşturmak için: [appicon.co](https://www.appicon.co) veya [makeappicon.com](https://makeappicon.com)

---

## 🚀 GitHub → CodeMagic Otomatik Build

`codemagic.yaml` ayarına göre:

- **`main` branch'e push** → Android APK otomatik build
- **`v*` tag push** → Android AAB + iOS IPA build + store'a submit

```bash
# Tag ile release tetikle
git tag v1.0.0
git push origin v1.0.0
```

---

## ⚠️ Önemli Notlar

1. **`app.json`'daki `YOUR_EAS_PROJECT_ID`** alanını `eas init` sonrası güncelle
2. **`bundleIdentifier` / `package`** alanlarını kendi şirket adınla değiştir
3. `@shopify/react-native-skia` canvas rendering için kullanılıyor — `expo prebuild` gerektirebilir
4. Test için en kolay yol: `eas build --profile preview` → APK indir, telefona yükle

---

## 🎮 Oyun Özellikleri

- Türkçe harf balonları (İ/I ayrımı garantili)
- Rastgele küme şekilleri (elmas, üçgen, petek, spiral…)
- Hayalet nişan çizgisi (açık/kapalı, kapalıyken +%20 puan)
- Duvardan sekme → bonus puan
- İpucu sistemi (2 hak, -5 sn)
- Yanlış harf → -5 sn
- Her 5 turda kelime uzunluğu artar
- Final animasyonu + motivasyon mesajları
