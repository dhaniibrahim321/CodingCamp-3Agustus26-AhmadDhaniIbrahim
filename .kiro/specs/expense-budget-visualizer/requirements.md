# Requirements Document

## Introduction

Expense & Budget Visualizer adalah aplikasi web berbasis client-side yang memungkinkan pengguna mencatat, mengelola, dan memvisualisasikan pengeluaran mereka. Aplikasi dibangun dengan HTML, CSS, dan Vanilla JavaScript murni tanpa framework atau backend server. Semua data disimpan di browser menggunakan Local Storage API. Fitur utama mencakup formulir input transaksi, daftar transaksi dengan kemampuan hapus, tampilan total saldo otomatis, grafik pie distribusi pengeluaran per kategori, kategori kustom, ringkasan bulanan, dan mode gelap/terang.

## Glossary

- **App**: Aplikasi web Expense & Budget Visualizer secara keseluruhan
- **Transaction**: Satu catatan pengeluaran yang terdiri dari nama item, jumlah, dan kategori
- **Input_Form**: Komponen formulir HTML untuk memasukkan data transaksi baru
- **Transaction_List**: Komponen daftar yang menampilkan semua transaksi yang tersimpan
- **Balance_Display**: Komponen yang menampilkan total saldo/pengeluaran secara keseluruhan
- **Chart**: Komponen grafik pie yang memvisualisasikan distribusi pengeluaran per kategori menggunakan Chart.js
- **Category**: Label pengelompokan transaksi; default: Food, Transport, Fun; dapat ditambah kategori kustom
- **Local_Storage**: Browser Local Storage API yang digunakan sebagai satu-satunya mekanisme penyimpanan data
- **Monthly_Summary**: Tampilan ringkasan pengeluaran yang dikelompokkan berdasarkan bulan dan tahun
- **Theme_Toggle**: Kontrol UI untuk beralih antara mode terang (light) dan mode gelap (dark)
- **Validator**: Logika validasi pada Input_Form sebelum transaksi disimpan

---

## Requirements

### Requirement 1: Input Form — Memasukkan Transaksi Baru

**User Story:** As a pengguna, I want mengisi formulir dengan nama item, jumlah, dan kategori, so that saya dapat menambahkan transaksi pengeluaran ke dalam daftar.

#### Acceptance Criteria

1. THE Input_Form SHALL menampilkan tiga field input: Item Name (teks, maksimal 100 karakter), Amount (angka desimal antara 0.01 dan 999,999,999.99), dan Category (dropdown tanpa pilihan default yang terpilih).
2. THE Input_Form SHALL menyediakan pilihan kategori default: Food, Transport, dan Fun pada dropdown Category sebagai pilihan awal yang tersedia.
3. WHEN pengguna menekan tombol submit, THE Validator SHALL memeriksa bahwa field Item Name tidak kosong dan tidak melebihi 100 karakter, field Amount berisi angka positif antara 0.01 dan 999,999,999.99, dan field Category memiliki nilai yang dipilih.
4. IF salah satu field tidak memenuhi syarat validasi, THEN THE Input_Form SHALL menampilkan pesan kesalahan deskriptif di bawah field yang bersangkutan tanpa mereset atau mengubah nilai field lainnya, dan fokus input dikembalikan ke field yang gagal.
5. WHEN semua field terisi valid dan pengguna menekan tombol submit, THE App SHALL menambahkan transaksi baru ke Transaction_List dan menyimpannya ke Local_Storage dalam waktu kurang dari 500ms.
6. WHEN transaksi berhasil ditambahkan, THE Input_Form SHALL mengosongkan field Item Name, Amount, dan mengembalikan dropdown Category ke kondisi tidak ada pilihan yang dipilih.
7. IF penyimpanan ke Local_Storage gagal saat submit, THEN THE App SHALL menampilkan pesan kesalahan bahwa transaksi tidak dapat disimpan secara permanen dan tidak menambahkan transaksi ke Transaction_List.

---

### Requirement 2: Transaction List — Menampilkan dan Menghapus Transaksi

**User Story:** As a pengguna, I want melihat semua transaksi yang telah dicatat dalam daftar yang dapat di-scroll, so that saya dapat memantau riwayat pengeluaran saya.

#### Acceptance Criteria

