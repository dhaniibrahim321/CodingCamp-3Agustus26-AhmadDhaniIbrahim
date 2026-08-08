# Design Document — Expense & Budget Visualizer

## Overview

Expense & Budget Visualizer adalah aplikasi web single-page berbasis client-side. Tidak ada server backend, tidak ada build step, tidak ada framework. Seluruh logika berjalan di browser menggunakan HTML, CSS, dan Vanilla JavaScript murni. Penyimpanan data menggunakan Browser LocalStorage API. Visualisasi menggunakan Chart.js yang dimuat via CDN.

Tujuan desain utama:
- **Zero-dependency runtime** — hanya Chart.js via CDN sebagai library eksternal.
- **Offline-capable** — semua fitur inti berfungsi tanpa koneksi internet setelah halaman pertama kali dimuat (kecuali Chart.js CDN).
- **Predictable state** — satu sumber kebenaran tunggal di memori (`AppState`), selalu disinkronkan dengan LocalStorage dan DOM setelah setiap mutasi.

---

## Architecture

### Pola Arsitektur

Aplikasi menggunakan pola **Event-Driven Single Source of Truth**:

1. Pengguna berinteraksi dengan DOM (click, submit).
2. Event handler memanggil fungsi domain (mis. `addTransaction`, `deleteTransaction`).
3. Fungsi domain memutasi `AppState` (in-memory).
4. Fungsi domain menulis ke LocalStorage (`Storage.save*`).
5. Fungsi domain memanggil `render()` — fungsi rendering idempoten yang membangun ulang seluruh tampilan dari `AppState`.

```
User Interaction
      │
      ▼
Event Handler (app.js)
      │
      ▼
Domain Function (addTransaction / deleteTransaction / addCategory / setTheme)
      │
      ├──► AppState (in-memory array/object)
      │
      ├──► Storage.*  (LocalStorage)
      │
      └──► render()  ──► DOM Update
                    ├──► Balance_Display
                    ├──► Transaction_List
                    ├──► Chart (Chart.js)
                    └──► Monthly_Summary
```

### Struktur File

```
project-root/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

---

## Components and Interfaces

### HTML Structure (index.html)

```
<body data-theme="light">
  ├── <header>
  │     ├── <h1> App Title
  │     ├── <div id="balance-display">  ← Balance_Display
  │     └── <button id="theme-toggle"> ← Theme_Toggle (min 44×44px)
  │
  ├── <main>
  │     ├── <section id="input-section">
  │     │     ├── <form id="transaction-form">   ← Input_Form
  │     │     │     ├── <input id="item-name">
  │     │     │     ├── <span id="item-name-error">
  │     │     │     ├── <input id="amount">
  │     │     │     ├── <span id="amount-error">
  │     │     │     ├── <select id="category">
  │     │     │     ├── <span id="category-error">
  │     │     │     └── <button type="submit">
  │     │     └── <div id="custom-category-section">  ← Custom Category UI
  │     │           ├── <input id="custom-category-input">
  │     │           ├── <button id="add-category-btn">
  │     │           └── <span id="custom-category-error">
  │     │
  │     ├── <section id="list-section">
  │     │     └── <ul id="transaction-list">     ← Transaction_List
  │     │           └── <li> per transaction (name | amount | category | delete btn)
  │     │
  │     └── <section id="chart-section">
  │           ├── <canvas id="expense-chart">   ← Chart
  │           └── <p id="chart-placeholder">
  │
  └── <section id="summary-section">
        ├── <nav id="tab-nav">
        │     ├── <button data-tab="main"> Transaksi
        │     └── <button data-tab="monthly"> Ringkasan Bulanan
        └── <div id="monthly-summary">          ← Monthly_Summary
              └── <div> per bulan (month-year | total)
```

### Komponen dan Tanggung Jawab

| Komponen | Elemen DOM | Tanggung Jawab |
|---|---|---|
| Input_Form | `#transaction-form` | Mengumpulkan data transaksi baru, validasi, submit |
| Transaction_List | `#transaction-list` | Render daftar transaksi, tombol hapus |
| Balance_Display | `#balance-display` | Tampilkan total saldo |
| Chart | `#expense-chart` | Visualisasi pie chart via Chart.js |
| Monthly_Summary | `#monthly-summary` | Tampilkan ringkasan per bulan |
| Theme_Toggle | `#theme-toggle` | Ganti tema light/dark |
| Custom Category UI | `#custom-category-section` | Tambah kategori kustom |

