# 📊 Sistem Manajemen Nilai Mahasiswa

Platform Manajemen Penilaian Terintegrasi untuk Perguruan Tinggi

## 🎯 Fitur Utama

### 1. Input Data Nilai
- Input nilai mahasiswa berdasarkan NIM, nama, dan jurusan
- Mendukung berbagai jurusan: Teknik Informatika, Sistem Informasi, Manajemen, Akuntansi, Desain Grafis
- Input nilai per semester (Semester 1-8)
- Komponen penilaian: Tugas, UTS, UAS
- Konfigurasi bobot penilaian (customizable)

### 2. Manajemen Data Mahasiswa
- Database lengkap mahasiswa
- Filter berdasarkan jurusan, grade, dan status kelulusan
- Pencarian dan sorting data
- Edit dan hapus data mahasiswa

### 3. Sistem Penilaian
- Perhitungan otomatis nilai akhir berdasarkan bobot
- Konversi nilai ke grade (A, B, C, D)
- Penentuan status kelulusan
- Perhitungan IPK otomatis

### 4. Analitik dan Statistik
- **Dashboard Statistik**:
  - Total mahasiswa
  - Rata-rata kelas
  - Tingkat kelulusan (%)
  - IPK rata-rata

- **Visualisasi Data**:
  - Grafik distribusi grade
  - Statistik per jurusan
  - Top 10 mahasiswa berdasarkan IPK

- **Peringkat**: Sistem ranking mahasiswa berdasarkan IPK

### 5. Import/Export Data
- Import data dari CSV
- Export ke CSV
- Export ke JSON
- Backup dan restore data

### 6. Pengaturan Sistem
- Konfigurasi bobot penilaian:
  - Bobot Tugas (%)
  - Bobot UTS (%)
  - Bobot UAS (%)
- Pengaturan batas kelulusan (nilai minimum)
- Reset ke pengaturan default

## 🛠️ Teknologi
- Frontend: HTML5, CSS3, JavaScript
- Storage: LocalStorage (client-side)
- Charts: Library visualisasi data

## 📋 Cara Penggunaan

### Input Nilai:
1. Isi form dengan data mahasiswa (NIM, Nama, Jurusan)
2. Pilih semester dan mata kuliah
3. Masukkan nilai Tugas, UTS, dan UAS (0-100)
4. Klik "Simpan Data"

### Melihat Statistik:
- Akses tab "Analitik" untuk melihat statistik lengkap
- Visualisasi otomatis ter-update saat data berubah

### Backup Data:
1. Buka tab "Pengaturan"
2. Klik "Backup Data" untuk download
3. Gunakan "Restore Data" untuk import kembali

## 🎨 Antarmuka
- Desain responsif dan modern
- Dark/Light mode support
- User-friendly interface
- Real-time data update

## 🔐 Fitur Keamanan
- Data tersimpan lokal di browser
- Validasi input data
- Konfirmasi sebelum menghapus data

## 📦 Deployment
Aplikasi di-deploy menggunakan GitHub Pages: https://reee00.github.io/manajemen-penilaian-mahasiswa/
