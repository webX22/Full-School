import { db } from "hatchable";
import { ensure, verify, sign, check } from "lib/core.js";
import A from "lib/routes_a.js";
import B2 from "lib/routes_b.js";

export const access = "public";

export default async function (req, res) {
  const send = (d, s = 200) => { res.status(s).json(d); return 1; };
  try {
    await ensure();
    const q = (s, p = []) => db.query(s, p).then(r => r.rows);
    const path = req.params.path || [], [a, b, c] = path, m = req.method, B = req.body || {};
    if (a === "login" && m === "POST") {
      const [u] = await q("SELECT * FROM users WHERE email=lower($1)", [B.email || ""]);
      if (!u || !(await verify(B.password || "", u.password_hash))) return send({ error: "Invalid email or password" }, 401);
      const token = await sign({ id: u.id, role: u.role });
      res.cookie("sms", token, { httpOnly: true, path: "/", maxAge: 604800 });
      await q("INSERT INTO audit_logs(user_id,action) VALUES($1,'Logged in')", [u.id]);
      return send({ token });
    }
    if (a === "logout") { res.cookie("sms", "", { path: "/", maxAge: 0 }); return send({ ok: 1 }); }
    const tok = await check((req.headers.authorization || "").replace(/^Bearer /, "") || req.cookies?.sms);
    const U = tok && (await q("SELECT id,name,email,role,profile_pic,(SELECT department FROM staff WHERE user_id=users.id) dept FROM users WHERE id=$1", [tok.id]))[0];
    if (!U) return send({ error: "Not authenticated" }, 401);
    const is = (...r) => r.includes(U.role);
    const no = () => send({ error: "Forbidden" }, 403);
    const log = (u, ac) => q("INSERT INTO audit_logs(user_id,action) VALUES($1,$2)", [u.id, ac]);
    if (a === "me") return send({ user: U });
    const x = { req, res, a, b, c, m, B, U, q, send, no, is, log, path, Q: req.query || {} };
    if ((await A(x)) || (await B2(x))) return;
    send({ error: "Not found" }, 404);
  } catch (e) { send({ error: e.message }, 500); }
}