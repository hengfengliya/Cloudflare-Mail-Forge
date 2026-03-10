// Local development server — mirrors the Vercel api/ functions.
// Token is read from the X-CF-Token request header (same as Vercel).
// Config persistence is handled by the browser (localStorage); this
// server only keeps env-var defaults for convenience.

import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createRoutingRule,
  deleteRoutingRule,
  getRoutingRule,
  listRoutingRules,
  listZones,
  updateRoutingRule,
} from "./src/cloudflare.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3042);

const MIME = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message) {
  sendJson(res, status, { ok: false, error: message });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch {
    throw new Error("请求体不是合法 JSON");
  }
}

function requireToken(req) {
  const token = (req.headers["x-cf-token"] || "").trim();
  if (!token) throw new Error("请先在配置区保存 Cloudflare API Token");
  return token;
}

function normalizeList(input) {
  if (!input) return [];
  return Array.from(
    new Set(String(input).split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean)),
  );
}

function randomLocalPart(len = 8) {
  const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: len }, () => abc[Math.floor(Math.random() * abc.length)]).join("");
}

function createLocalParts(body) {
  if (body.mode === "manual") {
    const parts = normalizeList(body.manualInput);
    if (!parts.length) throw new Error("手动模式下请至少输入一个 local-part 或完整邮箱");
    return parts;
  }
  const count = Number(body.count || 0);
  const start = Number(body.start || 1);
  if (!Number.isInteger(count) || count <= 0) throw new Error("批量模式下 count 必须是正整数");
  if (!Number.isInteger(start) || start <= 0) throw new Error("批量模式下 start 必须是正整数");
  const prefix = String(body.prefix || "").trim();
  return Array.from({ length: count }, (_, i) => (prefix ? `${prefix}${start + i}` : randomLocalPart()));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function handleApi(req, res, url) {
  try {
    // Health
    if (req.method === "GET" && url.pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, host: HOST, port: PORT, now: new Date().toISOString() });
    }

    // Config — env-var defaults on GET, no-op echo on PUT
    if (url.pathname === "/api/config") {
      if (req.method === "GET") {
        return sendJson(res, 200, {
          ok: true,
          config: {
            token: process.env.CF_TOKEN || "",
            destinationEmail: process.env.CF_DESTINATION || "",
            defaultPrefix: process.env.CF_DEFAULT_PREFIX || "",
            defaultCount: Number(process.env.CF_DEFAULT_COUNT || 5),
            defaultStart: Number(process.env.CF_DEFAULT_START || 1),
            delayMs: Number(process.env.CF_DELAY_MS || 0),
            selectedZoneIds: [],
          },
        });
      }
      if (req.method === "PUT") {
        const body = await readBody(req);
        return sendJson(res, 200, { ok: true, config: body });
      }
    }

    // Zones
    if (req.method === "GET" && url.pathname === "/api/zones") {
      const token = requireToken(req);
      const zones = await listZones(token);
      return sendJson(res, 200, { ok: true, zones });
    }

    // Rules — list
    if (req.method === "GET" && url.pathname === "/api/rules") {
      const zoneId = url.searchParams.get("zoneId");
      if (!zoneId) return sendError(res, 400, "缺少 zoneId");
      const token = requireToken(req);
      const rules = await listRoutingRules(token, zoneId);
      return sendJson(res, 200, { ok: true, rules });
    }

    // Rules — batch create
    if (req.method === "POST" && url.pathname === "/api/rules/batch") {
      const token = requireToken(req);
      const body = await readBody(req);
      const destinationEmail = String(body.destinationEmail || "").trim();
      if (!destinationEmail) return sendError(res, 400, "缺少 destinationEmail");
      const targets = Array.isArray(body.targets)
        ? body.targets.map((t) => ({ zoneId: String(t.zoneId || "").trim(), domain: String(t.domain || "").trim() })).filter((t) => t.zoneId && t.domain)
        : [];
      if (!targets.length) return sendError(res, 400, "请先至少选择一个域名");
      const localParts = createLocalParts(body);
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
      return sendJson(res, 200, {
        ok: true,
        summary: { total: results.length, created: results.filter((r) => r.status === "created").length, failed: results.filter((r) => r.status === "failed").length },
        results,
      });
    }

    // Rules — delete
    if (req.method === "DELETE" && url.pathname === "/api/rules") {
      const token = requireToken(req);
      const body = await readBody(req);
      const zoneId = String(body.zoneId || "").trim();
      const ruleIds = Array.isArray(body.ruleIds) ? body.ruleIds.map(String).filter(Boolean) : [];
      if (!zoneId || !ruleIds.length) return sendError(res, 400, "删除需要 zoneId 和 ruleIds");
      const results = [];
      for (const ruleId of ruleIds) {
        try {
          await deleteRoutingRule(token, zoneId, ruleId);
          results.push({ ruleId, status: "deleted", message: "" });
        } catch (err) {
          results.push({ ruleId, status: "failed", message: err.message });
        }
      }
      return sendJson(res, 200, { ok: true, results });
    }

    // Rules — toggle
    if (req.method === "PATCH" && url.pathname === "/api/rules/toggle") {
      const token = requireToken(req);
      const body = await readBody(req);
      const zoneId = String(body.zoneId || "").trim();
      const ruleId = String(body.ruleId || "").trim();
      const enabled = Boolean(body.enabled);
      if (!zoneId || !ruleId) return sendError(res, 400, "启停需要 zoneId 和 ruleId");
      const current = await getRoutingRule(token, zoneId, ruleId);
      const updated = await updateRoutingRule(token, zoneId, ruleId, {
        actions: current.actions || [],
        enabled,
        matchers: current.matchers || [],
        name: current.name || `rule:${ruleId}`,
        priority: current.priority || 0,
      });
      return sendJson(res, 200, { ok: true, rule: updated });
    }

    sendError(res, 404, "API 路径不存在");
  } catch (err) {
    sendError(res, 500, err.message);
  }
}

async function serveStatic(res, url) {
  const raw = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = path.normalize(raw).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalized);
  if (!filePath.startsWith(PUBLIC_DIR)) return sendError(res, 403, "禁止访问该路径");
  try {
    const content = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(content);
  } catch {
    sendError(res, 404, "页面不存在");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `${HOST}:${PORT}`}`);
  if (url.pathname.startsWith("/api/")) {
    await handleApi(req, res, url);
    return;
  }
  await serveStatic(res, url);
});

server.listen(PORT, HOST, () => {
  console.log(`Cloudflare Mail Forge  →  http://${HOST}:${PORT}`);
});
