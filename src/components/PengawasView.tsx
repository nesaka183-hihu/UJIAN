import { useMemo, useState } from 'react';
import { Calendar, Clock, LogOut, RefreshCw } from 'lucide-react';
import type { AppSettings, DashboardData, User } from '../shared/types';
import { formatSheetDate, formatSheetTime, getNow, parseExamDate } from '../utils/date';
import { apiCall } from '../utils/api';
import type { ToastVariant } from './Toast';

interface PengawasViewProps {
  user: User;
  settings: AppSettings;
  data: DashboardData;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
  onNotify: (text: string, variant?: ToastVariant) => void;
}

type StatusFilter = 'all' | 'active' | 'upcoming' | 'done';

export function PengawasView({
  user,
  settings,
  data,
  onRefresh,
  onLogout,
  onNotify,
}: PengawasViewProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);

  const now = getNow();

  const examCards = useMemo(() => {
    return data.ujian
      .filter((u) => Boolean(u.ID))
      .map((u) => {
        const sesi = data.sesi.find((s) => s.ID === u.SesiID);
        if (!sesi) return null;
        const start = parseExamDate(u.Tanggal, sesi['Jam Mulai']);
        const end = parseExamDate(u.Tanggal, sesi['Jam Berakhir']);

        let status: 'active' | 'upcoming' | 'done' = 'upcoming';
        if (u.aksesBebas) {
          status = 'active';
        } else if (now >= start && now <= end) {
          status = 'active';
        } else if (now > end) {
          status = 'done';
        }
        return { ujian: u, sesi, status };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => (filter === 'all' ? true : item.status === filter));
  }, [data.ujian, data.sesi, filter, now]);

  const myAssignments = useMemo(() => {
    return data.ruang_pengawas
      .filter((rp) => rp.PengawasID === user.ID)
      .map((rp) => {
        const ruang = data.ruang.find((r) => r.ID === rp.RuangID);
        const sesi = data.sesi.find((s) => s.ID === rp.SesiID);
        return {
          id: rp.ID,
          tanggal: formatSheetDate(rp.Tanggal),
          ruang: ruang ? ruang['Nama Ruang'] : '-',
          sesi: sesi ? `${sesi['Nama Sesi']} (${formatSheetTime(sesi['Jam Mulai'])} - ${formatSheetTime(sesi['Jam Berakhir'])})` : '-',
        };
      });
  }, [data.ruang_pengawas, data.ruang, data.sesi, user.ID]);

  const handleManualUpdateToken = async (ujianId: string) => {
    setRefreshingId(ujianId);
    const res = await apiCall('updateTokenManual', { ujianId });
    setRefreshingId(null);
    if (res.success) {
      onNotify(`Token diperbarui: ${res.token}`, 'success');
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal memperbarui token.', 'error');
    }
  };

  const handleRefreshAll = async () => {
    setReloading(true);
    await onRefresh();
    setReloading(false);
    onNotify('Data jadwal dan token diperbarui.', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-950 text-white border-b border-indigo-900 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <span className="text-base font-bold tracking-tight whitespace-nowrap shrink-0">
            {settings.namaApp}
          </span>

          <nav className="hidden md:flex items-center gap-1 bg-indigo-900/60 p-1 rounded-lg">
            {(
              [
                ['all', 'Semua Jadwal'],
                ['active', 'Berjalan'],
                ['upcoming', 'Akan Datang'],
                ['done', 'Selesai'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === key
                    ? 'bg-white text-indigo-950'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline text-xs text-indigo-200 whitespace-nowrap">
              {user.Nama}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-indigo-800 hover:bg-red-600 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel Pengawas Ujian</h1>
            <p className="mt-1 text-sm text-slate-600">
              Pantau jadwal aktif, kelola token masuk, dan verifikasi penugasan ruang Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={reloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${reloading ? 'animate-spin' : ''}`} />
            Segarkan Data
          </button>
        </div>

        {/* Mobile filter */}
        <div className="flex md:hidden items-center gap-1 bg-slate-200/70 p-1 rounded-lg overflow-x-auto">
          {(
            [
              ['all', 'Semua'],
              ['active', 'Berjalan'],
              ['upcoming', 'Akan Datang'],
              ['done', 'Selesai'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Assigned rooms for this proctor */}
        {myAssignments.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Jadwal Tugas Ruang Anda
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="py-2 pr-4 font-semibold">Tanggal</th>
                    <th className="py-2 pr-4 font-semibold">Ruang Penugasan</th>
                    <th className="py-2 font-semibold">Sesi & Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {myAssignments.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="py-2.5 pr-4 text-slate-700">{a.tanggal}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-900">{a.ruang}</td>
                      <td className="py-2.5 text-slate-600 tabular-nums">{a.sesi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Exam Token Cards */}
        <section>
          {examCards.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm text-slate-500">
                Tidak ada jadwal ujian yang sesuai dengan filter ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {examCards.map(({ ujian, sesi, status }) => {
                const statusLabel =
                  status === 'active'
                    ? 'Sedang Berjalan'
                    : status === 'upcoming'
                      ? 'Belum Mulai'
                      : 'Selesai';
                const statusTextClass =
                  status === 'active'
                    ? 'text-emerald-700'
                    : status === 'upcoming'
                      ? 'text-amber-700'
                      : 'text-red-700';

                return (
                  <div
                    key={ujian.ID}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <span className="font-semibold text-indigo-700">
                          Kelas {ujian.Kelas}
                        </span>
                        <span className={`font-semibold ${statusTextClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {ujian.Mapel}
                      </h3>
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        <p className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatSheetDate(ujian.Tanggal)}</span>
                        </p>
                        <p className="flex items-center gap-2 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {sesi['Nama Sesi']} ({formatSheetTime(sesi['Jam Mulai'])} -{' '}
                            {formatSheetTime(sesi['Jam Berakhir'])})
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100">
                      {status === 'active' ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Token Aktif · {ujian.Kelas}
                          </p>
                          <p className="mt-1 text-3xl font-mono font-bold tracking-[0.22em] text-indigo-700 tabular-nums">
                            {ujian.Token}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleManualUpdateToken(ujian.ID)}
                            disabled={refreshingId === ujian.ID}
                            className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                refreshingId === ujian.ID ? 'animate-spin' : ''
                              }`}
                            />
                            Perbarui Token
                          </button>
                        </div>
                      ) : status === 'upcoming' ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-center">
                          <p className="text-xs text-slate-500">
                            Token siap digunakan saat sesi ujian dimulai ({ujian.Token}).
                          </p>
                          <button
                            type="button"
                            onClick={() => handleManualUpdateToken(ujian.ID)}
                            disabled={refreshingId === ujian.ID}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Acak Token Baru
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-2">
                          Sesi ujian telah berakhir.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
