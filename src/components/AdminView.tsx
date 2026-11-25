import { useRef, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import {
  Award,
  Box,
  Clock,
  Download,
  Edit2,
  FileCode2,
  FileText,
  FolderArchive,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type { AppSettings, DashboardData, Sesi, User } from '../shared/types';
import { apiCall } from '../utils/api';
import { formatSheetDate, formatSheetTime } from '../utils/date';
import {
  downloadGithubProjectZip,
  downloadSingleFileHtml,
} from '../utils/exportProjectZip';
import { resolveSchoolLogo } from '../utils/logoResolver';
import { ConfirmDialog } from './ConfirmDialog';
import { PrintPreviewModal, type PrintDocumentType } from './PrintPreviewModal';
import type { ToastVariant } from './Toast';
import { AdminRuangTab } from './admin/AdminRuangTab';
import { AdminUjianTab } from './admin/AdminUjianTab';
import { AdminUserTab } from './admin/AdminUserTab';

type AdminTab =
  | 'dashboard'
  | 'kelas'
  | 'user'
  | 'sesi'
  | 'ujian'
  | 'ruang'
  | 'hasil'
  | 'pengaturan';

interface AdminViewProps {
  user: User;
  settings: AppSettings;
  data: DashboardData;
  onRefresh: () => Promise<void>;
  onSettingsUpdated: (next: AppSettings) => void;
  onLogout: () => void;
  onNotify: (text: string, variant?: ToastVariant) => void;
}

const DEFAULT_LOGO = '/assets/aistudio/logo_nesaka-removebg-preview_ee9f6ab8.png';

export function AdminView({
  user,
  settings,
  data,
  onRefresh,
  onSettingsUpdated,
  onLogout,
  onNotify,
}: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [htmlLoading, setHtmlLoading] = useState(false);

  // Kelas form
  const [namaKelas, setNamaKelas] = useState('');

  // Sesi form
  const [editingSesiId, setEditingSesiId] = useState<string | null>(null);
  const [namaSesi, setNamaSesi] = useState('');
  const [jamMulai, setJamMulai] = useState('07:30');
  const [jamBerakhir, setJamBerakhir] = useState('09:30');

  // Settings form
  const [formSettings, setFormSettings] = useState<AppSettings>(settings);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Print preview state
  const [printOpen, setPrintOpen] = useState(false);
  const [printType, setPrintType] = useState<PrintDocumentType>('kartu');
  const [printFilterRuang, setPrintFilterRuang] = useState('all');
  const [printFilterKelas, setPrintFilterKelas] = useState('all');

  // Confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<{
    sheet: string;
    id: string;
    label: string;
  } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const totalSiswa = data.users.filter((u) => u.Role === 'siswa').length;
  const totalPengawas = data.users.filter((u) => u.Role === 'pengawas').length;

  const handleRefresh = async () => {
    setReloading(true);
    await onRefresh();
    setReloading(false);
    onNotify('Data sistem diperbarui.', 'info');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await apiCall('deleteData', {
      sheet: deleteTarget.sheet,
      id: deleteTarget.id,
    });
    setDeleteTarget(null);
    if (res.success) {
      onNotify(res.message || 'Data berhasil dihapus.', 'success');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menghapus data.', 'error');
    }
  };

  const handleAddKelas = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiCall('addKelas', { namaKelas });
    if (res.success) {
      onNotify(res.message || 'Kelas ditambahkan.', 'success');
      setNamaKelas('');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menambah kelas.', 'error');
    }
  };

  const handleSaveSesi = async (e: FormEvent) => {
    e.preventDefault();
    const action = editingSesiId ? 'updateSesi' : 'addSesi';
    const res = await apiCall(action, {
      id: editingSesiId,
      namaSesi,
      jamMulai,
      jamBerakhir,
    });
    if (res.success) {
      onNotify(res.message || 'Sesi ujian disimpan.', 'success');
      setEditingSesiId(null);
      setNamaSesi('');
      setJamMulai('07:30');
      setJamBerakhir('09:30');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menyimpan sesi.', 'error');
    }
  };

  const handleEditSesi = (s: Sesi) => {
    setEditingSesiId(s.ID);
    setNamaSesi(s['Nama Sesi']);
    setJamMulai(s['Jam Mulai']);
    setJamBerakhir(s['Jam Berakhir']);
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiCall<AppSettings>('saveSettings', formSettings);
    if (res.success && res.data) {
      onSettingsUpdated(res.data);
      onNotify(res.message || 'Pengaturan disimpan.', 'success');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menyimpan pengaturan.', 'error');
    }
  };

  const handleExportBackup = async () => {
    const res = await apiCall<DashboardData>('exportBackup', {});
    if (res.success && res.data) {
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-manajemen-ujian-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify('Backup data berhasil diunduh.', 'success');
    }
  };

  const handleDownloadProjectZip = async () => {
    setZipLoading(true);
    try {
      const count = await downloadGithubProjectZip(settings.logo);
      onNotify(
        `Paket source code GitHub (.zip) berisi ${count} file berhasil diunduh.`,
        'success'
      );
    } catch {
      onNotify('Gagal membuat arsip ZIP proyek.', 'error');
    } finally {
      setZipLoading(false);
    }
  };

  const handleDownloadSingleHtml = async () => {
    setHtmlLoading(true);
    try {
      const bytes = await downloadSingleFileHtml();
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      onNotify(`File tunggal index.html (${mb} MB) berhasil diunduh.`, 'success');
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Gagal mengunduh file index.html.',
        'error'
      );
    } finally {
      setHtmlLoading(false);
    }
  };

  const handleImportBackup = async () => {
    const file = backupInputRef.current?.files?.[0];
    if (!file) {
      onNotify('Pilih file backup JSON terlebih dahulu.', 'error');
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await apiCall('importBackup', { data: parsed });
      if (res.success) {
        onNotify(res.message || 'Backup dipulihkan.', 'success');
        if (backupInputRef.current) backupInputRef.current.value = '';
        await onRefresh();
      } else {
        onNotify(res.message || 'Format backup tidak valid.', 'error');
      }
    } catch {
      onNotify('Gagal membaca file JSON backup.', 'error');
    }
  };

  const handleResetDemo = async () => {
    setConfirmResetOpen(false);
    const res = await apiCall('resetDemoData', {});
    if (res.success) {
      onNotify(res.message || 'Data awal dipulihkan.', 'success');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal mereset data.', 'error');
    }
  };

  const handleExportSubmissionsExcel = () => {
    if (data.submissions.length === 0) {
      onNotify('Belum ada hasil ujian CBT untuk diekspor.', 'error');
      return;
    }
    const rows = data.submissions.map((sub, i) => ({
      No: i + 1,
      Nama: sub.SiswaNama,
      Kelas: sub.Kelas,
      'Mata Pelajaran': sub.Mapel,
      Benar: sub.Benar,
      'Total Soal': sub.Total,
      Nilai: sub.Nilai,
      Waktu: new Date(sub.SubmittedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Ujian');
    XLSX.writeFile(wb, `Hasil_Ujian_CBT_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onNotify('Rekap hasil ujian berhasil diunduh.', 'success');
  };

  const navItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kelas', label: 'Kelola Kelas', icon: Box },
    { id: 'user', label: 'Data Pengguna', icon: Users },
    { id: 'sesi', label: 'Sesi Ujian', icon: Clock },
    { id: 'ujian', label: 'Jadwal Ujian', icon: FileText },
    { id: 'ruang', label: 'Manajemen Ruang', icon: LayoutGrid },
    { id: 'hasil', label: 'Hasil Ujian CBT', icon: Award },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  const pageTitles: Record<AdminTab, string> = {
    dashboard: 'Dashboard Utama',
    kelas: 'Kelola Kelas',
    user: 'Data Pengguna & Kartu Ujian',
    sesi: 'Manajemen Sesi Ujian',
    ujian: 'Jadwal & Paket Ujian',
    ruang: 'Manajemen Ruang & Penugasan',
    hasil: 'Rekap Hasil Ujian CBT',
    pengaturan: 'Pengaturan & Backup Sistem',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Sidebar Backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-indigo-950 text-indigo-100 flex flex-col shrink-0 transition-transform duration-200 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="px-5 py-4 border-b border-indigo-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center shrink-0">
              {settings.logo ? (
                <img
                  src={resolveSchoolLogo(settings.logo)}
                  alt={settings.namaSekolah}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain bg-white p-0.5"
                />
              ) : (
                <ShieldCheck className="w-5 h-5 text-indigo-200" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{settings.namaApp}</p>
              <p className="text-[11px] text-indigo-300 truncate">{settings.namaSekolah}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden p-1 text-indigo-300 hover:text-white"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                  if (item.id === 'pengaturan') setFormSettings(settings);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-indigo-800 text-white'
                    : 'text-indigo-200 hover:bg-indigo-900/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-indigo-900 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user.Nama}</p>
            <p className="text-[11px] text-indigo-300">Administrator</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-indigo-300 hover:text-white hover:bg-red-600/80 rounded-lg transition-colors cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-6 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {pageTitles[activeTab]}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={reloading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
            Segarkan Data
          </button>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Total Kelas</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {data.kelas.length}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Total Siswa</p>
                  <p className="mt-2 text-3xl font-bold text-indigo-700 tabular-nums">
                    {totalSiswa}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Total Pengawas</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
                    {totalPengawas}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-slate-500">Jadwal Ujian</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700 tabular-nums">
                    {data.ujian.length}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Jadwal & Token Ujian Aktif
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ujian')}
                      className="text-xs font-medium text-indigo-700 hover:underline cursor-pointer"
                    >
                      Kelola Jadwal
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 pr-3 font-semibold">Mapel</th>
                          <th className="py-2 pr-3 font-semibold">Kelas</th>
                          <th className="py-2 pr-3 font-semibold">Tanggal</th>
                          <th className="py-2 font-semibold text-right">Token</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ujian.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500">
                              Belum ada jadwal ujian.
                            </td>
                          </tr>
                        ) : (
                          data.ujian.map((u) => (
                            <tr key={u.ID} className="border-b border-slate-100 last:border-b-0">
                              <td className="py-2.5 pr-3 font-medium text-slate-900">{u.Mapel}</td>
                              <td className="py-2.5 pr-3 text-slate-600">{u.Kelas}</td>
                              <td className="py-2.5 pr-3 text-slate-600">
                                {formatSheetDate(u.Tanggal)}
                              </td>
                              <td className="py-2.5 text-right font-mono font-bold text-indigo-700 tracking-wider">
                                {u.Token}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Ringkasan Ruang Ujian
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ruang')}
                      className="text-xs font-medium text-indigo-700 hover:underline cursor-pointer"
                    >
                      Atur Denah & Pengawas
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2 pr-3 font-semibold">Nama Ruang</th>
                          <th className="py-2 pr-3 font-semibold">Peserta Terdaftar</th>
                          <th className="py-2 font-semibold text-right">Kapasitas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.ruang.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-slate-500">
                              Belum ada ruang ujian.
                            </td>
                          </tr>
                        ) : (
                          data.ruang.map((r) => {
                            const count = data.ruang_siswa.filter(
                              (rs) => rs.RuangID === r.ID
                            ).length;
                            return (
                              <tr key={r.ID} className="border-b border-slate-100 last:border-b-0">
                                <td className="py-2.5 pr-3 font-medium text-slate-900">
                                  {r['Nama Ruang']}
                                </td>
                                <td className="py-2.5 pr-3 text-slate-700 tabular-nums">
                                  {count} siswa
                                </td>
                                <td className="py-2.5 text-right text-slate-500 tabular-nums">
                                  {r.Kapasitas || 32} kursi
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Export untuk GitHub &amp; GitHub Pages
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Unduh 1 file tunggal <span className="font-mono">index.html</span> (paling mudah untuk upload lewat HP tanpa folder) atau paket lengkap <span className="font-mono">.zip</span>.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadSingleHtml}
                    disabled={htmlLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FileCode2 className="w-4 h-4" />
                    <span>{htmlLoading ? 'Menyiapkan HTML...' : 'Unduh 1 File (index.html)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadProjectZip}
                    disabled={zipLoading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <FolderArchive className="w-4 h-4" />
                    <span>{zipLoading ? 'Menyiapkan ZIP...' : 'Unduh Proyek (.zip)'}</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'kelas' && (
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
              <section className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  Tambah Kelas Baru
                </h3>
                <form onSubmit={handleAddKelas} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Kelas
                    </label>
                    <input
                      type="text"
                      required
                      value={namaKelas}
                      onChange={(e) => setNamaKelas(e.target.value)}
                      placeholder="Contoh: XII IPA 3"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Simpan Kelas
                  </button>
                </form>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Daftar Kelas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2.5 px-3 font-semibold w-12">No</th>
                        <th className="py-2.5 px-3 font-semibold">Nama Kelas</th>
                        <th className="py-2.5 px-3 font-semibold">Jumlah Siswa</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {data.kelas.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                            Belum ada data kelas.
                          </td>
                        </tr>
                      ) : (
                        data.kelas.map((k, idx) => {
                          const count = data.users.filter(
                            (u) => u.Role === 'siswa' && u.Kelas === k['Nama Kelas']
                          ).length;
                          return (
                            <tr key={k.ID} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                {k['Nama Kelas']}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-slate-600 tabular-nums">
                                {count} siswa
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      sheet: 'kelas',
                                      id: k.ID,
                                      label: k['Nama Kelas'],
                                    })
                                  }
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                  title="Hapus kelas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'user' && (
            <AdminUserTab
              data={data}
              onRefresh={onRefresh}
              onNotify={onNotify}
              onRequestDelete={(sheet, id, label) => setDeleteTarget({ sheet, id, label })}
              onPrintKartu={(filterKelas) => {
                setPrintType('kartu');
                setPrintFilterKelas(filterKelas);
                setPrintOpen(true);
              }}
            />
          )}

          {activeTab === 'sesi' && (
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
              <section className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  {editingSesiId ? 'Edit Sesi Ujian' : 'Tambah Sesi Ujian'}
                </h3>
                <form onSubmit={handleSaveSesi} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Sesi
                    </label>
                    <input
                      type="text"
                      required
                      value={namaSesi}
                      onChange={(e) => setNamaSesi(e.target.value)}
                      placeholder="Contoh: Sesi 1 (Pagi)"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Jam Mulai
                      </label>
                      <input
                        type="time"
                        required
                        value={jamMulai}
                        onChange={(e) => setJamMulai(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Jam Berakhir
                      </label>
                      <input
                        type="time"
                        required
                        value={jamBerakhir}
                        onChange={(e) => setJamBerakhir(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingSesiId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSesiId(null);
                          setNamaSesi('');
                        }}
                        className="px-3.5 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      {editingSesiId ? 'Simpan Perubahan' : 'Simpan Sesi'}
                    </button>
                  </div>
                </form>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  Daftar Sesi Ujian
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th className="py-2.5 px-3 font-semibold w-12">No</th>
                        <th className="py-2.5 px-3 font-semibold">Nama Sesi</th>
                        <th className="py-2.5 px-3 font-semibold">Mulai</th>
                        <th className="py-2.5 px-3 font-semibold">Berakhir</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {data.sesi.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                            Belum ada sesi ujian.
                          </td>
                        </tr>
                      ) : (
                        data.sesi.map((s, idx) => (
                          <tr key={s.ID} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              {s['Nama Sesi']}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs text-slate-700 tabular-nums">
                              {formatSheetTime(s['Jam Mulai'])}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-xs text-slate-700 tabular-nums">
                              {formatSheetTime(s['Jam Berakhir'])}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleEditSesi(s)}
                                className="p-1.5 text-slate-500 hover:text-indigo-700 rounded cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    sheet: 'sesi',
                                    id: s.ID,
                                    label: s['Nama Sesi'],
                                  })
                                }
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'ujian' && (
            <AdminUjianTab
              data={data}
              onRefresh={onRefresh}
              onNotify={onNotify}
              onRequestDelete={(sheet, id, label) => setDeleteTarget({ sheet, id, label })}
            />
          )}

          {activeTab === 'ruang' && (
            <AdminRuangTab
              data={data}
              onRefresh={onRefresh}
              onNotify={onNotify}
              onRequestDelete={(sheet, id, label) => setDeleteTarget({ sheet, id, label })}
              onPrintDenah={(ruangId) => {
                setPrintType('denah_siswa');
                setPrintFilterRuang(ruangId);
                setPrintOpen(true);
              }}
              onPrintJadwalPengawas={() => {
                setPrintType('jadwal_pengawas');
                setPrintOpen(true);
              }}
            />
          )}

          {activeTab === 'hasil' && (
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Rekap Nilai Ujian CBT Terpadu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftar nilai otomatis peserta yang mengerjakan paket soal CBT internal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportSubmissionsExcel}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Excel (.xlsx)
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2.5 px-3 font-semibold w-12">No</th>
                      <th className="py-2.5 px-3 font-semibold">Nama Peserta</th>
                      <th className="py-2.5 px-3 font-semibold">Kelas</th>
                      <th className="py-2.5 px-3 font-semibold">Mata Pelajaran</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Benar</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Nilai</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {data.submissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                          Belum ada peserta yang mengirimkan jawaban ujian CBT.
                        </td>
                      </tr>
                    ) : (
                      data.submissions.map((sub, idx) => (
                        <tr key={sub.ID} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {sub.SiswaNama}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600">{sub.Kelas}</td>
                          <td className="py-2.5 px-3 text-xs text-slate-800">{sub.Mapel}</td>
                          <td className="py-2.5 px-3 text-xs text-right font-mono tabular-nums">
                            {sub.Benar}/{sub.Total}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700 tabular-nums">
                            {sub.Nilai}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  sheet: 'submissions',
                                  id: sub.ID,
                                  label: `Nilai ${sub.SiswaNama}`,
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'pengaturan' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                  Konfigurasi Identitas Sekolah
                </h3>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Aplikasi
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.namaApp}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, namaApp: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nama Sekolah / Institusi
                    </label>
                    <input
                      type="text"
                      required
                      value={formSettings.namaSekolah}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, namaSekolah: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Alamat Sekolah (Untuk Kop Cetak)
                    </label>
                    <input
                      type="text"
                      value={formSettings.alamat}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, alamat: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Tahun Ajaran
                    </label>
                    <input
                      type="text"
                      value={formSettings.tahunAjaran}
                      onChange={(e) =>
                        setFormSettings({ ...formSettings, tahunAjaran: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      URL Logo Sekolah
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formSettings.logo}
                        onChange={(e) =>
                          setFormSettings({ ...formSettings, logo: e.target.value })
                        }
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormSettings({ ...formSettings, logo: DEFAULT_LOGO })
                        }
                        className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg whitespace-nowrap cursor-pointer"
                      >
                        Logo Default
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Simpan Pengaturan
                  </button>
                </form>
              </section>

              <div className="space-y-6">
                <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <h3 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
                    Backup & Pemulihan Database
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Seluruh data tersimpan penuh di Firebase Firestore tanpa batasan waktu atau kuota demo. Anda dapat mengunduh cadangan penuh (.json) atau memulihkan data kapan saja.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Backup (.json)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      Pulihkan Data Contoh Awal
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Restore dari File Backup (.json)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={backupInputRef}
                        type="file"
                        accept=".json"
                        className="flex-1 text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700"
                      />
                      <button
                        type="button"
                        onClick={handleImportBackup}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Restore Backup
                      </button>
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
                    Upload ke GitHub (.html Tunggal / .zip)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Untuk upload langsung lewat browser HP tanpa folder, gunakan <span className="font-mono font-semibold">index.html</span> tunggal. Untuk repositori source code penuh, unduh paket <span className="font-mono">.zip</span>.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadSingleHtml}
                      disabled={htmlLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg cursor-pointer"
                    >
                      <FileCode2 className="w-4 h-4" />
                      <span>{htmlLoading ? 'Menyiapkan HTML...' : 'Unduh 1 File (index.html)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadProjectZip}
                      disabled={zipLoading}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg cursor-pointer"
                    >
                      <FolderArchive className="w-4 h-4" />
                      <span>{zipLoading ? 'Mengemas ZIP...' : 'Unduh Source Code (.zip)'}</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Print Preview Modal */}
      <PrintPreviewModal
        open={printOpen}
        docType={printType}
        data={data}
        settings={settings}
        filterRuangId={printFilterRuang}
        filterKelas={printFilterKelas}
        onClose={() => setPrintOpen(false)}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Data?"
        description={`Anda yakin ingin menghapus "${deleteTarget?.label}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset confirmation */}
      <ConfirmDialog
        open={confirmResetOpen}
        title="Pulihkan Data Contoh Awal?"
        description="Seluruh perubahan data saat ini akan diganti dengan data awal bawaan."
        confirmLabel="Ya, Pulihkan"
        destructive
        onConfirm={handleResetDemo}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