1. THE Transaction_List SHALL menampilkan semua transaksi yang tersimpan, di mana setiap item menampilkan nama item (maksimal 100 karakter), jumlah dalam format "Rp #.###,##", dan kategori.
2. WHILE Transaction_List memiliki lebih dari jumlah item yang muat di area containernya, THE Transaction_List SHALL dapat di-scroll secara vertikal tanpa mempengaruhi posisi atau layout elemen di luar container Transaction_List.
3. THE Transaction_List SHALL menampilkan transaksi dalam urutan dari yang paling baru ditambahkan ke yang paling lama berdasarkan waktu pencatatan (newest first).
4. WHEN pengguna menekan tombol hapus pada sebuah item transaksi, THE App SHALL menghapus transaksi tersebut dari Transaction_List secara visual dan dari Local_Storage, sehingga setelah reload halaman transaksi tersebut tidak muncul kembali.
5. IF penghapusan dari Local_Storage gagal, THEN THE App SHALL menampilkan pesan kesalahan dan tetap mempertahankan transaksi di Transaction_List tanpa mengubah data yang tersimpan.
6. WHEN Transaction_List tidak memiliki transaksi, THE Transaction_List SHALL menggantikan area daftar dengan pesan teks yang secara eksplisit menyatakan bahwa belum ada transaksi yang dicatat.

---

### Requirement 3: Total Balance — Saldo Total Otomatis

**User Story:** As a pengguna, I want melihat total pengeluaran saya ditampilkan secara otomatis di bagian atas halaman, so that saya selalu mengetahui total yang telah saya keluarkan.

#### Acceptance Criteria

1. THE Balance_Display SHALL selalu terlihat di bagian atas halaman dan menampilkan total penjumlahan dari semua nilai Amount seluruh transaksi yang tersimpan; nilai Amount yang tidak valid diperlakukan sebagai nol dalam perhitungan.
2. WHEN sebuah transaksi baru ditambahkan, THE Balance_Display SHALL memperbarui nilai total yang ditampilkan dalam waktu kurang dari 100ms tanpa memerlukan reload halaman.
3. WHEN sebuah transaksi dihapus, THE Balance_Display SHALL memperbarui nilai total yang ditampilkan dalam waktu kurang dari 100ms tanpa memerlukan reload halaman.
4. THE Balance_Display SHALL menampilkan nilai total dalam format "Rp #.###" dengan titik sebagai pemisah ribuan dan simbol "Rp" sebagai prefiks, untuk nilai hingga maksimal 999,999,999,999.
5. WHEN Transaction_List kosong, THE Balance_Display SHALL menampilkan "Rp 0" sesuai format yang ditentukan di kriteria 4.
6. IF total pengeluaran melebihi 999,999,999,999, THEN THE Balance_Display SHALL menampilkan nilai maksimum tersebut dengan indikator overflow yang jelas kepada pengguna.

---

### Requirement 4: Visual Chart — Grafik Pie Distribusi Pengeluaran

**User Story:** As a pengguna, I want melihat grafik pie yang menunjukkan distribusi pengeluaran saya per kategori, so that saya dapat memahami pola pengeluaran saya secara visual.

#### Acceptance Criteria

1. THE Chart SHALL menampilkan grafik pie yang memvisualisasikan proporsi pengeluaran per kategori dari seluruh transaksi yang tersimpan, di mana setiap segmen mewakili persentase kontribusi kategori tersebut terhadap total keseluruhan.
2. THE Chart SHALL dirender menggunakan library Chart.js yang dimuat melalui CDN.
3. WHEN sebuah transaksi ditambahkan atau dihapus, THE Chart SHALL memperbarui tampilan grafiknya secara otomatis dalam waktu kurang dari 1 detik tanpa memerlukan reload halaman.
4. THE Chart SHALL menampilkan label nama kategori dan persentase dalam format satu desimal (contoh: 33.3%) pada atau di dekat setiap segmen grafik pie.
5. WHEN Transaction_List kosong, THE Chart SHALL menyembunyikan elemen canvas grafik dan menampilkan pesan teks pengganti yang menjelaskan bahwa belum ada data untuk divisualisasikan.
6. THE Chart SHALL menggunakan warna yang berbeda untuk setiap kategori dengan kontras visual yang cukup (minimum 4.5:1 terhadap latar belakang), untuk maksimal 20 kategori unik.
7. IF jumlah kategori unik melebihi jumlah warna yang telah didefinisikan, THEN THE Chart SHALL menghasilkan warna tambahan secara otomatis menggunakan algoritma generasi warna sehingga setiap kategori selalu mendapatkan warna yang unik.

---

### Requirement 5: Custom Categories — Kategori Kustom

**User Story:** As a pengguna, I want menambahkan kategori pengeluaran kustom selain kategori default, so that saya dapat menyesuaikan pengelompokan transaksi sesuai kebutuhan saya.

#### Acceptance Criteria

