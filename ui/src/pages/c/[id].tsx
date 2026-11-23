import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronDown, FolderOpen, MessageSquare, Pencil, Sparkles, Trash2 } from "lucide-react";
import clsx from "clsx";
import { ArtifactsFolder, PhoneBar, toast, useSession } from "@gerdr/core";
import { Button } from "../../components/Button";
import { Handoff } from "../../components/Handoff";
import { Menu, MoreMenu } from "../../components/MoreMenu";
import { Posts } from "../../components/Posts";
import { openChat, run } from "../../lib/gerdr";
import { useWide } from "../../components/ContentList";
import { STATUS_LABEL, STATUS_TONE, useRun, type Content, type Status } from "../../lib/data";

type Tab = "files" | "posts";

/**
 * One content: its name and status on top, its folder (files: brief, copy, images, videos; Markdown edited in place) and
 * its publish records. Its conversation is not drawn here: it goes in the panel agent's column on Gerdr's right
 * (openChat), so that one column is where every talk in this panel happens and what's typed there is about the content
 * on screen. On a phone that column is Gerdr's 助手 tab, reached with 对话 (opening it on its own would leave the page).
 */
export default function ContentPage() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: c, error } = useRun<Content>("contents.get", { id });
  const [tab, setTab] = useState<Tab>("files");
  const [handoff, setHandoff] = useState(false);
  const [rename, setRename] = useState<string>(); // the title being edited (undefined: not editing)
  const session = useSession(c?.session);
  const wide = useWide();
  // The content's conversation (opened empty if it has none) into the agent column. Once per content opened, not on
  // every change of its data, so switching to another conversation in that column by hand sticks
  const shown = useRef("");
  const talk = (id: string) =>
    run<{ session: string }>("contents.chat", { id }).then(
      (r) => openChat(r.session),
      (e) => toast.error(e.message),
    );
  useEffect(() => {
    if (!wide || !c || shown.current === c.id) return;
    shown.current = c.id;
    void talk(c.id);
  }, [wide, c?.id]);

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
  const tabs: [Tab, string, string][] = [
    ["files", "文件", ""],
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
                {label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 md:hidden">
              <button onClick={() => talk(c.id)} aria-label="对话" className="flex h-7 items-center gap-1 rounded-md bg-muted px-2 text-[12px]">
                <MessageSquare className={clsx("size-3.5", session?.status === "running" && "animate-pulse text-brand")} /> 对话
              </button>
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
            {tab === "posts" && <Posts content={c} />}
          </div>
        </div>
      </div>
      {handoff && (
        <Handoff
          content={c}
          onClose={() => setHandoff(false)}
          onSent={(session) => openChat(session)}
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
