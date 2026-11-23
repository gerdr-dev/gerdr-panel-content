import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronDown, FolderOpen, MessageSquare, PanelRightClose, PanelRightOpen, Pencil, Sparkles, Trash2 } from "lucide-react";
import clsx from "clsx";
import { ArtifactsFolder, PhoneBar, SessionChat, toast, useSession } from "@gerdr/core";
import { Button } from "../../components/Button";
import { Handoff } from "../../components/Handoff";
import { Menu, MoreMenu } from "../../components/MoreMenu";
import { Posts } from "../../components/Posts";
import { run } from "../../lib/gerdr";
import { STATUS_LABEL, STATUS_TONE, useRun, type Content, type Status } from "../../lib/data";

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
  const [rename, setRename] = useState<string>(); // the title being edited (undefined: not editing)
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
      nav("/", { replace: true });
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
      {/* On a phone this rides in Gerdr's top bar right of ☰ (PhoneBar; that bar is up exactly below md), so the copy
          below keeps the screen. There it holds only ← title ⋯, the title on up to two lines; the status and 交给 AI
          go to the tab row, folder-in-Finder (the computer's, not the phone's) goes */}
      <PhoneBar>
        <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2 max-md:min-w-0 max-md:flex-1 max-md:gap-0.5 max-md:border-0 max-md:p-0">
          <Link to="/" className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden" aria-label="返回">
            <ArrowLeft className="size-4" />
          </Link>
          <Title c={c} edit={rename} setEdit={setRename} />
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
            <Button
              variant="ghost"
              size="icon"
              className="max-md:hidden"
              title="在 Finder 中显示"
              onClick={() => run("contents.reveal", { id: c.id }).catch((e) => toast.error(e.message))}
            >
              <FolderOpen className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="max-md:hidden" title={chatOpen ? "收起对话" : "展开对话"} onClick={() => setChatOpen(!chatOpen)}>
              {chatOpen ? <PanelRightClose className="size-4" /> : <PanelRightOpen className="size-4" />}
            </Button>
            {/* Renaming is also a tap on the title, which nobody guesses; deleting sits here so a stray tap can't reach it */}
            <MoreMenu
              items={[
                { label: "改名", icon: <Pencil className="size-3.5" />, onSelect: () => setRename(c.title) },
                { label: "删掉这条内容", icon: <Trash2 className="size-3.5" />, danger: true, onSelect: remove },
              ]}
            />
          </div>
        </header>
      </PhoneBar>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b px-4 text-[13px]">
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
            <div className="ml-auto flex items-center gap-1 md:hidden">
              <StatusMenu status={c.status} onChange={setStatus} />
              <button
                onClick={() => setHandoff(true)}
                className="flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[12px] font-medium text-primary-foreground"
              >
                <Sparkles className="size-3.5" /> 交给 AI
              </button>
            </div>
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

/** The status as a small pill in its colour, a menu to change it (the phone's tab row). */
function StatusMenu({ status, onChange }: { status: Status; onChange: (s: Status) => void }) {
  return (
    <Menu
      items={(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ label: STATUS_LABEL[s], checked: s === status, onSelect: () => onChange(s) }))}
      trigger={(open, toggle) => (
        <button
          onClick={toggle}
          aria-label="状态"
          className={clsx("flex h-7 items-center gap-0.5 rounded-md bg-muted pr-1 pl-2 text-[12px] font-medium", STATUS_TONE[status], open && "bg-accent")}
        >
          {STATUS_LABEL[status]}
          <ChevronDown className="size-3.5 opacity-60" />
        </button>
      )}
    />
  );
}

/** The name: tap it, or ⋯ → 改名, to rename (its folder follows). On a phone up to two lines, so a long one reads. */
function Title({ c, edit, setEdit }: { c: Content; edit: string | undefined; setEdit: (v: string | undefined) => void }) {
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
      className="min-w-0 rounded-md px-1 text-left text-[15px] font-semibold hover:bg-accent/60 max-md:line-clamp-2 max-md:flex-1 max-md:text-[13px] max-md:leading-tight md:truncate"
      title="点一下改名"
      onClick={() => setEdit(c.title)}
    >
      {c.title}
    </button>
  );
}
