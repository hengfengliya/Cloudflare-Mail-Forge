import { getRoutingRule, updateRoutingRule } from "../../src/cloudflare.js";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = req.headers["x-cf-token"];
  if (!token) {
    return res.status(401).json({ ok: false, error: "请先在配置区保存 Cloudflare API Token" });
  }

  const body = req.body || {};
  const zoneId = String(body.zoneId || "").trim();
  const ruleId = String(body.ruleId || "").trim();
  const enabled = Boolean(body.enabled);

  if (!zoneId || !ruleId) {
    return res.status(400).json({ ok: false, error: "启停需要 zoneId 和 ruleId" });
  }

  try {
    const current = await getRoutingRule(token, zoneId, ruleId);
    const updated = await updateRoutingRule(token, zoneId, ruleId, {
      actions: current.actions || [],
      enabled,
      matchers: current.matchers || [],
      name: current.name || `rule:${ruleId}`,
      priority: current.priority || 0,
    });
    return res.status(200).json({ ok: true, rule: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
