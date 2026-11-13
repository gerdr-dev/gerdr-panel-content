// 资料库: one shared folder for material several contents use (photos, logos, reference docs).

import { libraryDir, writeOutside } from "./_store";

/** The library's folder, made the first time it's asked for (with a README so it isn't empty). */
export async function folder(_: unknown, ctx: Ctx) {
  const f = libraryDir(ctx);
  if (!f.exists) {
    await writeOutside(ctx, f.path, "说明.md", "# 资料库\n\n几条内容都会用到的素材放这里：照片、Logo、参考资料。只属于一条内容的东西放在那条内容里。\n");
    libraryDir(ctx);
  }
  return { path: f.path };
}
