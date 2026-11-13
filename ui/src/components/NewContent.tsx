import { useState } from "react";
import { Sparkles, PenLine } from "lucide-react";
import { toast } from "@gerdr/core";
import { useNavigate } from "react-router";
import { run } from "../lib/gerdr";
import type { Content } from "../lib/data";
import { Button } from "./Button";
import { Dialog, inputCls } from "./Dialog";

/**
 * 新建内容: what's written becomes its 稿子.md (the first line its name). 自己写 opens it; 让 AI 做 hands it to a worker
 * right away and opens it with the worker's chat beside the files.
 */
export function NewContent({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"self" | "ai">();
  const nav = useNavigate();
  const go = async (ai: boolean) => {
    setBusy(ai ? "ai" : "self");
    try {
      const c = await run<Content>("contents.create", { text, ai });
      onClose();
      nav(`/c/${c.id}`);
    } catch (e: any) {
      toast.error(e.message);
      setBusy(undefined);
    }
  };
  return (
    <Dialog title="新建内容" onClose={onClose} wide>
      <textarea
        autoFocus
        className={`${inputCls} h-44 resize-none leading-6`}
        placeholder={"第一行是名字，下面写要做什么、要求、大纲、参考……\n\n比如：\n为什么我不再用番茄钟\n写给刚开始远程工作的人，讲我两年里换过的三种专注方法，结论是……"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && text.trim() && go(true)}
      />
      <p className="mt-2 text-[12px] text-muted-foreground">写的内容存成这条内容的「稿子.md」，之后随时能改。</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" disabled={!text.trim() || !!busy} onClick={() => go(false)}>
          <PenLine className="size-3.5" /> {busy === "self" ? "建好就打开…" : "自己写"}
        </Button>
        <Button disabled={!text.trim() || !!busy} onClick={() => go(true)}>
          <Sparkles className="size-3.5" /> {busy === "ai" ? "交给 AI…" : "让 AI 做"}
        </Button>
      </div>
    </Dialog>
  );
}
