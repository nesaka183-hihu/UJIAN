import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
  type WriteBatch,
} from 'firebase/firestore';

function boundedCol(name: string, max = 500) {
  return query(collection(db, name), limit(max));
}

async function commitOperationsInChunks(
  ops: Array<(batch: WriteBatch) => void>,
  chunkSize = 400
): Promise<void> {
  for (let i = 0; i < ops.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = ops.slice(i, i + chunkSize);
    for (const op of slice) {
      op(batch);
    }
    await batch.commit();
  }
}
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  ApiResponse,
  AppSettings,
  DashboardData,
  ExamQuestion,
  ExamSubmission,
  Kelas,
  Ruang,
  RuangPengawas,
  RuangSiswa,
  Sesi,
  SiswaExamView,
  Ujian,
  User,
  UserRole,
} from '../shared/types';
import { getTodayJakarta } from '../utils/date';

const DEFAULT_LOGO = '/assets/aistudio/logo_nesaka-removebg-preview_ee9f6ab8.png';

export const DEFAULT_SETTINGS: AppSettings = {
  namaApp: 'CTB UJIAN ONLINE',
  namaSekolah: 'SMKN 1 PEKALONGAN LAMPUNG TIMUR',
  logo: DEFAULT_LOGO,
  alamat: 'Pekalongan, Lampung Timur',
  tahunAjaran: '2026/2027',
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeSettings(raw: Partial<AppSettings>): AppSettings {
  return {
    namaApp: String(raw.namaApp ?? DEFAULT_SETTINGS.namaApp).trim().slice(0, 100) || DEFAULT_SETTINGS.namaApp,
    namaSekolah: String(raw.namaSekolah ?? DEFAULT_SETTINGS.namaSekolah).trim().slice(0, 150) || DEFAULT_SETTINGS.namaSekolah,
    logo: String(raw.logo ?? '').trim().slice(0, 1000),
    alamat: String(raw.alamat ?? '').trim().slice(0, 250),
    tahunAjaran: String(raw.tahunAjaran ?? '2026/2027').trim().slice(0, 30),
  };
}

function mapKelasFromDoc(data: Record<string, unknown>): Kelas {
  return {
    ID: String(data.ID ?? ''),
    'Nama Kelas': String(data.NamaKelas ?? data['Nama Kelas'] ?? ''),
  };
}

function mapSesiFromDoc(data: Record<string, unknown>): Sesi {
  return {
    ID: String(data.ID ?? ''),
    'Nama Sesi': String(data.NamaSesi ?? data['Nama Sesi'] ?? ''),
    'Jam Mulai': String(data.JamMulai ?? data['Jam Mulai'] ?? ''),
    'Jam Berakhir': String(data.JamBerakhir ?? data['Jam Berakhir'] ?? ''),
  };
}

function mapRuangFromDoc(data: Record<string, unknown>): Ruang {
  return {
    ID: String(data.ID ?? ''),
    'Nama Ruang': String(data.NamaRuang ?? data['Nama Ruang'] ?? ''),
    Kapasitas: typeof data.Kapasitas === 'number' ? data.Kapasitas : 32,
  };
}

function buildSeedPayload(): {
  settings: AppSettings;
  kelas: Array<{ ID: string; NamaKelas: string }>;
  users: User[];
  sesi: Array<{ ID: string; NamaSesi: string; JamMulai: string; JamBerakhir: string }>;
  ruang: Array<{ ID: string; NamaRuang: string; Kapasitas: number }>;
  ruang_siswa: RuangSiswa[];
  ruang_pengawas: RuangPengawas[];
  ujian: Ujian[];
} {
  const today = getTodayJakarta();

  const sampleQuestions: ExamQuestion[] = [
    {
      id: 'q1',
      pertanyaan: 'Jika f(x) = 3x² - 4x + 5, maka nilai turunan pertama f\'(2) adalah...',
      opsi: ['6', '8', '10', '12'],
      jawabanBenar: 1,
    },
    {
      id: 'q2',
      pertanyaan: 'Hukum kekekalan energi mekanik berlaku apabila gaya yang bekerja pada sistem hanya berupa...',
      opsi: ['Gaya gesek kinetik', 'Gaya konservatif', 'Gaya dorong eksternal', 'Gaya sentrifugal semu'],
      jawabanBenar: 1,
    },
    {
      id: 'q3',
      pertanyaan: 'Organel sel tumbuhan yang berperan utama dalam proses fotosintesis adalah...',
      opsi: ['Mitokondria', 'Ribosom', 'Kloroplas', 'Lisosom'],
      jawabanBenar: 2,
    },
    {
      id: 'q4',
      pertanyaan: 'Dalam jaringan komputer, protokol yang bertugas menerjemahkan nama domain menjadi alamat IP adalah...',
      opsi: ['DHCP', 'DNS', 'HTTP', 'SMTP'],
      jawabanBenar: 1,
    },
  ];

  return {
    settings: DEFAULT_SETTINGS,
    kelas: [
      { ID: 'kls_1', NamaKelas: 'XII TKJ 1' },
      { ID: 'kls_2', NamaKelas: 'XII TKJ 2' },
      { ID: 'kls_3', NamaKelas: 'XII RPL 1' },
      { ID: 'kls_4', NamaKelas: 'XI TKJ 1' },
    ],
    users: [
      {
        ID: 'usr_admin_1',
        Role: 'admin',
        Nama: 'Administrator Utama',
        Username: 'admin',
        Password: 'admin123',
        Kelas: '',
      },
      {
        ID: 'usr_pengawas_1',
        Role: 'pengawas',
        Nama: 'Budi Santoso, S.Pd',
        Username: 'budi',
        Password: 'pengawas123',
        Kelas: '',
      },
      {
        ID: 'usr_pengawas_2',
        Role: 'pengawas',
        Nama: 'Siti Aminah, M.Pd',
        Username: 'siti',
        Password: 'pengawas123',
        Kelas: '',
      },
      {
        ID: 'usr_siswa_1',
        Role: 'siswa',
        Nama: 'Andi Pratama',
        Username: 'andi123',
        Password: 'siswa123',
        Kelas: 'XII TKJ 1',
      },
      {
        ID: 'usr_siswa_2',
        Role: 'siswa',
        Nama: 'Dewi Lestari',
        Username: 'dewi123',
        Password: 'siswa123',
        Kelas: 'XII TKJ 1',
      },
      {
        ID: 'usr_siswa_3',
        Role: 'siswa',
        Nama: 'Rizky Ramadhan',
        Username: 'rizky123',
        Password: 'siswa123',
        Kelas: 'XII TKJ 2',
      },
      {
        ID: 'usr_siswa_4',
        Role: 'siswa',
        Nama: 'Nadia Putri',
        Username: 'nadia123',
        Password: 'siswa123',
        Kelas: 'XI TKJ 1',
      },
    ],
    sesi: [
      { ID: 'sesi_1', NamaSesi: 'Sesi 1 (Pagi)', JamMulai: '07:30', JamBerakhir: '09:30' },
      { ID: 'sesi_2', NamaSesi: 'Sesi 2 (Siang)', JamMulai: '10:00', JamBerakhir: '12:00' },
      { ID: 'sesi_full', NamaSesi: 'Sesi Fleksibel (Seharian)', JamMulai: '00:00', JamBerakhir: '23:59' },
    ],
    ruang: [
      { ID: 'rng_1', NamaRuang: 'Ruang 01 - Lab Komputer A', Kapasitas: 32 },
      { ID: 'rng_2', NamaRuang: 'Ruang 02 - Lab Komputer B', Kapasitas: 32 },
      { ID: 'rng_3', NamaRuang: 'Ruang 03 - Ruang Teori XII', Kapasitas: 36 },
    ],
    ruang_siswa: [
      { ID: 'rs_1', RuangID: 'rng_1', SiswaID: 'usr_siswa_1' },
      { ID: 'rs_2', RuangID: 'rng_1', SiswaID: 'usr_siswa_2' },
      { ID: 'rs_3', RuangID: 'rng_2', SiswaID: 'usr_siswa_3' },
    ],
    ruang_pengawas: [
      { ID: 'rp_1', RuangID: 'rng_1', SesiID: 'sesi_full', PengawasID: 'usr_pengawas_1', Tanggal: today },
      { ID: 'rp_2', RuangID: 'rng_2', SesiID: 'sesi_2', PengawasID: 'usr_pengawas_2', Tanggal: today },
    ],
    ujian: [
      {
        ID: 'ujn_1',
        Kelas: 'XII TKJ 1',
        Mapel: 'Komputer & Jaringan Dasar (CBT)',
        Tanggal: today,
        SesiID: 'sesi_full',
        Link: '',
        Token: 'UJIAN',
        mode: 'cbt',
        aksesBebas: true,
        questions: sampleQuestions,
      },
      {
        ID: 'ujn_2',
        Kelas: 'XII TKJ 1',
        Mapel: 'Bahasa Inggris Kejuruan',
        Tanggal: today,
        SesiID: 'sesi_2',
        Link: 'https://docs.google.com/forms/d/e/1FAIpQLSd-contoh-ujian/viewform?embedded=true',
        Token: 'ENG26',
        mode: 'url',
        aksesBebas: false,
        questions: [],
      },
      {
        ID: 'ujn_3',
        Kelas: 'XII TKJ 2',
        Mapel: 'Administrasi Infrastruktur Jaringan',
        Tanggal: today,
        SesiID: 'sesi_full',
        Link: '',
        Token: 'AIJ01',
        mode: 'cbt',
        aksesBebas: true,
        questions: sampleQuestions,
      },
    ],
  };
}

let seedPromise: Promise<void> | null = null;

export async function ensureFirestoreSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const [settingsSnap, usersSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'main')),
        getDocs(query(collection(db, 'examUsers'), limit(1))),
      ]);
      if (settingsSnap.exists() && !usersSnap.empty) return;

      const seed = buildSeedPayload();
      const batch = writeBatch(db);
      if (!settingsSnap.exists()) {
        batch.set(doc(db, 'settings', 'main'), seed.settings);
      }
      if (usersSnap.empty) {
        for (const k of seed.kelas) batch.set(doc(db, 'kelas', k.ID), k);
        for (const u of seed.users) batch.set(doc(db, 'examUsers', u.ID), u);
        for (const s of seed.sesi) batch.set(doc(db, 'sesi', s.ID), s);
        for (const r of seed.ruang) batch.set(doc(db, 'ruang', r.ID), r);
        for (const rs of seed.ruang_siswa) batch.set(doc(db, 'ruang_siswa', rs.ID), rs);
        for (const rp of seed.ruang_pengawas) batch.set(doc(db, 'ruang_pengawas', rp.ID), rp);
        for (const ujn of seed.ujian) batch.set(doc(db, 'ujian', ujn.ID), ujn);
      }
      await batch.commit();
    } catch (err) {
      seedPromise = null;
      handleFirestoreError(err, OperationType.WRITE, 'settings/main');
    }
  })();
  return seedPromise;
}