1. THE App SHALL menyediakan kontrol UI berupa field input teks (maksimal 50 karakter) dan tombol tambah yang memungkinkan pengguna menambahkan kategori kustom.
2. WHEN pengguna menambahkan kategori kustom, THE Input_Form SHALL segera menampilkan kategori baru tersebut sebagai pilihan pada dropdown Category, diurutkan secara alfabetis di antara kategori yang sudah ada.
3. THE App SHALL menyimpan daftar kategori kustom ke Local_Storage sehingga kategori tetap tersedia setelah halaman di-reload.
4. WHEN halaman dimuat ulang, THE App SHALL memuat ulang kategori kustom dari Local_Storage dan menampilkannya pada dropdown Category sebelum pengguna dapat berinteraksi dengan formulir transaksi.
5. IF pengguna mencoba menambahkan kategori dengan nama kosong, hanya spasi, atau nama yang sudah ada (perbandingan case-insensitive setelah trim), THEN THE App SHALL menampilkan pesan kesalahan spesifik dan tidak menyimpan entri tersebut.
6. IF jumlah total kategori kustom telah mencapai 20, THEN THE App SHALL menonaktifkan kontrol penambahan kategori dan menampilkan pesan bahwa batas maksimum telah tercapai.

---

### Requirement 6: Monthly Summary — Ringkasan Bulanan

**User Story:** As a pengguna, I want melihat ringkasan pengeluaran yang dikelompokkan per bulan, so that saya dapat melacak tren pengeluaran saya dari waktu ke waktu.

#### Acceptance Criteria

1. THE App SHALL menyediakan elemen navigasi yang selalu terlihat (misalnya tab atau tombol toggle) di antarmuka utama yang memungkinkan pengguna beralih ke tampilan Monthly_Summary.
2. THE Monthly_Summary SHALL mengelompokkan dan menampilkan total pengeluaran per bulan berdasarkan tanggal pada saat transaksi ditambahkan, diurutkan dari bulan terbaru ke terlama, untuk maksimal 120 kelompok bulan.
3. THE Monthly_Summary SHALL menampilkan nama bulan dalam teks penuh (contoh: "Januari"), tahun dalam format 4 digit (contoh: "2026"), dan total pengeluaran dalam format mata uang dua desimal untuk setiap kelompok bulan.
4. WHEN sebuah transaksi ditambahkan atau dihapus, THE Monthly_Summary SHALL memperbarui data yang ditampilkan secara otomatis dalam waktu kurang dari 2 detik tanpa tindakan manual dari pengguna.
5. WHEN tidak ada transaksi yang tercatat, THE Monthly_Summary SHALL menampilkan pesan teks yang secara eksplisit menyatakan bahwa belum ada data ringkasan bulanan tersedia.
6. IF data dari Local_Storage gagal dimuat saat merender Monthly_Summary, THEN THE App SHALL menampilkan pesan kesalahan yang menginformasikan pengguna bahwa ringkasan tidak dapat ditampilkan sementara.

---

### Requirement 7: Dark/Light Mode Toggle — Pergantian Tema Tampilan

**User Story:** As a pengguna, I want beralih antara tampilan mode gelap dan mode terang, so that saya dapat menggunakan aplikasi dengan nyaman di berbagai kondisi pencahayaan.

#### Acceptance Criteria

1. THE App SHALL menampilkan kontrol Theme_Toggle berupa tombol atau ikon dengan area interaktif minimal 44×44px yang selalu terlihat di header pada semua tampilan.
2. WHEN pengguna mengaktifkan Theme_Toggle, THE App SHALL menerapkan tema yang dipilih ke seluruh elemen halaman dalam waktu kurang dari 200ms, termasuk background, teks, form, daftar, dan grafik.
3. WHEN tema berubah, THE Theme_Toggle SHALL memperbarui label atau ikonnya untuk mencerminkan tema yang sedang aktif (contoh: ikon matahari untuk light mode, ikon bulan untuk dark mode).
4. WHEN pengguna mengaktifkan Theme_Toggle, THE App SHALL menyimpan preferensi tema yang dipilih ke Local_Storage.
5. WHEN halaman dimuat ulang, THE App SHALL memuat preferensi tema dari Local_Storage dan menerapkannya sebelum elemen halaman pertama kali dirender, sehingga tidak terjadi perubahan tema yang terlihat oleh pengguna.
6. IF Local_Storage tidak tersedia saat membaca atau menyimpan preferensi tema, THEN THE App SHALL tetap menerapkan tema yang dipilih untuk sesi saat ini tanpa menampilkan error yang mengganggu alur pengguna.
7. WHEN sistem operasi pengguna menggunakan preferensi dark mode (via `prefers-color-scheme: dark`) DAN tidak ada preferensi tema yang tersimpan di Local_Storage, THEN THE App SHALL menerapkan mode gelap sebagai tema default pada kunjungan pertama.

