# Toilet Near Me

> Aplikasi untuk menemukan toilet umum terdekat dari lokasi kamu, kapan pun dan di mana pun dibutuhkan.

Project ini dibuat untuk memenuhi tugas mata kuliah **Layanan dan Aplikasi Internet**.

---

##  Tentang Project
**Toilet Near Me** dibuat untuk membantu pengguna menemukan toilet umum terdekat berdasarkan lokasi mereka secara cepat dan mudah. Project ini mengintegrasikan layanan aplikasi (service) agar data lokasi toilet dapat diakses, ditampilkan, dan dikelola dengan baik.

## Fitur Utama

- Menampilkan toilet terdekat berdasarkan lokasi pengguna
- Tampilan lokasi toilet pada peta
- Informasi detail toilet (nama, alamat, jarak, dll.)
- Pencarian dan filter toilet
- Rating / ulasan toilet
- Penambahan data toilet baru 

## Teknologi yang Digunakan

| Kategori | Teknologi |
|----------|-----------|
| Frontend | HTML, CSS, JavaScript (vanilla) |
| Backend / BaaS | [Supabase](https://supabase.com) |
| Database | PostgreSQL (via Supabase) |
| Autentikasi | Supabase Auth |
| Peta | Leaflet |

## Struktur Project

```
Project-Layap-Toilet-Near-Me/
├── backend/
│   └── supabase-setup.sql      # Skema database & setup Supabase
├── frontend/
│   ├── admin/                  # Halaman panel admin
│   │   ├── admin.html
│   │   ├── admin.css
│   │   └── admin.js
│   ├── css/                    # Stylesheet global
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── login.css
│   │   ├── main.css
│   │   └── pages.css
│   ├── js/                     # Logika aplikasi
│   │   ├── auth.js             # Autentikasi
│   │   ├── config.js           # Konfigurasi Supabase
│   │   ├── map.js              # Peta
│   │   ├── report.js           # Fitur laporan
│   │   └── utils.js            # Fungsi bantu
│   ├── pages/
│   │   ├── home.html           # Beranda (peta)
│   │   ├── login.html          # Halaman login
│   │   ├── my-reports.html     # Daftar laporan pengguna
│   │   └── report.html         # Form laporan
│   └── index.html              # Halaman awal
├── .gitignore
└── README.md
```

## Cara Menjalankan

### Prasyarat

Pastikan sudah terpasang:

- [Git](https://git-scm.com/downloads)
- [Visual Studio Code](https://code.visualstudio.com/)
- Ekstensi **Live Server** di VS Code (oleh Ritwick Dey)
- Browser modern (Chrome, Edge, atau Firefox)

### Instalasi

1. **Clone repository**
   ```bash
   git clone https://github.com/haswium/Project-Layap-Toilet-Near-Me.git
   cd Project-Layap-Toilet-Near-Me
   ```
2. **Install extension "Live Server"**
   
   Pada VS Code, tekan `Ctrl+Shift+X`, cari Live Server (pembuatnya Ritwick Dey), lalu klik Install.

4. **Jalankan aplikasi**
   
    Klik kanan file `frontend/index.html` pada file explorer, kemudian klik **Open with Live Server**. Browser akan terbuka otomatis.

## Tim Pengembang

| Nama | NRP | Peran |
|------|-----|-------|
| Reidita Eirene Anastasia Katampuge | 5024241001 | Backend |
| Hasna Widyaningrum | 5024241004 | Frontend |
| Aisyah Nuuri Winsetyowati | 5024241008 | Frontend |
| Verdia Nachel Tunggal Dewi | 5024241012 | UI/UX |