---

## Data Models

### Transaction Object

```js
{
  id: string,          // UUID v4 — "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
  name: string,        // 1–100 karakter, sudah di-trim
  amount: number,      // float, 0.01 ≤ amount ≤ 999999999.99
  category: string,    // nama kategori, tidak kosong
  timestamp: number    // Date.now() pada saat penambahan (ms sejak epoch)
}
```

### AppState (In-Memory)

```js
const AppState = {
  transactions: [],    // Transaction[]  — urutan insert, newest first
  categories: [],      // string[]       — ['Food','Transport','Fun', ...custom]
  theme: 'light'       // 'light' | 'dark'
};
```

### LocalStorage Schema

| Key | Value Type | Isi |
|---|---|---|
| `ebv_transactions` | JSON string | `Transaction[]` — array lengkap, diserialisasi ulang setiap mutasi |
| `ebv_custom_categories` | JSON string | `string[]` — hanya kategori kustom (tidak termasuk default) |
| `ebv_theme` | string | `'light'` atau `'dark'` |

**Alasan tiga kunci terpisah**: Requirement 8.3 mengharuskan preferensi (tema, kategori) disimpan di kunci berbeda dari data transaksi agar mutasi satu jenis data tidak memengaruhi kunci lainnya.

### Default Categories (Hardcoded, tidak disimpan ke LocalStorage)

```js
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
```

---

## Module / Function Design (js/app.js)

Seluruh kode ditulis dalam satu file `js/app.js`. File diorganisasi menjadi modul-modul logis menggunakan komentar section header.

### 1. Constants & Configuration

```js
const STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CUSTOM_CATEGORIES: 'ebv_custom_categories',
  THEME: 'ebv_theme'
};

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
const MAX_CUSTOM_CATEGORIES = 20;
const MAX_ITEM_NAME_LENGTH = 100;
const MAX_CUSTOM_CATEGORY_LENGTH = 50;
const AMOUNT_MIN = 0.01;
const AMOUNT_MAX = 999_999_999.99;
const BALANCE_MAX = 999_999_999_999;
```

### 2. Utility Functions

| Fungsi | Signature | Deskripsi |
|---|---|---|
| `generateId()` | `() → string` | UUID v4 sederhana via `crypto.randomUUID()` dengan fallback manual |
| `formatCurrency(amount)` | `(number) → string` | Format `1234567.89` → `"Rp 1.234.567,89"` (titik ribuan, koma desimal) |
| `formatBalance(amount)` | `(number) → string` | Format tanpa desimal `1234567` → `"Rp 1.234.567"` |
| `formatMonthYear(timestamp)` | `(number) → string` | `1700000000000` → `"November 2023"` (nama bulan penuh bahasa Indonesia) |
| `getMonthKey(timestamp)` | `(number) → string` | `"2023-11"` — kunci pengelompokan |
| `clampBalance(total)` | `(number) → {value, overflow}` | Batasi ke `BALANCE_MAX`, tandai overflow |

### 3. LocalStorage Wrappers

```js
const Storage = {
  isAvailable(): boolean,
  saveTransactions(transactions: Transaction[]): void,
  loadTransactions(): Transaction[],
  saveCustomCategories(cats: string[]): void,
  loadCustomCategories(): string[],
  saveTheme(theme: string): void,
  loadTheme(): string | null
};
```

- Setiap method `save*` dibungkus dengan `try/catch`. Jika gagal, memanggil `showStorageError(context)`.
- `loadTransactions()` memvalidasi setiap objek sebelum diterima. Data corrupt → kembalikan `[]` dan panggil `showCorruptDataNotification()`.
- `isAvailable()` mendeteksi ketersediaan LocalStorage dengan mencoba operasi dummy write/read/delete.

### 4. Validation

```js
function validateTransactionForm(name, amount, category): ValidationResult {
  // ValidationResult: { valid: boolean, errors: { name?, amount?, category? } }
}

function validateCustomCategory(name, existingCategories): ValidationResult
```

