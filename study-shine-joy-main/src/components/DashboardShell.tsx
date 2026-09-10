import { useEffect } from "react";
import { Link, useParams, useLocation, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Home,
  BookOpen,
  ClipboardList,
  FileQuestion,
  BarChart3,
  CalendarCheck,
  Bell,
  User,
  Upload,
  Users,
  ShieldCheck,
  Megaphone,
  LineChart,
  LogOut,
  Bot
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { type Role, roleMeta } from "@/lib/lms-data";
import { api } from "@/lib/api";
import { useState } from "react";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const navByRole: Record<Role, NavItem[]> = {
  student: [
    { to: "", label: "Home", icon: Home },
    { to: "courses", label: "Course Management", icon: BookOpen },
    { to: "attendance", label: "Attendance", icon: CalendarCheck },
    { to: "mock-interviews", label: "Mock Interviews", icon: Bot },
    { to: "library", label: "Library", icon: BookOpen },
    { to: "notifications", label: "Notifications", icon: Bell },
    { to: "profile", label: "Profile", icon: User },
  ],
  faculty: [
    { to: "", label: "Home", icon: Home },
    { to: "courses", label: "Course Management", icon: BookOpen },
    { to: "notifications", label: "Notifications", icon: Bell },
    { to: "library", label: "Library", icon: BookOpen },
    { to: "profile", label: "Profile", icon: User },
  ],
  admin: [
    { to: "", label: "Overview", icon: Home },
    { to: "users", label: "Users", icon: Users },
    { to: "announcements", label: "Announcements", icon: Megaphone },
    { to: "library", label: "Library", icon: BookOpen },
    { to: "reports", label: "Reports", icon: LineChart },
  ],
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { role } = useParams({ strict: false }) as { role: Role };
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const isSuperAdmin = user?.email === "admin@example.com";
  let items = navByRole[role] ?? navByRole.student;

  if (role === "admin" && !isSuperAdmin) {
    items = [
      { to: "", label: "Overview", icon: Home },
      { to: "users", label: "Users", icon: Users },
      { to: "courses", label: "Course approvals", icon: ShieldCheck },
      { to: "announcements", label: "Announcements", icon: Megaphone },
      { to: "library", label: "Library", icon: BookOpen },
      { to: "reports", label: "Reports", icon: LineChart },
    ];
  }

  const meta = roleMeta[role] ?? roleMeta.student;

  const basePath = `/dashboard/${role}`;
  const currentSub = location.pathname.replace(basePath, "").replace(/^\//, "") || "";

  useEffect(() => {
    const fetchUnreadCount = async () => {
      const res = await api.getUnreadNotificationsCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.count);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Prevent accessing dashboards not intended for their actual DB role
  useEffect(() => {
    if (user && user.role !== role) {
      navigate({ to: `/dashboard/${user.role}` });
    }
  }, [user, role, navigate]);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex h-screen sticky top-0 overflow-y-auto">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-base font-bold leading-tight">Vignan's LMS</div>
            <div className="text-[11px] text-muted-foreground">{meta.label} workspace</div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = currentSub === item.to;
            return (
              <Link
                key={item.to || "home"}
                to="/dashboard/$role/$section"
                params={{ role, section: item.to || "home" }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-primary-soft text-primary font-bold shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      {/* Main Content Area (Independent Scrollbar) */}
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-6 py-4 backdrop-blur shadow-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              {meta.label}
            </div>
            <div className="font-display text-lg font-bold">{meta.tagline}</div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/$role/$section"
              params={{ role, section: "notifications" }}
              className="relative rounded-full border border-border bg-card p-2 transition hover:bg-secondary"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
              )}
            </Link>
            <Link
              to="/dashboard/$role/$section"
              params={{ role, section: "profile" }}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 transition hover:bg-secondary"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                {user?.name?.[0]?.toUpperCase() || meta.label[0]}
              </div>
              <span className="hidden text-sm font-medium sm:inline">
                {user?.name || meta.label}
              </span>
            </Link>
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 overflow-x-hidden p-6 md:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
