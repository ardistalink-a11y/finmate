import { useEffect } from 'react';
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
import { getSupabase } from '@/lib/supabase';

function App() {
  const { currentPage, theme, loadData, setUser, userId } = useStore();

  // Apply theme class to html
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Check Supabase auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = getSupabase();
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name || session.user.email || '',
            session.user.user_metadata?.avatar_url || ''
          );
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
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
      }
    };

    checkAuth();
  }, [setUser]);

  // Load data on mount and when user changes
  useEffect(() => {
    loadData();
  }, [loadData, userId]);

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
      <div className="animate-fade-in">
        {renderPage()}
      </div>
      <ChatPanel />
    </Layout>
  );
}

export default App;
