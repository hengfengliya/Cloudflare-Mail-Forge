// Config is stored in localStorage ("mf_config") so it works on both
// local Node.js server and Vercel (stateless serverless).
// Every API call passes the token via the X-CF-Token request header.

const CONFIG_KEY = "mf_config";

const DEFAULT_CONFIG = {
  token: "",
  destinationEmail: "",
  defaultPrefix: "",
  defaultCount: 5,
  defaultStart: 1,
  delayMs: 0,
  selectedZoneIds: [],
};

const state = {
  activeZoneId: "",
  batchCreatedCount: 0,
  config: { ...DEFAULT_CONFIG },
  mode: "pattern",
  rules: [],
  selectedRuleIds: new Set(),
  selectedZoneIds: new Set(),
  zones: [],
};

const elements = {
  activeZone: document.querySelector("#active-zone"),
  batchEnabled: document.querySelector("#batchEnabled"),
  batchForm: document.querySelector("#batch-form"),
  batchStart: document.querySelector("#batchStart"),
  batchCount: document.querySelector("#batchCount"),
  batchPrefix: document.querySelector("#batchPrefix"),
  batchTargetHint: document.querySelector("#batch-target-hint"),
  clearLog: document.querySelector("#clear-log"),
  configForm: document.querySelector("#config-form"),
  defaultCount: document.querySelector("#defaultCount"),
  defaultPrefix: document.querySelector("#defaultPrefix"),
  defaultStart: document.querySelector("#defaultStart"),
  delayMs: document.querySelector("#delayMs"),
  deleteSelectedRules: document.querySelector("#delete-selected-rules"),
  destinationEmail: document.querySelector("#destinationEmail"),
  healthBadge: document.querySelector("#health-badge"),
  logList: document.querySelector("#log-list"),
  manualFields: document.querySelector("#manual-fields"),
  manualInput: document.querySelector("#manualInput"),
  modeChips: [...document.querySelectorAll(".mode-chip")],
  patternFields: document.querySelector("#pattern-fields"),
  refreshRules: document.querySelector("#refresh-rules"),
  reloadZones: document.querySelector("#reload-zones"),
  ruleSearch: document.querySelector("#rule-search"),
  rulesBody: document.querySelector("#rules-body"),
  selectAllRules: document.querySelector("#select-all-rules"),
  selectVisibleZones: document.querySelector("#select-visible-zones"),
  statBatchCount: document.querySelector("#stat-batch-count"),
  statRuleCount: document.querySelector("#stat-rule-count"),
  statSelectedCount: document.querySelector("#stat-selected-count"),
  statZoneCount: document.querySelector("#stat-zone-count"),
  token: document.querySelector("#token"),
  zoneList: document.querySelector("#zone-list"),
  zoneMeta: document.querySelector("#zone-meta"),
  zoneSearch: document.querySelector("#zone-search"),
};

// ── Logging ───────────────────────────────────────────────
function log(message, tone = "info") {
  const item = document.createElement("article");
  item.className = `log-entry ${tone}`;
  item.textContent = `[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${message}`;
  elements.logList.prepend(item);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ── API ───────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = state.config?.token || "";
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-CF-Token": token } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

// ── Config (localStorage) ─────────────────────────────────
function readConfigForm() {
  return {
    token: elements.token.value.trim(),
    destinationEmail: elements.destinationEmail.value.trim(),
    defaultPrefix: elements.defaultPrefix.value.trim(),
    defaultCount: Number(elements.defaultCount.value || 5),
    defaultStart: Number(elements.defaultStart.value || 1),
    delayMs: Number(elements.delayMs.value || 0),
    selectedZoneIds: [...state.selectedZoneIds],
  };
}

function fillConfigForm(config) {
  elements.token.value = config.token || "";
  elements.destinationEmail.value = config.destinationEmail || "";
  elements.defaultPrefix.value = config.defaultPrefix || "";
  elements.defaultCount.value = config.defaultCount ?? 5;
  elements.defaultStart.value = config.defaultStart ?? 1;
  elements.delayMs.value = config.delayMs ?? 0;
  elements.batchPrefix.value = config.defaultPrefix || "";
  elements.batchCount.value = config.defaultCount ?? 5;
  elements.batchStart.value = config.defaultStart ?? 1;
}

function loadConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    const config = stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : { ...DEFAULT_CONFIG };
    state.config = config;
    state.selectedZoneIds = new Set(config.selectedZoneIds || []);
    fillConfigForm(config);
    updateStats();
  } catch {
    state.config = { ...DEFAULT_CONFIG };
    state.selectedZoneIds = new Set();
  }
}

