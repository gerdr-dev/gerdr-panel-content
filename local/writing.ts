// 写法: the user's writing preferences, as prose the agents read in the content-studio skill — one general file
// (写作偏好.md) and one per platform (platforms/<平台>.md). The panel ships defaults in skills/; the user's edits and
// added platforms go to user/skills/ (Gerdr gives sessions the merged skill: a user file replaces the shared one of
// the same path). Nothing here interprets the text.

const SKILL = "skills/content-studio";
const GENERAL = "写作偏好";
const NAME = /^[\w一-鿿 .+-]{1,30}$/;

const rel = (name: string) => (name === GENERAL ? `${GENERAL}.md` : `platforms/${name}.md`);
const shared = (name: string) => `${SKILL}/${rel(name)}`;
const mine = (name: string) => `user/${SKILL}/${rel(name)}`;

function check(name: string) {
  if (!NAME.test(name ?? "") || name.includes("..")) throw new Error("名字只能有中英文、数字、空格和 - + . _，30 字以内");
}

const base = (p: string) => p.split("/").pop()!.replace(/\.md$/, "");
const platformsIn = (ctx: Ctx, dir: string) =>
  ctx.fs
    .list(dir)
    .filter((f) => !f.dir && f.path.endsWith(".md"))
    .map((f) => base(f.path));

/**
 * The general preferences first, then every platform (the panel's and the user's own), each with `changed` (the user
 * edited the panel's default: reset brings it back) and `own` (only the user has it: it can be deleted).
 */
export function list(_: unknown, ctx: Ctx) {
  const names = [...new Set([...platformsIn(ctx, `${SKILL}/platforms`), ...platformsIn(ctx, `user/${SKILL}/platforms`)])].sort((a, b) =>
    a.localeCompare(b, "zh"),
  );
  return [GENERAL, ...names].map((name) => {
    const s = !!ctx.fs.stat(shared(name));
    const m = !!ctx.fs.stat(mine(name));
    return { name, general: name === GENERAL, changed: s && m, own: m && !s };
  });
}

/** { name } → its text as the agents read it (the user's copy, else the default) and the etag to save against. */
export function read(input: { name: string }, ctx: Ctx) {
  check(input.name);
  const p = ctx.fs.stat(mine(input.name)) ? mine(input.name) : shared(input.name);
  const st = ctx.fs.stat(p);
  if (!st) throw new Error(`没有「${input.name}」的写法`);
  return { name: input.name, text: ctx.fs.read(p), etag: st.etag, changed: p.startsWith("user/") && !!ctx.fs.stat(shared(input.name)) };
}

/** { name, text, etag? } → saved into the user's copy (the default stays as shipped; a new name is a new platform). A stale etag is refused. */
export function save(input: { name: string; text: string; etag?: string }, ctx: Ctx) {
  check(input.name);
  if (!input.text?.trim()) throw new Error("写法不能是空的；不要这个平台就删掉它");
  const now = ctx.fs.stat(mine(input.name)) ?? ctx.fs.stat(shared(input.name)); // none: a new platform
  if (now && input.etag && input.etag !== now.etag) throw new Error("这份写法在别处被改过了（可能是 AI 刚记了偏好）：重新打开再改");
  return ctx.fs.write(mine(input.name), input.text);
}

/** Back to the panel's default: { name } — the user's copy goes to the Trash. */
export function reset(input: { name: string }, ctx: Ctx) {
  check(input.name);
  if (!ctx.fs.stat(shared(input.name))) throw new Error("这是你自己加的平台，没有默认的可以恢复");
  if (ctx.fs.stat(mine(input.name))) ctx.fs.trash(mine(input.name));
  return read(input, ctx);
}

/** A platform of the user's own: { name } → platforms/<name>.md with a starting outline. */
export function add(input: { name: string }, ctx: Ctx) {
  const name = (input.name ?? "").trim();
  check(name);
  if (name === GENERAL || ctx.fs.stat(mine(name)) || ctx.fs.stat(shared(name))) throw new Error(`已经有「${name}」了`);
  ctx.fs.write(mine(name), `# ${name}\n\n## 格式\n\n- （标题、正文、话题的长度，图片 / 视频的尺寸）\n\n## 写法\n\n- \n\n## 我的偏好\n\n- \n`);
  return read({ name }, ctx);
}

/** Deletes a platform the user added: { name } (the panel's own can only be reset). */
export function remove(input: { name: string }, ctx: Ctx) {
  check(input.name);
  if (ctx.fs.stat(shared(input.name))) throw new Error("这是面板自带的平台，只能恢复默认，不能删");
  if (ctx.fs.stat(mine(input.name))) ctx.fs.trash(mine(input.name));
}
