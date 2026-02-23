import { api } from "./api.js";

const tabs = ["Dashboard", "Students", "Staff", "Finance", "Attendance", "Exams", "Reports", "Messages", "Files", "Settings", "User Panel", "Developer Info"];

const state = {
  activeTab: "Dashboard",
  settings: null,
  online: true,
  data: {
    students: [
      { id: crypto.randomUUID(), name: "Ali Khan", grade: "8", guardian: "Mr Khan" },
      { id: crypto.randomUUID(), name: "Sara Noor", grade: "9", guardian: "Mrs Noor" },
    ],
    staff: [
      { id: crypto.randomUUID(), name: "Ayesha Malik", role: "Teacher", salary: 1800 },
      { id: crypto.randomUUID(), name: "Imran Shah", role: "Accountant", salary: 2200 },
    ],
    fees: [
      { id: crypto.randomUUID(), student: "Ali Khan", amount: 120, status: "Paid", month: "2026-01" },
      { id: crypto.randomUUID(), student: "Sara Noor", amount: 120, status: "Pending", month: "2026-01" },
    ],
    salaries: [
      { id: crypto.randomUUID(), staff: "Ayesha Malik", amount: 1800, month: "2026-01", status: "Processed" },
    ],
    documents: [
      { id: crypto.randomUUID(), owner: "Ali Khan", type: "Student", title: "Birth Certificate" },
      { id: crypto.randomUUID(), owner: "Ayesha Malik", type: "Staff", title: "ID Proof" },
    ],
    files: [
      { id: crypto.randomUUID(), name: "Announcements", kind: "Folder" },
      { id: crypto.randomUUID(), name: "fees-report-jan.pdf", kind: "File" },
    ],
  },
};

const els = {
  sidebar: document.getElementById("sidebar"),
  pageTitle: document.getElementById("pageTitle"),
  viewRoot: document.getElementById("viewRoot"),
  status: document.getElementById("statusIndicator"),
  app: document.getElementById("app"),
};

function persistLocalData() {
  localStorage.setItem("schoolLocalModules", JSON.stringify(state.data));
}

function loadLocalData() {
  const raw = localStorage.getItem("schoolLocalModules");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    state.data = { ...state.data, ...parsed };
  } catch {
    // no-op
  }
}

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

function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function renderStudentsTab() {
  const rows = state.data.students.map((s) => `<tr><td>${s.name}</td><td>${s.grade}</td><td>${s.guardian}</td><td><button class="btn btn-danger" data-action="del-student" data-id="${s.id}">Delete</button></td></tr>`);
  return `
    <section class="panel"><h3>Student List</h3>${table(["Name", "Grade", "Guardian", "Actions"], rows)}</section>
    <section class="panel"><h3>Add Student</h3>
      <form id="studentForm" class="form-grid">
        <label>Name<input name="name" required /></label>
        <label>Grade<input name="grade" required /></label>
        <label>Guardian<input name="guardian" required /></label>
        <button class="btn" type="submit">Add Student</button>
      </form>
    </section>
  `;
}

function renderStaffTab() {
  const rows = state.data.staff.map((s) => `<tr><td>${s.name}</td><td>${s.role}</td><td>${s.salary}</td><td><button class="btn btn-danger" data-action="del-staff" data-id="${s.id}">Delete</button></td></tr>`);
  return `
    <section class="panel"><h3>Staff Directory</h3>${table(["Name", "Role", "Salary", "Actions"], rows)}</section>
    <section class="panel"><h3>Add Staff</h3>
      <form id="staffForm" class="form-grid">
        <label>Name<input name="name" required /></label>
        <label>Role<input name="role" required /></label>
        <label>Salary<input name="salary" type="number" min="1" required /></label>
        <button class="btn" type="submit">Add Staff</button>
      </form>
    </section>
  `;
}

function renderFinanceTab() {
  const feeRows = state.data.fees.map((f) => `<tr><td>${f.student}</td><td>${f.amount}</td><td>${f.month}</td><td>${f.status}</td><td><button class="btn btn-danger" data-action="del-fee" data-id="${f.id}">Delete</button></td></tr>`);
  const salaryRows = state.data.salaries.map((s) => `<tr><td>${s.staff}</td><td>${s.amount}</td><td>${s.month}</td><td>${s.status}</td><td><button class="btn btn-danger" data-action="del-salary" data-id="${s.id}">Delete</button></td></tr>`);
  return `
    <section class="panel"><h3>Fees Module</h3>${table(["Student", "Amount", "Month", "Status", "Actions"], feeRows)}
      <form id="feeForm" class="form-grid">
        <label>Student<input name="student" required /></label>
        <label>Amount<input name="amount" type="number" min="1" required /></label>
        <label>Month<input name="month" type="month" required /></label>
        <label>Status<select name="status"><option>Paid</option><option>Pending</option></select></label>
        <button class="btn" type="submit">Add Fee Record</button>
      </form>
    </section>
    <section class="panel"><h3>Salary Module</h3>${table(["Staff", "Amount", "Month", "Status", "Actions"], salaryRows)}
      <form id="salaryForm" class="form-grid">
        <label>Staff<input name="staff" required /></label>
        <label>Amount<input name="amount" type="number" min="1" required /></label>
        <label>Month<input name="month" type="month" required /></label>
        <label>Status<select name="status"><option>Processed</option><option>Pending</option></select></label>
        <button class="btn" type="submit">Add Salary Record</button>
      </form>
    </section>
  `;
}

