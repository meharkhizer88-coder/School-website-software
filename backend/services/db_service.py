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
            """
        )
        conn.commit()


def seed_data() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        has_students = cur.execute("SELECT COUNT(*) FROM students").fetchone()[0]
        if has_students:
            return
        now = datetime.utcnow().isoformat()
        cur.execute(
            "INSERT INTO students (name,father_name,phone,class_name,address,admission_date,notes,created_at) VALUES (?,?,?,?,?,?,?,?)",
            ("Ali Khan", "Mr Khan", "+100000", "8", "Street 1", now[:10], "", now),
        )
        cur.execute(
            "INSERT INTO staff (name,role,salary,joining_date,phone,status,created_at) VALUES (?,?,?,?,?,?,?)",
            ("Ayesha Malik", "Teacher", 1800, now[:10], "+200000", "Active", now),
        )
        cur.execute(
            "INSERT INTO fees (student_id,amount,method,payment_date,month) VALUES (?,?,?,?,?)",
            (1, 120, "Cash", now[:10], now[:7]),
        )
        cur.execute(
            "INSERT INTO expenses (title,amount,category,expense_date,description) VALUES (?,?,?,?,?)",
            ("Utilities", 300, "Operations", now[:10], "Monthly utilities"),
        )
        cur.execute(
            "INSERT INTO activities (action,entity,entity_id,created_at) VALUES (?,?,?,?)",
            ("seed", "system", "0", now),
        )
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
        }
        cur.execute("INSERT INTO app_settings(key, value) VALUES (?,?)", ("system", json.dumps(settings_payload)))
        conn.commit()


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
