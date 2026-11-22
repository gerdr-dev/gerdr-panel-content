import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { Button } from "./Button";

export type MoreItem = { label: string; icon?: ReactNode; danger?: boolean; onSelect: () => void };

/**
 * A ⋯ button opening a small list under it: the actions that needn't sit in the header (deleting, which a stray tap
 * shouldn't reach). Drawn in place, not portaled, so it works inside Gerdr's phone bar (PhoneBar) as well.
 */
export function MoreMenu({ items, title = "更多" }: { items: MoreItem[]; title?: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={box} className="relative">
      <Button variant="ghost" size="icon" title={title} aria-expanded={open} className={clsx(open && "bg-accent")} onClick={() => setOpen(!open)}>
        <MoreHorizontal className="size-4" />
      </Button>
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 min-w-36 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
          {items.map((it) => (
            <button
              key={it.label}
              className={clsx("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-accent", it.danger && "text-bad")}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
            >
              {it.icon}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
