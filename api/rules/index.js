import { deleteRoutingRule, listRoutingRules } from "../../src/cloudflare.js";

export default async function handler(req, res) {
  const token = req.headers["x-cf-token"];
  if (!token) {
    return res.status(401).json({ ok: false, error: "请先在配置区保存 Cloudflare API Token" });
  }

  // GET /api/rules?zoneId=xxx
  if (req.method === "GET") {
    const zoneId = req.query.zoneId;
    if (!zoneId) {
      return res.status(400).json({ ok: false, error: "缺少 zoneId" });
    }
    try {
      const rules = await listRoutingRules(token, zoneId);
      return res.status(200).json({ ok: true, rules });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // DELETE /api/rules  { zoneId, ruleIds[] }
  if (req.method === "DELETE") {
    const body = req.body || {};
    const zoneId = String(body.zoneId || "").trim();
    const ruleIds = Array.isArray(body.ruleIds)
      ? body.ruleIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (!zoneId || ruleIds.length === 0) {
      return res.status(400).json({ ok: false, error: "删除需要 zoneId 和 ruleIds" });
    }

    const results = [];
    for (const ruleId of ruleIds) {
      try {
        await deleteRoutingRule(token, zoneId, ruleId);
        results.push({ ruleId, status: "deleted", message: "" });
      } catch (err) {
        results.push({ ruleId, status: "failed", message: err.message });
      }
    }
    return res.status(200).json({ ok: true, results });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
