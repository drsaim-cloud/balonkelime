# 🎈 Harf Balonu

React Native + Expo oyunu. CodeMagic ile native APK/IPA build.

---

## 🚀 Kurulum (Lokal)

```bash
npm install --legacy-peer-deps
npx expo start
```

---

## 📦 CodeMagic ile APK Build

### 1. GitHub'a push et
```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/KULLANICI/harf-balonu.git
git push -u origin main
```

### 2. CodeMagic'e bağla
1. [codemagic.io](https://codemagic.io) → GitHub ile giriş
2. "Add application" → repo'yu seç
3. `codemagic.yaml` otomatik algılanır

### 3. Android Keystore oluştur ve ekle
```bash
keytool -genkey -v \
  -keystore harf-balonu.jks \
  -alias harf-balonu \
  -keyalg RSA -keysize 2048 -validity 10000
```
CodeMagic → **Code signing** → **Android** → Upload keystore
- Keystore adı: `harf_balonu_keystore` (yaml ile eşleşmeli)

### 4. Build başlat
CodeMagic → **android-apk** workflow → **Start build**

Build ~15 dk sürer. APK e-posta ile gelir + dashboard'dan indirilir.

---

## 📁 Yapı

```
harf-balonu-app/
├── App.js              # Ana ekran
├── index.js            # Entry point
├── app.json            # Expo config
├── codemagic.yaml      # CI/CD (EAS YOK — native build)
├── src/game/
│   ├── words.js        # Kelime listeleri
│   ├── physics.js      # Fizik & şekiller
│   └── colors.js       # Renk paleti
└── assets/             # icon.png, splash.png, adaptive-icon.png
```

---

## ⚠️ Önemli

- `com.yourcompany.harfbalonu` → kendi paket adınla değiştir (`app.json`)
- `your@email.com` → kendi e-postanla değiştir (`codemagic.yaml`)
- Assets'leri gerçek tasarımlarla değiştir (şu an placeholder)
