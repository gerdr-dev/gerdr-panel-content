import { ArtifactsFolder } from "@gerdr/core";
import { useRun } from "../lib/data";

// 资料库: one shared folder for material several contents use. Drop files in to add them.
export default function Library() {
  const { data, error } = useRun<{ path: string }>("library.folder", undefined, "none");
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-4 py-3">
        <h1 className="text-[16px] font-semibold">资料库</h1>
        <p className="text-[12px] text-muted-foreground">几条内容都会用到的素材放这里：照片、Logo、参考资料。拖文件进来就加上了，AI 做内容时也能从这里取。</p>
      </div>
      {error && <div className="p-4 text-[13px] text-bad">{error}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto">{data && <ArtifactsFolder dir={data.path} />}</div>
    </div>
  );
}