function renderFilesTab() {
  const rows = state.data.files.map((f) => `<tr><td>${f.name}</td><td>${f.kind}</td><td><button class="btn btn-danger" data-action="del-file" data-id="${f.id}">Delete</button></td></tr>`);
  return `
    <section class="panel"><h3>File Manager</h3>${table(["Name", "Type", "Actions"], rows)}
      <form id="fileForm" class="form-grid">
        <label>Entry name<input name="name" required /></label>
        <label>Type<select name="kind"><option>Folder</option><option>File</option></select></label>
        <button class="btn" type="submit">Create</button>
      </form>
    </section>
  `;
}

function renderDocumentsPanel() {
  const rows = state.data.documents.map((d) => `<tr><td>${d.owner}</td><td>${d.type}</td><td>${d.title}</td><td><button class="btn btn-danger" data-action="del-doc" data-id="${d.id}">Delete</button></td></tr>`);
  return `<section class="panel"><h3>Documents Module</h3>${table(["Owner", "Type", "Title", "Actions"], rows)}
      <form id="docForm" class="form-grid">
        <label>Owner<input name="owner" required /></label>
        <label>Type<select name="type"><option>Student</option><option>Staff</option></select></label>
        <label>Title<input name="title" required /></label>
        <button class="btn" type="submit">Add Document</button>
      </form>
    </section>`;
}

function renderSimpleModules(tab, items) {
  return `<section class="panel"><h3>${tab}</h3><div class="module-grid">${items.map((m) => `<article class="module-card"><h4>${m}</h4><p>${tab} module ready.</p></article>`).join("")}</div></section>`;
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

  if (!degraded) setConnectivity(true, `Connected (${statsRes.meta?.base || "API"})`);
  else setConnectivity(false);

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

function attachCrudHandlers() {
  const formMap = [
    ["studentForm", (f) => state.data.students.push({ id: crypto.randomUUID(), name: f.get("name"), grade: f.get("grade"), guardian: f.get("guardian") })],
    ["staffForm", (f) => state.data.staff.push({ id: crypto.randomUUID(), name: f.get("name"), role: f.get("role"), salary: Number(f.get("salary")) })],
    ["feeForm", (f) => state.data.fees.push({ id: crypto.randomUUID(), student: f.get("student"), amount: Number(f.get("amount")), month: f.get("month"), status: f.get("status") })],
    ["salaryForm", (f) => state.data.salaries.push({ id: crypto.randomUUID(), staff: f.get("staff"), amount: Number(f.get("amount")), month: f.get("month"), status: f.get("status") })],
    ["docForm", (f) => state.data.documents.push({ id: crypto.randomUUID(), owner: f.get("owner"), type: f.get("type"), title: f.get("title") })],
    ["fileForm", (f) => state.data.files.push({ id: crypto.randomUUID(), name: f.get("name"), kind: f.get("kind") })],
  ];

  formMap.forEach(([id, handler]) => {
    const form = document.getElementById(id);
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      handler(formData);
      persistLocalData();
      renderView();
      updateStatus("Module record saved", "Success");
    });
  });

  els.viewRoot.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");
      const map = {
        "del-student": "students",
        "del-staff": "staff",
        "del-fee": "fees",
        "del-salary": "salaries",
        "del-doc": "documents",
        "del-file": "files",
      };
      const key = map[action];
      if (!key) return;
      state.data[key] = state.data[key].filter((row) => row.id !== id);
      persistLocalData();
      renderView();
      updateStatus("Record deleted", "Success");
    });
  });
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

  if (state.activeTab === "Students") els.viewRoot.innerHTML = `${renderStudentsTab()}${renderDocumentsPanel()}`;
  else if (state.activeTab === "Staff") els.viewRoot.innerHTML = `${renderStaffTab()}${renderDocumentsPanel()}`;
  else if (state.activeTab === "Finance") els.viewRoot.innerHTML = renderFinanceTab();
  else if (state.activeTab === "Files") els.viewRoot.innerHTML = renderFilesTab();
  else if (state.activeTab === "Attendance") els.viewRoot.innerHTML = renderSimpleModules("Attendance", ["Daily", "Monthly", "Subject", "Biometric ready structure"]);
  else if (state.activeTab === "Exams") els.viewRoot.innerHTML = renderSimpleModules("Exams", ["Exam creator", "Marks entry", "Grades config", "Result generator", "Transcript export"]);
  else if (state.activeTab === "Reports") els.viewRoot.innerHTML = renderSimpleModules("Reports", ["Student reports", "Finance reports", "Staff reports", "Custom reports"]);
  else if (state.activeTab === "Messages") els.viewRoot.innerHTML = renderSimpleModules("Messages", ["Send notification", "Bulk messaging", "Templates", "History", "Delivery logs"]);
  else if (state.activeTab === "User Panel") els.viewRoot.innerHTML = renderSimpleModules("User Panel", ["Profile editor", "Password change", "Session list", "Activity log", "Appearance", "Language"]);
  else if (state.activeTab === "Developer Info") els.viewRoot.innerHTML = renderSimpleModules("Developer Info", ["Build version", "Environment", "Update channel", "Editable metadata"]);

  attachCrudHandlers();
}

async function bootstrap() {
  loadLocalData();
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