---

### Requirement 8: Data Persistence — Ketekunan Data Lintas Sesi

**User Story:** As a pengguna, I want data transaksi dan pengaturan saya tetap tersimpan saat saya menutup dan membuka kembali browser, so that saya tidak kehilangan catatan pengeluaran saya.

#### Acceptance Criteria

1. WHEN sebuah transaksi ditambahkan atau dihapus, THE App SHALL menyimpan seluruh daftar transaksi terbaru ke Local_Storage dalam satu operasi tulis yang selesai sebelum pembaruan UI dirender.
2. WHEN halaman dimuat, THE App SHALL membaca semua data transaksi dari Local_Storage dan merender Transaction_List, Balance_Display, dan Chart dalam waktu kurang dari 2 detik.
3. WHEN preferensi pengguna (tema atau daftar kategori kustom) diubah, THE App SHALL menyimpan perubahan ke kunci Local_Storage yang terpisah dari kunci data transaksi, sebelum pembaruan UI dirender.
4. IF Local_Storage tidak tersedia atau akses ke Local_Storage gagal baik saat membaca maupun menulis, THEN THE App SHALL menampilkan notifikasi kepada pengguna bahwa data tidak akan tersimpan permanen, dan tetap mengizinkan penggunaan aplikasi untuk sesi saat ini.
5. IF data yang dibaca dari Local_Storage tidak valid atau corrupt, THEN THE App SHALL mengabaikan data tersebut, memulai dengan state kosong menggunakan preferensi default, dan menampilkan notifikasi kepada pengguna bahwa data sebelumnya tidak dapat dimuat.

---

### Requirement 9: Performance & Browser Compatibility — Performa dan Kompatibilitas

**User Story:** As a pengguna, I want aplikasi berjalan cepat dan responsif di browser modern yang saya gunakan, so that pengalaman penggunaan terasa mulus tanpa hambatan.

#### Acceptance Criteria

1. THE App SHALL dapat dijalankan sepenuhnya di browser Chrome, Firefox, Edge, dan Safari yang dirilis dalam 12 bulan terakhir tanpa plugin atau ekstensi tambahan, dengan semua fitur inti (Input_Form, Transaction_List, Balance_Display, Chart) berfungsi normal.
2. THE App SHALL dapat digunakan sebagai halaman web standalone (dibuka via file `index.html`) di mana semua logika pemrosesan dan penyimpanan data berjalan sepenuhnya di sisi klien tanpa memerlukan server backend.
3. WHEN halaman pertama kali dimuat dengan data yang tersimpan di Local_Storage, THE App SHALL menyelesaikan render antarmuka yang dapat berinteraksi dalam waktu kurang dari 2 detik pada koneksi minimum 10 Mbps, diukur dari event DOMContentLoaded hingga UI siap digunakan.
4. WHEN pengguna berinteraksi dengan Input_Form, Transaction_List, atau Theme_Toggle, THE App SHALL merespons dengan pembaruan visual yang terlihat dalam waktu kurang dari 100ms tanpa lag atau freeze yang terasa.
5. IF CDN Chart.js gagal dimuat dalam waktu 5 detik, THEN THE App SHALL menampilkan pesan indikasi kepada pengguna bahwa grafik tidak tersedia, sementara semua fitur inti lainnya (Input_Form, Transaction_List, Balance_Display) tetap berfungsi normal.

---

### Requirement 10: Code Structure — Struktur File dan Kode

**User Story:** As a developer, I want kode sumber diorganisasi dalam struktur folder yang bersih dan konsisten, so that kode mudah dipelihara dan dipahami.

#### Acceptance Criteria

1. THE App SHALL memiliki tepat satu file berekstensi `.css` yang berlokasi langsung di dalam folder `css/` di direktori root proyek.
2. THE App SHALL memiliki tepat satu file berekstensi `.js` yang berlokasi langsung di dalam folder `js/` di direktori root proyek.
3. THE App SHALL memiliki tepat satu file bernama `index.html` di direktori root proyek sebagai satu-satunya titik masuk aplikasi.
4. THE App SHALL menggunakan hanya HTML, CSS, dan Vanilla JavaScript tanpa framework JavaScript (seperti React, Vue, Angular) atau CSS preprocessor (seperti Sass, Less).
5. THE `index.html` SHALL mereferensikan file CSS dan JavaScript menggunakan path relatif yang benar sehingga aplikasi dapat berjalan ketika dibuka langsung dari sistem file tanpa server.
