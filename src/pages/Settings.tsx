import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { initSupabase, getSupabase, signInWithGoogle } from '@/lib/supabase';
import { GoogleIcon, CheckIcon, SparkleIcon, SettingsIcon, WalletIcon, ListIcon, BudgetIcon } from '@/components/Icons';
import { IconBubble } from '@/components/NotionIcon';
import { getTranslation, Language } from '@/lib/i18n';

type SettingsTab = 'ai' | 'database' | 'categories' | 'data' | 'rules' | 'language';

const GlobeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const Settings: React.FC = () => {
  const { userId, accounts, transactions, budgets, goals, debts, installments, language, setLanguage } = useStore();
  const t = getTranslation(language);

  const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: React.FC<{ size?: number; className?: string }> }> = [
    { id: 'ai', label: t.settings.tabs.ai, description: t.settings.tabs.aiDesc, icon: SparkleIcon },
    { id: 'database', label: t.settings.tabs.database, description: t.settings.tabs.databaseDesc, icon: SettingsIcon },
    { id: 'language', label: t.settings.tabs.language, description: t.settings.tabs.languageDesc, icon: GlobeIcon },
    { id: 'categories', label: t.settings.tabs.categories, description: t.settings.tabs.categoriesDesc, icon: ListIcon },
    { id: 'data', label: t.settings.tabs.data, description: t.settings.tabs.dataDesc, icon: WalletIcon },
    { id: 'rules', label: t.settings.tabs.rules, description: t.settings.tabs.rulesDesc, icon: BudgetIcon },
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [aiKey, setAiKey] = useState(localStorage.getItem('ai_api_key') || '');
  const [aiEndpoint, setAiEndpoint] = useState(localStorage.getItem('ai_endpoint') || '');
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('supabase_anon_key') || '');
  const [saved, setSaved] = useState(false);
  const [supabaseSaved, setSupabaseSaved] = useState(false);

  const active = tabs.find(t => t.id === activeTab) || tabs[0];
  const localFootprint = useMemo(() => ({
    [t.nav.accounts]: accounts.length,
    [t.nav.transactions]: transactions.length,
    [t.nav.budgets]: budgets.length,
    [t.nav.goals]: goals.length,
    [t.nav.debts]: debts.length,
    [t.nav.installments]: installments.length,
  }), [accounts.length, transactions.length, budgets.length, goals.length, debts.length, installments.length, t]);

  useEffect(() => {
    if (!saved && !supabaseSaved) return;
    const timer = setTimeout(() => {
      setSaved(false);
      setSupabaseSaved(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [saved, supabaseSaved]);

  const handleSaveAI = () => {
    localStorage.setItem('ai_api_key', aiKey);
    localStorage.setItem('ai_endpoint', aiEndpoint);
    localStorage.removeItem('ai_model');
    localStorage.removeItem('ai_provider');
    setSaved(true);
  };

  const handleSaveSupabase = () => {
    if (supabaseUrl && supabaseKey) {
      initSupabase(supabaseUrl, supabaseKey);
      setSupabaseSaved(true);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (!getSupabase()) {
        alert(language === 'id' ? 'Konfigurasi Supabase belum tersimpan.' : 'Supabase configuration not saved.');
        return;
      }
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      alert(language === 'id' ? 'Gagal login. Periksa konfigurasi Supabase dan Google OAuth.' : 'Login failed. Check Supabase and Google OAuth configuration.');
    }
  };

  const exportData = () => {
    const data = {
      version: 1,
      exported_at: new Date().toISOString(),
      transactions: localStorage.getItem('finmate_transactions'),
      accounts: localStorage.getItem('finmate_accounts'),
      budgets: localStorage.getItem('finmate_budgets'),
      goals: localStorage.getItem('finmate_goals'),
      debts: localStorage.getItem('finmate_debts'),
      installments: localStorage.getItem('finmate_installments'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finmate-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.transactions) localStorage.setItem('finmate_transactions', data.transactions);
          if (data.accounts) localStorage.setItem('finmate_accounts', data.accounts);
          if (data.budgets) localStorage.setItem('finmate_budgets', data.budgets);
          if (data.goals) localStorage.setItem('finmate_goals', data.goals);
          if (data.debts) localStorage.setItem('finmate_debts', data.debts);
          if (data.installments) localStorage.setItem('finmate_installments', data.installments);
          window.location.reload();
        } catch {
          alert(language === 'id' ? 'File backup tidak valid.' : 'Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const resetLocalData = () => {
    if (!confirm(t.settings.data.resetConfirm)) return;
    ['finmate_transactions', 'finmate_accounts', 'finmate_budgets', 'finmate_goals', 'finmate_debts', 'finmate_installments', 'finmate_chat_messages'].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.settings.title}</h2>
        <p className="text-sm text-zinc-500">{t.settings.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
        <aside className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 h-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${selected ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
              >
                <Icon size={18} className="mt-0.5 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{tab.label}</span>
                  <span className="block text-xs opacity-70 mt-0.5">{tab.description}</span>
                </span>
              </button>
            );
          })}
        </aside>

        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wider text-zinc-400">Sub menu</p>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{active.label}</h3>
          </div>

          <div className="p-5">
            {activeTab === 'ai' && (
              <div className="space-y-5 max-w-xl">
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{t.settings.ai.title}</p>
                  <p className="text-sm text-zinc-500 mt-1">{t.settings.ai.desc}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.settings.ai.apiKey}</label>
                  <input
                    type="password"
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    placeholder={language === 'id' ? 'Masukkan API key' : 'Enter API key'}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-zinc-400 mt-1">{t.settings.ai.apiKeyHint}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.settings.ai.apiUrl}</label>
                  <input
                    type="url"
                    value={aiEndpoint}
                    onChange={(e) => setAiEndpoint(e.target.value)}
                    placeholder="https://api.example.com/chat"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <p className="text-xs text-zinc-400 mt-1">{t.settings.ai.apiUrlHint}</p>
                </div>
                <button onClick={handleSaveAI} className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                  {saved ? t.common.saved : t.settings.ai.save}
                </button>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-5 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                    <p className="text-xs text-zinc-500">{t.settings.database.loginStatus}</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white mt-1">{userId ? t.settings.database.connected : t.settings.database.notLoggedIn}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                    <p className="text-xs text-zinc-500">{t.settings.database.dataMode}</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white mt-1">{userId ? t.settings.database.supabaseLocal : t.settings.database.localOnly}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.settings.database.supabaseUrl}</label>
                  <input type="url" value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://project.supabase.co" className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.settings.database.anonKey}</label>
                  <input type="password" value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} placeholder="eyJ..." className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30" />
                </div>
                <button onClick={handleSaveSupabase} className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${supabaseSaved ? 'bg-emerald-600 text-white' : 'bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-900 dark:hover:bg-zinc-600 text-white'}`}>
                  {supabaseSaved ? t.common.saved : t.settings.database.saveSupabase}
                </button>
                <button onClick={handleGoogleLogin} disabled={!!userId} className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50">
                  <GoogleIcon size={18} /> {userId ? t.settings.database.alreadyLoggedIn : t.settings.database.loginGoogle}
                </button>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{t.settings.database.checklist}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">{t.settings.database.checklistDesc}</p>
                </div>
              </div>
            )}

            {activeTab === 'language' && (
              <div className="space-y-5 max-w-xl">
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{t.settings.language.select}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleLanguageChange('id')}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${language === 'id'
                      ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">🇮🇩</span>
                      <span className="text-sm font-medium">{t.settings.language.indonesian}</span>
                    </span>
                    {language === 'id' && <CheckIcon size={16} />}
                  </button>
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${language === 'en'
                      ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl">🇺🇸</span>
                      <span className="text-sm font-medium">{t.settings.language.english}</span>
                    </span>
                    {language === 'en' && <CheckIcon size={16} />}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{t.settings.categories.title}</p>
                  <p className="text-sm text-zinc-500 mt-1">{t.settings.categories.desc}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">{t.settings.categories.expense}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {EXPENSE_CATEGORIES.map(cat => (
                      <div key={cat.name} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                        <IconBubble name={cat.icon} color={cat.color} size="sm" />
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {language === 'en' ? t.categories.expense[cat.name as keyof typeof t.categories.expense] || cat.name : cat.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">{t.settings.categories.income}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {INCOME_CATEGORIES.map(cat => (
                      <div key={cat.name} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                        <IconBubble name={cat.icon} color={cat.color} size="sm" />
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {language === 'en' ? t.categories.income[cat.name as keyof typeof t.categories.income] || cat.name : cat.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-5 max-w-xl">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(localFootprint).map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                      <p className="text-xs text-zinc-500 capitalize">{label}</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
                    </div>
                  ))}
                </div>
                <button onClick={exportData} className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors">{t.settings.data.export}</button>
                <button onClick={importData} className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium transition-colors">{t.settings.data.import}</button>
                <button onClick={resetLocalData} className="w-full py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors">{t.settings.data.reset}</button>
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-4 max-w-2xl">
                {t.settings.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckIcon size={14} />
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{rule}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
