import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Briefcase,
  ClipboardList,
  FileCheckCorner,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Star,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import type { Role } from "@/lib/types";
import { useUnreadCount } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const graduateNav: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Profile & Skills", to: "/profile", icon: UserRound },
  { label: "Assessments", to: "/assessments", icon: FileCheckCorner },
  { label: "Learn", to: "/learn", icon: BookOpen },
  { label: "Mentors", to: "/mentors", icon: Users },
  { label: "Opportunities", to: "/opportunities", icon: Briefcase },
  { label: "Applications", to: "/applications", icon: ClipboardList },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Settings", to: "/settings", icon: Settings },
];

const employerNav: NavItem[] = [
  { label: "Dashboard", to: "/employer/dashboard", icon: LayoutDashboard },
  { label: "Opportunities", to: "/employer/opportunities", icon: Briefcase },
  { label: "Candidates", to: "/employer/candidates", icon: Users },
  { label: "Shortlisted", to: "/employer/shortlisted", icon: Star },
  { label: "Settings", to: "/settings", icon: Settings },
];

const mentorNav: NavItem[] = [
  { label: "Dashboard", to: "/mentor/dashboard", icon: LayoutDashboard },
  { label: "Mentees", to: "/mentors", icon: Users },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Settings", to: "/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { label: "Overview", to: "/admin", icon: Gauge },
  { label: "Opportunities", to: "/opportunities", icon: Briefcase },
  { label: "Assessments", to: "/assessments", icon: FileCheckCorner },
  { label: "Settings", to: "/settings", icon: Settings },
];

const navFor = (role: Role) =>
  role === "employer" ? employerNav : role === "mentor" ? mentorNav : role === "admin" ? adminNav : graduateNav;

const roleLabel = (role: Role) =>
  role === "employer" ? "Employer" : role === "mentor" ? "Mentor" : role === "admin" ? "Admin" : "Graduate";

function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { user, signOut } = useStore();
  const navigate = useNavigate();
  const role = user?.role ?? "graduate";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {user?.avatarInitials ?? "GC"}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold text-foreground">
              {user ? `${user.firstName} ${user.lastName}` : "Guest"}
            </span>
            <span className="block text-xs text-muted-foreground">{roleLabel(role)}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{user?.email ?? "Not signed in"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">Profile &amp; Skills</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            navigate("/"); // leave the protected page first, then end the session
            await signOut();
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Layout for logged-in pages: dark sidebar, top bar and mobile bottom nav. */
export function AppShell({ children, contentClassName }: { children: ReactNode; contentClassName?: string }) {
  const { user, signOut } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useUnreadCount(!!user).data?.count ?? 0;
  const role = user?.role ?? "graduate";
  const items = navFor(role);

  return (
    <div className="min-h-screen bg-surface">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Link to="/" className="px-1">
          <Logo variant="light" />
        </Link>
        <p className="mt-1 px-1 text-xs font-medium tracking-wide text-sidebar-foreground/60 uppercase">
          {roleLabel(role)} workspace
        </p>
        <div className="mt-6 flex-1 overflow-y-auto">
          <SidebarNav items={items} />
        </div>
        <button
          onClick={async () => {
            navigate("/"); // leave the protected page first, then end the session
            await signOut();
          }}
          className="mt-4 flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="size-4.5" aria-hidden /> Sign out
        </button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </Button>

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input placeholder="Search skills, opportunities, mentors" aria-label="Search GradConnect" className="pl-9" />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" asChild aria-label={`Notifications, ${unreadCount} unread`}>
              <Link to="/notifications" className="relative">
                <Bell />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-action text-[10px] font-bold text-action-foreground">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </Button>
            <UserMenu />
          </div>
        </header>

        <main className={cn("mx-auto w-full max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:pb-12", contentClassName)}>
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-4 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo variant="light" />
          <div className="mt-6">
            <SidebarNav items={items} onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background lg:hidden"
        aria-label="Primary mobile"
      >
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
              pathname === item.to ? "text-action" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" aria-hidden />
            {item.label.split(" ")[0]}
          </Link>
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" aria-hidden />
          More
        </button>
      </nav>
    </div>
  );
}
