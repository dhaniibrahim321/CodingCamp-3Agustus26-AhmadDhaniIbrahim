# Implementation Plan: Expense & Budget Visualizer

## Overview

Implementasi aplikasi web client-side single-page tanpa framework menggunakan HTML, CSS, dan Vanilla JavaScript murni. Struktur file mencakup `index.html`, `css/style.css`, dan `js/app.js`. State dikelola melalui `AppState` in-memory yang disinkronkan ke LocalStorage dan DOM setelah setiap mutasi.

---

## Tasks

- [x] 1. Project scaffold — struktur file dan folder
  - Buat direktori `css/` dan `js/` di root proyek
  - Buat file kosong `index.html`, `css/style.css`, dan `js/app.js`
  - Verifikasi bahwa struktur sesuai dengan Requirement 10.1–10.3
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 2. HTML skeleton — kerangka semantik lengkap
  - [x] 2.1 Buat kerangka HTML dasar dengan `<header>`, `<main>`, dan `<section>` yang diperlukan
    - Tambahkan `<body data-theme="light">` sebagai titik injeksi tema
    - Buat `<header>` berisi `<h1>`, `#balance-display`, dan `#theme-toggle` (min 44×44px)
    - Buat `<nav id="tab-nav">` dengan dua tombol: `data-tab="main"` dan `data-tab="monthly"`
    - _Requirements: 3.1, 6.1, 7.1, 10.4, 10.5_
  - [x] 2.2 Buat komponen Input Form dan Custom Category UI
    - Buat `<form id="transaction-form">` dengan field `#item-name`, `#amount`, `#category` (select)
    - Tambahkan span error di bawah setiap field: `#item-name-error`, `#amount-error`, `#category-error`
    - Buat `<div id="custom-category-section">` dengan `#custom-category-input`, `#add-category-btn`, `#custom-category-error`
    - _Requirements: 1.1, 1.2, 5.1_
  - [x] 2.3 Buat komponen Transaction List, Chart Section, dan Monthly Summary
    - Buat `<ul id="transaction-list">` dalam `<section id="list-section">`
    - Buat `<section id="chart-section">` dengan `<canvas id="expense-chart">` dan `<p id="chart-placeholder">`
    - Buat `<div id="monthly-summary">` dalam `<section id="summary-section">`
    - Tambahkan tag `<script>` untuk Chart.js CDN dan referensi ke `js/app.js`
    - Tambahkan tag `<link>` untuk referensi ke `css/style.css` menggunakan path relatif
    - _Requirements: 2.1, 4.2, 6.1, 9.2, 10.5_

- [ ] 3. CSS foundation — custom properties, reset, layout, dan light theme
  - [x] 3.1 Definisikan CSS custom properties untuk light theme dan lakukan CSS reset
    - Definisikan semua `--color-*` variables pada `:root` (bg, surface, text-primary, text-secondary, accent, danger, border, shadow)
    - Lakukan box-sizing reset, margin/padding reset pada elemen umum
    - _Requirements: 7.2, 10.4_
  - [x] 3.2 Implementasikan layout utama menggunakan CSS Grid/Flexbox
    - Buat layout header dengan flexbox (title+balance di kiri, toggle di kanan)
    - Buat grid dua kolom untuk area form+chart di layar lebar
    - Beri `max-height` dan `overflow-y: auto` pada `#transaction-list`
    - Tambahkan style dasar untuk form, button, input, select, dan list item
    - _Requirements: 2.2, 3.1, 9.4_

- [x] 4. Dark mode CSS — dark theme variables dan transisi
  - Definisikan override CSS custom properties pada selector `[data-theme="dark"]`
  - Tambahkan CSS `transition` pada properti background-color dan color untuk semua elemen relevan (durasi < 200ms)
  - Pastikan semua elemen form, list, chart section, dan header mewarisi variabel tema dengan benar
  - _Requirements: 7.2, 7.3_

