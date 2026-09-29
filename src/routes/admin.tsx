// @ts-nocheck
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ClipboardList,
  Package,
  BarChart3,
  Users,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Landmark,
  BookOpen,
  Wallet,
  UserCheck,
  Receipt,
  FileSpreadsheet,
  Menu,
  Utensils,
  Store,
  Building2,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RestocashLogo } from "@/components/RestocashLogo";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CURRENT_VERSION } from "@/shared/config/version";
import { GitHubUpdateBanner } from "@/components/admin/GitHubUpdateBanner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة الإدارة" }] }),
  component: () => <AdminLayout />,
});

const nav = [
  { to: "/admin", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/admin/restaurant", label: "إدارة المطعم (البرنامج الشامل)", icon: Store },
  { to: "/admin/mall", label: "إدارة المول والحديقة", icon: Building2 },
  { to: "/admin", search: { tab: "treasury" }, label: "إدارة الخزائن", icon: Wallet },
  { to: "/admin/receipts", label: "تصميم وإدارة الإيصالات والسندات", icon: Receipt },
  { to: "/admin/accounts", label: "إدارة الحسابات", icon: Landmark },
  { to: "/admin/ledger", label: "حساب الأستاذ", icon: BookOpen },
  { to: "/admin/hr", label: "إدارة الموارد البشرية", icon: UserCheck },
  { to: "/admin/reports", label: "التقارير", icon: BarChart3 },
  { to: "/admin/users", label: "المستخدمين", icon: Users },
  {
    to: "/admin/system-update",
    label: "خيارات المطور",
    icon: Settings,
    permissionKey: "developer_options",
  },
];

export function AdminLayout({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const localUser =
        localStorage.getItem("restocash_auth_user") ||
        sessionStorage.getItem("restocash_auth_user");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (session?.user?.email) {
          setUser({ email: session.user.email });
        } else if (localUser) {
          setUser({ email: localUser });
        } else {
          navigate({ to: "/login" });
          return;
        }
      } catch (error) {
        console.error("Restocash auth check failed:", error);
        if (!isMounted) return;
        if (localUser) {
          setUser({ email: localUser });
        } else {
          navigate({ to: "/login" });
          return;
        }
      } finally {
        if (isMounted) {
          setAuthChecking(false);
        }
      }
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      const localUser =
        localStorage.getItem("restocash_auth_user") ||
        sessionStorage.getItem("restocash_auth_user");

      if (session?.user?.email) {
        setUser({ email: session.user.email });
      } else if (localUser) {
        setUser({ email: localUser });
      } else if (event === "SIGNED_OUT" || !session) {
        navigate({ to: "/login" });
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = async () => {
    localStorage.removeItem("restocash_auth_user");
    localStorage.removeItem("restocash_user_role");
    sessionStorage.removeItem("restocash_auth_user");
    sessionStorage.removeItem("restocash_user_role");
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    navigate({ to: "/login" });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <RestocashLogo size={32} />
          <p className="mt-4 text-sm font-bold text-foreground">جاري التحقق من جلسة الدخول…</p>
          <p className="mt-2 text-xs text-muted-foreground">يرجى الانتظار لحظات.</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const searchParams = new URLSearchParams(location.search);
  const hasRouteSearch = searchParams.has("tab");
  const isNavItemActive = (item: (typeof nav)[number]) => {
    if (item.search) {
      return pathname === item.to && searchParams.get("tab") === item.search.tab;
    }
    if (item.exact) {
      // Do not mark the base dashboard active while a tab-specific view is open.
      return pathname === item.to && !hasRouteSearch;
    }
    return pathname.startsWith(item.to);
  };
  const activeNavItem = nav.find(isNavItemActive);

  const renderSidebarNav = (onItemClick?: () => void) => (
    <div className="flex flex-col h-full bg-card text-card-foreground">
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <RestocashLogo size={20} />
          <p className="text-[10px] text-muted-foreground mt-1">نظام الإدارة المتكامل</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          {location.pathname.startsWith("/admin") ? "لوحة التحكم الرئيسية" : "الإدارة"}
        </div>
        {nav.map((item) => {
          const active = isNavItemActive(item);
          return (
            <Link
              key={item.to + (item.search ? "?" + new URLSearchParams(item.search).toString() : "")}
              to={item.to}
              search={item.search}
              onClick={() => {
                if (onItemClick) onItemClick();
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-2 shrink-0">
        <p className="px-3 text-xs text-muted-foreground truncate">{user?.email}</p>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => {
            if (onItemClick) onItemClick();
            handleSignOut();
          }}
        >
          <LogOut size={18} />
          تسجيل الخروج
        </Button>
        <Link
          to="/"
          onClick={() => {
            if (onItemClick) onItemClick();
          }}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition"
        >
          <ArrowLeft size={18} />
          الرئيسية
        </Link>

        <div className="pt-2 border-t border-border/60 space-y-2">
          <div className="space-y-1">
            <span className="px-1 text-[11px] font-bold text-muted-foreground block">
              لغة التطبيق:
            </span>
            <LanguageSwitcher compact />
          </div>
          <div className="space-y-1">
            <span className="px-1 text-[11px] font-bold text-muted-foreground block">
              عملة عرض اللوحة:
            </span>
            <CurrencySwitcher compact className="w-full justify-between" />
          </div>
        </div>

        {/* System Version & Update Status */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <Link
            to="/admin/system-update"
            className="flex items-center gap-1.5 hover:text-foreground transition font-medium"
            title="انتقل إلى صفحة خيارات المطور والتحديثات"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>الإصدار: v{CURRENT_VERSION}</span>
          </Link>
          <span className="text-[10px] text-muted-foreground/70">GitHub Sync</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 border-l border-border bg-card flex-col h-screen sticky top-0">
        {renderSidebarNav()}
      </aside>

      {/* Mobile Drawer Navigation (Sheet) */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="right" className="w-[280px] p-0 border-l border-border bg-card">
          {renderSidebarNav(() => setIsMobileMenuOpen(false))}
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* GitHub Auto-Update Notification Banner */}
        <GitHubUpdateBanner />

        {/* Admin Header with Page Title, Mobile Toggle, and Currency/Language Switcher */}
        <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {/* Mobile Sidebar Toggle Icon Button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden shrink-0 h-9 w-9 border-border"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="فتح القائمة الجانبية"
            >
              <Menu size={20} />
            </Button>
            <span className="font-black text-sm text-foreground">
              {activeNavItem?.label || "لوحة التحكم"}
            </span>
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              | نظام إدارة المطاعم والمحاسبة ERP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <CurrencySwitcher />
          </div>
        </header>
        <div className="p-4 sm:p-6 flex-1">{children || <Outlet />}</div>
      </main>
    </div>
  );
}
