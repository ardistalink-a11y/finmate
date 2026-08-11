import React from 'react';
import { useStore } from '@/store/useStore';
import { HomeIcon, WalletIcon, ChartIcon, TargetIcon, BudgetIcon, ListIcon, SettingsIcon, ChatIcon, SunIcon, MoonIcon, MenuIcon, CloseIcon, LogOutIcon } from './Icons';
import { signOut } from '@/lib/supabase';
import { getTranslation } from '@/lib/i18n';

const FinMateLogo: React.FC<{ size?: number }> = ({ size = 28 }) => {
  const scale = size / 28;
  const [themeKey, setThemeKey] = React.useState(0);
  React.useEffect(() => {
    const unsub = useStore.subscribe((state) => setThemeKey(k => k + 1));
    return unsub;
  }, []);
  const isDark = useStore.getState().theme === 'dark';
  const textColor = isDark ? '#F5F5F7' : '#18181b';
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: `${0.35 * size}px` }}>
      {/* Dot Orbit Icon */}
      <svg width={size} height={size} viewBox="0 0 44 44" fill="none" style={{ flexShrink: 0 }}>
        <g transform={`rotate(20 22 22)`}><circle cx="22" cy="6" r="6.5" fill="#22E6A6"/></g>
        <g transform={`rotate(110 22 22)`}><circle cx="22" cy="6" r="5.5" fill="#F5B942"/></g>
        <g transform={`rotate(200 22 22)`}><circle cx="22" cy="6" r="4.5" fill="#6C8CFF"/></g>
        <g transform={`rotate(290 22 22)`}><circle cx="22" cy="6" r="3.5" fill="#F2545B"/></g>
      </svg>
      {/* Wordmark with mint dot-i */}
      <span
        style={{
          fontFamily: "'Sora', 'Space Grotesk', 'Poppins', 'Inter', sans-serif",
          fontWeight: 700,
          fontSize: `${size * 0.75}px`,
          letterSpacing: '-0.02em',
          color: textColor,
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1,
        }}
      >
        f<span style={{ position: 'relative', display: 'inline-block' }}>
          <span style={{ visibility: 'hidden' }}>i</span>
          <span style={{
            position: 'absolute',
            left: '50%',
            top: '-0.38em',
            transform: 'translateX(-50%)',
            width: '0.16em',
            height: '0.16em',
            aspectRatio: '1',
            borderRadius: '50%',
            background: '#22E6A6',
            fontSize: `${size * 0.75}px`,
          }} />
        </span>nmate
      </span>
    </span>
  );
};

// Icons for debt and installment
const DebtIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const InstallmentIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18" />
    <path d="M7 15h4" />
    <path d="M7 18h2" />
  </svg>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme, currentPage, setCurrentPage, sidebarOpen, setSidebarOpen, chatOpen, setChatOpen, userName, userAvatar, language } = useStore();
  const t = getTranslation(language);

  const NAV_ITEMS = [
    { id: 'dashboard', label: t.nav.dashboard, icon: HomeIcon },
    { id: 'transactions', label: t.nav.transactions, icon: ListIcon },
    { id: 'accounts', label: t.nav.accounts, icon: WalletIcon },
    { id: 'budgets', label: t.nav.budgets, icon: BudgetIcon },
    { id: 'goals', label: t.nav.goals, icon: TargetIcon },
    { id: 'debts', label: t.nav.debts, icon: DebtIcon },
    { id: 'installments', label: t.nav.installments, icon: InstallmentIcon },
    { id: 'analytics', label: t.nav.analytics, icon: ChartIcon },
    { id: 'settings', label: t.nav.settings, icon: SettingsIcon },
  ];

  const handleSignOut = async () => {
    await signOut();
    useStore.getState().setUser(null);
    window.location.reload();
  };

  return (
    <div className={`h-screen flex overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800
        flex flex-col
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <FinMateLogo size={28} />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }
                `}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          {userName && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              {userAvatar ? (
                <img src={userAvatar} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{userName}</p>
              </div>
              <button onClick={handleSignOut} className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors" title="Sign Out">
                <LogOutIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              <MenuIcon size={20} />
            </button>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white capitalize">
              {NAV_ITEMS.find(n => n.id === currentPage)?.label || currentPage}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              <span className="hidden sm:inline">{theme === 'dark' ? t.theme.light : t.theme.dark}</span>
            </button>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${chatOpen
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400'
                }
              `}
            >
              <ChatIcon size={16} />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
