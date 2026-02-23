const DEFAULT_API_BASE = `${window.location.origin}/api`;
const FALLBACK_BASES = ["http://localhost:8000/api", "http://127.0.0.1:8000/api"];

function resolveApiBaseCandidates() {
  const override = window.localStorage.getItem("schoolApiBase");
  const preferred = override || DEFAULT_API_BASE;
  return [preferred, ...FALLBACK_BASES.filter((base) => base !== preferred)];
}

const mockSettings = {
  school_info: {
    school_name: "Global Academy",
    logo: "",
    phone: "+1 555-000-1000",
    email: "admin@globalacademy.edu",
    address: "1 Education Square",
    website: "https://globalacademy.edu",
    registration_no: "GA-2026",
    tagline: "Learn. Lead. Succeed.",
    currency: "USD",
    timezone: "UTC",
    language: "en",
  },
  user_preferences: {
    nav_position: "left",
    theme: "default",
    language: "en",
  },
  labels: {
    Dashboard: "Dashboard",
    Students: "Students",
    Staff: "Staff",
    Finance: "Finance",
    Attendance: "Attendance",
    Exams: "Exams",
    Reports: "Reports",
    Messages: "Messages",
    Files: "Files",
    Settings: "Settings",
    "User Panel": "User Panel",
    "Developer Info": "Developer Info",
  },
};

const mockStats = { students: 1240, staff: 124, attendance_rate: 94, pending_fees: 31200, alerts: 8 };
const mockAnalytics = {
  monthlyAttendance: [91, 93, 90, 95, 94, 96],
  feeCollection: [29000, 32000, 30000, 36000, 42000, 44000],
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
};
const mockNotices = {
  items: [
    { id: "n1", title: "Midterm schedule published", category: "Exams" },
    { id: "n2", title: "Fee reminder sent", category: "Finance" },
    { id: "n3", title: "Attendance anomaly detected", category: "Attendance" },
  ],
};

async function fetchFrom(base, path, options) {
  const response = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
}

async function request(path, options = {}, retries = 2) {
  const bases = resolveApiBaseCandidates();
  let lastError = new Error("Request failed");

  for (const base of bases) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const result = await fetchFrom(base, path, options);
        window.localStorage.setItem("schoolApiBase", base);
        return { ...result, meta: { degraded: false, source: "api", base } };
      } catch (error) {
        lastError = error;
      }
    }
  }

  return {
    success: false,
    data: {},
    message: lastError.message || "Unable to connect to server",
    code: 503,
    meta: { degraded: true, source: "fallback" },
  };
}

export const api = {
  login: (username, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  getDashboardStats: () => request("/dashboard/stats"),
  getAnalytics: () => request("/dashboard/analytics"),
  getNotices: () => request("/dashboard/notices"),
  getSettings: () => request("/settings"),
  updateSettings: (payload) => request("/settings", { method: "PUT", body: JSON.stringify(payload) }),
  fallbackData: { settings: mockSettings, stats: mockStats, analytics: mockAnalytics, notices: mockNotices },
};
