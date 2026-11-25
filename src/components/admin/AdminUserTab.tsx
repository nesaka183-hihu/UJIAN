import { useMemo, useRef, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { Download, Edit2, Printer, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import type { DashboardData, User, UserRole } from '../../shared/types';
import { apiCall } from '../../utils/api';
import type { ToastVariant } from '../Toast';

interface AdminUserTabProps {
  data: DashboardData;
  onRefresh: () => Promise<void>;
  onNotify: (text: string, variant?: ToastVariant) => void;
  onRequestDelete: (sheet: string, id: string, label: string) => void;
  onPrintKartu: (filterKelas: string) => void;
}

export function AdminUserTab({
  data,
  onRefresh,
  onNotify,
  onRequestDelete,
  onPrintKartu,
}: AdminUserTabProps) {
  const [subTab, setSubTab] = useState<UserRole>('siswa');
  const [search, setSearch] = useState('');
  const [kelasFilter, setKelasFilter] = useState('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('siswa');
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [kelas, setKelas] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.users.filter((u) => {
      if (u.Role !== subTab) return false;
      if (subTab === 'siswa' && kelasFilter !== 'all' && u.Kelas !== kelasFilter) return false;
      if (q && !u.Nama.toLowerCase().includes(q) && !u.Username.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [data.users, subTab, search, kelasFilter]);

  const resetForm = () => {
    setEditingId(null);
    setRole(subTab);
    setNama('');
    setUsername('');
    setPassword('');
    setKelas('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const action = editingId ? 'updateUser' : 'addUser';
    const res = await apiCall(action, {
      id: editingId,
      role,
      nama,
      username,
      password,
      kelas: role === 'siswa' ? kelas : '',
    });
    setSaving(false);
    if (res.success) {
      onNotify(res.message || 'Pengguna berhasil disimpan.', 'success');
      resetForm();
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menyimpan pengguna.', 'error');
    }
  };

  const handleEdit = (u: User) => {
    setEditingId(u.ID);
    setRole(u.Role);
    setNama(u.Nama);
    setUsername(u.Username);
    setPassword(u.Password);
    setKelas(u.Kelas || '');
  };

  const downloadTemplate = (targetRole: 'siswa' | 'pengawas') => {
    const rows =
      targetRole === 'siswa'
        ? [
            ['Nama', 'Username', 'Password', 'Kelas'],
            ['Andi Pratama', 'andi_baru', 'siswa123', data.kelas[0]?.['Nama Kelas'] || 'XII IPA 1'],
          ]
        : [
            ['Nama', 'Username', 'Password'],
            ['Drs. Hendra Wijaya', 'hendra_p', 'pengawas123'],
          ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Template_${targetRole.toUpperCase()}.xlsx`);
    onNotify(`Template ${targetRole} berhasil diunduh.`, 'info');
  };

  const handleImportExcel = async (targetRole: 'siswa' | 'pengawas') => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      onNotify('Pilih file Excel (.xlsx) terlebih dahulu.', 'error');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const payload = json
        .map((row) => ({
          role: targetRole,
          nama: String(row.Nama ?? row.NAMA ?? '').trim(),
          username: String(row.Username ?? row.USERNAME ?? '').trim(),
          password: String(row.Password ?? row.PASSWORD ?? '123456').trim(),
          kelas: targetRole === 'siswa' ? String(row.Kelas ?? row.KELAS ?? '').trim() : '',
        }))
        .filter((item) => item.nama && item.username);

      if (payload.length === 0) {
        onNotify('File Excel kosong atau header kolom tidak sesuai template.', 'error');
        return;
      }

      const res = await apiCall('importUsers', payload);
      if (res.success) {
        onNotify(res.message || 'Import berhasil.', 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
        await onRefresh();
      } else {
        onNotify(res.message || 'Gagal mengimpor pengguna.', 'error');
      }
    } catch (err) {
      onNotify(
        err instanceof Error ? err.message : 'Gagal membaca file Excel.',
        'error'
      );
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
      {/* Left column: Form + Batch Excel Import */}
      <div className="space-y-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-indigo-700" />
            {editingId ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peran</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
              >
                <option value="siswa">Siswa (Peserta)</option>
                <option value="pengawas">Pengawas Ruang</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Andi Pratama"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>
            {role === 'siswa' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kelas</label>
                <select
                  required
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                >
                  <option value="">Pilih Kelas</option>
                  {data.kelas.map((k) => (
                    <option key={k.ID} value={k['Nama Kelas']}>
                      {k['Nama Kelas']}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
              </button>
            </div>
          </form>
        </section>

        {/* Batch Excel Import */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Import Massal Excel (.xlsx)</h3>
          <p className="text-xs text-slate-500">
            Unduh format template terlebih dahulu, isi data pengguna, lalu unggah kembali.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate('siswa')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Format Siswa
            </button>
            <button
              type="button"
              onClick={() => downloadTemplate('pengawas')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Format Pengawas
            </button>
          </div>
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleImportExcel('siswa')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Siswa
              </button>
              <button
                type="button"
                onClick={() => handleImportExcel('pengawas')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Import Pengawas
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Right column: User Table */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                ['siswa', 'Siswa'],
                ['pengawas', 'Pengawas'],
                ['admin', 'Admin'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSubTab(key);
                  setRole(key);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  subTab === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {subTab === 'siswa' && (
            <button
              type="button"
              onClick={() => onPrintKartu(kelasFilter)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Kartu Ujian
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau username..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
            />
          </div>
          {subTab === 'siswa' && (
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
            >
              <option value="all">Semua Kelas</option>
              {data.kelas.map((k) => (
                <option key={k.ID} value={k['Nama Kelas']}>
                  {k['Nama Kelas']}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2.5 px-3 font-semibold w-12">No</th>
                <th className="py-2.5 px-3 font-semibold">Nama</th>
                {subTab === 'siswa' && <th className="py-2.5 px-3 font-semibold">Kelas</th>}
                <th className="py-2.5 px-3 font-semibold">Username</th>
                <th className="py-2.5 px-3 font-semibold">Password</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={subTab === 'siswa' ? 6 : 5}
                    className="py-10 text-center text-xs text-slate-500"
                  >
                    Belum ada data {subTab} yang cocok.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr
                    key={u.ID}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{u.Nama}</td>
                    {subTab === 'siswa' && (
                      <td className="py-2.5 px-3 text-xs text-slate-700">{u.Kelas || '-'}</td>
                    )}
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {u.Username}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {u.Password}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleEdit(u)}
                        className="p-1.5 text-slate-500 hover:text-indigo-700 rounded cursor-pointer"
                        title="Edit pengguna"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {u.ID !== 'usr_admin_1' && (
                        <button
                          type="button"
                          onClick={() => onRequestDelete('users', u.ID, u.Nama)}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded cursor-pointer"
                          title="Hapus pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
