import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useSessions } from "@gerdr/core";
import { Button } from "../components/Button";
import { NewContent } from "../components/NewContent";
import { ago, STATUS_LABEL, STATUS_TONE, useRun, type Content, type Status } from "../lib/data";

const TABS: (Status | "all")[] = ["all", "draft", "ready", "published"];

// The list of contents: filter by status, search by name; each row opens the content.
export default function Contents() {
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 p-6 max-md:p-3">
        <div className="flex items-center gap-3">
          <h1 className="flex-1 text-[18px] font-semibold">内容</h1>
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> 新建内容
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
            {TABS.map((s) => (
              <button
                key={s}
                onClick={() => setTab(s)}
                className={clsx(
                  "rounded-md px-2.5 py-1 text-[12px]",
                  tab === s ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "全部" : STATUS_LABEL[s]} <span className="text-muted-foreground tabular-nums">{count(s)}</span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-56 max-md:w-full">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded-md border bg-background py-1.5 pr-2.5 pl-8 text-[13px] outline-none focus:border-ring"
              placeholder="搜名字"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        {error && <div className="rounded-lg border border-bad/40 bg-bad/5 p-3 text-[13px] text-bad">{error}</div>}
        {data && !data.length && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <div className="text-[14px] font-medium">还没有内容</div>
            <p className="mt-1 text-[13px] text-muted-foreground">新建一条：写下要做什么，自己写或者交给 AI。每条内容是一个文件夹，稿子、文案、图、视频都在里面。</p>
            <Button className="mt-4" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" /> 新建内容
            </Button>
          </div>
        )}
        <div className={clsx("divide-y rounded-xl border bg-card", !list.length && "hidden")}>
          {list.map((c) => (
            <Link key={c.id} to={`/c/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium">{c.title}</span>
                  {c.fresh && <span className="shrink-0 rounded-sm bg-brand/15 px-1.5 text-[11px] text-brand">AI 做完了</span>}
                  {busy.get(c.id) === "running" && (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-brand">
                      <Sparkles className="size-3 animate-pulse" /> AI 在做
                    </span>
                  )}
                  {busy.get(c.id) === "waiting" && <span className="shrink-0 text-[11px] text-warn">AI 在等你</span>}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                  <span>{ago(c.updatedAt)}更新</span>
                  {(c.posts ?? []).map((p) => (
                    <span key={p.id} className="rounded-sm border px-1.5 text-[11px]">
                      {p.platform}
                    </span>
                  ))}
                </div>
              </div>
              <span className={clsx("shrink-0 text-[12px]", STATUS_TONE[c.status])}>{STATUS_LABEL[c.status]}</span>
            </Link>
          ))}
        </div>
        {data && data.length > 0 && !list.length && <div className="py-6 text-center text-[13px] text-muted-foreground">没有符合的内容</div>}
      </div>
      {creating && <NewContent onClose={() => setCreating(false)} />}
    </div>
  );
}
