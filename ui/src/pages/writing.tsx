import { useEffect, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import clsx from "clsx";
import { toast, usePanelChange } from "@gerdr/core";
import { Button } from "../components/Button";
import { inputCls } from "../components/Dialog";
import { run } from "../lib/gerdr";
import { useRun } from "../lib/data";

type Item = { name: string; general: boolean; changed: boolean; own: boolean };
type Doc = { name: string; text: string; etag: string; changed: boolean };

/**
 * 写法: how the user wants each platform written (and what holds everywhere), in their own words. AI reads these
 * before writing for a platform; it also notes lasting preferences the user tells it in a chat (writing_update).
 */
export default function Writing() {
  const { data: items, reload } = useRun<Item[]>("writing.list", undefined, "user/skills");
  const [cur, setCur] = useState("写作偏好");
  const [doc, setDoc] = useState<Doc>();
  const [text, setText] = useState("");
  const [adding, setAdding] = useState<string>();
  const changedHere = usePanelChange(`user/skills`);
  const dirty = !!doc && text !== doc.text;

  const open = (name: string) =>
    run<Doc>("writing.read", { name }).then(
      (d) => (setCur(name), setDoc(d), setText(d.text)),
      (e) => toast.error(e.message),
    );
  useEffect(() => void open(cur), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Changed elsewhere (AI noted a preference): show it, unless the user is in the middle of editing
  useEffect(() => {
    if (doc && !dirty) void open(cur);
  }, [changedHere]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (name: string) => {
    if (dirty && !window.confirm("这份还没保存，不要改动了？")) return;
    void open(name);
  };
  const save = () =>
    run("writing.save", { name: cur, text, etag: doc?.etag }).then(
      () => (toast.success("存好了"), open(cur), reload()),
      (e) => toast.error(e.message),
    );
  const reset = () => {
    if (!window.confirm(`「${cur}」恢复成面板默认的写法？你改的这份会移到废纸篓。`)) return;
    run<Doc>("writing.reset", { name: cur }).then(
      (d) => (setDoc(d), setText(d.text), reload()),
      (e) => toast.error(e.message),
    );
  };
  const remove = () => {
    if (!window.confirm(`删掉「${cur}」的写法？`)) return;
    run("writing.remove", { name: cur }).then(
      () => (reload(), open("写作偏好")),
      (e) => toast.error(e.message),
    );
  };
  const add = () => {
    const name = adding?.trim();
    if (!name) return setAdding(undefined);
    run<Doc>("writing.add", { name }).then(
      (d) => (setAdding(undefined), reload(), setCur(d.name), setDoc(d), setText(d.text)),
      (e) => toast.error(e.message),
    );
  };
  const item = items?.find((i) => i.name === cur);

  return (
    <div className="flex h-full min-h-0 max-md:flex-col">
      <div className="w-52 shrink-0 overflow-y-auto border-r p-3 max-md:w-full max-md:border-r-0 max-md:border-b">
        <h1 className="px-2 text-[16px] font-semibold">写法</h1>
        <p className="mt-1 mb-3 px-2 text-[12px] leading-5 text-muted-foreground">各平台怎么写、你的偏好。AI 给哪个平台写，就照哪份来。</p>
        <div className="flex flex-col gap-0.5 max-md:flex-row max-md:flex-wrap">
          {items?.map((i) => (
            <button
              key={i.name}
              onClick={() => pick(i.name)}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-accent/60",
                cur === i.name && "bg-accent font-medium",
                i.general && "mb-1",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{i.general ? "通用偏好" : i.name}</span>
              {i.changed && <span className="text-[11px] text-brand">已改</span>}
              {i.own && <span className="text-[11px] text-muted-foreground">自己加的</span>}
            </button>
          ))}
          {adding === undefined ? (
            <button className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-muted-foreground hover:bg-accent/60" onClick={() => setAdding("")}>
              <Plus className="size-3.5" /> 加一个平台
            </button>
          ) : (
            <input
              autoFocus
              className={inputCls}
              placeholder="平台名，回车"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onBlur={add}
              onKeyDown={(e) => (e.key === "Enter" ? add() : e.key === "Escape" && setAdding(undefined))}
            />
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
          <div className="min-w-0 flex-1 truncate text-[14px] font-semibold">{cur === "写作偏好" ? "通用偏好（所有平台）" : cur}</div>
          {item?.changed && (
            <Button variant="ghost" onClick={reset} title="恢复成面板默认的写法">
              <RotateCcw className="size-3.5" /> 恢复默认
            </Button>
          )}
          {item?.own && (
            <Button variant="ghost" onClick={remove}>
              <Trash2 className="size-3.5" /> 删掉
            </Button>
          )}
          <Button disabled={!dirty} onClick={save}>
            保存
          </Button>
        </div>
        <textarea
          className="min-h-0 flex-1 resize-none bg-background p-4 font-mono text-[13px] leading-6 outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "s" && (e.metaKey || e.ctrlKey) && (e.preventDefault(), dirty && save())}
          spellCheck={false}
        />
        <p className="shrink-0 border-t px-4 py-2 text-[12px] text-muted-foreground">
          在对话里跟 AI 说「以后小红书都……」，它也会记到这里。只对一条内容的要求写在那条内容的稿子里。
        </p>
      </div>
    </div>
  );
}
