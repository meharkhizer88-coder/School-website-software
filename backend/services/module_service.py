import json
from datetime import datetime
from typing import Any

from backend.services.db_service import db_cursor, log_activity


ALLOWED_SORT = {
    "students": {"id", "name", "class_name", "admission_date"},
    "staff": {"id", "name", "role", "joining_date", "salary"},
    "fees": {"id", "payment_date", "amount", "month"},
    "expenses": {"id", "expense_date", "amount", "category"},
    "files": {"id", "name", "kind"},
    "documents": {"id", "title", "created_at"},
}


def _paginated(query: str, count_query: str, params: list[Any], page: int, page_size: int) -> dict:
    offset = (page - 1) * page_size
    with db_cursor() as cur:
        total = cur.execute(count_query, params).fetchone()[0]
        rows = [dict(r) for r in cur.execute(f"{query} LIMIT ? OFFSET ?", [*params, page_size, offset]).fetchall()]
    return {"items": rows, "page": page, "page_size": page_size, "total": total}


def list_students(search: str, sort_by: str, order: str, page: int, page_size: int) -> dict:
    sort_col = sort_by if sort_by in ALLOWED_SORT["students"] else "id"
    direction = "DESC" if order.lower() == "desc" else "ASC"
    q = "%" + search + "%"
    base = f"""SELECT students.*,
    CASE WHEN COALESCE((SELECT SUM(amount) FROM fees WHERE fees.student_id=students.id),0) >= 120 THEN 'Paid' ELSE 'Pending' END AS fee_status
    FROM students WHERE name LIKE ? OR class_name LIKE ? ORDER BY {sort_col} {direction}"""
    count = "SELECT COUNT(*) FROM students WHERE name LIKE ? OR class_name LIKE ?"
    return _paginated(base, count, [q, q], page, page_size)


def create_student(payload: dict) -> dict:
    admission_date = payload.get("admission_date") or datetime.utcnow().strftime("%Y-%m-%d (%A)")
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO students (name,father_name,phone,class_name,address,admission_date,notes,created_at) VALUES (?,?,?,?,?,?,?,?)",
            (
                payload["name"], payload["father_name"], payload["phone"], payload["class_name"], payload["address"],
                admission_date, payload.get("notes", ""), datetime.utcnow().isoformat(),
            ),
        )
        sid = cur.lastrowid
    log_activity("student_added", "students", str(sid))
    return {"id": sid}


def update_student(student_id: int, payload: dict) -> None:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE students SET name=?,father_name=?,phone=?,class_name=?,address=?,admission_date=?,notes=? WHERE id=?",
            (payload["name"], payload["father_name"], payload["phone"], payload["class_name"], payload["address"], payload["admission_date"], payload.get("notes", ""), student_id),
        )
    log_activity("student_updated", "students", str(student_id))


def delete_row(table: str, row_id: int) -> None:
    with db_cursor() as cur:
        cur.execute(f"DELETE FROM {table} WHERE id=?", (row_id,))
    log_activity("deleted", table, str(row_id))


def list_staff(search: str, sort_by: str, order: str, page: int, page_size: int) -> dict:
    sort_col = sort_by if sort_by in ALLOWED_SORT["staff"] else "id"
    direction = "DESC" if order.lower() == "desc" else "ASC"
    q = "%" + search + "%"
    base = f"SELECT * FROM staff WHERE name LIKE ? OR role LIKE ? ORDER BY {sort_col} {direction}"
    count = "SELECT COUNT(*) FROM staff WHERE name LIKE ? OR role LIKE ?"
    return _paginated(base, count, [q, q], page, page_size)


def create_staff(payload: dict) -> dict:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO staff (name,role,salary,joining_date,phone,status,created_at) VALUES (?,?,?,?,?,?,?)",
            (payload["name"], payload["role"], payload["salary"], payload["joining_date"], payload["phone"], payload.get("status", "Active"), datetime.utcnow().isoformat()),
        )
        sid = cur.lastrowid
    log_activity("staff_added", "staff", str(sid))
    return {"id": sid}




def update_staff(staff_id: int, payload: dict) -> None:
    with db_cursor() as cur:
        cur.execute(
            "UPDATE staff SET name=?, role=?, salary=?, joining_date=?, phone=?, status=? WHERE id=?",
            (payload["name"], payload["role"], payload["salary"], payload["joining_date"], payload["phone"], payload.get("status", "Active"), staff_id),
        )
    log_activity("staff_updated", "staff", str(staff_id))
