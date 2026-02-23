const DEFAULT_API_BASE = `${window.location.origin}/api`;
const FALLBACK_BASES = ["http://localhost:8000/api", "http://127.0.0.1:8000/api"];

function resolveApiBaseCandidates() {
  const override = window.localStorage.getItem("schoolApiBase");
  const preferred = override || DEFAULT_API_BASE;
  return [preferred, ...FALLBACK_BASES.filter((base) => base !== preferred)];
}

async function fetchFrom(base, path, options) {
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", "x-role": window.localStorage.getItem("schoolRole") || "Super Admin" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || payload.detail || "Request failed");
  }
  return payload;
}

async function request(path, options = {}, retries = 2) {
  const bases = resolveApiBaseCandidates();
  let lastError = new Error("Request failed");
  for (const base of bases) {
    for (let i = 0; i <= retries; i += 1) {
      try {
        const payload = await fetchFrom(base, path, options);
        window.localStorage.setItem("schoolApiBase", base);
        return { ...payload, meta: { base } };
      } catch (error) {
        lastError = error;
      }
    }
  }
  return { success: false, data: {}, message: lastError.message, code: 503 };
}

export const api = {
  login: (username, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  dashboard: () => request("/modules/dashboard"),
  search: (q) => request(`/modules/search?q=${encodeURIComponent(q)}`),
  getSettings: () => request("/modules/settings"),
  updateSettings: (payload) => request("/modules/settings", { method: "PUT", body: JSON.stringify(payload) }),

  listStudents: (params = "") => request(`/modules/students${params}`),
  addStudent: (payload) => request("/modules/students", { method: "POST", body: JSON.stringify(payload) }),
  updateStudent: (id, payload) => request(`/modules/students/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStudent: (id) => request(`/modules/students/${id}`, { method: "DELETE" }),
  studentProfile: (id) => request(`/modules/students/${id}/profile`),

  listStaff: (params = "") => request(`/modules/staff${params}`),
  addStaff: (payload) => request("/modules/staff", { method: "POST", body: JSON.stringify(payload) }),
  updateStaff: (id, payload) => request(`/modules/staff/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  staffProfile: (id) => request(`/modules/staff/${id}/profile`),
  deleteStaff: (id) => request(`/modules/staff/${id}`, { method: "DELETE" }),

  saveAttendance: (payload) => request("/modules/attendance", { method: "POST", body: JSON.stringify(payload) }),

  listFees: (params = "") => request(`/modules/fees${params}`),
  addFee: (payload) => request("/modules/fees", { method: "POST", body: JSON.stringify(payload) }),
  deleteFee: (id) => request(`/modules/fees/${id}`, { method: "DELETE" }),

  listExpenses: (params = "") => request(`/modules/expenses${params}`),
  addExpense: (payload) => request("/modules/expenses", { method: "POST", body: JSON.stringify(payload) }),
  deleteExpense: (id) => request(`/modules/expenses/${id}`, { method: "DELETE" }),

  listFiles: (params = "") => request(`/modules/files${params}`),
  addFile: (payload) => request("/modules/files", { method: "POST", body: JSON.stringify(payload) }),
  deleteFile: (id) => request(`/modules/files/${id}`, { method: "DELETE" }),

  listDocuments: (params = "") => request(`/modules/documents${params}`),
  addDocument: (payload) => request("/modules/documents", { method: "POST", body: JSON.stringify(payload) }),
  deleteDocument: (id) => request(`/modules/documents/${id}`, { method: "DELETE" }),

  reportCsv: (type) => `${window.localStorage.getItem("schoolApiBase") || DEFAULT_API_BASE}/modules/reports/${type}.csv`,
  reportPdf: (type) => `${window.localStorage.getItem("schoolApiBase") || DEFAULT_API_BASE}/modules/reports/${type}.pdf`,
};
