import { Printer, X } from 'lucide-react';
import type { AppSettings, DashboardData } from '../shared/types';
import { formatSheetDate, formatSheetTime } from '../utils/date';
import { resolveSchoolLogo } from '../utils/logoResolver';

export type PrintDocumentType = 'kartu' | 'denah_siswa' | 'jadwal_pengawas';

interface PrintPreviewModalProps {
  open: boolean;
  docType: PrintDocumentType;
  data: DashboardData;
  settings: AppSettings;
  filterRuangId?: string;
  filterKelas?: string;
  onClose: () => void;
}

export function PrintPreviewModal({
  open,
  docType,
  data,
  settings,
  filterRuangId = 'all',
  filterKelas = 'all',
  onClose,
}: PrintPreviewModalProps) {
  if (!open) return null;

  const siswaList = data.users.filter((u) => {
    if (u.Role !== 'siswa') return false;
    if (filterKelas !== 'all' && u.Kelas !== filterKelas) return false;
    return true;
  });

  const getSiswaRuangName = (siswaId: string) => {
    const rs = data.ruang_siswa.find((item) => item.SiswaID === siswaId);
    if (!rs) return '-';
    const ruang = data.ruang.find((r) => r.ID === rs.RuangID);
    return ruang ? ruang['Nama Ruang'] : '-';
  };

  // Group students by room for denah_siswa
  const groupedSiswaByRoom: Record<string, typeof data.users> = {};
  const filteredRuangSiswa =
    filterRuangId && filterRuangId !== 'all'
      ? data.ruang_siswa.filter((rs) => rs.RuangID === filterRuangId)
      : data.ruang_siswa;

  for (const rs of filteredRuangSiswa) {
    const r = data.ruang.find((item) => item.ID === rs.RuangID);
    const s = data.users.find((item) => item.ID === rs.SiswaID);
    if (r && s) {
      if (!groupedSiswaByRoom[r['Nama Ruang']]) groupedSiswaByRoom[r['Nama Ruang']] = [];
      groupedSiswaByRoom[r['Nama Ruang']].push(s);
    }
  }

  // Group pengawas schedule
  const groupedPengawas: Record<
    string,
    Array<{ tanggal: string; ruang: string; sesi: string; waktu: string }>
  > = {};

  for (const rp of data.ruang_pengawas) {
    const r = data.ruang.find((item) => item.ID === rp.RuangID);
    const s = data.sesi.find((item) => item.ID === rp.SesiID);
    const p = data.users.find((item) => item.ID === rp.PengawasID);
    if (r && s && p) {
      if (!groupedPengawas[p.Nama]) groupedPengawas[p.Nama] = [];
      groupedPengawas[p.Nama].push({
        tanggal: formatSheetDate(rp.Tanggal),
        ruang: r['Nama Ruang'],
        sesi: s['Nama Sesi'],
        waktu: `${formatSheetTime(s['Jam Mulai'])} - ${formatSheetTime(s['Jam Berakhir'])}`,
      });
    }
  }

  const subtitle =
    docType === 'kartu'
      ? 'KARTU LOGIN PESERTA UJIAN DIGITAL'
      : docType === 'denah_siswa'
        ? 'DAFTAR HADIR & DENAH PESERTA UJIAN'
        : 'DAFTAR PENUGASAN PENGAWAS RUANG UJIAN';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex flex-col overflow-hidden print-only-container">
      {/* Toolbar (hidden on print) */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between gap-4 shrink-0 no-print">
        <div>
          <h3 className="text-sm font-semibold">{subtitle}</h3>
          <p className="text-xs text-slate-300">
            Pratinjau siap cetak · {settings.namaSekolah}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            Cetak Dokumen
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <X className="w-4 h-4" />
            Tutup
          </button>
        </div>
      </div>

      {/* Printable sheet */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-200 print-only-container">
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-10 shadow-sm border border-slate-300 print-only-container">
          {/* Kop Surat */}
          <div className="flex items-center justify-center gap-5 border-b-2 border-slate-900 pb-4 mb-6">
            {settings.logo ? (
              <img
                src={resolveSchoolLogo(settings.logo)}
                alt={settings.namaSekolah}
                referrerPolicy="no-referrer"
                className="h-16 w-16 object-contain rounded"
              />
            ) : null}
            <div className="text-center">
              <h2 className="text-xl font-bold uppercase tracking-wide text-slate-900">
                {settings.namaSekolah}
              </h2>
              {settings.alamat ? (
                <p className="text-xs text-slate-600 mt-0.5">{settings.alamat}</p>
              ) : null}
              <p className="text-xs font-semibold text-slate-800 mt-1">
                {subtitle} · TA {settings.tahunAjaran || '2026/2027'}
              </p>
            </div>
          </div>

          {docType === 'kartu' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {siswaList.length === 0 ? (
                <p className="col-span-full text-center text-sm text-slate-500 py-8">
                  Tidak ada data siswa untuk dicetak.
                </p>
              ) : (
                siswaList.map((siswa) => (
                  <div
                    key={siswa.ID}
                    className="border border-slate-800 rounded-lg p-4 bg-white print-page-break"
                  >
                    <div className="flex items-center gap-3 border-b border-slate-300 pb-2.5 mb-3">
                      {settings.logo ? (
                        <img
                          src={resolveSchoolLogo(settings.logo)}
                          alt="Logo"
                          referrerPolicy="no-referrer"
                          className="h-10 w-10 object-contain"
                        />
                      ) : null}
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-900">
                          {settings.namaSekolah}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Kartu Peserta Ujian · {settings.namaApp}
                        </p>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="py-1 text-slate-600 w-24">Nama</td>
                          <td className="py-1 font-semibold text-slate-900">: {siswa.Nama}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-600">Kelas</td>
                          <td className="py-1 font-medium text-slate-900">: {siswa.Kelas || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-600">Ruang</td>
                          <td className="py-1 font-medium text-slate-900">
                            : {getSiswaRuangName(siswa.ID)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-600">Username</td>
                          <td className="py-1 font-mono font-semibold text-slate-900">
                            : {siswa.Username}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-600">Password</td>
                          <td className="py-1 font-mono font-semibold text-slate-900">
                            : {siswa.Password}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {docType === 'denah_siswa' && (
            <div className="space-y-6">
              {Object.keys(groupedSiswaByRoom).length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  Belum ada peserta yang ditempatkan di ruang ujian ini.
                </p>
              ) : (
                Object.entries(groupedSiswaByRoom).map(([roomName, students]) => (
                  <div key={roomName} className="print-page-break">
                    <h4 className="text-sm font-bold text-slate-900 bg-slate-100 border border-slate-300 px-3 py-2 mb-2">
                      {roomName} ({students.length} Peserta)
                    </h4>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-300 px-2.5 py-2 text-left w-10">No</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left">Nama Peserta</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left w-28">Kelas</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left w-32">Username</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left w-36">Tanda Tangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, idx) => (
                          <tr key={s.ID}>
                            <td className="border border-slate-300 px-2.5 py-2 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 px-2.5 py-2 font-medium">
                              {s.Nama}
                            </td>
                            <td className="border border-slate-300 px-2.5 py-2">{s.Kelas || '-'}</td>
                            <td className="border border-slate-300 px-2.5 py-2 font-mono">
                              {s.Username}
                            </td>
                            <td className="border border-slate-300 px-2.5 py-2 h-8" />
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}

          {docType === 'jadwal_pengawas' && (
            <div className="space-y-6">
              {Object.keys(groupedPengawas).length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  Belum ada penugasan pengawas yang tersimpan.
                </p>
              ) : (
                Object.entries(groupedPengawas).map(([pengawasName, schedules]) => (
                  <div key={pengawasName} className="print-page-break">
                    <h4 className="text-sm font-bold text-slate-900 bg-slate-100 border border-slate-300 px-3 py-2 mb-2">
                      Pengawas: {pengawasName}
                    </h4>
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-300 px-2.5 py-2 text-left w-10">No</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left">Tanggal</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left">Sesi Ujian</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left">Waktu</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left">Ruang Penugasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.map((item, idx) => (
                          <tr key={`${pengawasName}-${idx}`}>
                            <td className="border border-slate-300 px-2.5 py-2 tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 px-2.5 py-2">{item.tanggal}</td>
                            <td className="border border-slate-300 px-2.5 py-2">{item.sesi}</td>
                            <td className="border border-slate-300 px-2.5 py-2 font-mono tabular-nums">
                              {item.waktu}
                            </td>
                            <td className="border border-slate-300 px-2.5 py-2 font-semibold">
                              {item.ruang}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
