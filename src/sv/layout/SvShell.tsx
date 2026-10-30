import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Cable, ChevronDown, ChevronRight, KeyRound, ListTree, LogOut, PanelLeft, Search, Settings as SettingsIcon, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { adminNav, allDestinations, applySidebarPrefs, chatRoute, footerNav, mainNav, svPath, type NavItem } from "../nav";
import { usePrefs } from "../prefs";
import { useOutsideClose } from "../ui";
import { ChromeProvider, useChrome, useSidebarCollapsed } from "./chrome";
import { CommandPalette } from "./CommandPalette";

function isActivePath(pathname: string, item: NavItem) {
  const prefix = svPath(item.match ?? item.to);
  return pathname === prefix || (!item.exact && pathname.startsWith(`${prefix}/`));
}

function NavRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActivePath(pathname, item);
  return (
    <Link to={svPath(item.to)} className={`sv-nav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
      <item.icon className="sv-icon" aria-hidden />
      <span className="sv-nav-label">{item.label}</span>
    </Link>
  );
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  const { pathname } = useLocation();
  const { user, activeWorkspace, logout, switchWorkspace } = useAuth();
  const navigate = useNavigate();
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useOutsideClose(() => setMenuOpen(false));

  const accountName = activeWorkspace?.name ?? "SendVybe";
  const personName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "";
  const chatMode = pathname.startsWith(svPath(chatRoute));
  const { prefs, workspaceColor } = usePrefs();
  // Super admins get the platform pages as one more collapsible group at the end; it isn't part of anyone's sidebar choices.
  const navGroups = [...applySidebarPrefs(mainNav, prefs?.appearance.sidebar), ...(user?.is_super_admin ? [adminNav] : [])];

  return (
    <aside className={`sv-sidebar${collapsed ? " is-collapsed" : ""}`} aria-label="Main navigation">
      <div className="sv-account">
        <span className="sv-avatar" aria-hidden style={workspaceColor ? { background: workspaceColor, color: "#fff" } : undefined}>
          {initials(accountName)}
        </span>
        <span className="sv-account-name" title={accountName}>
          {accountName}
        </span>
        <button type="button" className="sv-icon-btn" aria-label="Collapse sidebar" onClick={onCollapse}>
          <PanelLeft className="sv-icon" aria-hidden />
        </button>
      </div>

      <div className="sv-mode" role="tablist" aria-label="Mode">
        <Link to={svPath("dashboard")} className={chatMode ? "" : "is-active"} role="tab" aria-selected={!chatMode}>
          Home
        </Link>
        <Link to={svPath(chatRoute)} className={chatMode ? "is-active" : ""} role="tab" aria-selected={chatMode}>
          <Sparkles className="sv-icon" aria-hidden />
          Chat
        </Link>
      </div>

      <nav className="sv-nav">
        {navGroups.map((group, index) => (
          <div key={group.label ?? `group-${index}`} className={group.label ? "sv-group" : undefined}>
            {group.label ? (
              <button
                type="button"
                className="sv-group-label"
                aria-expanded={!closedGroups[group.label]}
                onClick={() => setClosedGroups((current) => ({ ...current, [group.label as string]: !current[group.label as string] }))}
              >
                {group.label}
                {closedGroups[group.label] ? <ChevronRight className="sv-icon" aria-hidden /> : <ChevronDown className="sv-icon" aria-hidden />}
              </button>
            ) : null}
            {closedGroups[group.label ?? ""] ? null : group.items.map((item) => <NavRow key={item.to} item={item} pathname={pathname} />)}
          </div>
        ))}
      </nav>

      <div className="sv-sidebar-foot">
        {footerNav.map((item) => (
          <NavRow key={item.to} item={item} pathname={pathname} />
        ))}
        <div style={{ position: "relative" }} ref={menuRef}>
          <button type="button" className="sv-user" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            <span className="sv-avatar" aria-hidden>
              {initials(personName)}
            </span>
            <span className="sv-user-text">
              <div className="sv-user-name">{personName}</div>
              <div className="sv-user-email">{user?.email}</div>
            </span>
          </button>
          {menuOpen ? (
            <div className="sv-popover" role="menu" style={{ bottom: 48, left: 0, right: 0 }}>
              {/* Only people who belong to more than one workspace ever see this; everyone else has a single workspace and no switcher. */}
              {(user?.workspaces?.length ?? 0) > 1 ? (
                <>
                  <div className="sv-hint" style={{ padding: "6px 10px 2px" }}>Workspace</div>
                  {user?.workspaces?.map((w) => (
                    <button key={w.id} type="button" className="sv-menu-item" role="menuitemradio" aria-checked={w.id === activeWorkspace?.id} onClick={() => { setMenuOpen(false); if (w.id !== activeWorkspace?.id) void switchWorkspace(w.id).then(() => navigate(svPath("dashboard"))); }}>
                      {w.name}{w.id === activeWorkspace?.id ? " ✓" : ""}
                    </button>
                  ))}
                </>
              ) : null}
              <Link to={svPath("settings/profile")} className="sv-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                <SettingsIcon className="sv-icon" aria-hidden />
                Settings
              </Link>
              <button type="button" className="sv-menu-item" role="menuitem" onClick={() => void logout()}>
                <LogOut className="sv-icon" aria-hidden />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function TopBar({ sidebarCollapsed, onExpand, onSearch }: { sidebarCollapsed: boolean; onExpand: () => void; onSearch: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { crumbs } = useChrome();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useOutsideClose(() => setBellOpen(false));

  const fallback = allDestinations.find((item) => isActivePath(pathname, item));
  const shown = crumbs
    ? crumbs.map((crumb, index) =>
        index === 0 && !crumb.icon
          ? { ...crumb, icon: allDestinations.find((item) => item.label.replace(/^(Settings|CRM) · /, "") === crumb.label)?.icon }
          : crumb,
      )
    : fallback
      ? [{ label: fallback.label.replace(/^Settings · |^CRM · /, ""), icon: fallback.icon }]
      : [];

  return (
    <header className="sv-topbar">
      {sidebarCollapsed ? (
        <button type="button" className="sv-icon-btn" aria-label="Expand sidebar" onClick={onExpand}>
          <PanelLeft className="sv-icon" aria-hidden />
        </button>
      ) : null}
      <div className="sv-topbar-title">
        {shown.map((crumb, index) => (
          <span key={crumb.label} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {index > 0 ? <ChevronRight className="sv-icon sv-crumb-sep" aria-hidden /> : null}
            {index === 0 && crumb.icon ? <crumb.icon className="sv-icon" aria-hidden /> : null}
            <span className={index < shown.length - 1 ? "sv-crumb" : undefined}>{crumb.label}</span>
          </span>
        ))}
      </div>
      <div className="sv-topbar-spacer" />
      <button type="button" className="sv-search" onClick={onSearch} aria-label="Search">
        <Search className="sv-icon" aria-hidden />
        <span>Search</span>
        <kbd className="sv-kbd">Ctrl K</kbd>
      </button>
      <button type="button" className="sv-askai" onClick={() => navigate(svPath(chatRoute))}>
        <Sparkles className="sv-icon" aria-hidden />
        Ask AI
      </button>
      <div style={{ position: "relative" }} ref={bellRef}>
        <button type="button" className="sv-bell" aria-label="Notifications" aria-expanded={bellOpen} onClick={() => setBellOpen((open) => !open)}>
          <Bell className="sv-icon" aria-hidden />
        </button>
        {bellOpen ? (
          <div className="sv-popover" style={{ top: 38, right: 0, width: 280 }}>
            <p style={{ margin: 0, padding: "12px 10px", color: "var(--ds-text-secondary)" }}>You're all caught up.</p>
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** Wraps a column (top bar + floating panel) shared by the app and settings shells. */
export function MainColumn({
  collapsed,
  onExpand,
  onSearch,
  children,
}: {
  collapsed: boolean;
  onExpand: () => void;
  onSearch: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sv-main">
      <TopBar sidebarCollapsed={collapsed} onExpand={onExpand} onSearch={onSearch} />
      <main className="sv-panel">
        <div className="sv-panel-scroll">{children}</div>
      </main>
    </div>
  );
}

export function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}

export function SvShell() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandShortcut(() => setPaletteOpen(true));

  return (
    <ChromeProvider>
      <div className="sv-root">
        <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(true)} />
        <MainColumn collapsed={collapsed} onExpand={() => setCollapsed(false)} onSearch={() => setPaletteOpen(true)}>
          <Outlet />
        </MainColumn>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </ChromeProvider>
  );
}