function saveConfig(announce = true) {
  const config = readConfigForm();
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable (private browsing edge case)
  }
  state.config = config;
  if (announce) {
    log("控制台配置已保存。", "success");
  }
}

// ── Stats ─────────────────────────────────────────────────
function updateStats() {
  elements.statZoneCount.textContent = String(state.zones.length);
  elements.statSelectedCount.textContent = String(state.selectedZoneIds.size);
  elements.statRuleCount.textContent = String(state.rules.length);
  elements.statBatchCount.textContent = String(state.batchCreatedCount);
}

// ── Zones ─────────────────────────────────────────────────
function visibleZones() {
  const keyword = elements.zoneSearch.value.trim().toLowerCase();
  if (!keyword) return state.zones;
  return state.zones.filter((zone) => zone.name.toLowerCase().includes(keyword));
}

function renderZones() {
  const zones = visibleZones();
  elements.zoneList.innerHTML = "";

  if (zones.length === 0) {
    elements.zoneList.className = "zone-list empty-state";
    elements.zoneList.textContent = "没有匹配到域名。";
    elements.zoneMeta.textContent = "调整搜索词或重新拉取域名。";
    return;
  }

  elements.zoneList.className = "zone-list";
  elements.zoneMeta.textContent = `共 ${state.zones.length} 个域名，当前可见 ${zones.length} 个。`;

  for (const zone of zones) {
    const card = document.createElement("article");
    card.className = `zone-card ${state.selectedZoneIds.has(zone.id) ? "selected" : ""}`;
    card.innerHTML = `
      <div class="zone-card-head">
        <label class="checkbox-line">
          <input type="checkbox" data-zone-check="${zone.id}" ${state.selectedZoneIds.has(zone.id) ? "checked" : ""} />
          <span class="zone-name">${escapeHtml(zone.name)}</span>
        </label>
        <span class="zone-chip">${escapeHtml(zone.status)}</span>
      </div>
      <div class="zone-card-meta">
        <span class="meta-text">${zone.paused ? "已暂停代理" : "代理正常"} · ${escapeHtml(zone.type)}</span>
        <button class="button ghost" type="button" data-zone-inspect="${zone.id}">查看规则</button>
      </div>
    `;
    elements.zoneList.append(card);
  }

  document.querySelectorAll("[data-zone-check]").forEach((input) => {
    input.addEventListener("change", async (event) => {
      const zoneId = event.currentTarget.dataset.zoneCheck;
      if (event.currentTarget.checked) {
        state.selectedZoneIds.add(zoneId);
      } else {
        state.selectedZoneIds.delete(zoneId);
      }
      if (!state.activeZoneId && state.selectedZoneIds.size > 0) {
        state.activeZoneId = [...state.selectedZoneIds][0];
      }
      saveConfig(false);
      renderZones();
      renderZoneSelect();
      updateBatchHint();
      updateStats();
    });
  });

  document.querySelectorAll("[data-zone-inspect]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      state.activeZoneId = event.currentTarget.dataset.zoneInspect;
      renderZoneSelect();
      await loadRules();
    });
  });
}

function renderZoneSelect() {
  const preferred = state.zones.filter((zone) => state.selectedZoneIds.has(zone.id));
  const list = preferred.length > 0 ? preferred : state.zones;

  elements.activeZone.innerHTML = "";
  if (list.length === 0) {
    const option = document.createElement("option");
    option.textContent = "暂无可查询域名";
    option.value = "";
    elements.activeZone.append(option);
    state.activeZoneId = "";
    return;
  }

  if (!list.some((zone) => zone.id === state.activeZoneId)) {
    state.activeZoneId = list[0].id;
  }

  for (const zone of list) {
    const option = document.createElement("option");
    option.value = zone.id;
    option.textContent = zone.name;
    option.selected = zone.id === state.activeZoneId;
    elements.activeZone.append(option);
  }
}

function updateBatchHint() {
  const selected = state.zones.filter((zone) => state.selectedZoneIds.has(zone.id));
  elements.batchTargetHint.textContent =
    selected.length > 0
      ? `将写入 ${selected.length} 个域名: ${selected.map((z) => z.name).join(", ")}`
      : "未选择域名";
}

