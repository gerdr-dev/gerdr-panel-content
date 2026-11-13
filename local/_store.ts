// The panel's data: contents, the creator's positioning, the presets for
// handing work to AI. One JSON file each in user/data/ (this person's, never shared). A helper file (leading _):
// nothing here is callable from a page.

/** Where a content is: being made (草稿) → ready to publish (待发) → published (已发). */
export type Status = "draft" | "ready" | "published";
export const STATUSES: Status[] = ["draft", "ready", "published"];

/** One time it went out: to which platform / account, where it is, when. Written by the user or the worker. */
export type Post = { id: string; platform: string; url?: string; title?: string; note?: string; at: number };

export type Content = {
  id: string;
  title: string;
  status: Status;
  /** Made from another content ("另写一篇"): that one's id. */
  source?: string;
  /** The conversation working on it now, and every one that did. */
  session?: string;
  sessions?: string[];
  /** Its worker finished a turn the user hasn't looked at yet (cleared when the content is opened). */
  fresh?: boolean;
  posts?: Post[];
  createdAt: number;
  updatedAt: number;
};

/** "我的定位": what every piece is written from. All free text in the user's words. */
export type Profile = {
  name?: string;
  positioning?: string;
  business?: string;
  about?: string;
  audience?: string;
  concerns?: string;
  advantages?: string;
  offer?: string;
  platforms?: string;
  tone?: string;
  keywords?: string;
  avoid?: string;
};

/** A saved request for 交给 AI: `here` works in this content's folder, `new` makes a new content from it. */
export type Preset = { id: string; label: string; note: string; mode: "here" | "new" };

export const DEFAULT_PRESETS: Preset[] = [
  { id: "p-write", label: "照稿子写", note: "照稿子.md 把这条内容做出来：先写一份文案，需要配图的话给出配图方案。", mode: "here" },
  { id: "p-xhs", label: "做成小红书图文", note: "在这条内容里做一份小红书图文版：一份文案（标题 20 字内，正文 1000 字内，5 个以内话题）和一组 3:4 的配图，放进「小红书」目录。", mode: "here" },
  { id: "p-long", label: "写成公众号长文", note: "在这条内容里写一篇公众号长文（Markdown，图片放旁边的目录用相对路径），放进「公众号」目录。", mode: "here" },
  { id: "p-video", label: "写视频脚本", note: "写一份 1–3 分钟的口播视频脚本（分镜、旁白、画面），再写一份视频的标题和简介文案，放进「视频」目录。", mode: "here" },
  { id: "p-oral", label: "改得更口语", note: "把最新的那份文案改得更口语一点，只改说法，不改意思和结构。", mode: "here" },
  { id: "p-angle", label: "换个角度另写一篇", note: "照这条内容换一个角度另写一篇：换读者或切入点，别重复原来的例子。", mode: "new" },
];

const FILES = { contents: "user/data/contents.json", profile: "user/data/profile.json", presets: "user/data/presets.json" };

function readJSON<T>(ctx: Ctx, path: string, fallback: T): T {
  if (!ctx.fs.stat(path)) return fallback;
  try {
    return JSON.parse(ctx.fs.read(path)) as T;
  } catch (e: any) {
    throw new Error(`${path} 读不出来（${e?.message ?? e}），请检查这个文件`);
  }
}
const writeJSON = (ctx: Ctx, path: string, v: unknown) => ctx.fs.write(path, JSON.stringify(v, null, 2));

type ContentsFile = { next: number; items: Content[] };

export function loadContents(ctx: Ctx): ContentsFile {
  return readJSON<ContentsFile>(ctx, FILES.contents, { next: 1, items: [] });
}

/** Reads, changes and writes the contents; returns what `fn` returned. */
export function updateContents<T>(ctx: Ctx, fn: (f: ContentsFile) => T): T {
  const f = loadContents(ctx);
  const out = fn(f);
  writeJSON(ctx, FILES.contents, f);
  return out;
}

export function newId(f: ContentsFile): string {
  return `c${f.next++}`;
}

export function find(f: ContentsFile, id: string): Content {
  const c = f.items.find((x) => x.id === id);
  if (!c) throw new Error(`没有这条内容：${id}`);
  return c;
}

/** The content a conversation works on (its current or a past worker). */
export function contentOfSession(ctx: Ctx, session: string): Content | undefined {
  if (!session) return undefined;
  return loadContents(ctx).items.find((c) => c.session === session || c.sessions?.includes(session));
}

export const loadProfile = (ctx: Ctx) => readJSON<Profile>(ctx, FILES.profile, {});
export const saveProfile = (ctx: Ctx, p: Profile) => writeJSON(ctx, FILES.profile, p);

export const loadPresets = (ctx: Ctx) => readJSON<Preset[]>(ctx, FILES.presets, DEFAULT_PRESETS);
export const savePresets = (ctx: Ctx, p: Preset[]) => writeJSON(ctx, FILES.presets, p);

/** The content's folder (~/Gerdr/<project>/内容/<title>/): an artifacts folder owned by this content. The path is always
 * asked of ctx.artifacts, never stored: the user may move or rename it in Finder. */
export function folderOf(ctx: Ctx, c: Content) {
  return ctx.artifacts.folder({ key: c.id, name: c.title || c.id, under: "内容" });
}

/** The shared library (资料库): material several contents use. */
export function libraryDir(ctx: Ctx) {
  return ctx.artifacts.folder({ key: "library", name: "资料库" });
}

/** Writes a text file into a folder outside the panel (ctx.fs only reaches the panel's own directory). */
export async function writeOutside(ctx: Ctx, dir: string, name: string, text: string) {
  const r = await ctx.exec("sh", ["-c", 'mkdir -p "$1" && cat > "$1/$2"', "_", dir, name], { input: text });
  if (r.code !== 0) throw new Error(`写不进 ${dir}/${name}：${r.stderr.trim()}`);
}

export const PROFILE_FIELDS: { key: keyof Profile; label: string; hint: string; long?: boolean }[] = [
  { key: "name", label: "名字 / 账号名", hint: "大家怎么称呼你" },
  { key: "positioning", label: "一句话定位", hint: "我是谁、给谁提供什么" },
  { key: "business", label: "主要写什么", hint: "几类内容", long: true },
  { key: "about", label: "关于我", hint: "经历、背景、做过的事。写文章用到的个人经历只从这里取，不编", long: true },
  { key: "audience", label: "写给谁", hint: "读者是什么人" },
  { key: "concerns", label: "读者关心什么", hint: "他们最常问、最想知道的", long: true },
  { key: "advantages", label: "我的独特之处", hint: "专长、可核实的经历和成绩", long: true },
  { key: "offer", label: "能提供什么", hint: "课程、咨询、作品、商品、合作（文末引导用）" },
  { key: "platforms", label: "主要平台和语言", hint: "比如：小红书、公众号，中文" },
  { key: "tone", label: "语气", hint: "说话风格" },
  { key: "keywords", label: "常写的话题", hint: "关键词，逗号分隔" },
  { key: "avoid", label: "不写什么", hint: "不碰的话题、不能说的话", long: true },
];

/** The positioning as Markdown, for an agent's prompt; says so when it isn't filled in. */
export function profileText(p: Profile): string {
  const lines = PROFILE_FIELDS.filter((f) => p[f.key]?.trim()).map((f) => `- ${f.label}：${p[f.key]!.trim()}`);
  return lines.length ? lines.join("\n") : "（用户还没填「我的定位」：照常识做，回复里提醒一句去「我的定位」填。）";
}
