import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import { Button } from "./Button";

export type MenuItem = { label: string; icon?: ReactNode; danger?: boolean; checked?: boolean; onSelect: () => void };

/**
 * A button opening a small list under it. Drawn in place, not portaled, so it also works inside Gerdr's phone bar
 * (PhoneBar); and ours rather than a native <select>, whose Android sheet covered half the screen in another style.
 * `trigger` gets whether the list is open.
 */
export function Menu({
  items,
  trigger,
  align = "right",
}: {
  items: MenuItem[];
  trigger: (open: boolean, toggle: () => void) => ReactNode;
  align?: "left" | "right";
}) {
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
  const hasChecks = items.some((it) => it.checked !== undefined);
  return (
    <div ref={box} className="relative shrink-0">
      {trigger(open, () => setOpen(!open))}
      {open && (
        <div
          className={clsx(
            "absolute top-full z-50 mt-1 min-w-32 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((it) => (
            <button
              key={it.label}
              className={clsx(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] whitespace-nowrap hover:bg-accent",
                it.danger && "text-bad",
              )}
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
            >
              {it.icon}
              <span className="flex-1">{it.label}</span>
              {hasChecks && <Check className={clsx("size-3.5", !it.checked && "invisible")} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** ⋯ and the actions that needn't sit in the header. */
export function MoreMenu({ items, title = "更多" }: { items: MenuItem[]; title?: string }) {
  return (
    <Menu
      items={items}
      trigger={(open, toggle) => (
        <Button variant="ghost" size="icon" title={title} aria-expanded={open} className={clsx(open && "bg-accent")} onClick={toggle}>
          <MoreHorizontal className="size-4" />
        </Button>
      )}
    />
  );
}
