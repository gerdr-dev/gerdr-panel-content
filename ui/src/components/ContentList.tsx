import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useSessions } from "@gerdr/core";
import { Button } from "./Button";
import { NewContent } from "./NewContent";
import { ago, STATUS_LABEL, STATUS_TONE, useRun, type Content, type Status } from "../lib/data";

const TABS: (Status | "all")[] = ["all", "draft", "ready", "published"];

/**
 * Every content, filtered by status and searched by name; a row opens it. On a wide screen this is the column left of
 * the open content (layout.tsx keeps it mounted across contents, so the filter and scroll stay); on a phone it is the
 * whole home page.
 */
export function ContentList({ selected, className }: { selected?: string; className?: string }) {
  const { data, error } = useRun<Content[]>("contents.list");
  const [tab, setTab] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  // Which contents have AI working on them right now
  const running = useSessions((s) => !!s.tags?.content && (s.status === "running" || s.status === "waiting"));
  const busy = useMemo(() => new Map(running.map((s) => [s.tags!.content, s.status])), [running]);
  const list = (data ?? []).filter((c) => (tab === "all" || c.status === tab) && (!q.trim() || c.title.toLowerCase().includes(q.trim().toLowerCase())));
  const count = (s: Status | "all") => (data ?? []).filter((c) => s === "all" || c.status === s).length;
  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      <div className="shrink-0 space-y-2.5 px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <h1 className="flex-1 pl-1 text-[15px] font-semibold">内容</h1>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> 新建
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-background py-1.5 pr-2.5 pl-8 text-[13px] outline-none focus:border-ring"
            placeholder="搜名字"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
          {TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={clsx(
                "flex-1 rounded-md px-1.5 py-1 text-[12px] whitespace-nowrap",
                tab === s ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "all" ? "全部" : STATUS_LABEL[s]} <span className="text-muted-foreground tabular-nums">{count(s)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {error && <div className="m-1 rounded-lg border border-bad/40 bg-bad/5 p-3 text-[13px] text-bad">{error}</div>}
        {data && !data.length && (
          <div className="m-1 rounded-xl border border-dashed p-6 text-center">
            <div className="text-[13px] font-medium">还没有内容</div>
            <p className="mt-1 text-[12px] text-muted-foreground">新建一条：写下要做什么，自己写或者交给 AI。每条内容是一个文件夹，稿子、文案、图、视频都在里面。</p>
          </div>
        )}
        {list.map((c) => (
          <Link
            key={c.id}
            to={`/c/${c.id}`}
            className={clsx("block rounded-lg px-2.5 py-2 hover:bg-accent/60", selected === c.id && "bg-accent hover:bg-accent")}
          >
            <div className="flex items-start gap-2">
              <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug font-medium">{c.title}</span>
              <span className={clsx("shrink-0 pt-px text-[11px]", STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              {c.fresh && <span className="rounded-sm bg-brand/15 px-1.5 text-brand">AI 做完了</span>}
              {busy.get(c.id) === "running" && (
                <span className="flex items-center gap-1 text-brand">
                  <Sparkles className="size-3 animate-pulse" /> AI 在做
                </span>
              )}
              {busy.get(c.id) === "waiting" && <span className="text-warn">AI 在等你</span>}
              <span>{ago(c.updatedAt)}更新</span>
              {(c.posts ?? []).map((p) => (
                <span key={p.id} className="rounded-sm border px-1">
                  {p.platform}
                </span>
              ))}
            </div>
          </Link>
        ))}
        {data && data.length > 0 && !list.length && <div className="py-6 text-center text-[13px] text-muted-foreground">没有符合的内容</div>}
      </div>
      {creating && <NewContent onClose={() => setCreating(false)} />}
    </div>
  );
}

/** md and up: where the list sits beside the open content instead of being a page of its own. */
export function useWide() {
  const q = "(min-width: 768px)";
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return wide;
}
