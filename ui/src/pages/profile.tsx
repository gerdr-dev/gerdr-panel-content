import { useEffect, useState } from "react";
import { toast } from "@gerdr/core";
import { Button } from "../components/Button";
import { inputCls } from "../components/Dialog";
import { run } from "../lib/gerdr";

type Field = { key: string; label: string; hint: string; long?: boolean };

// 我的定位: what AI writes every content from (who you are, who for, tone, what not to write).
export default function Profile() {
  const [fields, setFields] = useState<Field[]>([]);
  const [p, setP] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  useEffect(
    () =>
      void run<{ profile: Record<string, string>; fields: Field[] }>("profile.get").then(
        (r) => (setFields(r.fields), setP(r.profile), setSaved(r.profile)),
        (e) => toast.error(e.message),
      ),
    [],
  );
  const dirty = JSON.stringify(p) !== JSON.stringify(saved);
  const save = () =>
    run<Record<string, string>>("profile.save", { profile: p }).then(
      (r) => (setP(r), setSaved(r), toast.success("存好了")),
      (e) => toast.error(e.message),
    );
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-5 p-6 max-md:p-3">
        <div>
          <h1 className="text-[18px] font-semibold">我的定位</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">AI 写每一条内容都照这里来：写给谁、什么语气、不写什么。写得越具体，写出来越像你。</p>
        </div>
        {fields.map((f) => (
          <label key={f.key} className="block space-y-1">
            <div className="text-[13px] font-medium">{f.label}</div>
            {f.long ? (
              <textarea className={`${inputCls} h-20 resize-y leading-6`} placeholder={f.hint} value={p[f.key] ?? ""} onChange={(e) => setP({ ...p, [f.key]: e.target.value })} />
            ) : (
              <input className={inputCls} placeholder={f.hint} value={p[f.key] ?? ""} onChange={(e) => setP({ ...p, [f.key]: e.target.value })} />
            )}
          </label>
        ))}
        <div className="sticky bottom-0 flex justify-end border-t bg-background/95 py-3">
          <Button disabled={!dirty} onClick={save}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