**Aturan validasi:**
- `name`: tidak kosong setelah trim, panjang 1–100 karakter
- `amount`: bukan NaN, `AMOUNT_MIN ≤ amount ≤ AMOUNT_MAX`
- `category`: tidak kosong, ada dalam daftar kategori aktif
- Custom category: tidak kosong setelah trim, panjang ≤ 50, tidak duplikat (case-insensitive)

### 5. Domain Functions (CRUD)

```js
function addTransaction(name, amountStr, category): void
function deleteTransaction(id): void
function addCustomCategory(name): void
```

Urutan operasi `addTransaction`:
1. Validasi input.
2. Jika invalid → tampilkan error, return.
3. Buat objek `Transaction`.
4. Prepend ke `AppState.transactions`.
5. `Storage.saveTransactions(AppState.transactions)` — jika gagal, rollback dan tampilkan error.
6. `render()`.

Urutan operasi `deleteTransaction`:
1. Cari indeks transaksi di `AppState.transactions`.
2. Buat copy array tanpa transaksi tersebut.
3. `Storage.saveTransactions(newArray)` — jika gagal, tampilkan error dan return (tidak mutasi state).
4. `AppState.transactions = newArray`.
5. `render()`.

### 6. Rendering Functions

```js
function render(): void                         // Orchestrator — memanggil semua sub-render
function renderTransactionList(): void           // Rebuild <ul> dari AppState.transactions
function renderBalanceDisplay(): void            // Update teks #balance-display
function renderChart(): void                     // Destroy + recreate Chart.js instance
function renderMonthlySummary(): void            // Rebuild #monthly-summary
function renderCategoryDropdown(): void          // Rebuild <select> options dari AppState.categories
function renderTheme(): void                     // Set data-theme attribute pada <body>
function showFieldError(fieldId, message): void  // Tampilkan error di bawah field
function clearFieldErrors(): void               // Hapus semua error sebelum submit berikutnya
function showStorageError(context): void         // Toast/notifikasi non-blocking
function showCorruptDataNotification(): void     // Notifikasi satu kali tentang data corrupt
```

### 7. Chart Management

```js
let chartInstance = null;   // Referensi instance Chart.js aktif

function renderChart(): void {
  // Hitung data: groupByCategory(AppState.transactions)
  // Jika kosong: sembunyikan canvas, tampilkan placeholder, return
  // Jika chartInstance ada: chartInstance.destroy()
  // Buat instance baru dengan config lengkap
  // chartInstance = new Chart(ctx, config)
}

function groupByCategory(transactions): Record<string, number>
function generateChartColors(count): string[]
```

**Strategi destroy + recreate** dipilih (dibanding `.update()`) karena lebih sederhana dan tidak memiliki masalah animasi sisa saat kategori ditambah/dihapus secara dinamis.

### 8. Monthly Grouping

```js
function groupByMonth(transactions): MonthGroup[]
// MonthGroup: { key: string, label: string, total: number }
// Diurutkan descending berdasarkan key ("2024-03" > "2024-02")
```

### 9. Theme Management

```js
function setTheme(theme: 'light' | 'dark'): void
function detectInitialTheme(): 'light' | 'dark'
// Prioritas: localStorage → prefers-color-scheme → 'light'
```

### 10. Initialization

```js
document.addEventListener('DOMContentLoaded', function init() {
  // 1. Inisialisasi tema (sebelum render apapun — hindari flash)
  // 2. Load data dari LocalStorage
  // 3. Inisialisasi AppState
  // 4. Pasang event listeners (form submit, delete delegation, theme toggle, tab nav, add category)
  // 5. render()
  // 6. Deteksi CDN failure Chart.js
});
```

**Event Delegation** digunakan pada `#transaction-list` untuk tombol hapus — satu listener di container, bukan per-item.

---

## UI/UX Layout

### Layout Overview (Single Page)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER                                                  │
│  ┌──────────────────────────┐  ┌──────────┐             │
│  │  Expense & Budget         │  │ ☀️ / 🌙  │  ← Toggle  │
│  │  Visualizer               │  └──────────┘             │
│  │  Total: Rp 1.234.567      │                           │
│  └──────────────────────────┘                           │
├─────────────────────────────────────────────────────────┤
│  TAB NAV: [ Transaksi ] [ Ringkasan Bulanan ]           │
├────────────────────┬────────────────────────────────────┤
│  INPUT FORM        │  CHART (Pie)                        │
│  Item Name: ____   │                                     │
│  Amount:    ____   │       🥧 Pie Chart                  │
│  Category:  [v]    │   Food 45% | Transport 30% ...     │
│  [Tambah]          │                                     │
│  ── Custom Cat ──  │                                     │
│  Cat Name: __[+]   │                                     │
├────────────────────┴────────────────────────────────────┤
│  TRANSACTION LIST (scrollable, max-height defined)      │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Makan Siang    Rp 25.000   Food     [🗑 Hapus]   │   │
│  │ Bensin         Rp 50.000   Transport [🗑 Hapus]  │   │
│  │ ...                                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