- [] 5. JS constants, AppState, dan utility functions
  - [x] 5.1 Definisikan konstanta dan AppState di `js/app.js`
    - Definisikan `STORAGE_KEYS`, `DEFAULT_CATEGORIES`, `MAX_CUSTOM_CATEGORIES`, `MAX_ITEM_NAME_LENGTH`, `MAX_CUSTOM_CATEGORY_LENGTH`, `AMOUNT_MIN`, `AMOUNT_MAX`, `BALANCE_MAX`
    - Definisikan objek `AppState = { transactions: [], categories: [], theme: 'light' }`
    - _Requirements: 1.1, 3.4, 3.6, 5.6, 10.4_
  - [x] 5.2 Implementasikan utility functions: `generateId`, `formatCurrency`, `formatBalance`
    - `generateId()`: gunakan `crypto.randomUUID()` dengan fallback manual
    - `formatCurrency(amount)`: format `1234567.89` → `"Rp 1.234.567,89"` (titik ribuan, koma desimal)
    - `formatBalance(amount)`: format tanpa desimal `1234567` → `"Rp 1.234.567"`
    - _Requirements: 2.1, 3.4, 6.3_
  - [x] 5.3 Implementasikan utility functions: `formatMonthYear`, `getMonthKey`, `clampBalance`
    - `formatMonthYear(timestamp)`: hasilkan nama bulan penuh Bahasa Indonesia + tahun 4 digit (contoh: "Januari 2025")
    - `getMonthKey(timestamp)`: hasilkan string kunci `"YYYY-MM"` untuk pengelompokan
    - `clampBalance(total)`: batasi ke `BALANCE_MAX`, kembalikan `{ value, overflow: boolean }`
    - _Requirements: 3.4, 3.6, 6.3_
    - **Validates: Requirements 2.1, 3.4, 6.3**

- [ ] 6. LocalStorage wrappers — objek `Storage`
  - [x] 6.1 Implementasikan `Storage.isAvailable()` dan method `saveTransactions` / `loadTransactions`
    - `isAvailable()`: deteksi ketersediaan LocalStorage dengan operasi dummy write/read/delete
    - `saveTransactions(transactions)`: serialisasi ke JSON, simpan ke `ebv_transactions`, bungkus dengan `try/catch`
    - `loadTransactions()`: muat, parse JSON, validasi schema setiap objek; data corrupt → return `[]` dan panggil `showCorruptDataNotification()`
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  - [x] 6.2 Implementasikan method `saveCustomCategories`, `loadCustomCategories`, `saveTheme`, `loadTheme`
    - Setiap `save*`: bungkus `try/catch`, panggil `showStorageError(context)` jika gagal
    - `loadTheme()`: kembalikan `null` jika kunci tidak ada
    - Pastikan kunci `ebv_custom_categories` dan `ebv_theme` terpisah dari `ebv_transactions`
    - _Requirements: 5.3, 7.4, 8.3, 8.4_

- [x] 7. Validation functions — `validateTransactionForm` dan `validateCustomCategory`
  - [x] 7.1 Implementasikan `validateTransactionForm(name, amount, category)`
    - Validasi `name`: tidak kosong setelah trim, panjang 1–100 karakter
    - Validasi `amount`: bukan NaN, `AMOUNT_MIN ≤ amount ≤ AMOUNT_MAX`
    - Validasi `category`: tidak kosong, ada dalam daftar kategori aktif
    - Kembalikan `{ valid: boolean, errors: { name?, amount?, category? } }`
    - _Requirements: 1.3, 1.4_
  - [x] 7.2 Implementasikan `validateCustomCategory(name, existingCategories)`
    - Validasi: tidak kosong setelah trim, panjang ≤ 50, tidak duplikat (case-insensitive)
    - Kembalikan `{ valid: boolean, errors: { name? } }`
    - _Requirements: 5.5_

