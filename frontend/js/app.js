import { api } from "./api.js";

const tabs = ["Dashboard", "Students", "Staff", "Attendance", "Finance", "Expenses", "Reports", "Settings"];

const state = {
  activeTab: "Dashboard",
  settings: null,
  studentsQuery: { search: "", sort_by: "id", order: "desc", page: 1, page_size: 10 },
  staffQuery: { search: "", sort_by: "id", order: "desc", page: 1, page_size: 10 },
  feeQuery: { search: "", month: "", sort_by: "id", order: "desc", page: 1, page_size: 10 },
  expenseQuery: { search: "", month: "", sort_by: "id", order: "desc", page: 1, page_size: 10 },
};

const els = {
  sidebar: document.getElementById("sidebar"),
  pageTitle: document.getElementById("pageTitle"),
  viewRoot: document.getElementById("viewRoot"),
  status: document.getElementById("statusIndicator"),
};

const selectionState = { rows: new Set(), lastIndex: null };

function formatHumanDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function enforceDatePickerOnly() {
  document.querySelectorAll('input[type="date"], input[type="month"]').forEach((input) => {
    input.readOnly = true;
    input.addEventListener("keydown", (e) => e.preventDefault());
    input.addEventListener("paste", (e) => e.preventDefault());
  });
}

function showRowDetails(row) {
  const cells = [...row.querySelectorAll("td")].map((td) => td.innerText.trim()).filter(Boolean);
  const wrap = document.createElement("div");
  wrap.className = "modal-backdrop";
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>Row Details</h3><p>${cells.join(" | ")}</p><div class="modal-actions"><button class="btn" id="closeDetail">Close</button></div></div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelector("#closeDetail").addEventListener("click", close);
  wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
}

function attachInteractionEngine() {
  selectionState.rows.clear();
  selectionState.lastIndex = null;

  document.querySelectorAll("tbody tr").forEach((row, index) => {
    row.classList.add("interactive-row");
    row.addEventListener("click", (e) => {
      const rows = [...row.parentElement.querySelectorAll("tr")];
      if (e.shiftKey && selectionState.lastIndex !== null) {
        const [a, b] = [selectionState.lastIndex, index].sort((x, y) => x - y);
        rows.slice(a, b + 1).forEach((r) => { r.classList.add("row-selected"); selectionState.rows.add(r); });
      } else if (e.ctrlKey || e.metaKey) {
        row.classList.toggle("row-selected");
        if (row.classList.contains("row-selected")) selectionState.rows.add(row);
        else selectionState.rows.delete(row);
        selectionState.lastIndex = index;
      } else {
        rows.forEach((r) => r.classList.remove("row-selected"));
        selectionState.rows.clear();
        row.classList.add("row-selected");
        selectionState.rows.add(row);
        selectionState.lastIndex = index;
      }
    });

    row.addEventListener("dblclick", () => showRowDetails(row));

    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      document.querySelectorAll(".context-menu").forEach((m) => m.remove());
      const menu = document.createElement("div");
      menu.className = "context-menu";
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;
      menu.innerHTML = `<button data-cmd="open">Open Details</button><button data-cmd="copy">Copy Row</button><button data-cmd="delete">Delete (if available)</button>`;
      document.body.appendChild(menu);
      const close = () => menu.remove();
      menu.addEventListener("click", async (ev) => {
        const cmd = ev.target.getAttribute("data-cmd");
        if (cmd === "open") showRowDetails(row);
        if (cmd === "copy") navigator.clipboard?.writeText(row.innerText || "");
        if (cmd === "delete") row.querySelector(".btn-danger")?.click();
        close();
      });
      setTimeout(() => document.addEventListener("click", close, { once: true }), 0);
    });
  });

  document.querySelectorAll(".table-wrap").forEach((wrap) => {
    if (wrap.querySelector(".table-export")) return;
    const btn = document.createElement("button");
    btn.className = "btn table-export";
    btn.textContent = "Export Selected CSV";
    btn.addEventListener("click", () => {
      const rows = [...selectionState.rows].map((r) => [...r.querySelectorAll("td")].map((x) => x.innerText.replace(/,/g, " ")).join(","));
      const content = rows.join("\n");
      const blob = new Blob([content], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "selected-rows.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    });
    wrap.parentElement.insertBefore(btn, wrap);
  });
}

function notify(type, message) {
  const host = document.getElementById("toastHost") || (() => {
    const div = document.createElement("div");
    div.id = "toastHost";
    div.className = "toast-host";
    document.body.appendChild(div);
    return div;
  })();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  host.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function setStatus(message, variant = "ready") {
  els.status.className = `status-pill ${variant}`;
  els.status.textContent = `${variant.toUpperCase()}: ${message}`;
}

function renderSidebar() {
  const template = document.getElementById("tabButtonTemplate");
  els.sidebar.innerHTML = `
    <input id="globalSearch" placeholder="Search students/staff/payments/expenses" />
    <div id="globalSearchResults" class="search-results"></div>
  `;
  tabs.forEach((tab) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.textContent = state.settings?.labels?.[tab] ?? tab;
    node.setAttribute("aria-selected", String(state.activeTab === tab));
    node.addEventListener("click", async () => {
      state.activeTab = tab;
      renderSidebar();
      await renderView();
    });
    els.sidebar.appendChild(node);
  });

  const searchInput = document.getElementById("globalSearch");
  const searchBox = document.getElementById("globalSearchResults");
  let t = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      if (!searchInput.value.trim()) {
        searchBox.innerHTML = "";
        return;
      }
      const res = await api.search(searchInput.value.trim());
      if (!res.success) return;
      const { students, staff, payments, expenses } = res.data;
      searchBox.innerHTML = `
        <strong>Students</strong>${students.map((x) => `<div>${x.name}</div>`).join("")}
        <strong>Staff</strong>${staff.map((x) => `<div>${x.name}</div>`).join("")}
        <strong>Payments</strong>${payments.map((x) => `<div>${x.amount} (${x.month})</div>`).join("")}
        <strong>Expenses</strong>${expenses.map((x) => `<div>${x.title} (${x.amount})</div>`).join("")}
      `;
    }, 250);
  });
}