// ── Rules ─────────────────────────────────────────────────
function filteredRules() {
  const keyword = elements.ruleSearch.value.trim().toLowerCase();
  if (!keyword) return state.rules;
  return state.rules.filter((rule) => {
    const haystack = [rule.address, rule.name, ...(rule.destinations || [])].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });
}

function renderRules() {
  const rules = filteredRules();
  state.selectedRuleIds = new Set([...state.selectedRuleIds].filter((id) => rules.some((r) => r.id === id)));
  elements.rulesBody.innerHTML = "";

  if (!state.activeZoneId) {
    elements.rulesBody.innerHTML = `<tr><td colspan="7" class="empty-cell">先选择一个域名，再查询规则。</td></tr>`;
    updateStats();
    return;
  }

  if (rules.length === 0) {
    elements.rulesBody.innerHTML = `<tr><td colspan="7" class="empty-cell">当前没有匹配到规则。</td></tr>`;
    updateStats();
    return;
  }

  for (const rule of rules) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input type="checkbox" data-rule-check="${rule.id}" ${state.selectedRuleIds.has(rule.id) ? "checked" : ""} /></td>
      <td>
        <div class="rule-address">${escapeHtml(rule.address || "未解析地址")}</div>
        <div class="rule-destinations">${escapeHtml(rule.id)}</div>
      </td>
      <td>${escapeHtml((rule.destinations || []).join(", ") || "-")}</td>
      <td><span class="status-pill ${rule.enabled ? "enabled" : "disabled"}">${rule.enabled ? "启用" : "停用"}</span></td>
      <td>${escapeHtml(rule.name || "-")}</td>
      <td>${escapeHtml(String(rule.priority ?? 0))}</td>
      <td>
        <div class="row-actions">
          <button class="tiny-button ${rule.enabled ? "warn" : "success"}" type="button" data-rule-toggle="${rule.id}" data-enabled="${String(!rule.enabled)}">
            ${rule.enabled ? "停用" : "启用"}
          </button>
          <button class="tiny-button warn" type="button" data-rule-delete="${rule.id}">删除</button>
        </div>
      </td>
    `;
    elements.rulesBody.append(row);
  }

  document.querySelectorAll("[data-rule-check]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const ruleId = event.currentTarget.dataset.ruleCheck;
      if (event.currentTarget.checked) {
        state.selectedRuleIds.add(ruleId);
      } else {
        state.selectedRuleIds.delete(ruleId);
      }
    });
  });

  document.querySelectorAll("[data-rule-toggle]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      await toggleRule(event.currentTarget.dataset.ruleToggle, event.currentTarget.dataset.enabled === "true");
    });
  });

  document.querySelectorAll("[data-rule-delete]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      await deleteRules([event.currentTarget.dataset.ruleDelete]);
    });
  });

  updateStats();
}

// ── API Actions ───────────────────────────────────────────
async function checkHealth() {
  try {
    await request("/api/health");
    elements.healthBadge.textContent = "本地服务正常";
  } catch {
    elements.healthBadge.textContent = "服务异常";
  }
}

async function loadZones() {
  try {
    const data = await request("/api/zones");
    state.zones = data.zones;
    renderZones();
    renderZoneSelect();
    updateBatchHint();
    updateStats();
    log(`已拉取 ${data.zones.length} 个域名。`, "success");
  } catch (error) {
    log(`拉取域名失败: ${error.message}`, "error");
  }
}

async function loadRules() {
  if (!state.activeZoneId) { renderRules(); return; }
  try {
    const data = await request(`/api/rules?zoneId=${encodeURIComponent(state.activeZoneId)}`);
    state.rules = data.rules;
    state.selectedRuleIds.clear();
    renderRules();
    const activeZone = state.zones.find((z) => z.id === state.activeZoneId);
    log(`已加载 ${activeZone?.name || "当前域名"} 的 ${data.rules.length} 条规则。`, "info");
  } catch (error) {
    state.rules = [];
    renderRules();
    log(`查询规则失败: ${error.message}`, "error");
  }
}

async function createBatch(event) {
  event.preventDefault();
  const targets = state.zones
    .filter((zone) => state.selectedZoneIds.has(zone.id))
    .map((zone) => ({ zoneId: zone.id, domain: zone.name }));

  if (targets.length === 0) { log("请先选择至少一个域名。", "error"); return; }

  try {
    const payload = {
      targets,
      destinationEmail: elements.destinationEmail.value.trim(),
      mode: state.mode,
      manualInput: elements.manualInput.value,
      prefix: elements.batchPrefix.value.trim(),
      count: Number(elements.batchCount.value || 0),
      start: Number(elements.batchStart.value || 1),
      enabled: elements.batchEnabled.checked,
      delayMs: Number(elements.delayMs.value || 0),
    };
    const data = await request("/api/rules/batch", { method: "POST", body: JSON.stringify(payload) });
    state.batchCreatedCount = data.summary.created;
    updateStats();
    log(
      `批量创建完成: 成功 ${data.summary.created} 条，失败 ${data.summary.failed} 条。`,
      data.summary.failed > 0 ? "info" : "success",
    );
    if (state.activeZoneId) await loadRules();
  } catch (error) {
    log(`批量创建失败: ${error.message}`, "error");
  }
}

async function toggleRule(ruleId, enabled) {
  try {
    await request("/api/rules/toggle", {
      method: "PATCH",
      body: JSON.stringify({ zoneId: state.activeZoneId, ruleId, enabled }),
    });
    log(`规则 ${ruleId} 已${enabled ? "启用" : "停用"}。`, "success");
    await loadRules();
  } catch (error) {
    log(`切换状态失败: ${error.message}`, "error");
  }
}

async function deleteRules(ruleIds) {
  if (!state.activeZoneId || !ruleIds.length) return;
  try {
    const data = await request("/api/rules", {
      method: "DELETE",
      body: JSON.stringify({ zoneId: state.activeZoneId, ruleIds }),
    });
    const deleted = data.results.filter((r) => r.status === "deleted").length;
    const failed = data.results.filter((r) => r.status === "failed").length;
    log(`删除完成: 成功 ${deleted} 条，失败 ${failed} 条。`, failed > 0 ? "info" : "success");
    await loadRules();
  } catch (error) {
    log(`删除规则失败: ${error.message}`, "error");
  }
}

function switchMode(mode) {
  state.mode = mode;
  elements.patternFields.classList.toggle("hidden", mode !== "pattern");
  elements.manualFields.classList.toggle("hidden", mode !== "manual");
  elements.modeChips.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === mode));
}

// ── Event Bindings ────────────────────────────────────────
elements.configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    saveConfig(true);
    await loadZones();
  } catch (error) {
    log(`保存配置失败: ${error.message}`, "error");
  }
});

elements.reloadZones.addEventListener("click", loadZones);
elements.zoneSearch.addEventListener("input", renderZones);
elements.activeZone.addEventListener("change", async (event) => {
  state.activeZoneId = event.currentTarget.value;
  await loadRules();
});
elements.batchForm.addEventListener("submit", createBatch);
elements.refreshRules.addEventListener("click", loadRules);
elements.ruleSearch.addEventListener("input", renderRules);
elements.selectAllRules.addEventListener("change", (event) => {
  const rules = filteredRules();
  if (event.currentTarget.checked) {
    state.selectedRuleIds = new Set(rules.map((r) => r.id));
  } else {
    state.selectedRuleIds.clear();
  }
  renderRules();
});
elements.deleteSelectedRules.addEventListener("click", async () => {
  await deleteRules([...state.selectedRuleIds]);
});
elements.selectVisibleZones.addEventListener("click", async () => {
  visibleZones().forEach((zone) => state.selectedZoneIds.add(zone.id));
  saveConfig(false);
  renderZones();
  renderZoneSelect();
  updateBatchHint();
  updateStats();
});
elements.clearLog.addEventListener("click", () => {
  elements.logList.innerHTML = "";
  log("日志已清空。", "info");
});
elements.modeChips.forEach((btn) => {
  btn.addEventListener("click", () => switchMode(btn.dataset.mode));
});

// ── Boot ──────────────────────────────────────────────────
async function boot() {
  switchMode("pattern");
  await checkHealth();
  loadConfig();
  if (state.config?.token) {
    await loadZones();
    if (state.selectedZoneIds.size > 0) {
      state.activeZoneId = [...state.selectedZoneIds][0];
      renderZoneSelect();
      await loadRules();
    }
  } else {
    log("尚未配置 Token，先在控制台配置中保存。", "info");
  }
}

boot();
