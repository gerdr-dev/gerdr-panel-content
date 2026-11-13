// Contents: the list, one content, making one, handing it to AI, its publish records. Every content is a folder
// (~/Gerdr/<project>/内容/<title>/) made when the content is: its brief is 稿子.md, everything made for it goes in there.

import {
  find,
  folderOf,
  loadContents,
  loadPresets,
  loadProfile,
  newId,
  profileText,
  savePresets,
  STATUSES,
  updateContents,
  writeOutside,
  type Content,
  type Post,
  type Preset,
  type Status,
} from "./_store";

const now = () => Date.now();

const withFolder = (ctx: Ctx, c: Content) => ({ ...c, folder: folderOf(ctx, c).path });

/** Every content, newest change first, with its folder's path. */
export function list(_: unknown, ctx: Ctx) {
  return loadContents(ctx)
    .items.slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((c) => withFolder(ctx, c));
}

/** One content with its folder: { id } */
export function get(input: { id: string }, ctx: Ctx) {
  return withFolder(ctx, find(loadContents(ctx), input.id));
}

/** Makes the content's folder with 稿子.md, unless it has one. Returns its path. */
async function ensureFolder(ctx: Ctx, c: Content, brief: string): Promise<string> {
  const f = folderOf(ctx, c);
  if (!f.exists) {
    await writeOutside(ctx, f.path, "稿子.md", brief);
    folderOf(ctx, c); // gives the folder its identity and owner now that it exists
  }
  return f.path;
}

function addContent(ctx: Ctx, title: string, source?: string): Content {
  return updateContents(ctx, (f) => {
    const c: Content = { id: newId(f), title: title.slice(0, 80), status: "draft", source, createdAt: now(), updatedAt: now() };
    f.items.push(c);
    return c;
  });
}

/**
 * A new content: { text, ai?, note?, agent? }. The text's first line is its name; the whole text is its brief (稿子.md).
 * With `ai` it goes to a worker at once (`note`, or "make it from the brief").
 */