[SAAT TAB "Ringkasan Bulanan" AKTIF — menggantikan area list + chart]
┌─────────────────────────────────────────────────────────┐
│  MONTHLY SUMMARY                                         │
│  Januari 2025      Rp 1.234.567,00                      │
│  Desember 2024     Rp 987.654,00                        │
│  ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Responsivitas

- Layout utama menggunakan CSS Grid / Flexbox.
- Pada layar < 768px: kolom form dan chart ditumpuk vertikal.
- Transaction_List memiliki `max-height` dan `overflow-y: auto`.

---

## State Management

### Satu-Sumber-Kebenaran (Single Source of Truth)

`AppState` adalah satu-satunya representasi data in-memory. DOM tidak pernah dibaca untuk mendapatkan data; selalu dibaca dari `AppState`.

### Siklus State Update

```
Mutasi Data
    │
    ▼
1. Validasi input
    │
    ▼
2. Update AppState (in-memory)
    │
    ▼
3. Persist ke LocalStorage (Storage.save*)
    │  ← Jika GAGAL: rollback AppState, tampilkan error, STOP
    ▼
4. render() — bangun ulang DOM dari AppState
```

### Sinkronisasi LocalStorage ↔ AppState

- **Inisialisasi**: `init()` memanggil semua `Storage.load*` untuk mengisi `AppState` dari LocalStorage.
- **Setelah Mutasi**: Setiap domain function selalu memanggil `Storage.save*` sebelum `render()`.
- **Partial failure**: Jika save gagal, `AppState` di-rollback ke nilai sebelum mutasi sehingga DOM dan storage tetap konsisten.

### Tab Navigation State

Tab aktif (`main` atau `monthly`) tidak disimpan ke LocalStorage — state ini bersifat sementara per-sesi. Dikelola hanya via CSS class `active` pada tab button dan `hidden` attribute pada section.

---

## Theme System

### CSS Custom Properties

Tema diimplementasikan menggunakan CSS custom properties pada `:root` dan override pada `[data-theme="dark"]`.

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f5f5f5;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-accent: #2563eb;
  --color-danger: #dc2626;
  --color-border: #e2e8f0;
  --color-shadow: rgba(0, 0, 0, 0.08);
}

[data-theme="dark"] {
  --color-bg: #121212;
  --color-surface: #1e1e1e;
  --color-text-primary: #f1f1f1;
  --color-text-secondary: #a0a0a0;
  --color-accent: #60a5fa;
  --color-danger: #f87171;
  --color-border: #2d2d2d;
  --color-shadow: rgba(0, 0, 0, 0.4);
}
```

### Penerapan Tema

```js
function setTheme(theme) {
  AppState.theme = theme;
  document.body.setAttribute('data-theme', theme);
  Storage.saveTheme(theme);
  updateThemeToggleIcon(theme);
}
```

Dengan mengubah `data-theme` pada `<body>`, semua CSS custom properties yang dipakai di seluruh halaman otomatis ter-update via cascade.

### Deteksi Preferensi Awal

```js
function detectInitialTheme() {
  const stored = Storage.loadTheme();           // null jika tidak ada
  if (stored) return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}
```

Tema diterapkan **sebelum** `render()` pertama kali dipanggil di `init()`, sehingga tidak ada flash of unstyled content.

### Chart.js dan Tema

Saat tema berubah, `renderChart()` dipanggil kembali dengan warna teks legend/label yang disesuaikan:
- Light mode: label warna `#1a1a1a`
- Dark mode: label warna `#f1f1f1`

---

## Chart Integration

### Inisialisasi dan Update Pattern

**Pola: Destroy + Recreate** — setiap kali data berubah, instance Chart.js lama di-destroy dan instance baru dibuat.

