import { createRoutingRule } from "../../src/cloudflare.js";

function normalizeList(input) {
  if (!input) return [];
  return Array.from(
    new Set(
      String(input)
        .split(/[\n,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function randomLocalPart(length = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function createLocalParts(body) {
  if (body.mode === "manual") {
    const parts = normalizeList(body.manualInput);
    if (parts.length === 0) throw new Error("手动模式下请至少输入一个 local-part 或完整邮箱");
    return parts;
  }
  const count = Number(body.count || 0);
  const start = Number(body.start || 1);
  if (!Number.isInteger(count) || count <= 0) throw new Error("批量模式下 count 必须是正整数");
  if (!Number.isInteger(start) || start <= 0) throw new Error("批量模式下 start 必须是正整数");
  const prefix = String(body.prefix || "").trim();
  return Array.from({ length: count }, (_, i) => (prefix ? `${prefix}${start + i}` : randomLocalPart()));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = req.headers["x-cf-token"];
  if (!token) {
    return res.status(401).json({ ok: false, error: "请先在配置区保存 Cloudflare API Token" });
  }

  const body = req.body || {};
  const destinationEmail = String(body.destinationEmail || "").trim();
  if (!destinationEmail) {
    return res.status(400).json({ ok: false, error: "缺少 destinationEmail" });
  }

  const targets = Array.isArray(body.targets)
    ? body.targets
        .map((item) => ({ zoneId: String(item.zoneId || "").trim(), domain: String(item.domain || "").trim() }))
        .filter((item) => item.zoneId && item.domain)
    : [];

  if (targets.length === 0) {
    return res.status(400).json({ ok: false, error: "请先至少选择一个域名" });
  }

  let localParts;
  try {
    localParts = createLocalParts(body);
  } catch (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }

  const enabled = body.enabled !== false;
  const delayMs = Math.max(0, Number(body.delayMs ?? 0));

  const results = [];
  for (const target of targets) {
    for (const part of localParts) {
      const address = part.includes("@") ? part : `${part}@${target.domain}`;
      try {
        const rule = await createRoutingRule(token, target.zoneId, { address, destinationEmail, enabled });
        results.push({ zoneId: target.zoneId, zoneName: target.domain, address, status: "created", ruleId: rule.id || "", message: "" });
      } catch (err) {
        results.push({ zoneId: target.zoneId, zoneName: target.domain, address, status: "failed", ruleId: "", message: err.message });
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  return res.status(200).json({
    ok: true,
    summary: {
      total: results.length,
      created: results.filter((r) => r.status === "created").length,
      failed: results.filter((r) => r.status === "failed").length,
    },
    results,
  });
}
