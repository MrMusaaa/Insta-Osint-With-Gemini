# 🔍 Instagram Public Index OSINT Suite

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/AI_Engine-Gemini_3.8_Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/License-MIT-success?style=for-the-badge" alt="MIT License" />
</p>

---

## 📌 Proje Hakkında (About the Project)

**Instagram Public Index OSINT Suite**, siber güvenlik analistleri, açık kaynak istihbaratı (OSINT) araştırmacıları, adli bilişim uzmanları ve pentest ekipleri için geliştirilmiş tam teşekküllü bir **açık arama motoru indeksi ve dilbilimsel profil çıkarma platformudur**.

Instagram oturum açma duvarlarına (login wall), bot engellerine takılmadan; arama motorlarının (Google, Bing vb.) kamuya açık indekslediği metin parçacıklarını (**snippets**) toplar, SHA-256 ile tekilleştirir ve **Google Gemini 3.8 Flash** yapay zekası ile dilbilimsel ton, jargon ve tematik analiz raporu oluşturur.

> 🛡️ **Güvenlik & Gizlilik İlkesi:** Bu araç hesap çalma, özel mesaj okuma veya yetkisiz veri ihlali yapmaz. Yalnızca **arama motorlarında herkese açık olarak indekslenmiş verileri** pasif OSINT yöntemleriyle inceler.

---

## ✨ Öne Çıkan Özellikler

- **🚫 Sıfır Oturum Açma (Zero Login-Wall):** Sahte hesap, bot veya Instagram şifresi gerektirmez. Hesap banlanma riski sıfırdır.
- **⚡ Çift Çalışma Modu (Dual-Mode):**
  - **Modern Web Dashboard:** React 19, TypeScript ve Tailwind CSS v4 ile inşa edilmiş, karanlık mod odaklı, siber operasyon temalı web arayüzü.
  - **Bağımsız Python CLI (`instagram_osint.py`):** Sunucularda, headless ortamlarda veya terminal scriptlerinde tek başına çalışabilen hafif komut satırı aracı.
- **🎯 9'lu OSINT Dork Matrisi:**
  1. `site:instagram.com/{target}/` *(Doğrudan profil indeksi)*
  2. `site:instagram.com "{target}"` *(Genel platform bahsetmeleri)*
  3. `site:instagram.com intext:"@{target}"` *(Açıklama ve bio etiketleri)*
  4. `site:instagram.com inurl:"{target}"` *(URL varyasyonları)*
  5. `site:instagram.com/p/ "{target}"` *(Gönderi içerikleri)*
  6. `site:instagram.com/reel/ "{target}"` *(Reels ve video açıklamaları)*
  7. `site:instagram.com/explore/tags/ "{target}"` *(Etiket ilişkileri)*
  8. `"{target}" (site:picuki.com | site:imginn.com | site:dumpor.com | site:storiesig.info)` *(Açık ayna servisler)*
  9. `"{target}" site:instagram.com` *(Genişletilmiş indeks taraması)*
- **🧠 Yapay Zeka Dilbilimsel & Üslup Analizi (Gemini 3.8 Flash):**
  - URL ve platform meta verilerini ayıklayarak saf metin analizi yapar.
  - Dil kaydı (resmi/samimi), bölgesel söylemler, jargon ve baskın temaları tespit eder.
  - Yanıltıcı profillemeyi önlemek için otomatik "Doğrulanmamış İfade" denetimi uygular.
- **🔒 Geçici Bellek (RAM) Mimarisi:**
  - İncelenen hesap verileri kalıcı veri tabanına kaydedilmez.
  - Tek tıkla bellek temizleme (Wipe RAM) özelliği mevcuttur.
- **💾 Çoklu Dışa Aktarım (Export):**
  - JSON ve CSV veri seti indirme
  - Markdown (`.md`) formatında yönetici analiz raporu
  - Tek tıkla Python CLI scripti ve proje ZIP arşivi indirme

---

## 🏗️ Proje Mimarisi

```text
├── instagram_osint.py         # Bağımsız Python 3.10+ CLI aracı
├── server.ts                  # Express.js arka uç & API köprüsü
├── index.html                 # Web uygulaması giriş noktası
├── package.json               # Node.js bağımlılıkları ve çalıştırma komutları
├── .env.example               # Güvenli ortam değişkenleri şablonu
├── .gitignore                 # Gizli anahtarları, session ve geçici dosyaları engeller
├── src/
│   ├── App.tsx                # Ana arayüz mantığı ve sekme yönetimi
│   ├── components/            # Modüler React bileşenleri
│   │   ├── Header.tsx         # Üst menü, dışa aktarım butonları ve konsol tetikleyici
│   │   ├── ProfileBioCard.tsx # Profil kartı, istatistikler ve avatar yönetimi
│   │   ├── SnippetsTable.tsx  # İndeks kayıtları tablosu, filtreleme ve arama
│   │   ├── DorkInspector.tsx  # 9'lu dork inceleyici ve Google bağlantıları
│   │   ├── AnalysisReport.tsx # Gemini AI dilbilimsel analiz raporu görünümü
│   │   ├── CliCodeViewer.tsx  # Dahili Python CLI kod görüntüleyici
│   │   ├── TerminalView.tsx   # Canlı operasyonel terminal ve log akışı
│   │   └── GoogleCSEEmbed.tsx # Programlanabilir arama motoru entegrasyonu
│   ├── prompts/
│   │   └── geminiPrompts.ts   # Gemini OSINT sistem istemleri ve metin temizleyicileri
│   ├── utils/
│   │   └── instagramParser.ts # Girdi temizleme ve metin ayrıştırma yardımcıları
│   └── types.ts               # TypeScript veri tipleri
└── public/                    # Statik web varlıkları
```