export async function fetchAllDashboardData(): Promise<DashboardData> {
  await ensureFirestoreSeeded();
  try {
    const [
      settingsSnap,
      kelasSnap,
      usersSnap,
      sesiSnap,
      ruangSnap,
      rsSnap,
      rpSnap,
      ujianSnap,
      subSnap,
    ] = await Promise.all([
      getDoc(doc(db, 'settings', 'main')),
      getDocs(boundedCol('kelas', 200)),
      getDocs(boundedCol('examUsers', 1000)),
      getDocs(boundedCol('sesi', 200)),
      getDocs(boundedCol('ruang', 200)),
      getDocs(boundedCol('ruang_siswa', 1000)),
      getDocs(boundedCol('ruang_pengawas', 500)),
      getDocs(boundedCol('ujian', 500)),
      getDocs(query(collection(db, 'submissions'), orderBy('SubmittedAt', 'desc'), limit(1000))),
    ]);

    const settings = settingsSnap.exists()
      ? sanitizeSettings(settingsSnap.data() as Partial<AppSettings>)
      : DEFAULT_SETTINGS;

    const submissions = subSnap.docs
      .map((d) => d.data() as ExamSubmission)
      .sort((a, b) => b.SubmittedAt.localeCompare(a.SubmittedAt));

    return {
      settings,
      kelas: kelasSnap.docs.map((d) => mapKelasFromDoc(d.data())),
      users: usersSnap.docs.map((d) => d.data() as User),
      sesi: sesiSnap.docs.map((d) => mapSesiFromDoc(d.data())),
      ruang: ruangSnap.docs.map((d) => mapRuangFromDoc(d.data())),
      ruang_siswa: rsSnap.docs.map((d) => d.data() as RuangSiswa),
      ruang_pengawas: rpSnap.docs.map((d) => d.data() as RuangPengawas),
      ujian: ujianSnap.docs.map((d) => d.data() as Ujian),
      submissions,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'dashboard');
  }
}