- [x] 8. Domain functions — `addTransaction` dan `deleteTransaction`
  - [x] 8.1 Implementasikan `addTransaction(name, amountStr, category)`
    - Langkah: validasi → buat objek Transaction → prepend ke `AppState.transactions` → `Storage.saveTransactions` (rollback jika gagal) → `render()`
    - Jika storage gagal: rollback dan tampilkan error, jangan tambahkan ke list
    - _Requirements: 1.3, 1.5, 1.6, 1.7, 2.3, 8.1_
  
  - [x] 8.3 Implementasikan `deleteTransaction(id)`
    - Langkah: cari indeks → buat copy array baru tanpa item tersebut → `Storage.saveTransactions(newArray)` (jika gagal: tampilkan error, return tanpa mutasi state) → `AppState.transactions = newArray` → `render()`
    - _Requirements: 2.4, 2.5, 8.1_
  
- [ ] 9. Domain function — `addCustomCategory`
  - [x] 9.1 Implementasikan `addCustomCategory(name)`
    - Validasi via `validateCustomCategory`; tampilkan error jika invalid
    - Tambahkan ke `AppState.categories` secara terurut alfabetis
    - `Storage.saveCustomCategories(customOnly)` — simpan hanya kategori kustom (bukan default)
    - Panggil `renderCategoryDropdown()` untuk memperbarui dropdown
    - Jika total kategori kustom sudah 20: nonaktifkan `#add-category-btn` dan tampilkan pesan batas
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6_
  

- [ ] 10. Rendering functions — `renderTransactionList`, `renderBalanceDisplay`, `renderCategoryDropdown`
  - [x] 10.1 Implementasikan `renderTransactionList()`
    - Jika `AppState.transactions` kosong: ganti `#transaction-list` dengan pesan empty state (Requirement 2.6)
    - Untuk setiap transaksi: render `<li>` berisi nama (maks 100 char), `formatCurrency(amount)`, kategori, dan tombol hapus dengan `data-id`
    - Urutkan dari timestamp tertinggi ke terendah (newest first)
    - _Requirements: 2.1, 2.3, 2.6_
  
  - [x] 10.3 Implementasikan `renderBalanceDisplay()` dan `renderCategoryDropdown()`
    - `renderBalanceDisplay()`: hitung total dari `AppState.transactions`, gunakan `clampBalance()`, tampilkan via `formatBalance()`; jika overflow tampilkan indikator "⚠ Melebihi batas tampilan"
    - `renderCategoryDropdown()`: rebuild `<select id="category">` dari `AppState.categories` tanpa default terpilih; urutkan secara alfabetis
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.2_
  - [x] 10.4 Implementasikan `showFieldError(fieldId, message)`, `clearFieldErrors()`, dan fungsi `render()` utama
    - `showFieldError`: tampilkan teks error pada span error yang sesuai (`#item-name-error`, dll)
    - `clearFieldErrors`: reset semua span error sebelum setiap submit
    - `render()`: orkestrasi panggil `renderTransactionList()`, `renderBalanceDisplay()`, `renderChart()`, `renderMonthlySummary()`, `renderCategoryDropdown()`; bungkus dalam `try/catch`
    - _Requirements: 1.3, 1.4_

