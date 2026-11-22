import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, FolderOpen, MessageSquare, PanelRightClose, PanelRightOpen, Sparkles, Trash2 } from "lucide-react";
import clsx from "clsx";
import { ArtifactsFolder, SessionChat, toast, useSession } from "@gerdr/core";
import { Button } from "../../components/Button";
import { Handoff } from "../../components/Handoff";
import { Posts } from "../../components/Posts";
import { run } from "../../lib/gerdr";
import { STATUS_LABEL, useRun, type Content, type Status } from "../../lib/data";

type Tab = "files" | "chat" | "posts";

/**
 * One content: its name and status on top, its folder (files: brief, copy, images, videos; Markdown edited in place)
 * on the left, the conversation of the AI working on it on the right. On a narrow screen files / chat / posts are tabs.
 */
export default function ContentPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: c, error } = useRun<Content>("contents.get", { id });
  const [tab, setTab] = useState<Tab>("files");
  const [handoff, setHandoff] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const session = useSession(c?.session);

  // Opened: "AI 做完了" is seen
  useEffect(() => {
    if (c?.fresh) void run("contents.seen", { id: c.id });
  }, [c?.id, c?.fresh]);

  if (error) return <div className="p-6 text-[13px] text-bad">{error}</div>;
  if (!c) return null;

  const setStatus = (status: Status) => run("contents.edit", { id: c.id, status }).catch((e) => toast.error(e.message));
  const remove = async () => {
    if (!window.confirm(`删掉「${c.title}」？它的文件夹会移到废纸篓。`)) return;
    try {
      await run("contents.remove", { id: c.id });
      nav("/");
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const chat = c.session ? (
    <SessionChat id={c.session} className="h-full" />
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Sparkles className="size-5 text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground">还没交给 AI。说一句要做什么，AI 就在这条内容的文件夹里做，做完你在这里接着跟它说。</p>
      <Button onClick={() => setHandoff(true)}>
        <Sparkles className="size-3.5" /> 交给 AI
      </Button>
    </div>
  );
  const tabs: [Tab, string, string][] = [
    ["files", "文件", ""],
    ["chat", "对话", "md:hidden"],
    ["posts", `发布记录${c.posts?.length ? ` ${c.posts.length}` : ""}`, ""],
  ];
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* One row on a phone too: the title truncates, the status is a select, folder-in-Finder (the computer's, not
          the phone's) goes, so the copy below keeps the screen */}
      <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2 max-md:gap-1 max-md:px-2 max-md:py-1">
        <Link to="/" className="rounded-md p-1 text-muted-foreground hover:bg-accent" aria-label="返回">
          <ArrowLeft className="size-4" />
        </Link>
        <Title c={c} />
        <select
          value={c.status}
          onChange={(e) => setStatus(e.target.value as Status)}
          className="shrink-0 rounded-md bg-muted px-1.5 py-1 text-[12px] outline-none md:hidden"
          aria-label="状态"
        >
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 gap-0.5 rounded-lg bg-muted p-0.5 max-md:hidden">
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={clsx(
                "rounded-md px-2 py-0.5 text-[12px]",
                c.status === s ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 max-md:gap-0">
          <Button className="max-md:hidden" onClick={() => setHandoff(true)}>
            <Sparkles className="size-3.5" /> 交给 AI
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" title="交给 AI" onClick={() => setHandoff(true)}>
            <Sparkles className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="max-md:hidden"
            title="在 Finder 中显示"
            onClick={() => run("contents.reveal", { id: c.id }).catch((e) => toast.error(e.message))}
          >
            <FolderOpen className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" title="删掉这条内容" onClick={remove}>
            <Trash2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="max-md:hidden" title={chatOpen ? "收起对话" : "展开对话"} onClick={() => setChatOpen(!chatOpen)}>
            {chatOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 gap-3 border-b px-4 text-[13px] max-md:px-2">
            {tabs.map(([t, label, cls]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "-mb-px border-b-2 py-1.5",
                  cls,
                  tab === t ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "chat" && session?.status === "running" ? (
                  <span className="flex items-center gap-1">
                    <MessageSquare className="size-3 animate-pulse text-brand" /> {label}
                  </span>
                ) : (
                  label
                )}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "files" && <ArtifactsFolder dir={c.folder} />}
            {tab === "chat" && <div className="h-full md:hidden">{chat}</div>}
            {tab === "posts" && <Posts content={c} />}
          </div>
        </div>
        {chatOpen && <aside className="w-[min(460px,45%)] shrink-0 border-l max-md:hidden">{chat}</aside>}
      </div>
      {handoff && (
        <Handoff
          content={c}
          onClose={() => setHandoff(false)}
          onSent={() => {
            setChatOpen(true);
            setTab((t) => (t === "files" && window.innerWidth < 768 ? "chat" : t));
          }}
        />
      )}
    </div>
  );
}

/** The name: click to rename (its folder follows). */
function Title({ c }: { c: Content }) {
  const [edit, setEdit] = useState<string>();
  const save = () => {
    const t = edit?.trim();
    setEdit(undefined);
    if (t && t !== c.title) run("contents.edit", { id: c.id, title: t }).catch((e) => toast.error(e.message));
  };
  return edit !== undefined ? (
    <input
      autoFocus
      className="min-w-0 flex-1 rounded-md border bg-background px-2 py-0.5 text-[15px] font-semibold outline-none focus:border-ring"
      value={edit}
      onChange={(e) => setEdit(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => (e.key === "Enter" ? save() : e.key === "Escape" && setEdit(undefined))}
    />
  ) : (
    <button
      className="min-w-0 truncate rounded-md px-1 text-left text-[15px] font-semibold hover:bg-accent/60 max-md:flex-1 max-md:text-[14px]"
      title="点一下改名"
      onClick={() => setEdit(c.title)}
    >
      {c.title}
    </button>
  );
}
