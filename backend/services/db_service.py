import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

DB_PATH = Path("backend/data.db")


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                father_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                class_name TEXT NOT NULL,
                address TEXT NOT NULL,
                admission_date TEXT NOT NULL,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                salary REAL NOT NULL,
                joining_date TEXT NOT NULL,
                phone TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Active',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS fees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                method TEXT NOT NULL,
                payment_date TEXT NOT NULL,
                month TEXT NOT NULL,
                FOREIGN KEY(student_id) REFERENCES students(id)
            );
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                expense_date TEXT NOT NULL,
                description TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_type TEXT NOT NULL,
                owner_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                class_name TEXT NOT NULL,
                attendance_date TEXT NOT NULL,
                status TEXT NOT NULL,
                UNIQUE(student_id, attendance_date),
                FOREIGN KEY(student_id) REFERENCES students(id)
            );
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                entity TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL
            );
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id INTEGER NOT NULL,
                permission_id INTEGER NOT NULL,
                UNIQUE(role_id, permission_id),
                FOREIGN KEY(role_id) REFERENCES roles(id),
                FOREIGN KEY(permission_id) REFERENCES permissions(id)
            );
            """
        )
        conn.commit()


def seed_data() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        settings_payload = {
            "school_info": {
                "school_name": "Global Academy",
                "logo": "",
                "phone": "",
                "email": None,
                "address": "",
                "website": "",
                "registration_no": "",
                "tagline": "Learn. Lead. Succeed.",
                "currency": "USD",
                "timezone": "UTC",
                "language": "en",
            },
            "user_preferences": {"nav_position": "left", "theme": "default", "language": "en"},
            "labels": {
                "Dashboard": "Dashboard",
                "Students": "Students",
                "Staff": "Staff",
                "Attendance": "Attendance",
                "Finance": "Finance",
                "Expenses": "Expenses",
                "Reports": "Reports",
                "Settings": "Settings",
            },
            "dev": {"company": "", "phone": "", "email": "", "address": "", "notes": ""}
        }
        cur.execute("INSERT INTO app_settings(key, value) VALUES (?,?) ON CONFLICT(key) DO NOTHING", ("system", json.dumps(settings_payload)))

        role_names = ["Super Admin", "Admin", "Staff", "Viewer"]
        for r in role_names:
            cur.execute("INSERT INTO roles(name) VALUES (?) ON CONFLICT(name) DO NOTHING", (r,))

        perms = [
            "manage_students","manage_staff","manage_attendance","manage_finance","manage_expenses","view_reports","manage_settings"
        ]
        for code in perms:
            cur.execute("INSERT INTO permissions(code) VALUES (?) ON CONFLICT(code) DO NOTHING", (code,))

        # grant all to Super Admin/Admin, partial to Staff, view only to Viewer
        role_map = {r[1]: r[0] for r in cur.execute("SELECT id,name FROM roles").fetchall()}
        perm_map = {r[1]: r[0] for r in cur.execute("SELECT id,code FROM permissions").fetchall()}
        grants = {
            "Super Admin": perms,
            "Admin": perms,
            "Staff": ["manage_students","manage_attendance","manage_finance","view_reports"],
            "Viewer": ["view_reports"],
        }
        for role, codes in grants.items():
            for code in codes:
                cur.execute(
                    "INSERT INTO role_permissions(role_id, permission_id) VALUES (?,?) ON CONFLICT(role_id, permission_id) DO NOTHING",
                    (role_map[role], perm_map[code]),
                )
        conn.commit()


def has_permission(role: str, permission_code: str) -> bool:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        row = cur.execute(
            """
            SELECT 1 FROM role_permissions rp
            JOIN roles r ON rp.role_id = r.id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE r.name=? AND p.code=?
            """,
            (role, permission_code),
        ).fetchone()
    return bool(row)


@contextmanager
def db_cursor() -> Any:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        yield cur
        conn.commit()
    finally:
        conn.close()


def log_activity(action: str, entity: str, entity_id: str) -> None:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO activities (action,entity,entity_id,created_at) VALUES (?,?,?,?)",
            (action, entity, str(entity_id), datetime.utcnow().isoformat()),
        )
