import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types';
import { signOut } from '@/lib/supabase';
import { CheckIcon, SparkleIcon, SettingsIcon, WalletIcon, ListIcon, BudgetIcon, LogOutIcon } from '@/components/Icons';
import { IconBubble } from '@/components/NotionIcon';
import { getTranslation, Language } from '@/lib/i18n';

type SettingsTab = 'ai' | 'account' | 'categories' | 'data' | 'rules' | 'language';

const GlobeIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const UserIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const Settings: React.FC = () => {
  const { userId, userEmail, userName, userAvatar, accounts, transactions, budgets, goals, debts, installments, language, setLanguage } = useStore();
  const t = getTranslation(language);

  const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: React.FC<{ size?: number; className?: string }> }> = [
    { id: 'account', label: language === 'id' ? 'Akun Saya' : 'My Account', description: language === 'id' ? 'Profil dan logout' : 'Profile and logout', icon: UserIcon },
    { id: 'ai', label: t.settings.tabs.ai, description: t.settings.tabs.aiDesc, icon: SparkleIcon },
    { id: 'language', label: t.settings.tabs.language, description: t.settings.tabs.languageDesc, icon: GlobeIcon },
    { id: 'categories', label: t.settings.tabs.categories, description: t.settings.tabs.categoriesDesc, icon: ListIcon },
    { id: 'data', label: t.settings.tabs.data, description: t.settings.tabs.dataDesc, icon: WalletIcon },
    { id: 'rules', label: t.settings.tabs.rules, description: t.settings.tabs.rulesDesc, icon: BudgetIcon },
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [aiKey, setAiKey] = useState(localStorage.getItem('ai_api_key') || '');
  const [aiEndpoint, setAiEndpoint] = useState(localStorage.getItem('ai_endpoint') || '');
  const [saved, setSaved] = useState(false);

  const active = tabs.find(tab => tab.id === activeTab) || tabs[0];
  const dataCount = useMemo(() => ({
    [t.nav.accounts]: accounts.length,
    [t.nav.transactions]: transactions.length,
    [t.nav.budgets]: budgets.length,
    [t.nav.goals]: goals.length,
    [t.nav.debts]: debts.length,
    [t.nav.installments]: installments.length,
  }), [accounts.length, transactions.length, budgets.length, goals.length, debts.length, installments.length, t]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const handleSaveAI = () => {
    localStorage.setItem('ai_api_key', aiKey);
    localStorage.setItem('ai_endpoint', aiEndpoint);
    setSaved(true);
  };

  const handleSignOut = async () => {
    await signOut();
    useStore.getState().setUser(null);
    window.location.reload();
  };

  const handleLanguageChange = (lang: Language) => setLanguage(lang);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{t.settings.title}</h2>
        <p className="text-sm text-zinc-500">{t.settings.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
        {/* Sidebar tabs */}
        <aside className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-2 h-fit">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${selected ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                <Icon size={18} className="mt-0.5 shrink-0" />
                <span>
                  <span className="block text-sm font-medium">{tab.label}</span>
                  <span className="block text-xs opacity-70 mt-0.5">{tab.description}</span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* Content */}
        <section className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wider text-zinc-400">Sub menu</p>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{active.label}</h3>
          </div>

          <div className="p-5">
            {/* ── Account ── */}
            {activeTab === 'account' && (
              <div className="space-y-5 max-w-xl">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  {userAvatar ? (
                    <img src={userAvatar} alt="" className="w-14 h-14 rounded-full" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl font-bold">
                      {(userName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold text-zinc-900 dark:text-white">{userName}</p>
                    <p className="text-sm text-zinc-500">{userEmail}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                    <p className="text-xs text-zinc-500">{language === 'id' ? 'Status' : 'Status'}</p>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">{language === 'id' ? 'Terhubung via Google' : 'Connected via Google'}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                    <p className="text-xs text-zinc-500">{language === 'id' ? 'Penyimpanan' : 'Storage'}</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white mt-1">Supabase Cloud</p>
                  </div>
                </div>
                <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors">
                  <LogOutIcon size={16} /> {language === 'id' ? 'Keluar' : 'Sign Out'}
                </button>
              </div>
            )}

            {/* ── AI ── */}
            {activeTab === 'ai' && (
              <div className="space-y-5 max-w-xl">
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{t.settings.ai.title}</p>
                  <p className="text-sm text-zinc-500 mt-1">{t.settings.ai.desc}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.settings.ai.apiKey}</label>
                  <input type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder={language === 'id' ? 'Masukkan API key' : 'Enter API key'} className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  <p className="text-xs text-zinc-400 mt-1">{t.settings.ai.apiKeyHint}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{t.settings.ai.apiUrl}</label>
                  <input type="url" value={aiEndpoint} onChange={(e) => setAiEndpoint(e.target.value)} placeholder="https://api.example.com/chat" className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-emerald-500/30" />
                  <p className="text-xs text-zinc-400 mt-1">{t.settings.ai.apiUrlHint}</p>
                </div>
                <button onClick={handleSaveAI} className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                  {saved ? t.common.saved : t.settings.ai.save}
                </button>
              </div>
            )}

            {/* ── Language ── */}
            {activeTab === 'language' && (
              <div className="space-y-5 max-w-xl">
                <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-4">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{t.settings.language.select}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['id', 'en'] as const).map(lang => (
                    <button key={lang} onClick={() => handleLanguageChange(lang)} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${language === lang ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}>
                      <span className="flex items-center gap-3">
                        <span className="text-xl">{lang === 'id' ? '🇮🇩' : '🇺🇸'}</span>
                        <span className="text-sm font-medium">{lang === 'id' ? t.settings.language.indonesian : t.settings.language.english}</span>
                      </span>
                      {language === lang && <CheckIcon size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Categories ── */}
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
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{language === 'en' ? t.categories.expense[cat.name as keyof typeof t.categories.expense] || cat.name : cat.name}</span>
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
                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{language === 'en' ? t.categories.income[cat.name as keyof typeof t.categories.income] || cat.name : cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Data ── */}
            {activeTab === 'data' && (
              <div className="space-y-5 max-w-xl">
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4">
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {language === 'id' ? 'Semua data tersimpan otomatis di Supabase Cloud. Data di bawah adalah jumlah record Anda saat ini.' : 'All data is automatically saved to Supabase Cloud. Data below shows your current record count.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(dataCount).map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
                      <p className="text-xs text-zinc-500 capitalize">{label}</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Rules ── */}
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
