const API_BASE = "https://api.cloudflare.com/client/v4";

async function requestCloudflare(pathname, { body, method = "GET", token } = {}) {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { success: false, errors: [{ message: text || "Cloudflare 返回了非 JSON 响应" }] };
  }

  if (!response.ok || payload.success === false) {
    const detail = Array.isArray(payload.errors)
      ? payload.errors.map((item) => item.message || JSON.stringify(item)).join(" | ")
      : `HTTP ${response.status}`;
    throw new Error(detail || `Cloudflare API 请求失败 (${response.status})`);
  }

  return payload.result;
}

export async function listZones(token) {
  let page = 1;
  const zones = [];

  while (true) {
    const result = await requestCloudflare(`/zones?page=${page}&per_page=50`, { token });
    const items = Array.isArray(result) ? result : result?.result || [];
    if (Array.isArray(items)) {
      zones.push(...items);
    }
    if (!Array.isArray(items) || items.length < 50) {
      break;
    }
    page += 1;
  }

  return zones
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      status: zone.status,
      paused: Boolean(zone.paused),
      type: zone.type || "full",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function listRoutingRules(token, zoneId) {
  let page = 1;
  const rules = [];

  while (true) {
    const result = await requestCloudflare(
      `/zones/${zoneId}/email/routing/rules?page=${page}&per_page=50`,
      { token },
    );
    const items = Array.isArray(result) ? result : result?.result || [];
    if (Array.isArray(items)) {
      rules.push(...items);
    }
    if (!Array.isArray(items) || items.length < 50) {
      break;
    }
    page += 1;
  }

  return rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    enabled: Boolean(rule.enabled),
    priority: Number(rule.priority || 0),
    matchers: Array.isArray(rule.matchers) ? rule.matchers : [],
    actions: Array.isArray(rule.actions) ? rule.actions : [],
    address:
      (Array.isArray(rule.matchers)
        ? rule.matchers.find((matcher) => matcher.field === "to" && matcher.type === "literal")?.value
        : "") || "",
    destinations: Array.isArray(rule.actions)
      ? rule.actions
          .filter((action) => action.type === "forward")
          .flatMap((action) => action.value || [])
      : [],
  }));
}

export function buildRoutingRuleBody({ address, destinationEmail, enabled = true, name, priority = 0 }) {
  return {
    name: name || address,
    enabled,
    priority,
    matchers: [
      {
        type: "literal",
        field: "to",
        value: address,
      },
    ],
    actions: [
      {
        type: "forward",
        value: [destinationEmail],
      },
    ],
  };
}

export async function createRoutingRule(token, zoneId, { address, destinationEmail, enabled = true }) {
  return requestCloudflare(`/zones/${zoneId}/email/routing/rules`, {
    method: "POST",
    token,
    body: buildRoutingRuleBody({ address, destinationEmail, enabled }),
  });
}

export async function deleteRoutingRule(token, zoneId, ruleId) {
  return requestCloudflare(`/zones/${zoneId}/email/routing/rules/${ruleId}`, {
    method: "DELETE",
    token,
  });
}

export async function getRoutingRule(token, zoneId, ruleId) {
  return requestCloudflare(`/zones/${zoneId}/email/routing/rules/${ruleId}`, {
    method: "GET",
    token,
  });
}

export async function updateRoutingRule(token, zoneId, ruleId, body) {
  return requestCloudflare(`/zones/${zoneId}/email/routing/rules/${ruleId}`, {
    method: "PUT",
    token,
    body,
  });
}
