import { useState } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "@gerdr/core";
import { run } from "../lib/gerdr";
import type { Content } from "../lib/data";
import { Button } from "./Button";
import { inputCls } from "./Dialog";

const fmt = (ms: number) => new Date(ms).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 发布记录: where this content went out. Added by hand here, or by the worker (content_add_post). */
export function Posts({ content }: { content: Content }) {
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ platform: "", url: "", note: "" });
  const add = () =>
    run("contents.addPost", { id: content.id, ...f }).then(
      () => (setAdding(false), setF({ platform: "", url: "", note: "" })),
      (e) => toast.error(e.message),
    );
  const posts = content.posts ?? [];
  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      {!posts.length && !adding && <p className="text-[13px] text-muted-foreground">还没有发布记录。发出去以后在这里记一笔：发到哪、链接是什么。</p>}
      {posts.map((p) => (
        <div key={p.id} className="group flex items-start gap-3 rounded-lg border bg-card px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-medium">{p.platform}</span>
              <span className="text-[12px] text-muted-foreground">{fmt(p.at)}</span>
            </div>
            {p.title && <div className="mt-0.5 text-[13px]">{p.title}</div>}
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-brand hover:underline">
                <ExternalLink className="size-3 shrink-0" /> <span className="truncate">{p.url}</span>
              </a>
            )}
            {p.note && <div className="mt-0.5 text-[12px] text-muted-foreground">{p.note}</div>}
          </div>
          <button
            className="rounded-md p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent"
            title="删掉这条记录"
            onClick={() => run("contents.removePost", { id: content.id, post: p.id }).catch((e) => toast.error(e.message))}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
      {adding ? (
        <div className="space-y-2 rounded-lg border bg-card p-3">
          <input autoFocus className={inputCls} placeholder="发到哪：小红书 / 公众号 / X…" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })} />
          <input className={inputCls} placeholder="链接（可选）" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
          <input className={inputCls} placeholder="备注（可选）" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>
              取消
            </Button>
            <Button disabled={!f.platform.trim()} onClick={add}>
              记下
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <Plus className="size-3.5" /> 记一次发布
        </Button>
      )}
    </div>
  );
}
