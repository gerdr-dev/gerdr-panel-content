// What the agents working on contents get as tools (MCP "work"), and what each is told about itself.

import { contentOfSession, find, folderOf, libraryDir, loadContents, loadProfile, profileText, STATUSES } from "./_store";
import { addPost, edit } from "./contents";
import { list as writingList, read as writingRead, save as writingSave } from "./writing";

export const tools = {
  writing_read: {
    description:
      "Read one of the user's writing preferences (写法) as they have it now: name is 写作偏好 (general) or a platform (小红书, 抖音, 公众号…). Leave name out to list them. Returns the text and an etag for writing_update.",
    input: { type: "object", properties: { name: { type: "string" } } },
  },
  writing_update: {
    description:
      "Save a lasting preference the user stated (\"以后小红书都…\", \"我不喜欢…\") into their writing preferences: the whole new text of that file (read it first with writing_read and pass its etag; change only the part it concerns, usually under 我的偏好). A new platform name creates its file. Not for a request about one content (that goes in its 稿子.md).",
    input: {
      type: "object",
      properties: { name: { type: "string" }, text: { type: "string" }, etag: { type: "string" } },
      required: ["name", "text"],
    },
  },
  content_info: {
    description:
      "The content you work on (or the one with `id`): its name, status, folder, publish records, and the creator's positioning (我的定位) to write from. Call it before writing anything.",
    input: { type: "object", properties: { id: { type: "string", description: "a content id (c12); leave out for your own" } } },
  },
  content_list: {
    description: "Every content in this panel (id, name, status, folder), newest first: to avoid repeating one, or to find one the user names.",
    input: { type: "object", properties: {} },
  },
  content_update: {
    description: `Change the content's name or status. Status: draft (草稿, being made), ready (待发, done and waiting to go out), published (已发). Set ready when what the user asked for is done and nothing waits on them; the folder follows a new name.`,
    input: {
      type: "object",
      properties: { id: { type: "string" }, title: { type: "string" }, status: { type: "string", enum: STATUSES } },
    },
  },
  content_add_post: {
    description:
      "Record that the content went out: the platform / account, the link to the post. Call it after you published it for the user (or they told you they did); it marks the content published.",
    input: {
      type: "object",
      properties: {
        id: { type: "string" },
        platform: { type: "string", description: "小红书 / 公众号 / X / 抖音… and the account if there are several" },
        url: { type: "string" },
        title: { type: "string" },
        note: { type: "string" },
      },
      required: ["platform"],
    },
  },
};

export function writing_read(input: { name?: string }, ctx: Ctx) {
  return input.name ? writingRead({ name: input.name }, ctx) : writingList(undefined, ctx);
}

export function writing_update(input: { name: string; text: string; etag?: string }, ctx: Ctx) {
  writingSave(input, ctx);
  return { ok: true, gerdrCard: { title: `记下了：${input.name}的写法`, body: "在面板的「写法」页能看到和改", tone: "ok" } };
}

function mine(ctx: Ctx, id?: string) {
  if (id) return find(loadContents(ctx), id);
  const c = contentOfSession(ctx, ctx.caller.session);
  if (!c) throw new Error("这段对话不是在做某条内容：传 id（content_list 里找）");
  return c;
}

export function content_info(input: { id?: string }, ctx: Ctx) {
  const c = mine(ctx, input.id);
  return { ...c, folder: folderOf(ctx, c).path, library: libraryDir(ctx).path, positioning: profileText(loadProfile(ctx)) };
}

export function content_list(_: unknown, ctx: Ctx) {
  return loadContents(ctx).items.map((c) => ({ id: c.id, title: c.title, status: c.status, folder: folderOf(ctx, c).path, updatedAt: c.updatedAt }));
}

export function content_update(input: { id?: string; title?: string; status?: any }, ctx: Ctx) {
  return edit({ id: mine(ctx, input.id).id, title: input.title, status: input.status }, ctx);
}

export function content_add_post(input: { id?: string; platform: string; url?: string; title?: string; note?: string }, ctx: Ctx) {
  const p = addPost({ ...input, id: mine(ctx, input.id).id }, ctx);
  return { ...p, gerdrCard: { title: `已记下发布：${p.platform}`, body: p.url ?? "", tone: "ok" } };
}

/** Told to each conversation of ours when its agent starts: which content it works on (survives /clear). */
export function instructions(_: unknown, ctx: Ctx) {
  const c = contentOfSession(ctx, ctx.caller.session);
  if (!c) return "";
  return `你在做内容面板里的一条内容：「${c.title}」（id ${c.id}），文件夹 ${folderOf(ctx, c).path}。用户在面板右边这一栏跟你说的都是关于这条内容的。动手前先读文件夹里的 稿子.md，做法见 content-studio skill；用 content_info 拿它的现状和我的定位。做出来的都放进这个文件夹。`;
}