def upsert_attendance(payload: dict) -> None:
    with db_cursor() as cur:
        for row in payload["records"]:
            cur.execute(
                "INSERT INTO attendance (student_id,class_name,attendance_date,status) VALUES (?,?,?,?) ON CONFLICT(student_id,attendance_date) DO UPDATE SET status=excluded.status, class_name=excluded.class_name",
                (row["student_id"], payload["class_name"], payload["attendance_date"], row["status"]),
            )
    log_activity("attendance_saved", "attendance", payload["attendance_date"])


def create_fee(payload: dict) -> dict:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO fees (student_id,amount,method,payment_date,month) VALUES (?,?,?,?,?)",
            (payload["student_id"], payload["amount"], payload["method"], payload["payment_date"], payload["month"]),
        )
        fid = cur.lastrowid
    log_activity("payment_submitted", "fees", str(fid))
    return {"id": fid}


def list_fees(search: str, month: str, sort_by: str, order: str, page: int, page_size: int) -> dict:
    sort_col = sort_by if sort_by in ALLOWED_SORT["fees"] else "id"
    direction = "DESC" if order.lower() == "desc" else "ASC"
    q = "%" + search + "%"
    month_filter = month or "%"
    base = f"""SELECT fees.*, students.name as student_name FROM fees
    JOIN students ON students.id=fees.student_id
    WHERE students.name LIKE ? AND fees.month LIKE ? ORDER BY {sort_col} {direction}"""
    count = "SELECT COUNT(*) FROM fees JOIN students ON students.id=fees.student_id WHERE students.name LIKE ? AND fees.month LIKE ?"
    return _paginated(base, count, [q, month_filter], page, page_size)


def create_expense(payload: dict) -> dict:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO expenses (title,amount,category,expense_date,description) VALUES (?,?,?,?,?)",
            (payload["title"], payload["amount"], payload["category"], payload["expense_date"], payload.get("description", "")),
        )
        eid = cur.lastrowid
    log_activity("expense_recorded", "expenses", str(eid))
    return {"id": eid}


def list_expenses(search: str, month: str, sort_by: str, order: str, page: int, page_size: int) -> dict:
    sort_col = sort_by if sort_by in ALLOWED_SORT["expenses"] else "id"
    direction = "DESC" if order.lower() == "desc" else "ASC"
    q = "%" + search + "%"
    month_filter = (month + "%") if month else "%"
    base = f"SELECT * FROM expenses WHERE (title LIKE ? OR category LIKE ?) AND expense_date LIKE ? ORDER BY {sort_col} {direction}"
    count = "SELECT COUNT(*) FROM expenses WHERE (title LIKE ? OR category LIKE ?) AND expense_date LIKE ?"
    return _paginated(base, count, [q, q, month_filter], page, page_size)


def list_files(search: str, sort_by: str, order: str, page: int, page_size: int) -> dict:
    sort_col = sort_by if sort_by in ALLOWED_SORT["files"] else "id"
    direction = "DESC" if order.lower() == "desc" else "ASC"
    q = "%" + search + "%"
    base = f"SELECT * FROM files WHERE name LIKE ? OR kind LIKE ? ORDER BY {sort_col} {direction}"
    count = "SELECT COUNT(*) FROM files WHERE name LIKE ? OR kind LIKE ?"
    return _paginated(base, count, [q, q], page, page_size)


def create_file(payload: dict) -> dict:
    with db_cursor() as cur:
        cur.execute("INSERT INTO files (name,kind,created_at) VALUES (?,?,?)", (payload["name"], payload["kind"], datetime.utcnow().isoformat()))
        fid = cur.lastrowid
    log_activity("file_created", "files", str(fid))
    return {"id": fid}


def list_documents(search: str, sort_by: str, order: str, page: int, page_size: int) -> dict:
    sort_col = sort_by if sort_by in ALLOWED_SORT["documents"] else "id"
    direction = "DESC" if order.lower() == "desc" else "ASC"
    q = "%" + search + "%"
    base = f"SELECT * FROM documents WHERE title LIKE ? ORDER BY {sort_col} {direction}"
    count = "SELECT COUNT(*) FROM documents WHERE title LIKE ?"
    return _paginated(base, count, [q], page, page_size)


def create_document(payload: dict) -> dict:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO documents (owner_type,owner_id,title,created_at) VALUES (?,?,?,?)",
            (payload["owner_type"], payload["owner_id"], payload["title"], datetime.utcnow().isoformat()),
        )
        did = cur.lastrowid
    log_activity("document_added", "documents", str(did))
    return {"id": did}


