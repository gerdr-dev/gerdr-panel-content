// Types and small hooks over the panel's local functions (local/contents.ts …). Pages only draw.

import { useCallback, useEffect, useState } from "react";
import { usePanelChange } from "@gerdr/core";
import { run } from "./gerdr";

export type Status = "draft" | "ready" | "published";
export const STATUS_LABEL: Record<Status, string> = { draft: "草稿", ready: "待发", published: "已发" };
export const STATUS_TONE: Record<Status, string> = { draft: "text-muted-foreground", ready: "text-warn", published: "text-ok" };

export type Post = { id: string; platform: string; url?: string; title?: string; note?: string; at: number };
export type Content = {
  id: string;
  title: string;
  status: Status;
  source?: string;
  session?: string;
  sessions?: string[];
  fresh?: boolean;
  posts?: Post[];
  createdAt: number;
  updatedAt: number;
  folder: string;
};
export type Preset = { id: string; label: string; note: string; mode: "here" | "new" };

/** Calls a function and keeps its result, again whenever the panel's data changes (a button, an agent's tool call). */
export function useRun<T>(fn: string, input?: unknown, watch = "user/data") {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const v = usePanelChange(watch);
  const key = JSON.stringify(input ?? null);
  const load = useCallback(
    () =>
      run<T>(fn, input).then(
        (d) => (setData(d), setError(undefined)),
        (e) => setError(e.message),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn, key],
  );
  useEffect(() => void load(), [load, v]);
  return { data, error, reload: load };
}

export function ago(ms: number) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} 天前`;
  const d = new Date(ms);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
