import { createPortal } from "react-dom";
import { useEffect } from "react";
import { X } from "lucide-react";
import { usePortalContainer } from "@gerdr/core";

/** A plain dialog drawn inside the panel's own area (usePortalContainer), closed by Esc or the backdrop. */
export function Dialog({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const box = usePortalContainer();
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-xl border bg-popover text-popover-foreground shadow-lg`}>
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="text-[14px] font-semibold">{title}</div>
          <button className="rounded-md p-1 text-muted-foreground hover:bg-accent" onClick={onClose} aria-label="关闭">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    box ?? document.body,
  );
}

export const inputCls = "w-full rounded-md border bg-background px-2.5 py-1.5 text-[13px] outline-none focus:border-ring";
