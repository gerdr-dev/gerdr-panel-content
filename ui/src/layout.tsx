import { useEffect } from "react";
import { FileText, FolderOpen, PenLine, UserRound } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import clsx from "clsx";
import { onShowSession, PhoneBar, usePhoneMenu } from "@gerdr/core";
import { project, run, showSession } from "./lib/gerdr";
import type { Content } from "./lib/data";
import { ContentList, useWide } from "./components/ContentList";

// The menu on the left and the page on the right (内容 adds the list of contents between them); below md the menu is a row of tabs above the page.
const MENU = [
  { to: "/", label: "内容", icon: FileText, end: true },
  { to: "/library", label: "资料库", icon: FolderOpen, end: true },
  { to: "/writing", label: "写法", icon: PenLine, end: true },
  { to: "/profile", label: "我的定位", icon: UserRound, end: true },
];

export default function Layout() {
  const nav = useNavigate();
  // A content's conversation brought up from elsewhere (a notification, the inbox): open that content, its chat beside
  useEffect(
    () =>
      onShowSession(project, async (session) => {
        const list = await run<Content[]>("contents.list").catch(() => []);
        const c = list.find((x) => x.session === session || x.sessions?.includes(session));
        if (c) nav(`/c/${c.id}`);
        else showSession(session);
      }),
    [nav],
  );
  usePhoneMenu(MENU.map((m) => ({ label: m.label, icon: <m.icon className="size-4" />, onSelect: () => nav(m.to) })));
  const path = useLocation().pathname;
  // 内容 stays lit on a content's own page (/c/<id>)
  const inContents = path === "/" || path.startsWith("/c/");
  const active = (to: string) => (to === "/" ? inContents : path === to);
  const wide = useWide();
  return (
    <div className="flex h-full">
      <nav className="hidden w-48 shrink-0 flex-col gap-0.5 border-r bg-sidebar px-2 py-3 md:flex">
        <div className="px-2 pb-2 text-[11px] font-medium text-muted-foreground">内容</div>
        {MENU.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={() => clsx("flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent/60", active(it.to) && "bg-accent font-medium")}
          >
            <it.icon className="size-3.5 text-muted-foreground" />
            {it.label}
          </NavLink>
        ))}
      </nav>
      {/* Wide screens: every content in a column, the open one on the right. Here rather than in the pages so it stays
          mounted while moving between contents (filter, search and scroll kept); on a phone the home page is the list */}
      {wide && inContents && <ContentList selected={path.startsWith("/c/") ? decodeURIComponent(path.slice(3)) : undefined} className="w-72 shrink-0 border-r" />}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* On a phone the pages ride in Gerdr's top bar, right of ☰ (PhoneBar), instead of a strip of their own.
            A content's own page puts its header there instead: it has its back arrow, the drawer has these pages */}
        {!path.startsWith("/c/") && (
          <PhoneBar>
            <nav className="flex min-w-0 gap-0.5 overflow-x-auto md:hidden [scrollbar-width:none]">
              {MENU.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={() =>
                    clsx("flex shrink-0 items-center rounded-md px-2.5 py-1.5 text-[13px]", active(it.to) ? "bg-accent font-medium" : "text-muted-foreground")
                  }
                >
                  {it.label}
                </NavLink>
              ))}
            </nav>
          </PhoneBar>
        )}
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
