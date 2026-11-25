import { useState, type FormEvent } from 'react';
import { CalendarPlus, Edit2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { DashboardData, ExamQuestion, Ujian } from '../../shared/types';
import { apiCall } from '../../utils/api';
import { formatSheetDate, formatSheetTime, getInputDate, getTodayJakarta } from '../../utils/date';
import type { ToastVariant } from '../Toast';

interface AdminUjianTabProps {
  data: DashboardData;
  onRefresh: () => Promise<void>;
  onNotify: (text: string, variant?: ToastVariant) => void;
  onRequestDelete: (sheet: string, id: string, label: string) => void;
}

export function AdminUjianTab({
  data,
  onRefresh,
  onNotify,
  onRequestDelete,
}: AdminUjianTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  const [tanggal, setTanggal] = useState(getTodayJakarta());
  const [sesiId, setSesiId] = useState('');
  const [mode, setMode] = useState<'url' | 'cbt'>('url');
  const [link, setLink] = useState('');
  const [aksesBebas, setAksesBebas] = useState(false);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setKelas('');
    setMapel('');
    setTanggal(getTodayJakarta());
    setSesiId('');
    setMode('url');
    setLink('');
    setAksesBebas(false);
    setQuestions([]);
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}_${prev.length + 1}`,
        pertanyaan: '',
        opsi: ['', '', '', ''],
        jawabanBenar: 0,
      },
    ]);
  };

  const handleUpdateQuestion = (idx: number, patch: Partial<ExamQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const nextOpsi = [...q.opsi];
        nextOpsi[optIdx] = val;
        return { ...q, opsi: nextOpsi };
      })
    );
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'cbt' && questions.length === 0) {
      onNotify('Tambahkan minimal 1 soal CBT atau pilih mode Tautan Eksternal.', 'error');
      return;
    }
    setSaving(true);
    const action = editingId ? 'editUjian' : 'addUjian';
    const res = await apiCall(action, {
      id: editingId,
      kelas,
      mapel,
      tanggal,
      sesiId,
      mode,
      link,
      aksesBebas,
      questions,
    });
    setSaving(false);
    if (res.success) {
      onNotify(res.message || 'Jadwal ujian berhasil disimpan.', 'success');
      resetForm();
      await onRefresh();
    } else {
      onNotify(res.message || 'Gagal menyimpan jadwal ujian.', 'error');
    }
  };

  const handlePrepareEdit = (u: Ujian) => {
    setEditingId(u.ID);
    setKelas(u.Kelas);
    setMapel(u.Mapel);
    setTanggal(getInputDate(u.Tanggal));
    setSesiId(u.SesiID);
    setMode(u.mode ?? 'url');
    setLink(u.Link);
    setAksesBebas(Boolean(u.aksesBebas));
    setQuestions(u.questions ?? []);
  };

  const handleRefreshToken = async (ujianId: string) => {
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

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <CalendarPlus className="w-4 h-4 text-indigo-700" />
          {editingId ? 'Edit Jadwal Ujian' : 'Buat Jadwal Ujian Baru'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Mata Pelajaran
              </label>
              <input
                type="text"
                required
                value={mapel}
                onChange={(e) => setMapel(e.target.value)}
                placeholder="Contoh: Matematika Wajib"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
              <input
                type="date"
                required
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sesi Ujian</label>
              <select
                required
                value={sesiId}
                onChange={(e) => setSesiId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
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
          </div>

          {/* Mode & Flexibility */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Link Eksternal (GForm / CBT)
              </button>
              <button
                type="button"
                onClick={() => setMode('cbt')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  mode === 'cbt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                CBT Terpadu (Soal Internal)
              </button>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={aksesBebas}
                onChange={(e) => setAksesBebas(e.target.checked)}
                className="rounded border-slate-300 text-indigo-700 focus:ring-indigo-600"
              />
              <span>Akses Penuh Fleksibel (Dapat dikerjakan kapan saja tanpa kunci jam sesi)</span>
            </label>
          </div>

          {mode === 'url' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Link Ujian (Google Form / Tautan CBT)
              </label>
              <input
                type="url"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://docs.google.com/forms/..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>
          ) : (
            <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Daftar Soal CBT ({questions.length} Soal)
                </span>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Soal
                </button>
              </div>
              {questions.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Belum ada soal. Klik "Tambah Soal" untuk membuat butir pertanyaan pilihan ganda.
                </p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-700">
                          Soal #{qIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-xs text-red-600 hover:underline cursor-pointer"
                        >
                          Hapus Soal
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={q.pertanyaan}
                        onChange={(e) =>
                          handleUpdateQuestion(qIdx, { pertanyaan: e.target.value })
                        }
                        placeholder="Tulis pertanyaan di sini..."
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-600"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.opsi.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.jawabanBenar === optIdx}
                              onChange={() =>
                                handleUpdateQuestion(qIdx, { jawabanBenar: optIdx })
                              }
                              title="Tandai sebagai kunci jawaban benar"
                            />
                            <input
                              type="text"
                              required
                              value={opt}
                              onChange={(e) =>
                                handleUpdateOption(qIdx, optIdx, e.target.value)
                              }
                              placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:border-indigo-600"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                Batal Edit
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Jadwal Ujian'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Daftar Jadwal Ujian</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2.5 px-3 font-semibold w-12">No</th>
                <th className="py-2.5 px-3 font-semibold">Mata Pelajaran</th>
                <th className="py-2.5 px-3 font-semibold">Kelas</th>
                <th className="py-2.5 px-3 font-semibold">Tanggal & Sesi</th>
                <th className="py-2.5 px-3 font-semibold">Token</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {data.ujian.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    Belum ada jadwal ujian yang dibuat.
                  </td>
                </tr>
              ) : (
                data.ujian.map((u, idx) => {
                  const sesi = data.sesi.find((s) => s.ID === u.SesiID);
                  return (
                    <tr key={u.ID} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3 text-xs text-slate-500 tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900">{u.Mapel}</p>
                        <p className="text-xs text-slate-500">
                          {u.mode === 'cbt' ? `CBT (${u.questions?.length || 0} Soal)` : 'Link Eksternal'}
                          {u.aksesBebas ? ' · Akses Fleksibel' : ''}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-slate-800">{u.Kelas}</td>
                      <td className="py-3 px-3 text-xs text-slate-600 tabular-nums">
                        <p>{formatSheetDate(u.Tanggal)}</p>
                        <p className="text-slate-500">
                          {sesi
                            ? `${sesi['Nama Sesi']} (${formatSheetTime(sesi['Jam Mulai'])}-${formatSheetTime(sesi['Jam Berakhir'])})`
                            : '-'}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-widest bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded">
                            {u.Token}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRefreshToken(u.ID)}
                            disabled={refreshingId === u.ID}
                            className="p-1 text-slate-400 hover:text-indigo-700 rounded cursor-pointer"
                            title="Acak ulang token"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                refreshingId === u.ID ? 'animate-spin' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handlePrepareEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 rounded cursor-pointer"
                          title="Edit jadwal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete('ujian', u.ID, u.Mapel)}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded cursor-pointer"
                          title="Hapus jadwal"
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
  );
}
