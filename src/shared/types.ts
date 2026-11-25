export type UserRole = 'admin' | 'pengawas' | 'siswa';

export interface User {
  ID: string;
  Role: UserRole;
  Nama: string;
  Username: string;
  Password: string;
  Kelas?: string;
}

export interface Kelas {
  ID: string;
  'Nama Kelas': string;
}

export interface Sesi {
  ID: string;
  'Nama Sesi': string;
  'Jam Mulai': string;
  'Jam Berakhir': string;
}

export interface Ruang {
  ID: string;
  'Nama Ruang': string;
  Kapasitas?: number;
}

export interface RuangSiswa {
  ID: string;
  RuangID: string;
  SiswaID: string;
}

export interface RuangPengawas {
  ID: string;
  RuangID: string;
  SesiID: string;
  PengawasID: string;
  Tanggal: string;
}

export interface ExamQuestion {
  id: string;
  pertanyaan: string;
  opsi: string[];
  jawabanBenar: number;
}

export interface Ujian {
  ID: string;
  Kelas: string;
  Mapel: string;
  Tanggal: string;
  SesiID: string;
  Link: string;
  Token: string;
  mode?: 'url' | 'cbt';
  aksesBebas?: boolean;
  questions?: ExamQuestion[];
}

export interface ExamSubmission {
  ID: string;
  UjianID: string;
  SiswaID: string;
  SiswaNama: string;
  Kelas: string;
  Mapel: string;
  Benar: number;
  Total: number;
  Nilai: number;
  SubmittedAt: string;
}

export interface AppSettings {
  namaApp: string;
  namaSekolah: string;
  logo: string;
  alamat: string;
  tahunAjaran: string;
}

export interface DashboardData {
  kelas: Kelas[];
  users: User[];
  sesi: Sesi[];
  ruang: Ruang[];
  ruang_siswa: RuangSiswa[];
  ruang_pengawas: RuangPengawas[];
  ujian: Ujian[];
  submissions: ExamSubmission[];
  settings: AppSettings;
}

export interface SiswaExamView extends Ujian {
  'Nama Sesi': string;
  'Jam Mulai': string;
  'Jam Berakhir': string;
  alreadySubmitted?: boolean;
  lastScore?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  serverTime?: number;
  data?: T;
  user?: User;
  exams?: SiswaExamView[];
  token?: string;
  link?: string;
  mode?: 'url' | 'cbt';
  questions?: Array<{ id: string; pertanyaan: string; opsi: string[] }>;
  submission?: ExamSubmission;
}