export async function create(input: { text: string; ai?: boolean; note?: string; agent?: string }, ctx: Ctx) {
  const text = (input.text ?? "").trim();
  if (!text) throw new Error("写一句这条内容要做什么（第一行当名字）");
  const title = text.split("\n")[0].trim().replace(/^#+\s*/, "") || "未命名内容";
  const c = addContent(ctx, title);
  const body = text.split("\n").slice(1).join("\n").trim();
  await ensureFolder(ctx, c, `# ${title}\n\n${body || "（这条内容要做什么、要求、大纲、参考，写在这里。）"}\n`);
  let session: string | undefined;
  if (input.ai) session = (await handoff({ id: c.id, note: input.note?.trim() || "照稿子.md 把这条内容做出来。", agent: input.agent }, ctx)).session;
  return { ...get({ id: c.id }, ctx), session };
}

/** Changes a content: { id, title?, status? }. A new name renames its folder too. */
export function edit(input: { id: string; title?: string; status?: Status }, ctx: Ctx) {
  if (input.status && !STATUSES.includes(input.status)) throw new Error(`状态只能是 ${STATUSES.join(" / ")}`);
  const before = find(loadContents(ctx), input.id);
  const title = input.title?.trim();
  if (title && title !== before.title) {
    try {
      ctx.artifacts.rename(before.id, title);
    } catch (e: any) {
      ctx.log(`文件夹改名失败：${e?.message ?? e}`);
    }
  }
  return updateContents(ctx, (f) => {
    const c = find(f, input.id);
    if (title) c.title = title.slice(0, 80);
    if (input.status) c.status = input.status;
    c.updatedAt = now();
    return c;
  });
}

/** Opened by the user: what its worker did since is seen. { id } */
export function seen(input: { id: string }, ctx: Ctx) {
  if (!find(loadContents(ctx), input.id).fresh) return;
  updateContents(ctx, (f) => (find(f, input.id).fresh = undefined));
}

/** Removes a content from the list; its folder goes to the Trash. { id } */
export async function remove(input: { id: string }, ctx: Ctx) {
  const c = find(loadContents(ctx), input.id);
  const f = folderOf(ctx, c);
  if (f.exists) {
    const r = await ctx.exec("osascript", ["-e", `tell application "Finder" to delete (POSIX file ${JSON.stringify(f.path)} as alias)`]);
    if (r.code !== 0) throw new Error(`没能把文件夹移到废纸篓：${r.stderr.trim()}。请在 Finder 里删掉 ${f.path} 再试`);
  }
  for (const s of c.sessions ?? []) await ctx.sessions.close(s).catch(() => {});
  updateContents(ctx, (f) => (f.items = f.items.filter((x) => x.id !== c.id)));
}

/** Opens the content's folder in Finder. { id } */
export async function reveal(input: { id: string }, ctx: Ctx) {
  const f = folderOf(ctx, find(loadContents(ctx), input.id));
  if (!f.exists) throw new Error("找不到这条内容的文件夹");
  await ctx.exec("open", [f.path]);
}

function firstMessage(ctx: Ctx, c: Content, dir: string, note: string, source?: Content) {
  return [
    note.trim(),
    "",
    "---",
    `这条内容：「${c.title}」（id ${c.id}），文件夹 ${dir}。先读里面的 稿子.md，照 content-studio 这个 skill 做，做出来的都放进这个文件夹。`,
    ...(source ? [`它是照「${source.title}」（id ${source.id}）另写的：先看那条的文件夹 ${folderOf(ctx, source).path}，原内容不动。`] : []),
    "",
    "我的定位：",
    profileText(loadProfile(ctx)),
  ].join("\n");
}

/**
 * Hands work on a content to AI: { id, note, fresh?, agent? }. Its conversation goes on when it has one (the user keeps
 * talking to the worker that made it), unless `fresh`: then a new conversation in its folder. Returns the session id.
 */
export async function handoff(input: { id: string; note: string; fresh?: boolean; agent?: string; source?: string }, ctx: Ctx) {
  if (!input.note?.trim()) throw new Error("写一句要 AI 做什么");
  const c = find(loadContents(ctx), input.id);
  const dir = await ensureFolder(ctx, c, `# ${c.title}\n`);
  const source = input.source ? find(loadContents(ctx), input.source) : undefined;
  let id = !input.fresh && c.session && ctx.sessions.get(c.session) ? c.session : "";
  if (id) {
    await ctx.sessions.send(id, input.note.trim(), { show: true });
  } else {
    const s = await ctx.sessions.start({
      cwd: dir,
      prompt: firstMessage(ctx, c, dir, input.note, source),
      title: c.title,
      artifactsDir: dir,
      workspace: "none",
      tags: { content: c.id },
      ...(input.agent ? { agent: input.agent } : {}),
    });
    id = s.id;
  }
  updateContents(ctx, (f) => {
    const x = find(f, c.id);
    x.session = id;
    x.sessions = [...new Set([...(x.sessions ?? []), id])];
    x.updatedAt = now();
  });
  return { session: id };
}

/** "另写一篇": a new content from this one, handed to AI with the note. { id, note } → the new content and its session */
export async function derive(input: { id: string; note: string; agent?: string }, ctx: Ctx) {
  if (!input.note?.trim()) throw new Error("写一句这一篇要怎么写");
  const src = find(loadContents(ctx), input.id);
  const c = addContent(ctx, `${src.title}（另一篇）`, src.id);
  await ensureFolder(ctx, c, `# ${c.title}\n\n照「${src.title}」另写一篇。\n\n这次的要求：${input.note.trim()}\n`);
  const r = await handoff(
    { id: c.id, note: `${input.note.trim()}\n\n写完后用 content_update 给这条内容起个合适的名字。`, source: src.id, agent: input.agent },
    ctx,
  );
  return { ...get({ id: c.id }, ctx), session: r.session };
}

/** Adds a publish record: { id, platform, url?, title?, note?, at? }. The content becomes "published". */
export function addPost(input: { id: string; platform: string; url?: string; title?: string; note?: string; at?: number }, ctx: Ctx) {
  if (!input.platform?.trim()) throw new Error("写上发到了哪个平台 / 账号");
  return updateContents(ctx, (f) => {
    const c = find(f, input.id);
    const p: Post = {
      id: `p${now().toString(36)}`,
      platform: input.platform.trim(),
      url: input.url?.trim() || undefined,
      title: input.title?.trim() || undefined,
      note: input.note?.trim() || undefined,
      at: input.at || now(),
    };
    c.posts = [...(c.posts ?? []), p];
    c.status = "published";
    c.updatedAt = now();
    return p;
  });
}

/** Removes a publish record: { id, post } */
export function removePost(input: { id: string; post: string }, ctx: Ctx) {
  updateContents(ctx, (f) => {
    const c = find(f, input.id);
    c.posts = (c.posts ?? []).filter((p) => p.id !== input.post);
  });
}

/** The presets for 交给 AI. */
export function presets(_: unknown, ctx: Ctx) {
  return loadPresets(ctx);
}

/** Saves the whole preset list: { presets } */
export function savePresetList(input: { presets: Preset[] }, ctx: Ctx) {
  const list = (input.presets ?? [])
    .filter((p) => p.label?.trim() && p.note?.trim())
    .map((p, i) => ({ id: p.id || `p${now().toString(36)}${i}`, label: p.label.trim(), note: p.note.trim(), mode: p.mode === "new" ? "new" : "here" }) as Preset);
  savePresets(ctx, list);
  return list;
}

/**
 * A worker of ours changed status (triggers/workers.json): when one finished a turn the user didn't drive, its content
 * shows "AI 做完了" and the rail button gets a dot, until the user opens it.
 */
export function onSession(input: { event: { data: { id: string; status: string; prev?: string } } }, ctx: Ctx) {
  const d = input.event?.data;
  if (!d || d.status !== "idle" || d.prev !== "running") return;
  if (ctx.sessions.get(d.id)?.byPerson) return;
  let hit = false;
  updateContents(ctx, (f) => {
    const c = f.items.find((x) => x.session === d.id);
    if (c) {
      c.fresh = true;
      c.updatedAt = now();
      hit = true;
    }
  });
  if (hit) ctx.badge.add();
}
