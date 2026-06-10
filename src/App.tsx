import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Layout } from '@/components/Layout';
import { ChatPanel } from '@/components/ChatPanel';
import { Dashboard } from '@/pages/Dashboard';
import { Transactions } from '@/pages/Transactions';
import { Accounts } from '@/pages/Accounts';
import { Budgets } from '@/pages/Budgets';
import { Goals } from '@/pages/Goals';
import { Debts } from '@/pages/Debts';
import { Installments } from '@/pages/Installments';
import { Analytics } from '@/pages/Analytics';
import { Settings } from '@/pages/Settings';
import { getSupabase, signInWithGoogle } from '@/lib/supabase';
import { GoogleIcon } from '@/components/Icons';
import { getTranslation } from '@/lib/i18n';

// ── Login Screen ──
const LoginScreen: React.FC = () => {
  const { language, theme } = useStore();
  const t = getTranslation(language);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex">
            <svg width={56} height={56} viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#login-grad)" />
              <path d="M8 12h6M8 16h10M8 20h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M20 8l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="login-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#10b981" />
                  <stop offset="1" stopColor="#047857" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mt-4">{t.appName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{t.appTagline}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mb-5">
            {language === 'id' ? 'Masuk untuk mulai mengelola keuangan Anda' : 'Sign in to start managing your finances'}
          </p>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
            ) : (
              <GoogleIcon size={20} />
            )}
            {loading
              ? (language === 'id' ? 'Menghubungkan...' : 'Connecting...')
              : (language === 'id' ? 'Masuk dengan Google' : 'Sign in with Google')
            }
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center mt-3">{error}</p>
          )}
        </div>

        <p className="text-xs text-zinc-400 text-center mt-4">
          {language === 'id'
            ? 'Data Anda disimpan aman di cloud dengan enkripsi Supabase.'
            : 'Your data is securely stored in the cloud with Supabase encryption.'
          }
        </p>
      </div>
    </div>
  );
};

// ── Main App ──
function App() {
  const { currentPage, theme, loadData, setUser, setAuthReady, userId, authReady } = useStore();

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Check auth on mount
  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.full_name || session.user.email || '',
          session.user.user_metadata?.avatar_url || ''
        );
      }
      setAuthReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.full_name || session.user.email || '',
          session.user.user_metadata?.avatar_url || ''
        );
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setAuthReady]);

  // Load data when user is ready
  useEffect(() => {
    if (userId) loadData();
  }, [userId, loadData]);

  // Loading state
  if (!authReady) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="w-8 h-8 border-3 border-zinc-300 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → show login
  if (!userId) {
    return <LoginScreen />;
  }

  // Logged in → show app
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'transactions': return <Transactions />;
      case 'accounts': return <Accounts />;
      case 'budgets': return <Budgets />;
      case 'goals': return <Goals />;
      case 'debts': return <Debts />;
      case 'installments': return <Installments />;
      case 'analytics': return <Analytics />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in">{renderPage()}</div>
      <ChatPanel />
    </Layout>
  );
}

export default App;
