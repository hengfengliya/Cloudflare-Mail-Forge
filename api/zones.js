import { listZones } from "../src/cloudflare.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const token = req.headers["x-cf-token"];
  if (!token) {
    return res.status(401).json({ ok: false, error: "请先在配置区保存 Cloudflare API Token" });
  }
  try {
    const zones = await listZones(token);
    return res.status(200).json({ ok: true, zones });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