- [x] 11. Chart integration — `groupByCategory`, `generateChartColors`, `renderChart`
  - [x] 11.1 Implementasikan `groupByCategory(transactions)` dan `generateChartColors(count)`
    - `groupByCategory`: agregasi `amount` per kategori; kembalikan `Record<string, number>`
    - `generateChartColors(count)`: gunakan 20 warna predefined, lalu generate via golden angle HSL (`hue = (i * 137.508) % 360`) untuk count > 20
    - _Requirements: 4.1, 4.6, 4.7_
  
  - [x] 11.3 Implementasikan `renderChart()` dengan pola destroy + recreate
    - Jika data kosong: sembunyikan `<canvas>`, tampilkan `#chart-placeholder`, destroy instance lama jika ada
    - Jika ada data: tampilkan canvas, destroy instance lama, buat instance Chart.js baru (pie, label, percentage tooltip, legend di bottom)
    - Sesuaikan warna label legend/tooltip berdasarkan `AppState.theme` (light: `#1a1a1a`, dark: `#f1f1f1`)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 12. Monthly summary — `groupByMonth` dan `renderMonthlySummary`
  - [x] 12.1 Implementasikan `groupByMonth(transactions)`
    - Kelompokkan transaksi berdasarkan `getMonthKey(timestamp)`
    - Untuk setiap kelompok: hitung total amount, buat label via `formatMonthYear()`
    - Urutkan descending berdasarkan key string (`"2024-03"` > `"2024-02"`)
    - Kembalikan `MonthGroup[]` dengan maks 120 entri
    - _Requirements: 6.2_
  
  - [x] 12.3 Implementasikan `renderMonthlySummary()`
    - Jika kosong: tampilkan pesan empty state (Requirement 6.5)
    - Untuk setiap `MonthGroup`: render baris berisi label bulan, tahun, dan total via `formatCurrency()`
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [x] 13. Theme management — `setTheme`, `detectInitialTheme`, `updateThemeToggleIcon`
  - Implementasikan `detectInitialTheme()`: baca `Storage.loadTheme()` → fallback ke `prefers-color-scheme: dark` → fallback ke `'light'`
  - Implementasikan `setTheme(theme)`: update `AppState.theme`, set `document.body.setAttribute('data-theme', theme)`, panggil `Storage.saveTheme()`, panggil `updateThemeToggleIcon()`
  - Implementasikan `updateThemeToggleIcon(theme)`: tampilkan ikon/label matahari untuk light, bulan untuk dark
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 14. Initialization — `init()` dan event listeners
  - [x] 14.1 Implementasikan fungsi `init()` yang dipanggil pada event `DOMContentLoaded`
    - Urutan: `detectInitialTheme()` → `setTheme()` → load data dari `Storage.load*` → isi `AppState` → `render()`
    - Cek `Storage.isAvailable()` di awal; jika false: tampilkan banner notifikasi persisten
    - _Requirements: 7.5, 8.2, 8.4, 9.3_
  - [x] 14.2 Pasang event listeners untuk form submit dan delete delegation
    - Form submit (`#transaction-form`): `clearFieldErrors()`, ambil nilai, panggil `addTransaction()`, set fokus ke field error pertama jika invalid
    - Delete delegation pada `#transaction-list`: cek `data-id` pada elemen yang diklik, panggil `deleteTransaction(id)`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.4_
  - [x] 14.3 Pasang event listeners untuk theme toggle, tab navigation, dan add category
    - Theme toggle (`#theme-toggle`): toggle antara `'light'` dan `'dark'`, panggil `setTheme()` dan `renderChart()` (untuk update warna label)
    - Tab navigation (`#tab-nav`): toggle class `active` pada tombol, toggle visibilitas section list+chart vs monthly-summary
    - Add category (`#add-category-btn`): ambil nilai `#custom-category-input`, panggil `addCustomCategory()`
    - _Requirements: 5.1, 6.1, 7.1, 7.2_
  - [x] 14.4 Pasang CDN failure detection untuk Chart.js
    - Tambahkan listener pada `window load` event dengan `setTimeout(5000)`
    - Jika `typeof Chart === 'undefined'`: ganti konten `#chart-section` dengan pesan "Grafik tidak tersedia. Periksa koneksi internet Anda."
    - _Requirements: 9.5_

- [x] 15. Toast notification system — `showToast`, `showStorageError`, `showCorruptDataNotification`
  - Implementasikan `showToast(message, type, duration)`: buat elemen toast, append ke body, auto-remove setelah `duration` ms; type: `'error' | 'warning' | 'info'`
  - Implementasikan `showStorageError(context)`: panggil `showToast` dengan pesan yang menginformasikan konteks kegagalan storage
  - Implementasikan `showCorruptDataNotification()`: tampilkan notifikasi satu kali bahwa data sebelumnya tidak dapat dimuat
  - Tambahkan CSS untuk elemen toast (posisi fixed, z-index tinggi, animasi masuk/keluar)
  - _Requirements: 1.7, 2.5, 8.4, 8.5_

