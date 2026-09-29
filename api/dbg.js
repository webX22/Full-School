import { check } from "lib/core.js";
export const access = "public";
export default async function (req, res) {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "") || req.cookies?.sms;
  let r = null, err = null;
  try { r = await check(t); } catch (e) { err = e.message; }
  res.json({ hdr: Object.keys(req.headers), cookies: Object.keys(req.cookies || {}), hasTok: !!t, r, err });
}