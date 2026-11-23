import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Button } from "../components/Button";
import { ContentList, useWide } from "../components/ContentList";
import { NewContent } from "../components/NewContent";

// Home. On a phone it is the list of contents; on a wide screen the list is the column on the left (layout.tsx), so
// this is the right side before a content is picked.
export default function Home() {
  const wide = useWide();
  const [creating, setCreating] = useState(false);
  if (!wide) return <ContentList className="h-full" />;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <FileText className="size-6 text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground">在左边选一条内容，或者新建一条。</p>
      <Button variant="outline" onClick={() => setCreating(true)}>
        <Plus className="size-3.5" /> 新建内容
      </Button>
      {creating && <NewContent onClose={() => setCreating(false)} />}
    </div>
  );
}