export function subscribeDashboardData(
  onUpdate: (data: DashboardData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  let state: DashboardData = {
    kelas: [],
    users: [],
    sesi: [],
    ruang: [],
    ruang_siswa: [],
    ruang_pengawas: [],
    ujian: [],
    submissions: [],
    settings: DEFAULT_SETTINGS,
  };

  const emit = () => onUpdate({ ...state });

  const unsubs: Unsubscribe[] = [
    onSnapshot(
      doc(db, 'settings', 'main'),
      (snap) => {
        if (snap.exists()) {
          state.settings = sanitizeSettings(snap.data() as Partial<AppSettings>);
          emit();
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, 'settings/main');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      boundedCol('kelas'),
      (snap) => {
        state.kelas = snap.docs.map((d) => mapKelasFromDoc(d.data()));
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'kelas');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      boundedCol('examUsers', 1000),
      (snap) => {
        state.users = snap.docs.map((d) => d.data() as User);
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'examUsers');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      boundedCol('sesi'),
      (snap) => {
        state.sesi = snap.docs.map((d) => mapSesiFromDoc(d.data()));
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'sesi');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      boundedCol('ruang'),
      (snap) => {
        state.ruang = snap.docs.map((d) => mapRuangFromDoc(d.data()));
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'ruang');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      boundedCol('ruang_siswa', 1000),
      (snap) => {
        state.ruang_siswa = snap.docs.map((d) => d.data() as RuangSiswa);
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'ruang_siswa');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      boundedCol('ruang_pengawas'),
      (snap) => {
        state.ruang_pengawas = snap.docs.map((d) => d.data() as RuangPengawas);
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'ruang_pengawas');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      boundedCol('ujian'),
      (snap) => {
        state.ujian = snap.docs.map((d) => d.data() as Ujian);
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'ujian');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
    onSnapshot(
      query(collection(db, 'submissions'), orderBy('SubmittedAt', 'desc'), limit(1000)),
      (snap) => {
        state.submissions = snap.docs
          .map((d) => d.data() as ExamSubmission)
          .sort((a, b) => b.SubmittedAt.localeCompare(a.SubmittedAt));
        emit();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'submissions');
        } catch (e) {
          onError?.(e as Error);
        }
      }
    ),
  ];

  return () => {
    for (const u of unsubs) u();
  };
}

export async function dispatchFirestoreAction<T = unknown>(
  action: string,
  payload: Record<string, unknown> | unknown[] = {}
): Promise<ApiResponse<T>> {
  await ensureFirestoreSeeded();
  const serverTime = Date.now();
  const body = (Array.isArray(payload) ? {} : payload) as Record<string, unknown>;

  switch (action) {
    case 'getSettings': {
      try {
        const snap = await getDoc(doc(db, 'settings', 'main'));
        const data = snap.exists()
          ? sanitizeSettings(snap.data() as Partial<AppSettings>)
          : DEFAULT_SETTINGS;
        return { success: true, data: data as T, serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'settings/main');
      }
    }

    case 'saveSettings': {
      const next = sanitizeSettings(body as Partial<AppSettings>);
      try {
        await setDoc(doc(db, 'settings', 'main'), next);
        return {
          success: true,
          message: 'Pengaturan sistem berhasil disimpan ke Firestore.',
          data: next as T,
          serverTime,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'settings/main');
      }
    }

    case 'login': {
      const username = String(body.username ?? '').trim();
      const password = String(body.password ?? '').trim();
      if (!username || !password) {
        return { success: false, message: 'Username dan password wajib diisi.', serverTime };
      }
      try {
        let snap = await getDocs(
          query(collection(db, 'examUsers'), where('Username', '==', username), limit(5))
        );
        if (snap.empty && username !== username.toLowerCase()) {
          snap = await getDocs(
            query(
              collection(db, 'examUsers'),
              where('Username', '==', username.toLowerCase()),
              limit(5)
            )
          );
        }
        const users = snap.docs.map((d) => d.data() as User);
        const found = users.find(
          (u) => u.Username.toLowerCase() === username.toLowerCase() && u.Password === password
        );
        if (!found) {
          return { success: false, message: 'Username atau password tidak sesuai.', serverTime };
        }
        return {
          success: true,
          user: {
            ID: found.ID,
            Role: found.Role,
            Nama: found.Nama,
            Username: found.Username,
            Password: found.Password,
            Kelas: found.Kelas ?? '',
          },
          serverTime,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'examUsers');
      }
    }

    case 'getDashboard': {
      const data = await fetchAllDashboardData();
      return { success: true, data: data as T, serverTime };
    }

    case 'addKelas': {
      const namaKelas = String(body.namaKelas ?? '').trim().slice(0, 64);
      if (!namaKelas) {
        return { success: false, message: 'Nama kelas wajib diisi.', serverTime };
      }
      try {
        const snap = await getDocs(boundedCol('kelas'));
        const exists = snap.docs.some(
          (d) => String(d.data().NamaKelas ?? '').toLowerCase() === namaKelas.toLowerCase()
        );
        if (exists) {
          return { success: false, message: `Kelas "${namaKelas}" sudah ada.`, serverTime };
        }
        const id = generateId('kls');
        await setDoc(doc(db, 'kelas', id), { ID: id, NamaKelas: namaKelas });
        return { success: true, message: `Kelas ${namaKelas} berhasil ditambahkan.`, serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'kelas');
      }
    }

    case 'addUser': {
      const role = String(body.role ?? 'siswa').toLowerCase() as UserRole;
      const nama = String(body.nama ?? '').trim().slice(0, 120);
      const username = String(body.username ?? '').trim().slice(0, 64);
      const password = String(body.password ?? '').trim().slice(0, 128);
      const kelas = role === 'siswa' ? String(body.kelas ?? '').trim().slice(0, 64) : '';
      if (!nama || !username || !password) {
        return { success: false, message: 'Nama, username, dan password wajib diisi.', serverTime };
      }
      try {
        const [exactSnap, lowerSnap] = await Promise.all([
          getDocs(query(collection(db, 'examUsers'), where('Username', '==', username), limit(5))),
          username !== username.toLowerCase()
            ? getDocs(
                query(
                  collection(db, 'examUsers'),
                  where('Username', '==', username.toLowerCase()),
                  limit(5)
                )
              )
            : Promise.resolve(null),
        ]);
        const dup =
          !exactSnap.empty || (lowerSnap !== null && !lowerSnap.empty);
        if (dup) {
          return { success: false, message: `Username "${username}" sudah digunakan.`, serverTime };
        }
        const id = generateId('usr');
        await setDoc(doc(db, 'examUsers', id), {
          ID: id,
          Role: role,
          Nama: nama,
          Username: username,
          Password: password,
          Kelas: kelas,
        });
        return { success: true, message: `Pengguna ${nama} berhasil ditambahkan.`, serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'examUsers');
      }
    }

    case 'updateUser': {
      const id = String(body.id ?? '').trim();
      const role = String(body.role ?? 'siswa').toLowerCase() as UserRole;
      const nama = String(body.nama ?? '').trim().slice(0, 120);
      const username = String(body.username ?? '').trim().slice(0, 64);
      const password = String(body.password ?? '').trim().slice(0, 128);
      const kelas = role === 'siswa' ? String(body.kelas ?? '').trim().slice(0, 64) : '';
      if (!id || !nama || !username || !password) {
        return { success: false, message: 'Data pengguna tidak lengkap.', serverTime };
      }
      try {
        const [exactSnap, lowerSnap] = await Promise.all([
          getDocs(query(collection(db, 'examUsers'), where('Username', '==', username), limit(5))),
          username !== username.toLowerCase()
            ? getDocs(
                query(
                  collection(db, 'examUsers'),
                  where('Username', '==', username.toLowerCase()),
                  limit(5)
                )
              )
            : Promise.resolve(null),
        ]);
        const docsToCheck = [...exactSnap.docs, ...(lowerSnap ? lowerSnap.docs : [])];
        const dup = docsToCheck.some((d) => d.id !== id);
        if (dup) {
          return { success: false, message: `Username "${username}" sudah digunakan.`, serverTime };
        }
        await setDoc(doc(db, 'examUsers', id), {
          ID: id,
          Role: role,
          Nama: nama,
          Username: username,
          Password: password,
          Kelas: kelas,
        });
        return { success: true, message: 'Data pengguna berhasil diperbarui.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `examUsers/${id}`);
      }
    }

    case 'importUsers': {
      const rows = Array.isArray(payload) ? payload : [];
      if (rows.length === 0) {
        return { success: false, message: 'Tidak ada data pengguna untuk diimpor.', serverTime };
      }
      try {
        const [usersSnap, kelasSnap] = await Promise.all([
          getDocs(boundedCol('examUsers', 1000)),
          getDocs(boundedCol('kelas', 200)),
        ]);
        const existingUsernames = new Set(
          usersSnap.docs.map((d) => String(d.data().Username ?? '').toLowerCase())
        );
        const existingClasses = new Set(
          kelasSnap.docs.map((d) => String(d.data().NamaKelas ?? ''))
        );

        const ops: Array<(batch: WriteBatch) => void> = [];
        let added = 0;
        let skipped = 0;

        for (const item of rows) {
          const row = item as Record<string, unknown>;
          const role = String(row.role ?? 'siswa').toLowerCase() as UserRole;
          const nama = String(row.nama ?? '').trim().slice(0, 120);
          const username = String(row.username ?? '').trim().slice(0, 64);
          const password = (String(row.password ?? '123456').trim() || '123456').slice(0, 128);
          const kelas = role === 'siswa' ? String(row.kelas ?? '').trim().slice(0, 64) : '';

          if (!nama || !username || existingUsernames.has(username.toLowerCase())) {
            skipped++;
            continue;
          }
          existingUsernames.add(username.toLowerCase());
          if (role === 'siswa' && kelas && !existingClasses.has(kelas)) {
            existingClasses.add(kelas);
            const kId = generateId('kls');
            ops.push((batch) => batch.set(doc(db, 'kelas', kId), { ID: kId, NamaKelas: kelas }));
          }
          const uId = generateId('usr');
          ops.push((batch) =>
            batch.set(doc(db, 'examUsers', uId), {
              ID: uId,
              Role: role,
              Nama: nama,
              Username: username,
              Password: password,
              Kelas: kelas,
            })
          );
          added++;
        }
        await commitOperationsInChunks(ops);
        return {
          success: true,
          message: `Import selesai: ${added} pengguna ditambahkan${skipped > 0 ? `, ${skipped} dilewati` : ''}.`,
          serverTime,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'examUsers');
      }
    }

    case 'addSesi': {
      const namaSesi = String(body.namaSesi ?? '').trim().slice(0, 100);
      const jamMulai = String(body.jamMulai ?? '').trim().slice(0, 10);
      const jamBerakhir = String(body.jamBerakhir ?? '').trim().slice(0, 10);
      if (!namaSesi || !jamMulai || !jamBerakhir) {
        return { success: false, message: 'Semua kolom sesi wajib diisi.', serverTime };
      }
      try {
        const id = generateId('sesi');
        await setDoc(doc(db, 'sesi', id), {
          ID: id,
          NamaSesi: namaSesi,
          JamMulai: jamMulai,
          JamBerakhir: jamBerakhir,
        });
        return { success: true, message: `Sesi "${namaSesi}" berhasil disimpan.`, serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'sesi');
      }
    }

    case 'updateSesi': {
      const id = String(body.id ?? '').trim();
      const namaSesi = String(body.namaSesi ?? '').trim().slice(0, 100);
      const jamMulai = String(body.jamMulai ?? '').trim().slice(0, 10);
      const jamBerakhir = String(body.jamBerakhir ?? '').trim().slice(0, 10);
      if (!id || !namaSesi || !jamMulai || !jamBerakhir) {
        return { success: false, message: 'Semua kolom sesi wajib diisi.', serverTime };
      }
      try {
        await setDoc(doc(db, 'sesi', id), {
          ID: id,
          NamaSesi: namaSesi,
          JamMulai: jamMulai,
          JamBerakhir: jamBerakhir,
        });
        return { success: true, message: 'Sesi berhasil diperbarui.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `sesi/${id}`);
      }
    }

    case 'addRuang': {
      const namaRuang = String(body.namaRuang ?? '').trim().slice(0, 100);
      const kapasitas = Math.min(1000, Math.max(1, Number(body.kapasitas) || 32));
      if (!namaRuang) {
        return { success: false, message: 'Nama ruang wajib diisi.', serverTime };
      }
      try {
        const id = generateId('rng');
        await setDoc(doc(db, 'ruang', id), {
          ID: id,
          NamaRuang: namaRuang,
          Kapasitas: kapasitas,
        });
        return { success: true, message: `Ruang "${namaRuang}" berhasil ditambahkan.`, serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'ruang');
      }
    }

    case 'toggleRuangSiswa': {
      const ruangId = String(body.ruangId ?? '').trim();
      const siswaId = String(body.siswaId ?? '').trim();
      if (!ruangId || !siswaId) {
        return { success: false, message: 'Ruang dan siswa wajib dipilih.', serverTime };
      }
      try {
        const snap = await getDocs(boundedCol('ruang_siswa', 1000));
        const existingDoc = snap.docs.find((d) => d.data().SiswaID === siswaId);
        if (existingDoc && existingDoc.data().RuangID === ruangId) {
          await deleteDoc(doc(db, 'ruang_siswa', existingDoc.id));
          return { success: true, message: 'Siswa dikeluarkan dari ruang.', serverTime };
        }
        if (existingDoc) {
          await updateDoc(doc(db, 'ruang_siswa', existingDoc.id), { RuangID: ruangId });
        } else {
          const id = generateId('rs');
          await setDoc(doc(db, 'ruang_siswa', id), {
            ID: id,
            RuangID: ruangId,
            SiswaID: siswaId,
          });
        }
        return { success: true, message: 'Penempatan ruang siswa diperbarui.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'ruang_siswa');
      }
    }

    case 'assignBulkRuangSiswa': {
      const ruangId = String(body.ruangId ?? '').trim();
      const kelasName = String(body.kelas ?? '').trim();
      if (!ruangId || !kelasName) {
        return { success: false, message: 'Pilih ruang dan kelas terlebih dahulu.', serverTime };
      }
      try {
        const [usersSnap, rsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, 'examUsers'),
              where('Kelas', '==', kelasName),
              limit(200)
            )
          ),
          getDocs(boundedCol('ruang_siswa', 1000)),
        ]);
        const students = usersSnap.docs
          .map((d) => d.data() as User)
          .filter((u) => u.Role === 'siswa');
        const existingMap = new Map(
          rsSnap.docs.map((d) => [String(d.data().SiswaID), d.id])
        );
        const ops: Array<(batch: WriteBatch) => void> = [];
        for (const s of students) {
          const existingId = existingMap.get(s.ID);
          if (existingId) {
            ops.push((batch) =>
              batch.update(doc(db, 'ruang_siswa', existingId), { RuangID: ruangId })
            );
          } else {
            const id = generateId('rs');
            ops.push((batch) =>
              batch.set(doc(db, 'ruang_siswa', id), {
                ID: id,
                RuangID: ruangId,
                SiswaID: s.ID,
              })
            );
          }
        }
        await commitOperationsInChunks(ops);
        return {
          success: true,
          message: `${students.length} siswa kelas ${kelasName} berhasil ditempatkan.`,
          serverTime,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'ruang_siswa');
      }
    }

    case 'addRuangPengawas': {
      const ruangId = String(body.ruangId ?? '').trim();
      const sesiId = String(body.sesiId ?? '').trim();
      const pengawasId = String(body.pengawasId ?? '').trim();
      const tanggal = String(body.tanggal ?? '').trim().slice(0, 20);
      if (!ruangId || !sesiId || !pengawasId || !tanggal) {
        return { success: false, message: 'Semua data penugasan pengawas wajib diisi.', serverTime };
      }
      try {
        const id = generateId('rp');
        await setDoc(doc(db, 'ruang_pengawas', id), {
          ID: id,
          RuangID: ruangId,
          SesiID: sesiId,
          PengawasID: pengawasId,
          Tanggal: tanggal,
        });
        return { success: true, message: 'Penugasan pengawas berhasil disimpan.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'ruang_pengawas');
      }
    }

    case 'addUjian': {
      const kelas = String(body.kelas ?? '').trim().slice(0, 64);
      const mapel = String(body.mapel ?? '').trim().slice(0, 150);
      const tanggal = String(body.tanggal ?? '').trim().slice(0, 20);
      const sesiId = String(body.sesiId ?? '').trim();
      const link = String(body.link ?? '').trim().slice(0, 1000);
      const mode = body.mode === 'cbt' ? 'cbt' : 'url';
      const aksesBebas = Boolean(body.aksesBebas);
      const questions = Array.isArray(body.questions) ? (body.questions as ExamQuestion[]).slice(0, 100) : [];
      if (!kelas || !mapel || !tanggal || !sesiId) {
        return { success: false, message: 'Kelas, Mapel, Tanggal, dan Sesi wajib diisi.', serverTime };
      }
      if (mode === 'url' && !link) {
        return { success: false, message: 'Link Ujian wajib diisi untuk mode tautan eksternal.', serverTime };
      }
      try {
        const id = generateId('ujn');
        await setDoc(doc(db, 'ujian', id), {
          ID: id,
          Kelas: kelas,
          Mapel: mapel,
          Tanggal: tanggal,
          SesiID: sesiId,
          Link: link,
          Token: generateToken(),
          mode,
          aksesBebas,
          questions,
        });
        return { success: true, message: `Jadwal ujian "${mapel}" berhasil dibuat.`, serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'ujian');
      }
    }

    case 'editUjian': {
      const id = String(body.id ?? '').trim();
      const kelas = String(body.kelas ?? '').trim().slice(0, 64);
      const mapel = String(body.mapel ?? '').trim().slice(0, 150);
      const tanggal = String(body.tanggal ?? '').trim().slice(0, 20);
      const sesiId = String(body.sesiId ?? '').trim();
      const link = String(body.link ?? '').trim().slice(0, 1000);
      const mode = body.mode === 'cbt' ? 'cbt' : 'url';
      const aksesBebas = Boolean(body.aksesBebas);
      const questions = Array.isArray(body.questions) ? (body.questions as ExamQuestion[]).slice(0, 100) : [];
      if (!id || !kelas || !mapel || !tanggal || !sesiId) {
        return { success: false, message: 'Data jadwal ujian tidak lengkap.', serverTime };
      }
      try {
        await updateDoc(doc(db, 'ujian', id), {
          Kelas: kelas,
          Mapel: mapel,
          Tanggal: tanggal,
          SesiID: sesiId,
          Link: link,
          mode,
          aksesBebas,
          questions,
        });
        return { success: true, message: 'Jadwal ujian berhasil diperbarui.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `ujian/${id}`);
      }
    }

    case 'updateTokenManual': {
      const ujianId = String(body.ujianId ?? '').trim();
      if (!ujianId) {
        return { success: false, message: 'ID ujian tidak valid.', serverTime };
      }
      const newToken = generateToken();
      try {
        await updateDoc(doc(db, 'ujian', ujianId), { Token: newToken });
        return { success: true, token: newToken, message: 'Token berhasil diperbarui.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `ujian/${ujianId}`);
      }
    }

    case 'getSiswaExams': {
      const kelas = String(body.kelas ?? '').trim();
      const siswaId = String(body.siswaId ?? '').trim();
      try {
        const [ujianSnap, sesiSnap, subSnap] = await Promise.all([
          kelas
            ? getDocs(query(collection(db, 'ujian'), where('Kelas', '==', kelas), limit(100)))
            : Promise.resolve(null),
          getDocs(boundedCol('sesi', 200)),
          siswaId
            ? getDocs(query(collection(db, 'submissions'), where('SiswaID', '==', siswaId), limit(100)))
            : Promise.resolve(null),
        ]);
        const sesiList = sesiSnap.docs.map((d) => mapSesiFromDoc(d.data()));
        const subList = subSnap ? subSnap.docs.map((d) => d.data() as ExamSubmission) : [];
        const ujianList = ujianSnap ? ujianSnap.docs.map((d) => d.data() as Ujian) : [];

        const exams: SiswaExamView[] = ujianList.map((u) => {
          const sesi = sesiList.find((s) => s.ID === u.SesiID);
          const sub = siswaId
            ? subList.find((s) => s.UjianID === u.ID && s.SiswaID === siswaId)
            : undefined;
          return {
            ID: u.ID,
            Kelas: u.Kelas,
            Mapel: u.Mapel,
            Tanggal: u.Tanggal,
            SesiID: u.SesiID,
            Link: '',
            Token: '',
            mode: u.mode ?? 'url',
            aksesBebas: Boolean(u.aksesBebas),
            'Nama Sesi': sesi ? sesi['Nama Sesi'] : '-',
            'Jam Mulai': sesi ? sesi['Jam Mulai'] : '00:00',
            'Jam Berakhir': sesi ? sesi['Jam Berakhir'] : '23:59',
            alreadySubmitted: Boolean(sub),
            lastScore: sub?.Nilai,
          };
        });
        return { success: true, exams, serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'ujian');
      }
    }

    case 'checkToken': {
      const ujianId = String(body.ujianId ?? '').trim();
      const token = String(body.token ?? '').trim().toUpperCase();
      try {
        const snap = await getDoc(doc(db, 'ujian', ujianId));
        if (!snap.exists()) {
          return { success: false, message: 'Jadwal ujian tidak ditemukan.', serverTime };
        }
        const ujian = snap.data() as Ujian;
        if (ujian.Token.toUpperCase() !== token) {
          return { success: false, message: 'Token ujian tidak valid. Periksa kembali dari pengawas.', serverTime };
        }
        const safeQuestions = (ujian.questions ?? []).map((q) => ({
          id: q.id,
          pertanyaan: q.pertanyaan,
          opsi: q.opsi,
        }));
        return {
          success: true,
          link: ujian.Link,
          mode: ujian.mode ?? 'url',
          questions: safeQuestions,
          serverTime,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `ujian/${ujianId}`);
      }
    }

    case 'submitExam': {
      const ujianId = String(body.ujianId ?? '').trim();
      const siswaId = String(body.siswaId ?? '').trim();
      const answers = (body.answers ?? {}) as Record<string, number>;
      try {
        const [ujianSnap, siswaSnap] = await Promise.all([
          getDoc(doc(db, 'ujian', ujianId)),
          getDoc(doc(db, 'examUsers', siswaId)),
        ]);
        if (!ujianSnap.exists() || !siswaSnap.exists()) {
          return { success: false, message: 'Data ujian atau peserta tidak ditemukan.', serverTime };
        }
        const ujian = ujianSnap.data() as Ujian;
        const siswa = siswaSnap.data() as User;
        const questions = ujian.questions ?? [];
        let benar = 0;
        for (const q of questions) {
          if (answers[q.id] === q.jawabanBenar) benar++;
        }
        const total = questions.length;
        const nilai = total > 0 ? Math.round((benar / total) * 100) : 100;
        const submission: ExamSubmission = {
          ID: generateId('sub'),
          UjianID: ujian.ID,
          SiswaID: siswa.ID,
          SiswaNama: siswa.Nama,
          Kelas: siswa.Kelas ?? '-',
          Mapel: ujian.Mapel,
          Benar: benar,
          Total: total,
          Nilai: nilai,
          SubmittedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'submissions', submission.ID), submission);
        return {
          success: true,
          submission,
          message: 'Jawaban ujian berhasil dikirim ke Firestore.',
          serverTime,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'submissions');
      }
    }

    case 'deleteData': {
      const sheet = String(body.sheet ?? '').trim();
      const id = String(body.id ?? '').trim();
      const collectionMap: Record<string, string> = {
        kelas: 'kelas',
        users: 'examUsers',
        sesi: 'sesi',
        ruang: 'ruang',
        ruang_pengawas: 'ruang_pengawas',
        ujian: 'ujian',
        submissions: 'submissions',
      };
      const colName = collectionMap[sheet];
      if (!colName || !id) {
        return { success: false, message: 'Target data tidak valid.', serverTime };
      }
      if (colName === 'examUsers' && id === 'usr_admin_1') {
        return { success: false, message: 'Akun admin utama tidak dapat dihapus.', serverTime };
      }
      try {
        await deleteDoc(doc(db, colName, id));
        return { success: true, message: 'Data berhasil dihapus dari Firestore.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${colName}/${id}`);
      }
    }

    case 'exportBackup': {
      const data = await fetchAllDashboardData();
      return { success: true, data: data as T, serverTime };
    }

    case 'importBackup': {
      const imported = body.data as Partial<DashboardData> | undefined;
      if (!imported || !Array.isArray(imported.users) || !Array.isArray(imported.kelas)) {
        return { success: false, message: 'Format file backup tidak valid.', serverTime };
      }
      try {
        await clearAllCollections();
        const ops: Array<(batch: WriteBatch) => void> = [];
        ops.push((batch) =>
          batch.set(
            doc(db, 'settings', 'main'),
            sanitizeSettings(imported.settings ?? DEFAULT_SETTINGS)
          )
        );
        for (const k of imported.kelas) {
          ops.push((batch) =>
            batch.set(doc(db, 'kelas', k.ID), {
              ID: k.ID,
              NamaKelas: k['Nama Kelas'],
            })
          );
        }
        for (const u of imported.users) {
          ops.push((batch) => batch.set(doc(db, 'examUsers', u.ID), u));
        }
        for (const s of imported.sesi ?? []) {
          ops.push((batch) =>
            batch.set(doc(db, 'sesi', s.ID), {
              ID: s.ID,
              NamaSesi: s['Nama Sesi'],
              JamMulai: s['Jam Mulai'],
              JamBerakhir: s['Jam Berakhir'],
            })
          );
        }
        for (const r of imported.ruang ?? []) {
          ops.push((batch) =>
            batch.set(doc(db, 'ruang', r.ID), {
              ID: r.ID,
              NamaRuang: r['Nama Ruang'],
              Kapasitas: r.Kapasitas ?? 32,
            })
          );
        }
        for (const rs of imported.ruang_siswa ?? []) {
          ops.push((batch) => batch.set(doc(db, 'ruang_siswa', rs.ID), rs));
        }
        for (const rp of imported.ruang_pengawas ?? []) {
          ops.push((batch) => batch.set(doc(db, 'ruang_pengawas', rp.ID), rp));
        }
        for (const ujn of imported.ujian ?? []) {
          ops.push((batch) => batch.set(doc(db, 'ujian', ujn.ID), ujn));
        }
        for (const sub of imported.submissions ?? []) {
          ops.push((batch) => batch.set(doc(db, 'submissions', sub.ID), sub));
        }
        await commitOperationsInChunks(ops);
        return { success: true, message: 'Seluruh data berhasil dipulihkan ke Firestore.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'importBackup');
      }
    }

    case 'resetDemoData': {
      try {
        await clearAllCollections();
        const seed = buildSeedPayload();
        const ops: Array<(batch: WriteBatch) => void> = [];
        ops.push((batch) => batch.set(doc(db, 'settings', 'main'), seed.settings));
        for (const k of seed.kelas) ops.push((batch) => batch.set(doc(db, 'kelas', k.ID), k));
        for (const u of seed.users) ops.push((batch) => batch.set(doc(db, 'examUsers', u.ID), u));
        for (const s of seed.sesi) ops.push((batch) => batch.set(doc(db, 'sesi', s.ID), s));
        for (const r of seed.ruang) ops.push((batch) => batch.set(doc(db, 'ruang', r.ID), r));
        for (const rs of seed.ruang_siswa) {
          ops.push((batch) => batch.set(doc(db, 'ruang_siswa', rs.ID), rs));
        }
        for (const rp of seed.ruang_pengawas) {
          ops.push((batch) => batch.set(doc(db, 'ruang_pengawas', rp.ID), rp));
        }
        for (const ujn of seed.ujian) ops.push((batch) => batch.set(doc(db, 'ujian', ujn.ID), ujn));
        await commitOperationsInChunks(ops);
        return { success: true, message: 'Data awal berhasil dipulihkan di Firestore.', serverTime };
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'resetDemoData');
      }
    }

    default:
      return { success: false, message: `Aksi "${action}" tidak dikenali.`, serverTime };
  }
}

async function clearAllCollections(): Promise<void> {
  const names = [
    'kelas',
    'examUsers',
    'sesi',
    'ruang',
    'ruang_siswa',
    'ruang_pengawas',
    'ujian',
    'submissions',
  ];
  const snaps = await Promise.all(names.map((n) => getDocs(boundedCol(n, 1000))));
  const ops: Array<(batch: WriteBatch) => void> = [];
  names.forEach((n, idx) => {
    for (const d of snaps[idx].docs) {
      ops.push((batch) => batch.delete(doc(db, n, d.id)));
    }
  });
  await commitOperationsInChunks(ops);
}
