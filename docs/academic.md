# Academic (Akademik)

Fitur Akademik mencakup pengelolaan mata pelajaran, penugasan guru, jadwal pelajaran, dan penilaian siswa dengan antarmuka mirip Excel.

## Scope

- Antarmuka utama ada di `app/(site)/(shell)/academic/`.
- Komponen berada di `features/academic/components/`.
- Server Actions berada di `features/academic/actions/`.
- Data disimpan di tabel `academic_*` dalam database D1.

## Permission Model

- `academic`: Izin administratif penuh.
- Guru (deteksi lewat email mengandung `/Guru`): Izin mengelola jadwal dan nilai untuk kelas yang ditugaskan.
- Siswa: Izin melihat nilai jika sudah memiliki data nilai yang terekam.
- Superuser: Akses penuh ke seluruh fitur.

## Struktur Data (Schema)

- `academic_lessons`: Daftar mata pelajaran.
- `academic_teacher_assignments`: Pemetaan Guru ke Mata Pelajaran dan Kelas.
- `academic_timetable`: Jadwal mingguan rutin.
- `academic_timetable_overrides`: Perubahan jadwal pada tanggal tertentu.
- `academic_grading_sheets`: Grup penilaian.
- `academic_grading_columns`: Kolom penilaian.
- `academic_grading_scores`: Nilai siswa per kolom.

## Fitur Utama

### 1. Pengelolaan Mata Pelajaran
Admin dapat menambah, mengubah, atau menghapus daftar mata pelajaran.

### 2. Penugasan Guru
Guru ditugaskan ke mata pelajaran tertentu pada kelas tertentu.

### 3. Jadwal (Timetable)
Mendukung jadwal rutin mingguan per kelas.

### 4. Penilaian (Grading)
- Antarmuka mirip Excel.
- Edit nilai secara real-time.
- Export data ke format Excel.