function qs(params) {
  const sp = new URLSearchParams(params);
  return `?${sp.toString()}`;
}

function table(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function paginationBar(meta, key) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.page_size));
  return `<div class="pager"><button class="btn" data-page-key="${key}" data-page="${Math.max(1, meta.page - 1)}">Prev</button><span>Page ${meta.page}/${totalPages}</span><button class="btn" data-page-key="${key}" data-page="${Math.min(totalPages, meta.page + 1)}">Next</button></div>`;
}

function confirmDialog(message) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>Confirm</h3><p>${message}</p><div class="modal-actions"><button class="btn btn-danger" id="confirmYes">Delete</button><button class="btn" id="confirmNo">Cancel</button></div></div>`;
    document.body.appendChild(wrap);
    const close = (val) => { wrap.remove(); resolve(val); };
    wrap.querySelector("#confirmYes").addEventListener("click", () => close(true));
    wrap.querySelector("#confirmNo").addEventListener("click", () => close(false));
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(false); });
    document.addEventListener("keydown", function esc(ev) { if (ev.key === "Escape") { document.removeEventListener("keydown", esc); close(false); } });
  });
}

async function renderDashboard() {
  const res = await api.dashboard();
  if (!res.success) {
    els.viewRoot.innerHTML = `<section class="panel">Dashboard load failed: ${res.message}</section>`;
    setStatus("Dashboard error", "error");
    return;
  }
  const { stats, bar_chart, pie_chart, activities } = res.data;
  els.viewRoot.innerHTML = `
    <article class="card"><h3>Total Students</h3><p class="metric">${stats.total_students}</p></article>
    <article class="card"><h3>Total Staff</h3><p class="metric">${stats.total_staff}</p></article>
    <article class="card"><h3>Total Fees Collected</h3><p class="metric">${stats.total_fees_collected}</p></article>
    <article class="card"><h3>Pending Fees</h3><p class="metric">${stats.pending_fees}</p></article>
    <section class="panel span-7"><h3>Monthly Fee Collection</h3>${table(["Month", "Total"], bar_chart.map((r) => `<tr><td>${r.month}</td><td>${r.total}</td></tr>`))}</section>
    <section class="panel span-5"><h3>Expense Distribution</h3>${table(["Category", "Total"], pie_chart.map((r) => `<tr><td>${r.category}</td><td>${r.total}</td></tr>`))}</section>
    <section class="panel"><h3>Latest Activities</h3>${table(["Action", "Entity", "Created"], activities.map((a) => `<tr><td>${a.action}</td><td>${a.entity}</td><td>${formatHumanDate(a.created_at)}</td></tr>`))}</section>
  `;
  setStatus("Dashboard synced", "success");
  attachInteractionEngine();
}


async function renderStudents() {
  const res = await api.listStudents(qs(state.studentsQuery));
  if (!res.success) return notify("error", res.message);
  const d = res.data;
  els.viewRoot.innerHTML = `
    <section class="panel"><h3>Students</h3>
      <div class="toolbar"><input id="studentSearch" placeholder="Search" value="${state.studentsQuery.search}" /><select id="studentSort"><option value="id">ID</option><option value="name">Name</option><option value="class_name">Class</option></select></div>
      ${table(["ID","Name","Class","Guardian","Phone","Fee Status","Admission Date","Actions"], d.items.map((s) => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.class_name}</td><td>${s.father_name}</td><td>${s.phone}</td><td>${s.fee_status}</td><td>${formatHumanDate(s.admission_date)}</td><td><button class="btn" data-view-student="${s.id}">View</button><button class="btn" data-edit-student='${JSON.stringify(s)}'>Edit</button><button class="btn btn-danger" data-delete-student="${s.id}">Delete</button></td></tr>`))}
      ${paginationBar(d, "students")}
    </section>
    <section class="panel"><h3>Add Student</h3><button class='btn' id='openStudentModal'>Open Add Student Form</button>
      <div id='studentModalHost'></div>
        <label>Name<input name="name" required /></label>
        <label>Father Name<input name="father_name" required /></label>
        <label>Phone<input name="phone" pattern="^[+0-9 -]{7,15}$" required /></label>
        <label>Class<input name="class_name" required /></label>
        <label>Address<input name="address" required /></label>
        <label>Admission Date<input name="admission_date" type="date" /></label>
        <label>Notes<input name="notes" /></label>
    </section>
  `;

  enforceDatePickerOnly();
  attachInteractionEngine();
  document.getElementById("studentSort").value = state.studentsQuery.sort_by;

  const buildStudentModal = () => {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h3>Add Student</h3><form id="studentForm" class="form-grid">
      <label>Name<input name="name" required /></label>
      <label>Father Name<input name="father_name" required /></label>
      <label>Phone<input name="phone" pattern="^[+0-9 -]{7,15}$" required /></label>
      <label>Class<input name="class_name" required /></label>
      <label>Address<input name="address" required /></label>
      <label>Admission Date<input name="admission_date" type="date" /></label>
      <label>Notes<input name="notes" /></label>
      <div class="modal-actions"><button class="btn" type="submit">Add Student</button><button class="btn" type="button" id="closeStudentModal">Cancel</button></div>
    </form></div>`;
    document.body.appendChild(wrap);
    enforceDatePickerOnly();
    const close = () => wrap.remove();
    wrap.querySelector('#closeStudentModal').addEventListener('click', close);
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('#studentForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
      const r = await api.addStudent(payload);
      notify(r.success ? 'success' : 'error', r.message);
      if (r.success) { close(); await renderStudents(); }
    });
  };
  document.getElementById('openStudentModal').addEventListener('click', buildStudentModal);

  document.getElementById("studentSearch").addEventListener("input", async (e) => { state.studentsQuery.search = e.target.value; state.studentsQuery.page = 1; await renderStudents(); });
  document.getElementById("studentSort").addEventListener("change", async (e) => { state.studentsQuery.sort_by = e.target.value; await renderStudents(); });
  els.viewRoot.querySelectorAll("[data-delete-student]").forEach((b) => b.addEventListener("click", async () => {
    if (!(await confirmDialog("Delete this student?"))) return;
    const r = await api.deleteStudent(b.dataset.deleteStudent);
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderStudents();
  }));

  els.viewRoot.querySelectorAll("[data-edit-student]").forEach((b) => b.addEventListener("click", async () => {
    const s = JSON.parse(b.dataset.editStudent);
    const name = prompt("Name", s.name);
    if (!name) return;
    const payload = { ...s, name };
    const r = await api.updateStudent(s.id, payload);
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderStudents();
  }));

  els.viewRoot.querySelectorAll("[data-view-student]").forEach((b) => b.addEventListener("click", async () => {
    const r = await api.studentProfile(b.dataset.viewStudent);
    if (!r.success) return notify("error", r.message);
    const p = r.data;
    els.viewRoot.innerHTML = `<section class="panel"><h3>Student Profile: ${p.personal.name}</h3>
      <p>Class: ${p.personal.class_name}</p><p>Phone: ${p.personal.phone}</p><p>Address: ${p.personal.address}</p>
      <h4>Payment History</h4>${table(["Amount", "Month", "Date"], (p.payments || []).map((f) => `<tr><td>${f.amount}</td><td>${f.month}</td><td>${formatHumanDate(f.payment_date)}</td></tr>`))}
      <h4>Behavior Notes</h4><p>${p.behavior_notes || "None"}</p>
      <h4>Attendance Summary</h4><p>Present: ${p.attendance_summary.present} | Absent: ${p.attendance_summary.absent} | Total: ${p.attendance_summary.total}</p>
      <h4>Class History Log</h4>${table(["Action","Date"], (p.class_history_log || []).map((x)=>`<tr><td>${x.action}</td><td>${formatHumanDate(x.created_at)}</td></tr>`))}
      <button class="btn" id="backStudents">Back</button></section>`;
    attachInteractionEngine();
    document.getElementById("backStudents").addEventListener("click", renderStudents);
  }));

  els.viewRoot.querySelectorAll("[data-page-key='students']").forEach((b) => b.addEventListener("click", async () => {
    state.studentsQuery.page = Number(b.dataset.page);
    await renderStudents();
  }));
}

async function renderStaff() {
  const res = await api.listStaff(qs(state.staffQuery));
  if (!res.success) return notify("error", res.message);
  const d = res.data;
  els.viewRoot.innerHTML = `
    <section class="panel"><h3>Staff</h3>
      <div class="toolbar"><input id="staffSearch" value="${state.staffQuery.search}" placeholder="Search" /></div>
      ${table(["ID","Name","Role","Salary","Joining","Phone","Status","Actions"], d.items.map((s) => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.role}</td><td>${s.salary}</td><td>${formatHumanDate(s.joining_date)}</td><td>${s.phone}</td><td>${s.status}</td><td><button class="btn" data-view-staff="${s.id}">View</button><button class="btn" data-edit-staff='${JSON.stringify(s)}'>Edit</button><button class="btn btn-danger" data-delete-staff="${s.id}">Delete</button></td></tr>`))}
      ${paginationBar(d, "staff")}
    </section>
    <section class="panel"><h3>Add Staff</h3><form id="staffForm" class="form-grid">
      <label>Name<input name="name" required /></label><label>Role<input name="role" required /></label>
      <label>Salary<input name="salary" type="number" min="1" required /></label><label>Joining Date<input name="joining_date" type="date" required /></label>
      <label>Phone<input name="phone" pattern="^[+0-9 -]{7,15}$" required /></label>
      <button class="btn" type="submit">Add Staff</button></form></section>
  `;
  enforceDatePickerOnly();
  attachInteractionEngine();
  document.getElementById("staffSearch").addEventListener("input", async (e) => { state.staffQuery.search = e.target.value; await renderStaff(); });
  document.getElementById("staffForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await api.addStaff(Object.fromEntries(new FormData(e.currentTarget).entries()));
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderStaff();
  });
  els.viewRoot.querySelectorAll("[data-delete-staff]").forEach((b) => b.addEventListener("click", async () => {
    if (!(await confirmDialog("Delete this staff member?"))) return;
    const r = await api.deleteStaff(b.dataset.deleteStaff);
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderStaff();
  }));
  els.viewRoot.querySelectorAll("[data-edit-staff]").forEach((b) => b.addEventListener("click", async () => {
    const s = JSON.parse(b.dataset.editStaff);
    const name = prompt("Name", s.name);
    if (!name) return;
    const r = await api.updateStaff(s.id, { ...s, name });
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderStaff();
  }));
  els.viewRoot.querySelectorAll("[data-view-staff]").forEach((b) => b.addEventListener("click", async () => {
    const r = await api.staffProfile(b.dataset.viewStaff);
    if (!r.success) return notify("error", r.message);
    const s = r.data;
    els.viewRoot.innerHTML = `<section class='panel'><h3>Staff Profile: ${s.details.name}</h3><p>Role: ${s.details.role}</p><p>Salary: ${s.details.salary}</p><p>Phone: ${s.details.phone}</p><p>Status: ${s.details.status}</p><h4>Salary Payment History</h4>${table(["Amount","Date","Note"], (s.salary_history||[]).map((x)=>`<tr><td>${x.amount}</td><td>${formatHumanDate(x.date)}</td><td>${x.note}</td></tr>`))}<h4>Performance Notes</h4>${table(["Action","Date"], (s.performance_notes||[]).map((x)=>`<tr><td>${x.action}</td><td>${formatHumanDate(x.created_at)}</td></tr>`))}<h4>Attendance Record</h4><p>${(s.attendance_record||[]).length} records</p><button class='btn' id='backStaff'>Back</button></section>`;
    document.getElementById("backStaff").addEventListener("click", renderStaff);
  }));
  els.viewRoot.querySelectorAll("[data-page-key='staff']").forEach((b) => b.addEventListener("click", async () => { state.staffQuery.page = Number(b.dataset.page); await renderStaff(); }));
}

async function renderAttendance() {
  const students = await api.listStudents(qs({ page: 1, page_size: 200 }));
  if (!students.success) return notify("error", students.message);
  const options = [...new Set(students.data.items.map((s) => s.class_name))].map((c) => `<option>${c}</option>`).join("");
  els.viewRoot.innerHTML = `<section class='panel'><h3>Attendance</h3><form id='attendanceForm' class='form-grid'><label>Class<select name='class_name'>${options}</select></label><label>Date<input type='date' name='attendance_date' required /></label><button class='btn' type='button' id='markAllPresent'>Mark All Present</button><button class='btn' type='submit'>Save Attendance</button></form><div id='attendanceList'></div></section>`;
  enforceDatePickerOnly();
  const listEl = document.getElementById("attendanceList");
  const renderList = () => {
    const selected = document.querySelector("select[name='class_name']").value;
    const rows = students.data.items.filter((s) => s.class_name === selected).map((s) => `<tr><td>${s.name}</td><td><select data-att='${s.id}'><option value='Present'>Present</option><option value='Absent'>Absent</option></select></td></tr>`);
    listEl.innerHTML = table(["Student", "Status"], rows);
  };
  renderList();
  document.querySelector("select[name='class_name']").addEventListener("change", renderList);
  document.getElementById("markAllPresent").addEventListener("click", () => document.querySelectorAll("[data-att]").forEach((el) => { el.value = "Present"; }));
  document.getElementById("attendanceForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const records = [...document.querySelectorAll("[data-att]")].map((el) => ({ student_id: Number(el.dataset.att), status: el.value }));
    const r = await api.saveAttendance({ class_name: fd.get("class_name"), attendance_date: fd.get("attendance_date"), records });
    notify(r.success ? "success" : "error", r.message);
  });
}

async function renderFinance() {
  const students = await api.listStudents(qs({ page: 1, page_size: 200 }));
  const fees = await api.listFees(qs(state.feeQuery));
  if (!students.success || !fees.success) return notify("error", "Finance load failed");
  const studentOpts = students.data.items.map((s) => `<option value='${s.id}'>${s.name}</option>`).join("");
  els.viewRoot.innerHTML = `<section class='panel'><h3>Fee Records</h3><input id='feeSearch' value='${state.feeQuery.search}' placeholder='Search student'/>${table(["ID","Student","Amount","Method","Date","Month","Actions"], fees.data.items.map((f) => `<tr><td>${f.id}</td><td>${f.student_name}</td><td>${f.amount}</td><td>${f.method}</td><td>${formatHumanDate(f.payment_date)}</td><td>${f.month}</td><td><button class='btn btn-danger' data-delete-fee='${f.id}'>Delete</button></td></tr>`))}${paginationBar(fees.data,'fees')}</section>
  <section class='panel'><h3>Payment Entry</h3><form id='feeForm' class='form-grid'><label>Student<select name='student_id'>${studentOpts}</select></label><label>Amount<input name='amount' type='number' min='1' required/></label><label>Payment method<select name='method'><option>Cash</option><option>Bank</option><option>Online</option></select></label><label>Date<input name='payment_date' type='date' required/></label><label>Month<input name='month' type='month' required/></label><button class='btn' type='submit'>Save Payment</button></form></section>
  <section class='panel'><h3>Pending Fees</h3><p>Calculated in dashboard stat "Pending Fees" and updated after payments.</p></section>`;

  enforceDatePickerOnly();
  attachInteractionEngine();
  document.getElementById("feeSearch").addEventListener("input", async (e) => { state.feeQuery.search = e.target.value; state.feeQuery.page = 1; await renderFinance(); });
  document.getElementById("feeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await api.addFee(Object.fromEntries(new FormData(e.currentTarget).entries()));
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderFinance();
  });
  els.viewRoot.querySelectorAll("[data-delete-fee]").forEach((b) => b.addEventListener("click", async () => {
    if (!(await confirmDialog("Delete fee record?"))) return;
    const r = await api.deleteFee(b.dataset.deleteFee);
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderFinance();
  }));
  els.viewRoot.querySelectorAll("[data-page-key='fees']").forEach((b) => b.addEventListener("click", async () => { state.feeQuery.page = Number(b.dataset.page); await renderFinance(); }));
}

async function renderExpenses() {
  const res = await api.listExpenses(qs(state.expenseQuery));
  if (!res.success) return notify("error", res.message);
  const total = res.data.items.reduce((a, b) => a + Number(b.amount), 0);
  els.viewRoot.innerHTML = `<section class='panel'><h3>Expenses</h3><input id='expSearch' value='${state.expenseQuery.search}' placeholder='Search title/category'/>${table(["Title","Amount","Category","Date","Description","Actions"], res.data.items.map((e) => `<tr><td>${e.title}</td><td>${e.amount}</td><td>${e.category}</td><td>${formatHumanDate(e.expense_date)}</td><td>${e.description}</td><td><button class='btn btn-danger' data-delete-exp='${e.id}'>Delete</button></td></tr>`))}${paginationBar(res.data,'expenses')}<p>Total (current page): ${total}</p></section>
  <section class='panel'><h3>Add Expense</h3><form id='expenseForm' class='form-grid'><label>Title<input name='title' required/></label><label>Amount<input type='number' name='amount' min='1' required/></label><label>Category<input name='category' required/></label><label>Date<input type='date' name='expense_date' required/></label><label>Description<input name='description'/></label><button class='btn' type='submit'>Record Expense</button></form></section>`;
  enforceDatePickerOnly();
  attachInteractionEngine();
  document.getElementById("expSearch").addEventListener("input", async (e) => { state.expenseQuery.search = e.target.value; await renderExpenses(); });
  document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const r = await api.addExpense(Object.fromEntries(new FormData(e.currentTarget).entries()));
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderExpenses();
  });
  els.viewRoot.querySelectorAll("[data-delete-exp]").forEach((b) => b.addEventListener("click", async () => {
    if (!(await confirmDialog("Delete expense?"))) return;
    const r = await api.deleteExpense(b.dataset.deleteExp);
    notify(r.success ? "success" : "error", r.message);
    if (r.success) await renderExpenses();
  }));
  els.viewRoot.querySelectorAll("[data-page-key='expenses']").forEach((b) => b.addEventListener("click", async () => { state.expenseQuery.page = Number(b.dataset.page); await renderExpenses(); }));
}

