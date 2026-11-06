"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  Repeat,
  HandCoins,
  BarChart3,
  Upload,
  Sparkles,
  Settings,
  Sun,
  Moon,
  Monitor,
  Globe,
  LogOut,
  Plus,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  group: "main" | "planning" | "tools";
}

const NAV: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", group: "main" },
  { href: "/transactions", icon: ArrowLeftRight, labelKey: "transactions", group: "main" },
  { href: "/accounts", icon: Wallet, labelKey: "accounts", group: "main" },
  { href: "/budgets", icon: Target, labelKey: "budgets", group: "planning" },
  { href: "/recurring", icon: Repeat, labelKey: "recurring", group: "planning" },
  { href: "/goals", icon: Target, labelKey: "goals", group: "planning" },
  { href: "/debts", icon: HandCoins, labelKey: "debts", group: "planning" },
  { href: "/reports", icon: BarChart3, labelKey: "reports", group: "tools" },
  { href: "/import", icon: Upload, labelKey: "import", group: "tools" },
  { href: "/advisor", icon: Sparkles, labelKey: "advisor", group: "tools" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const tc = useTranslations("auth");
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
    router.refresh();
  }

  function cycleTheme() {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  }

  function toggleLocale() {
    const newLocale = locale === "id" ? "en" : "id";
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  const groups: Record<NavItem["group"], NavItem[]> = {
    main: NAV.filter((n) => n.group === "main"),
    planning: NAV.filter((n) => n.group === "planning"),
    tools: NAV.filter((n) => n.group === "tools"),
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r bg-surface md:flex md:flex-col print:hidden">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-fg shadow-sm">F</div>
          <div>
            <span className="block text-sm font-bold tracking-tight">Finmate</span>
            <span className="block text-[10px] text-muted">Personal finance</span>
          </div>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
          <NavGroup label={t("groupMain")} items={groups.main} locale={locale} pathname={pathname} t={t} />
          <NavGroup label={t("groupPlanning")} items={groups.planning} locale={locale} pathname={pathname} t={t} />
          <NavGroup label={t("groupTools")} items={groups.tools} locale={locale} pathname={pathname} t={t} />
        </nav>

        <div className="border-t p-4">
          <Link
            href={`/${locale}/settings`}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg",
              pathname.includes("/settings") && "bg-accent/10 font-medium text-accent"
            )}
          >
            <Settings className="h-4 w-4" />
            {t("settings")}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-surface/90 px-4 backdrop-blur md:px-8 print:hidden">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-fg">F</div>
            <span className="text-sm font-bold tracking-tight">Finmate</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleLocale} title={`Switch to ${locale === "id" ? "English" : "Bahasa"}`}>
              <span className="flex items-center gap-1 text-xs font-medium">
                <Globe className="h-4 w-4" />
                {locale.toUpperCase()}
              </span>
            </Button>
            <Button variant="ghost" size="icon" onClick={cycleTheme} title="Toggle theme">
              {theme === "light" ? <Sun className="h-4 w-4" /> : theme === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} disabled={signingOut} title={tc("signOut")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden print:hidden">
            <button className="absolute inset-0 bg-black/40" aria-label="Tutup menu" onClick={closeMobile} />
            <aside className="relative flex h-full w-[min(86vw,320px)] flex-col border-r bg-surface shadow-xl">
              <div className="flex h-16 items-center justify-between border-b px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-fg">F</div>
                  <span className="text-sm font-bold tracking-tight">Finmate</span>
                </div>
                <Button variant="ghost" size="icon" onClick={closeMobile} aria-label="Tutup menu">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
                <NavGroup label={t("groupMain")} items={groups.main} locale={locale} pathname={pathname} t={t} onNavigate={closeMobile} />
                <NavGroup label={t("groupPlanning")} items={groups.planning} locale={locale} pathname={pathname} t={t} onNavigate={closeMobile} />
                <NavGroup label={t("groupTools")} items={groups.tools} locale={locale} pathname={pathname} t={t} onNavigate={closeMobile} />
              </nav>
              <div className="border-t p-4">
                <Link href={`/${locale}/settings`} onClick={closeMobile} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-fg">
                  <Settings className="h-4 w-4" />
                  {t("settings")}
                </Link>
              </div>
            </aside>
          </div>
        )}
        <main className="flex-1 p-4 md:p-7 xl:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  locale,
  pathname,
  t,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  locale: string;
  pathname: string;
  t: ReturnType<typeof useTranslations>;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">{label}</div>
      <ul className="space-y-1">
        {items.map((item) => {
          const href = `/${locale}${item.href}`;
          const active = pathname === href || pathname.startsWith(href + "/");
          const Icon = item.icon;
          return (
            <li key={item.href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-accent/10 font-medium text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