```js
let chartInstance = null;

function renderChart() {
  const data = groupByCategory(AppState.transactions);
  const canvas = document.getElementById('expense-chart');
  const placeholder = document.getElementById('chart-placeholder');

  if (Object.keys(data).length === 0) {
    canvas.hidden = true;
    placeholder.hidden = false;
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  canvas.hidden = false;
  placeholder.hidden = true;

  const labels = Object.keys(data);
  const values = Object.values(data);
  const total = values.reduce((a, b) => a + b, 0);
  const colors = generateChartColors(labels.length);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2 }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${pct}%`;
            }
          }
        },
        datalabels: {  // Menggunakan chartjs-plugin-datalabels jika tersedia
          formatter: (value) => `${((value / total) * 100).toFixed(1)}%`
        }
      }
    }
  });
}
```

**Alasan destroy + recreate**: Lebih sederhana dan tidak ada risiko animasi/data stale saat label/kategori berubah. Untuk dataset kecil (maks 20+ kategori), performa tidak menjadi masalah.

### Algoritma Generasi Warna

```js
const PREDEFINED_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16',
  '#f43f5e','#fb923c','#facc15','#4ade80','#2dd4bf',
  '#60a5fa','#a78bfa','#f472b6','#38bdf8','#a3e635'
];

function generateChartColors(count) {
  const colors = [...PREDEFINED_COLORS];
  // Jika count > 20: generate warna tambahan via HSL rotation
  for (let i = PREDEFINED_COLORS.length; i < count; i++) {
    const hue = (i * 137.508) % 360;  // Golden angle distribution
    colors.push(`hsl(${hue}, 65%, 55%)`);
  }
  return colors.slice(0, count);
}
```

**Golden angle (137.508°)** digunakan untuk distribusi warna yang maksimum berbeda secara perceptual untuk setiap kategori baru yang ditambahkan.

### Fallback Jika Chart.js Gagal Dimuat

```js
window.addEventListener('load', function() {
  setTimeout(function() {
    if (typeof Chart === 'undefined') {
      document.getElementById('chart-section').innerHTML =
        '<p class="chart-unavailable">Grafik tidak tersedia. Periksa koneksi internet Anda.</p>';
    }
  }, 5000);
});
```

---

## Error Handling

### Matriks Error Handling

| Skenario | Deteksi | Respons |
|---|---|---|
| LocalStorage tidak tersedia | `Storage.isAvailable()` di `init()` | Banner notifikasi persisten di atas halaman: "Data tidak akan disimpan permanen di sesi ini" |
| LocalStorage gagal saat write (quota exceeded, dll) | `try/catch` di `Storage.save*` | Toast notifikasi non-blocking; rollback `AppState`; transaksi tidak ditambahkan |
| Data corrupt di LocalStorage | `JSON.parse` throw atau validasi schema gagal | Reset ke state kosong; tampilkan notifikasi satu kali: "Data sebelumnya tidak dapat dimuat" |
| Chart.js CDN gagal dimuat | Cek `typeof Chart === 'undefined'` setelah 5 detik | Tampilkan pesan di chart section; semua fitur lain tetap berfungsi |
| Input Form validation error | `validateTransactionForm()` return `{ valid: false }` | Tampilkan pesan deskriptif di bawah setiap field; fokus ke field pertama yang error |
| Custom category validation error | `validateCustomCategory()` return `{ valid: false }` | Tampilkan pesan deskriptif di bawah input custom category |
| Balance overflow | `clampBalance()` return `{ overflow: true }` | Tampilkan nilai maksimum + label "⚠ Melebihi batas tampilan" |
| LocalStorage gagal saat delete | `try/catch` di `Storage.saveTransactions` | Tidak mutasi `AppState`; tampilkan pesan error; transaksi tetap di list |

### Notifikasi Non-Blocking (Toast)

```js
function showToast(message, type = 'error', duration = 5000) {
  // Buat element toast, append ke body
  // Auto-remove setelah `duration` ms
  // type: 'error' | 'warning' | 'info'
}
```

### Isolasi Error

Setiap operasi domain dibungkus sehingga error tidak menyebar ke operasi lain. `render()` sendiri juga dibungkus dalam `try/catch` — jika rendering gagal, error dicatat ke console tanpa mencrash seluruh aplikasi.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Berdasarkan prework analysis terhadap acceptance criteria, berikut adalah properti-properti yang dapat diuji secara universal menggunakan property-based testing:

**Property Reflection:**
- Properti 1 (validasi invalid) dan Properti 2 (submit valid → list grows) bersama-sama mencakup semua jalur submit form — keduanya diperlukan karena menguji sisi berlawanan dari logika yang sama.
- Properti 4 (format currency) mencakup kebutuhan formatting dari requirement 2.1, 3.4, dan 6.3 — tidak perlu properti terpisah untuk setiap konteks penggunaan fungsi format.
- Properti 5 (urutan transaksi) dan Properti 6 (groupByMonth) mencakup ordering requirement masing-masing secara orthogonal — tidak ada redundansi.
- Properti 8 (color uniqueness) mencakup requirement 4.6 dan 4.7 sekaligus — menghapus kebutuhan properti terpisah untuk keduanya.

---

### Property 1: Invalid Inputs Are Always Rejected by Validation

*For any* combination of transaction field values where at least one field violates validation rules (name is empty or exceeds 100 characters, amount is outside the range [0.01, 999999999.99] or is NaN, or category is empty), `validateTransactionForm()` shall return `{ valid: false }` with at least one error message.

**Validates: Requirements 1.3**

---

### Property 2: Valid Transaction Submission Grows the List by One

*For any* AppState with an arbitrary list of transactions, and any valid transaction input (name with 1–100 non-whitespace-only characters, amount in [0.01, 999999999.99], non-empty category), calling `addTransaction()` shall result in `AppState.transactions` having exactly one more item than before, and the new item shall appear as the first element (newest-first order).

**Validates: Requirements 1.5, 2.3**

---

### Property 3: Transaction Deletion Is Always Reversible at the List Level

*For any* AppState with N transactions (N ≥ 1), deleting a transaction identified by any valid ID in the list shall result in `AppState.transactions` having exactly N−1 items, and no transaction with the deleted ID shall be present anywhere in the resulting list.

**Validates: Requirements 2.4**

---

### Property 4: Currency Formatter Produces Correct Format for Any Non-Negative Number

*For any* non-negative number `n` where `n ≤ BALANCE_MAX`, `formatCurrency(n)` shall produce a string that:
- Starts with the prefix `"Rp "` 
- Uses a period (`.`) as the thousands separator
- Uses a comma (`,`) as the decimal separator
- Contains exactly the correct numeric value when parsed back

**Validates: Requirements 2.1, 3.4, 6.3**

---

### Property 5: Transaction List Is Always Ordered Newest-First

*For any* list of transactions with distinct timestamps, the order returned by the rendering sort shall always place the transaction with the highest timestamp first, and the transaction with the lowest timestamp last.

**Validates: Requirements 2.3**

---

### Property 6: Monthly Grouping Correctly Aggregates Any Transaction Set

*For any* non-empty list of transactions spanning one or more months, `groupByMonth()` shall:
1. Group all transactions sharing the same year-month into exactly one group
2. For each group, the total shall equal the sum of all `amount` values for transactions in that month
3. Return groups sorted in descending order by month-year key

**Validates: Requirements 6.2**

---

### Property 7: Category Dropdown Is Always Alphabetically Sorted After Addition

*For any* existing list of categories and any valid new category name (non-empty after trim, no duplicate case-insensitive), after `addCustomCategory()` the complete list of categories available in the dropdown shall be sorted in alphabetical order (case-insensitive), and the new category shall be present exactly once.

**Validates: Requirements 5.2, 5.5**

---

### Property 8: Chart Color Generator Produces Unique Colors for Any Count

*For any* integer N where N ≥ 1, `generateChartColors(N)` shall return an array of exactly N strings, and all N strings shall be distinct (no two categories receive the same color value).

**Validates: Requirements 4.6, 4.7**

---

### Property 9: LocalStorage Round-Trip Preserves All Transaction Data

*For any* array of valid Transaction objects, serializing it via `Storage.saveTransactions()` and then immediately deserializing it via `Storage.loadTransactions()` shall return an array that is deep-equal to the original (same ids, names, amounts, categories, and timestamps, in the same order).

**Validates: Requirements 8.1, 8.2**

---

### Property 10: Corrupt or Invalid LocalStorage Data Always Results in Empty State

*For any* string stored under `STORAGE_KEYS.TRANSACTIONS` that is not valid JSON, or is valid JSON but does not conform to the Transaction array schema (missing required fields, wrong types), `Storage.loadTransactions()` shall return an empty array `[]` without throwing an exception.

**Validates: Requirements 8.5**

---

## Testing Strategy

### Pendekatan Dual Testing

Strategi pengujian mengkombinasikan dua pendekatan yang saling melengkapi:

1. **Unit tests (example-based)**: Menguji skenario konkret, edge cases, dan kondisi error spesifik.
2. **Property-based tests**: Menguji properti universal yang harus berlaku untuk semua input valid.

### Pemilihan Library

- **Property-Based Testing**: [fast-check](https://github.com/dubzzz/fast-check) — library PBT untuk JavaScript/TypeScript, mendukung arbitrary generators dan shrinking otomatis.
- **Test Runner**: [Vitest](https://vitest.dev/) atau [Jest](https://jestjs.io/) — kompatibel dengan fast-check.

Karena aplikasi ini adalah Vanilla JS tanpa build tool, test suite dijalankan secara terpisah dari aplikasi produksi. File test dipisah di folder `tests/` dan mengimport fungsi murni yang diekspor dari `js/app.js` (atau diekstrak ke modul terpisah saat testing).

### Property-Based Tests

Setiap test harus dijalankan minimum **100 iterasi** (konfigurasi default fast-check: 100 runs).

| Test | Properti yang divalidasi | Generator |
|---|---|---|
| `validateTransactionForm` rejects all invalid inputs | Property 1 | Arbitrary strings, out-of-range numbers, empty values |
| `addTransaction` grows list by one | Property 2 | Valid transaction fields |
| `deleteTransaction` removes exactly one item | Property 3 | Arbitrary transaction lists, random delete target |
| `formatCurrency` always produces correct format | Property 4 | Non-negative floats up to BALANCE_MAX |
| Transaction list is always newest-first | Property 5 | Arbitrary arrays of transactions with distinct timestamps |
| `groupByMonth` correctly aggregates | Property 6 | Arbitrary transaction lists across multiple months |
| Category dropdown is always alphabetically sorted | Property 7 | Valid category names, existing category lists |
| `generateChartColors` returns N unique colors | Property 8 | Integer N from 1 to 50 |
| LocalStorage round-trip preserves data | Property 9 | Arbitrary valid Transaction arrays |
| Corrupt data results in empty state | Property 10 | Arbitrary invalid strings, malformed JSON |

**Tag format** untuk setiap test:
```js
// Feature: expense-budget-visualizer, Property 1: Invalid inputs are always rejected by validation
```

### Unit Tests (Example-Based)

Fokus pada skenario spesifik yang tidak dicakup oleh property tests:

- Default categories (Food, Transport, Fun) muncul di dropdown saat init
- Form fields kosong setelah successful submission
- Error message muncul di bawah field yang salah tanpa mereset field lain
- Empty state messages muncul saat tidak ada transaksi
- Theme toggle mengubah `data-theme` attribute pada `<body>`
- OS dark mode preference diterapkan saat tidak ada localStorage preference
- Custom category limit (20) menonaktifkan input
- Balance overflow menampilkan indikator yang sesuai
- CDN failure menampilkan pesan chart unavailable setelah 5 detik

### Integration Tests

- Alur lengkap: tambah transaksi → cek list, balance, chart semua terupdate
- Alur hapus: hapus transaksi → cek list, balance, chart semua terupdate
- Persistensi: tambah beberapa transaksi → simulasi reload → semua data muncul kembali

### Scope Pengujian Manual

Aspek berikut memerlukan pengujian manual atau visual:
- Rendering Chart.js (tampilan visual pie chart)
- CSS responsivitas di berbagai ukuran layar
- Smooth transition animasi tema (< 200ms terasa di mata)
- Kompatibilitas di Chrome, Firefox, Edge, Safari
- Scrollability Transaction_List saat overflow
- Aksesibilitas: keyboard navigation, screen reader, contrast ratio

---

*Design document ini dibuat berdasarkan requirements.md versi awal. Jika ada perubahan requirements, bagian Architecture, Data Models, Module Design, dan Correctness Properties perlu ditinjau ulang.*