async function renderReports() {
  const types = ["students", "fees", "expenses", "staff"];
  attachInteractionEngine();
  els.viewRoot.innerHTML = `<section class='panel'><h3>Reports</h3>${types.map((t) => `<div class='report-row'><span>${t.toUpperCase()} Report</span><a class='btn' href='${api.reportCsv(t)}' target='_blank'>CSV</a><a class='btn' href='${api.reportPdf(t)}' target='_blank'>PDF</a></div>`).join("")}</section>`;
}

async function renderSettings() {
  const s = state.settings;
  enforceDatePickerOnly();
  els.viewRoot.innerHTML = `<section class='panel'><h3>User Settings</h3><form id='settingsForm' class='form-grid'>
      ${Object.entries(s.school_info).map(([k, v]) => `<label>${k}<input name='school_info.${k}' value='${v ?? ""}' /></label>`).join("")}
      ${Object.entries(s.user_preferences).map(([k, v]) => `<label>${k}<input name='user_preferences.${k}' value='${v}' /></label>`).join("")}
      <button class='btn' type='submit'>Save</button>
    </form></section>
    <section class='panel'><h3>Developer Info</h3><form id='devForm' class='form-grid'>
      <label>company<input name='dev.company' value='${s.dev?.company ?? ""}' /></label>
      <label>phone<input name='dev.phone' value='${s.dev?.phone ?? ""}' /></label>
      <label>email<input name='dev.email' value='${s.dev?.email ?? ""}' /></label>
      <label>address<input name='dev.address' value='${s.dev?.address ?? ""}' /></label>
      <label>notes<input name='dev.notes' value='${s.dev?.notes ?? ""}' /></label>
      <button class='btn' type='submit'>Save Developer Info</button>
    </form></section>`;

  const saveAll = async () => {
    const r = await api.updateSettings(state.settings);
    notify(r.success ? "success" : "error", r.message);
    if (r.success) renderSidebar();
  };

  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.forEach((v, k) => {
      const [scope, key] = k.split(".");
      state.settings[scope][key] = v;
    });
    await saveAll();
  });

  document.getElementById("devForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    state.settings.dev = state.settings.dev || {};
    const fd = new FormData(e.currentTarget);
    fd.forEach((v, k) => {
      const [, key] = k.split(".");
      state.settings.dev[key] = v;
    });
    await saveAll();
  });
}

async function renderView() {
  els.pageTitle.textContent = state.activeTab;
  const mapping = {
    Dashboard: renderDashboard,
    Students: renderStudents,
    Staff: renderStaff,
    Attendance: renderAttendance,
    Finance: renderFinance,
    Expenses: renderExpenses,
    Reports: renderReports,
    Settings: renderSettings,
  };
  await mapping[state.activeTab]();
}

async function bootstrap() {
  const settingsRes = await api.getSettings();
  if (!settingsRes.success) {
    setStatus("Settings load failed", "warning");
    state.settings = { school_info: {}, user_preferences: {}, labels: {} };
  } else {
    state.settings = settingsRes.data;
    setStatus(`Connected (${settingsRes.meta?.base || "api"})`, "success");
  }
  renderSidebar();
  await renderView();
  setInterval(async () => {
    if (state.activeTab === "Dashboard") await renderDashboard();
  }, 15000);
}


bootstrap();
