# Sistem Manajemen Ujian (CTB Ujian Online)

Portal manajemen ujian sekolah terpadu berbasis **React + TypeScript + Tailwind CSS + Firebase Firestore** dengan akses penuh tanpa batas waktu.

## Fitur Utama
- **Satu Halaman Login Terpadu (3 Peran Otomatis)**:
  - Login sebagai **Admin** otomatis masuk ke Dashboard Manajemen Ujian.
  - Login sebagai **Pengawas** otomatis masuk ke Panel Pengawas (pantau jadwal & perbarui token 5 digit secara real-time).
  - Login sebagai **Siswa** otomatis masuk ke Portal Peserta Ujian (verifikasi token, ruang ujian fokus dengan timer hitung mundur, mendukung tautan GForm/CBT eksternal maupun soal CBT terpadu).
- **Penyimpanan Cloud Firebase Firestore**: Seluruh data kelas, pengguna, sesi, ruang, penugasan pengawas, jadwal, token, soal, nilai, dan pengaturan sekolah tersimpan permanen di Firestore dengan sinkronisasi real-time.
- **Impor/Ekspor Excel (.xlsx) & Cetak Dokumen**: Impor massal siswa/pengawas, ekspor nilai CBT, serta cetak Kartu Ujian, Daftar Hadir Denah Ruang, dan Jadwal Pengawas.
- **Backup & Restore JSON**: Cadangkan dan pulihkan seluruh database kapan saja dari menu Pengaturan.

## Menjalankan Secara Lokal / Deploy ke GitHub
1. `npm install`
2. Pastikan konfigurasi Firebase tersedia di `firebase-applet-config.json`.
3. Jalankan mode pengembangan: `npm run dev`
4. Bangun untuk produksi (Vercel / Netlify / Firebase Hosting / GitHub Pages): `npm run build`
