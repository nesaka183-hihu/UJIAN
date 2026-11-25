import { useMemo, useState, type FormEvent } from 'react';
import { DoorOpen, Printer, Trash2, UserCheck, Users } from 'lucide-react';
import type { DashboardData } from '../../shared/types';
import { apiCall } from '../../utils/api';
import { formatSheetDate, formatSheetTime, getTodayJakarta } from '../../utils/date';
import type { ToastVariant } from '../Toast';

interface AdminRuangTabProps {
  data: DashboardData;
  onRefresh: () => Promise<void>;
  onNotify: (text: string, variant?: ToastVariant) => void;
  onRequestDelete: (sheet: string, id: string, label: string) => void;
  onPrintDenah: (filterRuangId: string) => void;
  onPrintJadwalPengawas: () => void;
}

export function AdminRuangTab({
  data,
  onRefresh,
  onNotify,
  onRequestDelete,
  onPrintDenah,
  onPrintJadwalPengawas,
}: AdminRuangTabProps) {
  const [subTab, setSubTab] = useState<'siswa' | 'pengawas'>('siswa');

  // Add room state
  const [namaRuang, setNamaRuang] = useState('');
  const [kapasitas, setKapasitas] = useState('32');

  // Student placement state
  const [selectedRuangId, setSelectedRuangId] = useState(data.ruang[0]?.ID ?? '');
  const [filterKelasSiswa, setFilterKelasSiswa] = useState('all');
  const [filterRuangTabel, setFilterRuangTabel] = useState('all');

  // Proctor assignment state
  const [rpRuangId, setRpRuangId] = useState('');
  const [rpSesiId, setRpSesiId] = useState('');
  const [rpPengawasId, setRpPengawasId] = useState('');
  const [rpTanggal, setRpTanggal] = useState(getTodayJakarta());

  const siswaList = useMemo(() => {
    return data.users.filter((u) => {
      if (u.Role !== 'siswa') return false;
      if (filterKelasSiswa !== 'all' && u.Kelas !== filterKelasSiswa) return false;
      return true;
    });
  }, [data.users, filterKelasSiswa]);

  const pengawasList = useMemo(
    () => data.users.filter((u) => u.Role === 'pengawas'),
    [data.users]
  );

  const filteredRuangSiswa = useMemo(() => {
    return data.ruang_siswa.filter((rs) =>
      filterRuangTabel === 'all' ? true : rs.RuangID === filterRuangTabel
    );
  }, [data.ruang_siswa, filterRuangTabel]);

  const handleAddRuang = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiCall('addRuang', {
      namaRuang,
      kapasitas: Number(kapasitas) || 32,
    });
    if (res.success) {
      onNotify(res.message || 'Ruang berhasil ditambahkan.', 'success');
      setNamaRuang('');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menambah ruang.', 'error');
    }
  };

  const handleToggleStudentRoom = async (siswaId: string) => {
    const targetRuang = selectedRuangId || data.ruang[0]?.ID;
    if (!targetRuang) {
      onNotify('Tambahkan ruang ujian terlebih dahulu.', 'error');
      return;
    }
    const res = await apiCall('toggleRuangSiswa', {
      ruangId: targetRuang,
      siswaId,
    });
    if (res.success) {
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal memperbarui ruang siswa.', 'error');
    }
  };

  const handleBulkAssignClass = async () => {
    const targetRuang = selectedRuangId || data.ruang[0]?.ID;
    if (!targetRuang) {
      onNotify('Pilih ruang ujian terlebih dahulu.', 'error');
      return;
    }
    if (filterKelasSiswa === 'all') {
      onNotify('Pilih kelas tertentu pada filter untuk penempatan massal.', 'error');
      return;
    }
    const res = await apiCall('assignBulkRuangSiswa', {
      ruangId: targetRuang,
      kelas: filterKelasSiswa,
    });
    if (res.success) {
      onNotify(res.message || 'Penempatan kelas selesai.', 'success');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menempatkan kelas.', 'error');
    }
  };

  const handleAddRuangPengawas = async (e: FormEvent) => {
    e.preventDefault();
    const res = await apiCall('addRuangPengawas', {
      ruangId: rpRuangId,
      sesiId: rpSesiId,
      pengawasId: rpPengawasId,
      tanggal: rpTanggal,
    });
    if (res.success) {
      onNotify(res.message || 'Tugas pengawas disimpan.', 'success');
      setRpRuangId('');
      setRpSesiId('');
      setRpPengawasId('');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menyimpan penugasan.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('siswa')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'siswa' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Daftar Siswa (Denah)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pengawas')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              subTab === 'pengawas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Daftar Pengawas
          </button>
        </div>
      </div>

      {subTab === 'siswa' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <div className="space-y-6">
            {/* Add Room */}
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <DoorOpen className="w-4 h-4 text-indigo-700" />
                Kelola Ruang Ujian
              </h3>
              <form onSubmit={handleAddRuang} className="space-y-3">
                <input
                  type="text"
                  required
                  value={namaRuang}
                  onChange={(e) => setNamaRuang(e.target.value)}
                  placeholder="Nama Ruang (misal: Ruang 01 - Lab A)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={kapasitas}
                    onChange={(e) => setKapasitas(e.target.value)}
                    placeholder="Kapasitas"
                    className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none tabular-nums"
                  />
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Tambah Ruang
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                {data.ruang.map((r) => {
                  const count = data.ruang_siswa.filter((rs) => rs.RuangID === r.ID).length;
                  return (
                    <div
                      key={r.ID}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-slate-50"
                    >
                      <div>
                        <span className="font-medium text-slate-800">{r['Nama Ruang']}</span>
                        <span className="text-slate-400 ml-2 tabular-nums">
                          ({count}/{r.Kapasitas || 32})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRequestDelete('ruang', r.ID, r['Nama Ruang'])}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Hapus ruang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Placement Panel */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-700" />
                Tempatkan Peserta ke Ruang
              </h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Target Ruang Ujian
                </label>
                <select
                  value={selectedRuangId || data.ruang[0]?.ID || ''}
                  onChange={(e) => setSelectedRuangId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none"
                >
                  {data.ruang.map((r) => (
                    <option key={r.ID} value={r.ID}>
                      {r['Nama Ruang']}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Filter Kelas Siswa
                </label>
                <div className="flex gap-2">
                  <select
                    value={filterKelasSiswa}
                    onChange={(e) => setFilterKelasSiswa(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none"
                  >
                    <option value="all">Semua Kelas</option>
                    {data.kelas.map((k) => (
                      <option key={k.ID} value={k['Nama Kelas']}>
                        {k['Nama Kelas']}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkAssignClass}
                    className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    Pilih Sekelas
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {siswaList.map((s) => {
                  const currentAssignment = data.ruang_siswa.find((rs) => rs.SiswaID === s.ID);
                  const assignedRoom = data.ruang.find(
                    (r) => r.ID === currentAssignment?.RuangID
                  );
                  const isInSelectedRoom =
                    currentAssignment?.RuangID === (selectedRuangId || data.ruang[0]?.ID);

                  return (
                    <div
                      key={s.ID}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{s.Nama}</p>
                        <p className="text-[11px] text-slate-500">
                          {s.Kelas} · {assignedRoom ? assignedRoom['Nama Ruang'] : 'Belum diatur'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleStudentRoom(s.ID)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          isInSelectedRoom
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-red-100 hover:text-red-700'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {isInSelectedRoom ? 'Terdaftar' : 'Masukkan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right column: Denah Table */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-slate-900">Denah Peserta Ruang</h3>
                <select
                  value={filterRuangTabel}
                  onChange={(e) => setFilterRuangTabel(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none"
                >
                  <option value="all">Semua Ruang</option>
                  {data.ruang.map((r) => (
                    <option key={r.ID} value={r.ID}>
                      {r['Nama Ruang']}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => onPrintDenah(filterRuangTabel)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Daftar Hadir
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 px-3 font-semibold w-12">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Siswa</th>
                    <th className="py-2.5 px-3 font-semibold">Kelas</th>
                    <th className="py-2.5 px-3 font-semibold">Ruang Ujian</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {filteredRuangSiswa.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-xs text-slate-500">
                        Belum ada peserta yang ditempatkan di ruang ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRuangSiswa.map((rs, idx) => {
                      const s = data.users.find((u) => u.ID === rs.SiswaID);
                      const r = data.ruang.find((item) => item.ID === rs.RuangID);
                      return (
                        <tr key={rs.ID} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {s?.Nama || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600">{s?.Kelas || '-'}</td>
                          <td className="py-2.5 px-3 text-xs font-medium text-indigo-800">
                            {r?.['Nama Ruang'] || '-'}
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
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
          <section className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
              <UserCheck className="w-4 h-4 text-indigo-700" />
              Tugas Pengawas Ruang
            </h3>
            <form onSubmit={handleAddRuangPengawas} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={rpTanggal}
                  onChange={(e) => setRpTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ruang Ujian</label>
                <select
                  required
                  value={rpRuangId}
                  onChange={(e) => setRpRuangId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none"
                >
                  <option value="">Pilih Ruang</option>
                  {data.ruang.map((r) => (
                    <option key={r.ID} value={r.ID}>
                      {r['Nama Ruang']}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sesi Ujian</label>
                <select
                  required
                  value={rpSesiId}
                  onChange={(e) => setRpSesiId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none"
                >
                  <option value="">Pilih Sesi</option>
                  {data.sesi.map((s) => (
                    <option key={s.ID} value={s.ID}>
                      {s['Nama Sesi']} ({formatSheetTime(s['Jam Mulai'])} -{' '}
                      {formatSheetTime(s['Jam Berakhir'])})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pengawas</label>
                <select
                  required
                  value={rpPengawasId}
                  onChange={(e) => setRpPengawasId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none"
                >
                  <option value="">Pilih Pengawas</option>
                  {pengawasList.map((p) => (
                    <option key={p.ID} value={p.ID}>
                      {p.Nama}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Simpan Penugasan
              </button>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900">Jadwal Tugas Pengawas</h3>
              <button
                type="button"
                onClick={onPrintJadwalPengawas}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Jadwal Pengawas
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2.5 px-3 font-semibold w-12">No</th>
                    <th className="py-2.5 px-3 font-semibold">Tanggal</th>
                    <th className="py-2.5 px-3 font-semibold">Pengawas</th>
                    <th className="py-2.5 px-3 font-semibold">Ruang</th>
                    <th className="py-2.5 px-3 font-semibold">Sesi</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.ruang_pengawas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                        Belum ada penugasan pengawas.
                      </td>
                    </tr>
                  ) : (
                    data.ruang_pengawas.map((rp, idx) => {
                      const p = data.users.find((u) => u.ID === rp.PengawasID);
                      const r = data.ruang.find((item) => item.ID === rp.RuangID);
                      const s = data.sesi.find((item) => item.ID === rp.SesiID);
                      return (
                        <tr key={rp.ID} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-xs text-slate-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700">
                            {formatSheetDate(rp.Tanggal)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {p?.Nama || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-indigo-800 font-medium">
                            {r?.['Nama Ruang'] || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-600 tabular-nums">
                            {s
                              ? `${s['Nama Sesi']} (${formatSheetTime(s['Jam Mulai'])}-${formatSheetTime(s['Jam Berakhir'])})`
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                onRequestDelete(
                                  'ruang_pengawas',
                                  rp.ID,
                                  `${p?.Nama || 'Pengawas'} di ${r?.['Nama Ruang'] || 'Ruang'}`
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
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
    </div>
  );
}
