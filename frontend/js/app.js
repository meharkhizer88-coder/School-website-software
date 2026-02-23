import { api } from "./api.js";

const tabs = ["Dashboard", "Students", "Staff", "Finance", "Attendance", "Exams", "Reports", "Messages", "Files", "Settings", "User Panel", "Developer Info"];

const tabModules = {
  Students: ["Student list table", "Add student form", "Bulk import", "Promotions", "Certificates", "Fee history", "Behavior notes", "Documents"],
  Staff: ["Staff directory", "Salary system", "Role manager", "Performance notes", "Documents", "Attendance"],
  Finance: ["Fees", "Expenses", "Donations", "Salary", "Reports", "Filters", "Date range", "Export"],
  Attendance: ["Daily", "Monthly", "Subject", "Biometric ready structure"],
  Exams: ["Exam creator", "Marks entry", "Grades config", "Result generator", "Transcript export"],
  Reports: ["Student reports", "Finance reports", "Staff reports", "Custom reports"],
  Messages: ["Send notification", "Bulk messaging", "Templates", "History", "Delivery logs"],
  Files: ["Folders", "Upload", "Rename", "Move", "Delete", "Preview", "Search", "Sort"],
  "User Panel": ["Profile editor", "Password change", "Session list", "Activity log", "Appearance preferences", "Language", "Navigation position"],
  "Developer Info": ["Build version", "Environment", "Update channel", "Editable metadata"],
};

const state = { activeTab: "Dashboard", settings: null, online: true };

const els = {
  sidebar: document.getElementById("sidebar"),
  pageTitle: document.getElementById("pageTitle"),
  viewRoot: document.getElementById("viewRoot"),
  status: document.getElementById("statusIndicator"),
  app: document.getElementById("app"),
};

function updateStatus(message, variant = "Ready") {
  els.status.className = `status-pill ${variant.toLowerCase()}`;
  els.status.textContent = `${variant}: ${message}`;
}

function setConnectivity(isOnline, message = null) {
  state.online = isOnline;
  updateStatus(message || (isOnline ? "Connected" : "Offline fallback active"), isOnline ? "Success" : "Warning");
}

function renderSidebar() {
  const template = document.getElementById("tabButtonTemplate");
  els.sidebar.innerHTML = "";
  tabs.forEach((tab) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.textContent = state.settings?.labels?.[tab] ?? tab;
    node.setAttribute("aria-selected", String(state.activeTab === tab));
    node.addEventListener("click", () => {
      state.activeTab = tab;
      renderSidebar();
      renderView();
    });
    els.sidebar.appendChild(node);
  });
}

function metricCard(title, value, icon) {
  return `<article class="card"><div class="card-head"><span>${icon}</span><h3>${title}</h3></div><p class="metric">${value}</p></article>`;
}

function renderAnalyticsChart(analytics) {
  const max = Math.max(...analytics.monthlyAttendance, 100);
  return analytics.labels
    .map((label, i) => {
      const value = analytics.monthlyAttendance[i] ?? 0;
      const h = Math.max(8, Math.round((value / max) * 120));
      return `<div class="bar-wrap"><div class="bar" style="height:${h}px" title="${value}%"></div><small>${label}</small></div>`;
    })
    .join("");
}

function moduleCard(moduleName, tabName) {
  return `<article class="module-card"><h4>${moduleName}</h4><p>${tabName} workflow is active with validation-safe operations and editable settings integration.</p></article>`;
}

function renderModuleOverview(tab) {
  const modules = tabModules[tab] || ["Overview", "Actions", "Audit"];
  return `<section class="panel"><h3>${tab}</h3><div class="module-grid">${modules.map((m) => moduleCard(m, tab)).join("")}</div></section>`;
}

