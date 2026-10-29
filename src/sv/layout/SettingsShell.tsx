import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronLeft, Search } from "lucide-react";
import { settingsNav, svPath } from "../nav";
import { ChromeProvider, useSidebarCollapsed } from "./chrome";
import { CommandPalette } from "./CommandPalette";
import { MainColumn, useCommandShortcut } from "./SvShell";

function SettingsSidebar({ collapsed }: { collapsed: boolean }) {
  const { pathname } = useLocation();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return settingsNav;
    return settingsNav
      .map((group) => ({
        ...group,
        pages: group.pages.filter((page) => `${page.label} ${page.keywords ?? ""}`.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.pages.length > 0);
  }, [query]);

  return (
    <aside className={`sv-settings-side sv-sidebar${collapsed ? " is-collapsed" : ""}`} aria-label="Settings navigation">
      <Link to={svPath("dashboard")} className="sv-back">
        <ChevronLeft className="sv-icon" aria-hidden />
        Back to app
      </Link>
      <label className="sv-settings-search">
        <Search className="sv-icon" aria-hidden />
        <input value={query} placeholder="Search…" onChange={(event) => setQuery(event.target.value)} aria-label="Search settings" />
      </label>
      <nav className="sv-settings-nav">
        {groups.map((group) => (
          <div key={group.label} className="sv-group">
            <div className="sv-group-label" style={{ cursor: "default" }}>
              {group.label}
            </div>
            {group.pages.map((page) => {
              const active = pathname === svPath(page.to);
              return (
                <Link key={page.to} to={svPath(page.to)} className={`sv-snav-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
                  <page.icon className="sv-icon" aria-hidden />
                  <span className="sv-nav-label">{page.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
        {groups.length === 0 ? <p style={{ padding: "8px 10px", color: "var(--ds-text-secondary)" }}>No settings match.</p> : null}
      </nav>
    </aside>
  );
}

export function SettingsShell() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandShortcut(() => setPaletteOpen(true));

  return (
    <ChromeProvider>
      <div className="sv-root">
        <SettingsSidebar collapsed={collapsed} />
        <MainColumn collapsed={collapsed} onExpand={() => setCollapsed(false)} onSearch={() => setPaletteOpen(true)}>
          <Outlet />
        </MainColumn>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </ChromeProvider>
  );
}
