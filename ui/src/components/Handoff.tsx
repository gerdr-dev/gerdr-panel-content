import { useEffect, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import { toast } from "@gerdr/core";
import { useNavigate } from "react-router";
import { run } from "../lib/gerdr";
import type { Content, Preset } from "../lib/data";
import { Button } from "./Button";
import { Dialog, inputCls } from "./Dialog";

/**
 * 交给 AI: a request (written, or a saved preset) for this content. "在这条上做" goes to its conversation (a new one
 * when it has none, or when asked); "另写一篇" makes a new content from this one. Presets are the user's: kept in
 * user/data/presets.json, added and removed here.
 */
export function Handoff({ content, onClose, onSent }: { content: Content; onClose: () => void; onSent: (session: string) => void }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"here" | "new">("here");
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  useEffect(() => void run<Preset[]>("contents.presets").then(setPresets, () => {}), []);
  const savePresets = (list: Preset[]) => run<Preset[]>("contents.savePresetList", { presets: list }).then(setPresets, (e) => toast.error(e.message));
  const send = async () => {
    setBusy(true);
    try {
      if (mode === "new") {
        const c = await run<Content & { session: string }>("contents.derive", { id: content.id, note });
        onClose();
        nav(`/c/${c.id}`);
      } else {
        const r = await run<{ session: string }>("contents.handoff", { id: content.id, note, fresh });
        onSent(r.session);
        onClose();
      }
    } catch (e: any) {
      toast.error(e.message);
      setBusy(false);
    }
  };
  return (
    <Dialog title="交给 AI" onClose={onClose} wide>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <span key={p.id} className="group flex items-center rounded-md border text-[12px] hover:bg-accent/60">
            <button
              className="py-1 pl-2"
              title={p.note}
              onClick={() => {
                setNote(p.note);
                setMode(p.mode);
              }}
            >
              {p.label}
            </button>
            <button
              className="px-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
              title="删掉这个预设"
              onClick={() => savePresets(presets.filter((x) => x.id !== p.id))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <textarea
        autoFocus
        className={`${inputCls} h-32 resize-none leading-6`}
        placeholder="要 AI 做什么：写一份小红书文案、做一组配图、写视频脚本、把文案改短……"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && note.trim() && send()}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
        <div className="flex gap-0.5 rounded-lg bg-muted p-0.5">
          {(["here", "new"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx("rounded-md px-2.5 py-1", mode === m ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
            >
              {m === "here" ? "在这条上做" : "另写一篇"}
            </button>
          ))}
        </div>
        {mode === "here" && content.session && (
          <label className="flex items-center gap-1.5 text-muted-foreground">
            <input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} /> 开一段新对话
          </label>
        )}
        <span className="text-muted-foreground">
          {mode === "new" ? "新建一条内容，照这条另写，原内容不动" : content.session && !fresh ? "接着这条内容原来的对话说" : "AI 在这条内容的文件夹里做"}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground disabled:opacity-40"
          disabled={!note.trim()}
          onClick={() => {
            const label = window.prompt("预设叫什么？", note.trim().slice(0, 12));
            if (label?.trim()) savePresets([...presets, { id: "", label: label.trim(), note: note.trim(), mode }]);
          }}
        >
          <Plus className="size-3" /> 存成预设
        </button>
        <Button disabled={!note.trim() || busy} onClick={send}>
          <Sparkles className="size-3.5" /> {busy ? "交给 AI…" : "交给 AI"}
        </Button>
      </div>
    </Dialog>
  );
}