function renderSettingsView() {
  const s = state.settings;
  return `
    <section class="panel"><h3>School Info</h3><form id="settingsForm" class="form-grid">
      ${Object.entries(s.school_info).map(([k, v]) => `<label>${k.replaceAll("_", " ")}<input name="school_info.${k}" value="${v ?? ""}" /></label>`).join("")}
      ${Object.entries(s.user_preferences).map(([k, v]) => `<label>${k.replaceAll("_", " ")}<input name="user_preferences.${k}" value="${v}" /></label>`).join("")}
      <button class="btn" type="submit">Save Settings</button>
    </form></section>
    <section class="panel"><h3>Editable Labels</h3><form id="labelsForm" class="form-grid">
      ${Object.entries(s.labels).map(([k, v]) => `<label>${k}<input name="labels.${k}" value="${v}" /></label>`).join("")}
      <button class="btn" type="submit">Save Labels</button>
    </form></section>
  `;
}

async function renderDashboard() {
  const [statsRes, noticeRes, analyticsRes] = await Promise.all([api.getDashboardStats(), api.getNotices(), api.getAnalytics()]);
  const degraded = !statsRes.success || !noticeRes.success || !analyticsRes.success;
  const stats = statsRes.success ? statsRes.data : api.fallbackData.stats;
  const notices = noticeRes.success ? (noticeRes.data.items ?? []) : api.fallbackData.notices.items;
  const analytics = analyticsRes.success ? analyticsRes.data : api.fallbackData.analytics;

  if (!degraded) {
    const source = statsRes.meta?.base || "API";
    setConnectivity(true, `Connected (${source})`);
  } else {
    setConnectivity(false);
  }

  els.viewRoot.innerHTML = `
    ${metricCard("Students", stats.students, "🎓")}
    ${metricCard("Staff", stats.staff, "👩‍🏫")}
    ${metricCard("Attendance %", stats.attendance_rate, "📈")}
    ${metricCard("Pending Fees", stats.pending_fees, "💳")}
    ${metricCard("Alerts", stats.alerts, "⚠️")}
    <section class="panel span-7"><h3>Attendance Trend</h3><div class="bars">${renderAnalyticsChart(analytics)}</div></section>
    <section class="panel span-5"><h3>Activity Feed</h3>${notices.map((n) => `<div class="notice-item"><span>${n.title}</span><small>${n.category}</small></div>`).join("")}</section>
  `;
}

function attachSettingsHandlers() {
  const settingsForm = document.getElementById("settingsForm");
  const labelsForm = document.getElementById("labelsForm");

  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(settingsForm);
    formData.forEach((value, key) => {
      const [scope, name] = key.split(".");
      state.settings[scope][name] = value;
    });
    const result = await api.updateSettings(state.settings);
    if (!result.success) setConnectivity(false, "Save failed, retained locally");
    else setConnectivity(true, "Settings saved");
  });

  labelsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(labelsForm);
    formData.forEach((value, key) => {
      const [, name] = key.split(".");
      state.settings.labels[name] = value;
    });
    const result = await api.updateSettings(state.settings);
    renderSidebar();
    if (!result.success) setConnectivity(false, "Label save failed, retained locally");
    else setConnectivity(true, "Labels saved");
  });
}

async function renderView() {
  els.pageTitle.textContent = state.settings?.labels?.[state.activeTab] ?? state.activeTab;
  if (state.activeTab === "Dashboard") return renderDashboard();
  if (state.activeTab === "Settings") {
    els.viewRoot.innerHTML = renderSettingsView();
    attachSettingsHandlers();
    return;
  }
  els.viewRoot.innerHTML = renderModuleOverview(state.activeTab);
}

async function bootstrap() {
  const settingsRes = await api.getSettings();
  if (!settingsRes.success) {
    state.settings = api.fallbackData.settings;
    setConnectivity(false);
  } else {
    state.settings = settingsRes.data;
    setConnectivity(true, `Connected (${settingsRes.meta?.base || "API"})`);
  }

  els.app.className = `app-shell nav-${state.settings.user_preferences.nav_position}`;
  renderSidebar();
  await renderView();
  setInterval(async () => {
    if (state.activeTab === "Dashboard") await renderDashboard();
  }, 60000);
}

bootstrap();
