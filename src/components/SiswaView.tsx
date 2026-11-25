import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import type { AppSettings, SiswaExamView, User } from '../shared/types';
import { apiCall } from '../utils/api';
import { formatSheetDate, formatSheetTime, getNow, parseExamDate } from '../utils/date';
import { ConfirmDialog } from './ConfirmDialog';
import type { ToastVariant } from './Toast';

interface SiswaViewProps {
  user: User;
  settings: AppSettings;
  onLogout: () => void;
  onNotify: (text: string, variant?: ToastVariant) => void;
}

interface ActiveSession {
  exam: SiswaExamView;
  mode: 'url' | 'cbt';
  link: string;
  questions: Array<{ id: string; pertanyaan: string; opsi: string[] }>;
  endTimeMs: number;
}

const ACTIVE_EXAM_STORAGE_KEY = 'examAppActiveSession';

export function SiswaView({ user, settings, onLogout, onNotify }: SiswaViewProps) {
  const [exams, setExams] = useState<SiswaExamView[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<SiswaExamView | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [checkingToken, setCheckingToken] = useState(false);

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const [extendTokenInput, setExtendTokenInput] = useState('');
  const [extending, setExtending] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  // Built-in CBT state
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [submittingCbt, setSubmittingCbt] = useState(false);

  const loadExams = async () => {
    setLoading(true);
    const res = await apiCall('getSiswaExams', {
      kelas: user.Kelas ?? '',
      siswaId: user.ID,
    });
    setLoading(false);
    if (res.success && res.exams) {
      setExams(res.exams);
    } else {
      onNotify(res.message || 'Gagal memuat jadwal ujian.', 'error');
    }
  };

  useEffect(() => {
    void loadExams();
    // Restore active exam session if page refreshed during exam
    try {
      const saved = localStorage.getItem(ACTIVE_EXAM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ActiveSession & { userId?: string };
        if (parsed.userId === user.ID && parsed.exam) {
          setActiveSession(parsed);
        }
      }
    } catch {
      // Ignore invalid localStorage payload
    }
  }, [user.ID]);

  // Live countdown timer
  useEffect(() => {
    if (!activeSession) return;
    const tick = () => {
      const diff = Math.floor((activeSession.endTimeMs - getNow().getTime()) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        setTimeExpired(true);
      } else {
        setRemainingSeconds(diff);
        setTimeExpired(false);
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const handleOpenTokenModal = (exam: SiswaExamView) => {
    setSelectedExam(exam);
    setTokenInput('');
  };

  const handleStartExam = async () => {
    if (!selectedExam) return;
    const cleaned = tokenInput.trim().toUpperCase();
    if (cleaned.length < 5) {
      onNotify('Masukkan 5 digit token ujian dari pengawas.', 'error');
      return;
    }
    setCheckingToken(true);
    const res = await apiCall('checkToken', {
      ujianId: selectedExam.ID,
      token: cleaned,
    });
    setCheckingToken(false);
    if (!res.success) {
      onNotify(res.message || 'Token tidak valid.', 'error');
      setTokenInput('');
      return;
    }

    const endDateTime = selectedExam.aksesBebas
      ? new Date(getNow().getTime() + 90 * 60000)
      : parseExamDate(selectedExam.Tanggal, selectedExam['Jam Berakhir']);

    const session: ActiveSession = {
      exam: selectedExam,
      mode: res.mode ?? 'url',
      link: res.link ?? '',
      questions: res.questions ?? [],
      endTimeMs: endDateTime.getTime(),
    };

    localStorage.setItem(
      ACTIVE_EXAM_STORAGE_KEY,
      JSON.stringify({ ...session, userId: user.ID })
    );
    setAnswers({});
    setCurrentQuestionIdx(0);
    setTimeExpired(false);
    setSelectedExam(null);
    setActiveSession(session);
  };

  const handleExtendExam = async () => {
    if (!activeSession) return;
    const cleaned = extendTokenInput.trim().toUpperCase();
    if (!cleaned) {
      onNotify('Masukkan token perpanjangan dari pengawas.', 'error');
      return;
    }
    setExtending(true);
    const res = await apiCall('checkToken', {
      ujianId: activeSession.exam.ID,
      token: cleaned,
    });
    setExtending(false);
    if (!res.success) {
      onNotify('Token perpanjangan salah atau tidak aktif.', 'error');
      return;
    }
    const updated: ActiveSession = {
      ...activeSession,
      endTimeMs: getNow().getTime() + 5 * 60000,
    };
    localStorage.setItem(
      ACTIVE_EXAM_STORAGE_KEY,
      JSON.stringify({ ...updated, userId: user.ID })
    );
    setActiveSession(updated);
    setTimeExpired(false);
    setExtendTokenInput('');
    onNotify('Waktu ujian diperpanjang 5 menit.', 'success');
  };

  const exitExamRoom = async () => {
    localStorage.removeItem(ACTIVE_EXAM_STORAGE_KEY);
    setActiveSession(null);
    setTimeExpired(false);
    setConfirmExitOpen(false);
    await loadExams();
  };

  const handleSubmitCbt = async () => {
    if (!activeSession) return;
    setSubmittingCbt(true);
    const res = await apiCall('submitExam', {
      ujianId: activeSession.exam.ID,
      siswaId: user.ID,
      answers,
    });
    setSubmittingCbt(false);
    if (res.success) {
      onNotify(
        `Jawaban terkirim! Nilai Anda: ${res.submission?.Nilai ?? '-'}`,
        'success'
      );
      await exitExamRoom();
    } else {
      onNotify(res.message || 'Gagal mengirim jawaban.', 'error');
    }
  };

  const formatCountdown = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Focus Exam Room View
  if (activeSession) {
    const isUrgent = remainingSeconds > 0 && remainingSeconds <= 300;
    const currentQ = activeSession.questions[currentQuestionIdx];

    return (
      <div className="fixed inset-0 z-40 bg-white flex flex-col">
        <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate">{activeSession.exam.Mapel}</h1>
            <p className="text-xs text-slate-300 truncate">
              {user.Nama} · Kelas {user.Kelas}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`} />
              <span
                className={`font-mono text-lg font-bold tabular-nums tracking-wider ${
                  isUrgent ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {formatCountdown(remainingSeconds)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmExitOpen(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Akhiri Ujian
            </button>
          </div>
        </header>

        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900">
          Progres sesi ujian Anda tersimpan otomatis. Pastikan menekan tombol kirim/submit sebelum mengakhiri ujian.
        </div>

        {/* Main exam body */}
        {!timeExpired && activeSession.mode === 'cbt' && activeSession.questions.length > 0 ? (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
                  <span className="font-semibold text-slate-800">
                    Soal Nomor {currentQuestionIdx + 1} dari {activeSession.questions.length}
                  </span>
                  <span className="tabular-nums">
                    Terjawab: {Object.keys(answers).length}/{activeSession.questions.length}
                  </span>
                </div>

                {currentQ && (
                  <div>
                    <p className="text-base font-medium text-slate-900 leading-relaxed mb-6">
                      {currentQ.pertanyaan}
                    </p>
                    <div className="space-y-2.5">
                      {currentQ.opsi.map((opt, idx) => {
                        const selected = answers[currentQ.id] === idx;
                        const letter = String.fromCharCode(65 + idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({ ...prev, [currentQ.id]: idx }))
                            }
                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm flex items-start gap-3 transition-colors cursor-pointer ${
                              selected
                                ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-medium'
                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                                selected
                                  ? 'bg-indigo-700 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="pt-0.5">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
                    className="px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-lg cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  {currentQuestionIdx < activeSession.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentQuestionIdx((i) =>
                          Math.min(activeSession.questions.length - 1, i + 1)
                        )
                      }
                      className="px-4 py-2 text-xs font-medium bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg cursor-pointer"
                    >
                      Soal Berikutnya
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={submittingCbt}
                      onClick={handleSubmitCbt}
                      className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg cursor-pointer"
                    >
                      {submittingCbt ? 'Mengirim...' : 'Kirim Jawaban Ujian'}
                    </button>
                  )}
                </div>
              </div>

              <aside className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
                <h3 className="text-xs font-semibold text-slate-700 mb-3">
                  Navigasi Soal
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {activeSession.questions.map((q, idx) => {
                    const answered = answers[q.id] !== undefined;
                    const active = idx === currentQuestionIdx;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`h-9 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-indigo-700 text-white'
                            : answered
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={submittingCbt}
                  onClick={handleSubmitCbt}
                  className="w-full mt-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {submittingCbt ? 'Mengirim...' : 'Selesai & Kirim'}
                </button>
              </aside>
            </div>
          </div>
        ) : !timeExpired ? (
          <div className="flex-1 flex flex-col bg-slate-50">
            <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Tautan Lembar Ujian: {activeSession.link}</span>
              <a
                href={activeSession.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-700 font-medium hover:underline"
              >
                Buka di Tab Baru <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <iframe
              title={activeSession.exam.Mapel}
              src={activeSession.link}
              className="flex-1 w-full border-none bg-white"
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-950/90 p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
              <h2 className="text-2xl font-bold text-slate-900">Waktu Ujian Habis</h2>
              <p className="mt-2 text-sm text-slate-600">
                Masukkan token perpanjangan (5 menit) dari pengawas untuk melanjutkan atau mengirim jawaban Anda.
              </p>
              <input
                type="text"
                maxLength={5}
                value={extendTokenInput}
                onChange={(e) => setExtendTokenInput(e.target.value.toUpperCase())}
                placeholder="TOKEN"
                className="mt-6 w-full border-2 border-slate-200 bg-slate-50 p-3 rounded-xl text-center text-2xl font-mono tracking-[0.4em] uppercase focus:border-indigo-600 outline-none"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmExitOpen(true)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg cursor-pointer"
                >
                  Keluar
                </button>
                <button
                  type="button"
                  disabled={extending}
                  onClick={handleExtendExam}
                  className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold rounded-lg cursor-pointer"
                >
                  {extending ? 'Memeriksa...' : 'Buka Kunci (+5m)'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmExitOpen}
          title="Akhiri Sesi Ujian?"
          description="Pastikan Anda sudah menekan tombol kirim/submit jawaban sebelum keluar dari ruang ujian."
          confirmLabel="Ya, Akhiri Ujian"
          destructive
          onConfirm={exitExamRoom}
          onCancel={() => setConfirmExitOpen(false)}
        />
      </div>
    );
  }

  const now = getNow();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-950 text-white border-b border-indigo-900 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <span className="text-base font-bold tracking-tight whitespace-nowrap shrink-0">
            {settings.namaApp}
          </span>
          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline text-xs text-indigo-200 whitespace-nowrap">
              {user.Nama} · Kelas {user.Kelas || '-'}
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

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Jadwal Ujian Kelas {user.Kelas || '-'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Pilih mata pelajaran yang tersedia dan masukkan 5 digit token dari pengawas.
            </p>
          </div>
          <button
            type="button"
            onClick={loadExams}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-slate-200 rounded-xl p-5 h-44 animate-pulse"
              />
            ))}
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm text-slate-500">
              Belum ada jadwal ujian untuk kelas {user.Kelas || '-'} saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((u) => {
              const examStart = parseExamDate(u.Tanggal, u['Jam Mulai']);
              const examEnd = parseExamDate(u.Tanggal, u['Jam Berakhir']);
              const isActive = Boolean(u.aksesBebas) || (now >= examStart && now <= examEnd);
              const isUpcoming = !u.aksesBebas && now < examStart;

              return (
                <div
                  key={u.ID}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium text-slate-500">
                        {u.mode === 'cbt' ? 'CBT Terpadu' : 'Tautan Ujian'}
                      </span>
                      <span
                        className={`font-semibold ${
                          isActive
                            ? 'text-emerald-700'
                            : isUpcoming
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {isActive ? 'Tersedia' : isUpcoming ? 'Belum Waktunya' : 'Ditutup'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug">{u.Mapel}</h3>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatSheetDate(u.Tanggal)}</span>
                      </p>
                      <p className="flex items-center gap-2 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {u['Nama Sesi']} ({formatSheetTime(u['Jam Mulai'])} -{' '}
                          {formatSheetTime(u['Jam Berakhir'])})
                        </span>
                      </p>
                    </div>
                    {u.alreadySubmitted && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sudah dikerjakan · Nilai: {u.lastScore ?? '-'}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!isActive}
                    onClick={() => handleOpenTokenModal(u)}
                    className={`mt-5 w-full py-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-indigo-700 hover:bg-indigo-800 text-white cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <span>Mulai Ujian</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <span>Tidak Tersedia</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Token Input Modal */}
      {selectedExam && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 max-w-sm w-full text-center shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Verifikasi Token Ujian</h3>
            <p className="mt-1 text-xs text-slate-500">
              {selectedExam.Mapel} · Masukkan 5 digit token dari pengawas.
            </p>
            <input
              type="text"
              maxLength={5}
              autoFocus
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleStartExam();
              }}
              placeholder="XXXXX"
              className="mt-5 w-full border-2 border-slate-200 rounded-xl p-3 text-center text-2xl font-mono tracking-[0.45em] uppercase focus:border-indigo-600 outline-none"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedExam(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={checkingToken}
                onClick={handleStartExam}
                className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                {checkingToken ? 'Memeriksa...' : 'Mulai'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