---

## 🚀 Hızlı Başlangıç (Kurulum)

### Gereksinimler

- **Node.js** (v18 veya üzeri)
- **npm** veya **bun**
- **Python** (v3.10 veya üzeri - CLI aracı için)

### 1. Repoyu Klonlayın

```bash
git clone https://github.com/kullanici-adiniz/instagram-osint-suite.git
cd instagram-osint-suite
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

*(İsteğe bağlı: Python Instaloader modülü)*:
```bash
pip install instaloader
```

### 3. Ortam Değişkenlerini Ayarlayın

Örnek `.env.example` dosyasını `.env` olarak kopyalayın:

```bash
cp .env.example .env
```

`.env` dosyanızı açıp API anahtarınızı girin:

```env
# Gemini API Anahtarı (Yapay Zeka Analizleri için)
# https://aistudio.google.com/ adresinden ücretsiz alabilirsiniz
GEMINI_API_KEY="your_gemini_api_key_here"

# İsteğe Bağlı: Google Custom Search API
GOOGLE_CUSTOM_SEARCH_API_KEY=""
GOOGLE_SEARCH_CX=""
VITE_GOOGLE_SEARCH_CX=""
```

> ⚠️ **UYARI:** `.env` dosyanızı **asla** GitHub'a göndermeyin! Repodaki `.gitignore` dosyası bu dosyayı otomatik olarak hariç tutacak şekilde ayarlanmıştır.

### 4. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcınızda açın:
```text
http://localhost:3000
```

---

## 💻 Python CLI Kullanımı (`instagram_osint.py`)

Arayüze gerek kalmadan doğrudan terminal üzerinden çalışabilirsiniz:

### 1. Profil Bilgilerini ve İstatistikleri Çekme
```bash
python3 instagram_osint.py fetch-profile --username "hedef_kullanici"
```

### 2. İndeks Snippet'lerini Toplama
```bash
python3 instagram_osint.py collect --username "hedef_kullanici" --pages 3
```

### 3. Gemini AI ile Dilbilimsel Analiz Gerçekleştirme
```bash
export GEMINI_API_KEY="kendi_api_anahtariniz"
python3 instagram_osint.py analyze --username "hedef_kullanici"
```

### 4. Uçtan Uca Tam OSINT Taraması Çalıştırma
```bash
python3 instagram_osint.py run-all --username "hedef_kullanici" --pages 5
```

---

## 🛡️ Güvenlik, Gizlilik ve Public Repo Hazırlığı

Bu depo açık kaynak (Public Repo) haline getirilmek üzere özel olarak sanitize edilmiştir:

1. **Hiçbir Özel Anahtar Barındırmaz:** Kod içerisinde hardcoded API anahtarı, kişisel token veya gizli değer bulunmaz.
2. **Kişisel Veri ve Test Hesapları Temizlendi:** Önceden analiz edilen hesap adları, yerel test profilleri ve indirilmiş resimler repodan tamamen kaldırılmıştır.
3. **Kapsamlı `.gitignore`:** `.env*`, `*.session`, `instaloader*`, `osint_output/`, `public/avatar_*` ve python cache dizinleri git takibinden çıkartılmıştır.
4. **Veri Minimizasyonu:** Yapay zekaya gönderilen sorgularda üçüncü şahıs bağlantıları ve kullanıcı adları filtrelenerek gizlilik standartlarına uyulur.

---

## ⚖️ Yasal ve Etik Sorumluluk Reddi (Disclaimer)

- Bu yazılım yalnızca **yasal güvenlik araştırmaları, adli analizler, tehdit istihbaratı ve eğitim amaçları** için tasarlanmıştır.
- Hedef hesapların özel hayatına müdahale, siber taciz, yetkisiz gözetleme veya kötü niyetli istihbarat toplama faaliyetleri kesinlikle desteklenmemektedir.
- Aracın kullanımından doğabilecek tüm hukuki ve cezai sorumluluk tamamen kullanıcıya aittir. Kullanıcıların yürürlükteki yasalara (KVKK, GDPR vb.) uyması zorunludur.

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.
