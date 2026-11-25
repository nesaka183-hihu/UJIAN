import { useCallback, useEffect, useState } from 'react';
import type { AppSettings, DashboardData, User } from './shared/types';
import { apiCall } from './utils/api';
import { DEFAULT_SETTINGS, subscribeDashboardData } from './services/firestoreService';
import { AdminView } from './components/AdminView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginView } from './components/LoginView';
import { PengawasView } from './components/PengawasView';
import { SiswaView } from './components/SiswaView';
import { ToastContainer, type ToastMessage, type ToastVariant } from './components/Toast';

const USER_STORAGE_KEY = 'examAppUser';

const EMPTY_DASHBOARD: DashboardData = {
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

function MainApp() {
  const [initializing, setInitializing] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, text, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshDashboard = useCallback(async () => {
    const res = await apiCall<DashboardData>('getDashboard', {});
    if (res.success && res.data) {
      setDashboardData(res.data);
      if (res.data.settings) {
        setSettings(res.data.settings);
        document.title = res.data.settings.namaApp;
      }
    }
  }, []);

  useEffect(() => {
    const boot = async () => {
      const settingsRes = await apiCall<AppSettings>('getSettings', {});
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
        document.title = settingsRes.data.namaApp;
      }
      try {
        const saved = localStorage.getItem(USER_STORAGE_KEY);
        if (saved) {
          const parsedUser = JSON.parse(saved) as User;
          setCurrentUser(parsedUser);
          if (parsedUser.Role === 'admin' || parsedUser.Role === 'pengawas') {
            await refreshDashboard();
          }
        }
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      setInitializing(false);
    };
    void boot();
  }, [refreshDashboard]);

  // Real-time Firestore listener for admin & pengawas dashboards
  useEffect(() => {
    if (!currentUser || (currentUser.Role !== 'admin' && currentUser.Role !== 'pengawas')) {
      return;
    }
    const unsubscribe = subscribeDashboardData(
      (nextData) => {
        setDashboardData(nextData);
        if (nextData.settings) {
          setSettings(nextData.settings);
          document.title = nextData.settings.namaApp;
        }
      },
      (err) => {
        notify(err.message || 'Gagal sinkronisasi real-time Firestore.', 'error');
      }
    );
    return () => unsubscribe();
  }, [currentUser, notify]);

  const handleLogin = async (username: string, password: string) => {
    setLoginLoading(true);
    try {
      const res = await apiCall('login', { username, password });
      if (res.success && res.user) {
        setCurrentUser(res.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
        if (res.user.Role === 'admin' || res.user.Role === 'pengawas') {
          await refreshDashboard();
        }
        notify(`Selamat datang, ${res.user.Nama}.`, 'success');
      } else {
        notify(res.message || 'Username atau password tidak sesuai.', 'error');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal masuk ke sistem.', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('examAppActiveSession');
    setCurrentUser(null);
    notify('Anda telah keluar dari portal.', 'info');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-indigo-600 animate-spin" />
          <p className="text-xs font-medium text-slate-600">Menghubungkan ke Firestore...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!currentUser && (
        <LoginView
          settings={settings}
          loading={loginLoading}
          onLogin={handleLogin}
          onNotify={notify}
        />
      )}

      {currentUser?.Role === 'admin' && (
        <AdminView
          user={currentUser}
          settings={settings}
          data={dashboardData}
          onRefresh={refreshDashboard}
          onSettingsUpdated={(next) => {
            setSettings(next);
            document.title = next.namaApp;
          }}
          onLogout={handleLogout}
          onNotify={notify}
        />
      )}

      {currentUser?.Role === 'pengawas' && (
        <PengawasView
          user={currentUser}
          settings={settings}
          data={dashboardData}
          onRefresh={refreshDashboard}
          onLogout={handleLogout}
          onNotify={notify}
        />
      )}

      {currentUser?.Role === 'siswa' && (
        <SiswaView
          user={currentUser}
          settings={settings}
          onLogout={handleLogout}
          onNotify={notify}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
