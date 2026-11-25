import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ChevronDown,
  FileCode2,
  FolderArchive,
  Lock,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import type { AppSettings } from '../shared/types';
import {
  downloadGithubProjectZip,
  downloadSingleFileHtml,
} from '../utils/exportProjectZip';
import { resolveSchoolLogo } from '../utils/logoResolver';
import type { ToastVariant } from './Toast';

interface LoginViewProps {
  settings: AppSettings;
  loading: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
  onNotify?: (text: string, variant?: ToastVariant) => void;
}

export function LoginView({ settings, loading, onLogin, onNotify }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [imgFailed, setImgFailed] = useState(false);
  const [showDemoInfo, setShowDemoInfo] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [htmlLoading, setHtmlLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onLogin(username, password);
  };

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const handleDownloadZip = async () => {
    setZipLoading(true);
    try {
      const count = await downloadGithubProjectZip(settings.logo);
      onNotify?.(`Paket GitHub (.zip) berisi ${count} file berhasil diunduh.`, 'success');
    } catch {
      onNotify?.('Gagal membuat arsip ZIP proyek.', 'error');
    } finally {
      setZipLoading(false);
    }
  };

  const handleDownloadHtml = async () => {
    setHtmlLoading(true);
    try {
      const bytes = await downloadSingleFileHtml();
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      onNotify?.(`File tunggal index.html (${mb} MB) berhasil diunduh.`, 'success');
    } catch (err) {
      onNotify?.(
        err instanceof Error ? err.message : 'Gagal mengunduh file index.html.',
        'error'
      );
    } finally {
      setHtmlLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-[24px] shadow-xl shadow-slate-200/80 border border-slate-100 w-full max-w-[440px] overflow-hidden">
        {/* Top Gradient Header matching screenshot */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 px-8 py-9 text-center text-white">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center overflow-hidden p-1 shadow-sm">
            {settings.logo && !imgFailed ? (
              <img
                src={resolveSchoolLogo(settings.logo)}
                alt={settings.namaSekolah}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-contain rounded-xl bg-white"
              />
            ) : (
              <ShieldCheck className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight uppercase text-white">
            {settings.namaApp}
          </h1>
          <p className="mt-1 text-xs font-medium tracking-wide uppercase text-indigo-100">
            {settings.namaSekolah}
          </p>
        </div>

        {/* Unified 3-Role Login Form */}
        <div className="p-8 bg-white">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Selamat Datang 👋</h2>
            <p className="mt-1 text-xs text-slate-500">
              Silakan masuk menggunakan akun Anda.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/15 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
            >
              <span>{loading ? 'Memeriksa...' : 'Masuk'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Subtle collapsible credential helper and GitHub ZIP export below card */}
      <div className="mt-5 w-full max-w-[440px] text-center space-y-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => setShowDemoInfo((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            <span>Akun bawaan Admin, Pengawas &amp; Siswa</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showDemoInfo ? 'rotate-180' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={zipLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-800 disabled:opacity-60 cursor-pointer"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>{zipLoading ? 'Menyiapkan ZIP...' : 'Unduh Source Code (.zip)'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHtml}
            disabled={htmlLoading}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-60 cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{htmlLoading ? 'Menyiapkan HTML...' : 'Unduh 1 File (index.html)'}</span>
          </button>
        </div>

        {showDemoInfo && (
          <div className="mt-3 bg-white border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-left shadow-sm">
            <button
              type="button"
              onClick={() => quickFill('admin', 'admin123')}
              className="p-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <span className="block text-[11px] font-semibold text-indigo-700">Admin</span>
              <span className="block text-[11px] font-mono text-slate-600">admin / admin123</span>
            </button>
            <button
              type="button"
              onClick={() => quickFill('budi', 'pengawas123')}
              className="p-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <span className="block text-[11px] font-semibold text-indigo-700">Pengawas</span>
              <span className="block text-[11px] font-mono text-slate-600">budi / pengawas123</span>
            </button>
            <button
              type="button"
              onClick={() => quickFill('andi123', 'siswa123')}
              className="p-2 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <span className="block text-[11px] font-semibold text-indigo-700">Siswa</span>
              <span className="block text-[11px] font-mono text-slate-600">andi123 / siswa123</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
