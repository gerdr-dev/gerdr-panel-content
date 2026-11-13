// "我的定位": what every piece is written from.

import { loadProfile, PROFILE_FIELDS, saveProfile, type Profile } from "./_store";

/** The positioning and its fields (label, hint) for the page. */
export function get(_: unknown, ctx: Ctx) {
  return { profile: loadProfile(ctx), fields: PROFILE_FIELDS };
}

/** Saves it: { profile } (only the known fields are kept). */
export function save(input: { profile: Profile }, ctx: Ctx) {
  const p: Profile = {};
  for (const f of PROFILE_FIELDS) {
    const v = input.profile?.[f.key];
    if (typeof v === "string" && v.trim()) p[f.key] = v.trim();
  }
  saveProfile(ctx, p);
  return p;
}