def get_dashboard() -> dict:
    with db_cursor() as cur:
        students = cur.execute("SELECT COUNT(*) FROM students").fetchone()[0]
        staff = cur.execute("SELECT COUNT(*) FROM staff").fetchone()[0]
        fees_collected = cur.execute("SELECT COALESCE(SUM(amount),0) FROM fees").fetchone()[0]
        pending_fees = max(students * 120 - fees_collected, 0)

        monthly_rows = cur.execute(
            "SELECT substr(month,1,7) as month, COALESCE(SUM(amount),0) as total FROM fees GROUP BY substr(month,1,7) ORDER BY month"
        ).fetchall()
        expense_rows = cur.execute(
            "SELECT category, COALESCE(SUM(amount),0) as total FROM expenses GROUP BY category ORDER BY total DESC"
        ).fetchall()
        activities = [dict(r) for r in cur.execute("SELECT * FROM activities ORDER BY id DESC LIMIT 10").fetchall()]

    return {
        "stats": {
            "total_students": students,
            "total_staff": staff,
            "total_fees_collected": fees_collected,
            "pending_fees": pending_fees,
        },
        "bar_chart": [dict(r) for r in monthly_rows],
        "pie_chart": [dict(r) for r in expense_rows],
        "activities": activities,
    }


def global_search(q: str) -> dict:
    term = f"%{q}%"
    with db_cursor() as cur:
        students = [dict(r) for r in cur.execute("SELECT id,name,class_name FROM students WHERE name LIKE ? LIMIT 10", (term,)).fetchall()]
        staff = [dict(r) for r in cur.execute("SELECT id,name,role FROM staff WHERE name LIKE ? LIMIT 10", (term,)).fetchall()]
        payments = [dict(r) for r in cur.execute("SELECT id,amount,month FROM fees WHERE CAST(amount as TEXT) LIKE ? OR month LIKE ? LIMIT 10", (term, term)).fetchall()]
        expenses = [dict(r) for r in cur.execute("SELECT id,title,amount FROM expenses WHERE title LIKE ? OR category LIKE ? LIMIT 10", (term, term)).fetchall()]
    return {"students": students, "staff": staff, "payments": payments, "expenses": expenses}


def get_settings() -> dict:
    with db_cursor() as cur:
        row = cur.execute("SELECT value FROM app_settings WHERE key='system'").fetchone()
        return json.loads(row[0]) if row else {}


def put_settings(payload: dict) -> dict:
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO app_settings(key,value) VALUES('system',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (json.dumps(payload),),
        )
    log_activity("settings_updated", "settings", "system")
    return payload



def student_profile(student_id: int) -> dict:
    with db_cursor() as cur:
        student = cur.execute("SELECT * FROM students WHERE id=?", (student_id,)).fetchone()
        if not student:
            return {}
        payments = [dict(r) for r in cur.execute("SELECT * FROM fees WHERE student_id=? ORDER BY id DESC", (student_id,)).fetchall()]
        attendance = [dict(r) for r in cur.execute("SELECT attendance_date,status,class_name FROM attendance WHERE student_id=? ORDER BY attendance_date DESC", (student_id,)).fetchall()]
        class_history = [dict(r) for r in cur.execute("SELECT action,created_at FROM activities WHERE entity='students' AND entity_id=? ORDER BY id DESC", (str(student_id),)).fetchall()]
    present = sum(1 for r in attendance if r["status"] == "Present")
    absent = sum(1 for r in attendance if r["status"] == "Absent")
    return {
        "personal": dict(student),
        "payments": payments,
        "behavior_notes": student["notes"],
        "attendance_summary": {"present": present, "absent": absent, "total": len(attendance)},
        "class_history_log": class_history,
    }


def staff_profile(staff_id: int) -> dict:
    with db_cursor() as cur:
        staff = cur.execute("SELECT * FROM staff WHERE id=?", (staff_id,)).fetchone()
        if not staff:
            return {}
        perf = [dict(r) for r in cur.execute("SELECT action,created_at FROM activities WHERE entity='staff' AND entity_id=? ORDER BY id DESC", (str(staff_id),)).fetchall()]
    return {
        "details": dict(staff),
        "salary_history": [{"amount": staff["salary"], "note": "Base salary", "date": staff["joining_date"]}],
        "performance_notes": perf,
        "attendance_record": [],
    }