- [x] 16. Responsive CSS — layout mobile < 768px dan scrollable transaction list
  - Tambahkan media query `@media (max-width: 768px)` pada `css/style.css`
  - Ubah grid dua kolom form+chart menjadi satu kolom (ditumpuk vertikal)
  - Pastikan `#transaction-list` tetap scrollable dengan `max-height` yang sesuai di semua ukuran layar
  - Pastikan tombol dan kontrol interaktif memiliki area sentuh minimal 44×44px
  - _Requirements: 2.2, 7.1_

- [x] 17. Empty states, error UI, dan balance overflow indicator
  - Pastikan pesan empty state muncul di `#transaction-list` saat tidak ada transaksi (Requirement 2.6)
  - Pastikan pesan empty state muncul di `#chart-placeholder` saat tidak ada data (Requirement 4.5)
  - Pastikan pesan empty state muncul di `#monthly-summary` saat tidak ada data (Requirement 6.5)
  - Pastikan indikator overflow "⚠ Melebihi batas tampilan" muncul di `#balance-display` saat total > `BALANCE_MAX` (Requirement 3.6)
  - Pastikan semua span error form ditampilkan di bawah field yang sesuai tanpa mereset field lain (Requirement 1.4)
  - _Requirements: 1.4, 2.6, 3.5, 3.6, 4.5, 6.5_

- [x] 18. Accessibility dan polish akhir
  - Tambahkan atribut `aria-label` pada tombol hapus per transaksi, `#theme-toggle`, dan `#add-category-btn`
  - Pastikan semua elemen interaktif dapat dijangkau via keyboard navigation (Tab, Enter, Space)
  - Pastikan contrast ratio minimum 4.5:1 antara teks dan background untuk kedua tema
  - Tambahkan `role`, `aria-live`, atau `aria-atomic` pada area yang diperbarui dinamis (`#balance-display`, toast container) untuk screen reader
  - Verifikasi semua tombol memiliki area sentuh minimal 44×44px
  - _Requirements: 4.6, 7.1, 9.1_

- [x] 19. Final checkpoint — semua fitur terintegrasi
  - Pastikan semua test pass, verifikasi alur lengkap: tambah transaksi → list, balance, chart semua terupdate
  - Verifikasi alur hapus: hapus transaksi → list, balance, chart semua terupdate
  - Verifikasi persistensi: tambah transaksi → simulasi reload → semua data muncul kembali
  - Pastikan aplikasi berfungsi ketika dibuka langsung via `file://` tanpa server
  - Tanyakan kepada pengguna jika ada pertanyaan atau masalah yang ditemukan.

---

## Notes

- Tugas bertanda `*` adalah opsional (property-based tests) dan dapat dilewati untuk MVP lebih cepat
- Setiap tugas mereferensikan requirements spesifik untuk keterlacakan
- Pola destroy + recreate pada Chart.js dipilih untuk kesederhanaan dan menghindari masalah animasi stale
- Tema diterapkan sebelum `render()` pertama di `init()` untuk menghindari flash of unstyled content
- Event delegation digunakan pada `#transaction-list` — satu listener di container, bukan per-item
- Property tests menggunakan fast-check dengan minimum 100 iterasi per test
- Test suite dijalankan terpisah dari aplikasi produksi di folder `tests/`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "5.1"] },
    { "id": 3, "tasks": ["4", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "6.4", "7.1", "7.2"] },
    { "id": 6, "tasks": ["7.3", "8.1", "8.3", "9.1"] },
    { "id": 7, "tasks": ["8.2", "8.4", "9.2", "10.1", "10.3"] },
    { "id": 8, "tasks": ["10.2", "10.4", "11.1", "12.1"] },
    { "id": 9, "tasks": ["11.2", "11.3", "12.2", "12.3", "13"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3", "14.4", "15"] },
    { "id": 11, "tasks": ["16", "17"] },
    { "id": 12, "tasks": ["18", "19"] }
  ]
}
```
