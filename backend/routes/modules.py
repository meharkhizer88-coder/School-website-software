import csv
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import StreamingResponse

from backend.models.schemas import ApiResponse
from backend.services import module_service as svc
from backend.services.db_service import has_permission

router = APIRouter(prefix="/modules", tags=["modules"])

def authorize(role: str, permission: str) -> None:
    if not has_permission(role, permission):
        raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")


def _p(page: int, page_size: int) -> tuple[int, int]:
    return max(1, page), min(200, max(1, page_size))


@router.get("/dashboard")
def dashboard_data():
    return ApiResponse(success=True, data=svc.get_dashboard(), message="Dashboard data fetched")


@router.get("/search")
def search(q: str = Query(min_length=1)):
    return ApiResponse(success=True, data=svc.global_search(q), message="Search completed")


@router.get("/students")
def list_students(search: str = "", sort_by: str = "id", order: str = "desc", page: int = 1, page_size: int = 10, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    page, page_size = _p(page, page_size)
    return ApiResponse(success=True, data=svc.list_students(search, sort_by, order, page, page_size), message="Students loaded")


@router.post("/students")
def add_student(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    required = ["name", "father_name", "phone", "class_name", "address"]
    if any(not payload.get(k) for k in required):
        raise HTTPException(status_code=422, detail="Missing required student fields")
    return ApiResponse(success=True, data=svc.create_student(payload), message="Student added")


@router.put("/students/{student_id}")
def edit_student(student_id: int, payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    svc.update_student(student_id, payload)
    return ApiResponse(success=True, data={"id": student_id}, message="Student updated")


@router.delete("/students/{student_id}")
def remove_student(student_id: int, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    svc.delete_row("students", student_id)
    return ApiResponse(success=True, data={"id": student_id}, message="Student deleted")


@router.get("/staff")
def list_staff(search: str = "", sort_by: str = "id", order: str = "desc", page: int = 1, page_size: int = 10, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_staff")
    page, page_size = _p(page, page_size)
    return ApiResponse(success=True, data=svc.list_staff(search, sort_by, order, page, page_size), message="Staff loaded")


@router.post("/staff")
def add_staff(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_staff")
    required = ["name", "role", "salary", "joining_date", "phone"]
    if any(payload.get(k) in (None, "") for k in required):
        raise HTTPException(status_code=422, detail="Missing required staff fields")
    return ApiResponse(success=True, data=svc.create_staff(payload), message="Staff added")


@router.delete("/staff/{staff_id}")
def remove_staff(staff_id: int, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_staff")
    svc.delete_row("staff", staff_id)
    return ApiResponse(success=True, data={"id": staff_id}, message="Staff deleted")


@router.post("/attendance")
def save_attendance(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_attendance")
    if not payload.get("class_name") or not payload.get("attendance_date") or not payload.get("records"):
        raise HTTPException(status_code=422, detail="Invalid attendance payload")
    svc.upsert_attendance(payload)
    return ApiResponse(success=True, data={}, message="Attendance saved")


@router.get("/fees")
def list_fees(search: str = "", month: str = "", sort_by: str = "id", order: str = "desc", page: int = 1, page_size: int = 10, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_finance")
    page, page_size = _p(page, page_size)
    return ApiResponse(success=True, data=svc.list_fees(search, month, sort_by, order, page, page_size), message="Fees loaded")


@router.post("/fees")
def add_fee(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_finance")
    required = ["student_id", "amount", "method", "payment_date", "month"]
    if any(payload.get(k) in (None, "") for k in required):
        raise HTTPException(status_code=422, detail="Missing required fee fields")
    return ApiResponse(success=True, data=svc.create_fee(payload), message="Payment submitted")


@router.delete("/fees/{fee_id}")
def remove_fee(fee_id: int, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_finance")
    svc.delete_row("fees", fee_id)
    return ApiResponse(success=True, data={"id": fee_id}, message="Fee deleted")


@router.get("/expenses")
def list_expenses(search: str = "", month: str = "", sort_by: str = "id", order: str = "desc", page: int = 1, page_size: int = 10, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_expenses")
    page, page_size = _p(page, page_size)
    return ApiResponse(success=True, data=svc.list_expenses(search, month, sort_by, order, page, page_size), message="Expenses loaded")


@router.post("/expenses")
def add_expense(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_expenses")
    required = ["title", "amount", "category", "expense_date"]
    if any(payload.get(k) in (None, "") for k in required):
        raise HTTPException(status_code=422, detail="Missing required expense fields")
    return ApiResponse(success=True, data=svc.create_expense(payload), message="Expense recorded")


@router.delete("/expenses/{expense_id}")
def remove_expense(expense_id: int, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_expenses")
    svc.delete_row("expenses", expense_id)
    return ApiResponse(success=True, data={"id": expense_id}, message="Expense deleted")


@router.get("/files")
def list_files(search: str = "", sort_by: str = "id", order: str = "desc", page: int = 1, page_size: int = 10, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    page, page_size = _p(page, page_size)
    return ApiResponse(success=True, data=svc.list_files(search, sort_by, order, page, page_size), message="Files loaded")


@router.post("/files")
def add_file(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    if not payload.get("name") or not payload.get("kind"):
        raise HTTPException(status_code=422, detail="Missing file fields")
    return ApiResponse(success=True, data=svc.create_file(payload), message="File entry created")


@router.delete("/files/{file_id}")
def remove_file(file_id: int, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    svc.delete_row("files", file_id)
    return ApiResponse(success=True, data={"id": file_id}, message="File deleted")


@router.get("/documents")
def list_documents(search: str = "", sort_by: str = "id", order: str = "desc", page: int = 1, page_size: int = 10, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    page, page_size = _p(page, page_size)
    return ApiResponse(success=True, data=svc.list_documents(search, sort_by, order, page, page_size), message="Documents loaded")


@router.post("/documents")
def add_document(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    if not payload.get("owner_type") or not payload.get("owner_id") or not payload.get("title"):
        raise HTTPException(status_code=422, detail="Missing document fields")
    return ApiResponse(success=True, data=svc.create_document(payload), message="Document added")


@router.delete("/documents/{doc_id}")
def remove_document(doc_id: int, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_students")
    svc.delete_row("documents", doc_id)
    return ApiResponse(success=True, data={"id": doc_id}, message="Document deleted")


@router.get("/settings")
def get_settings(x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_settings")
    return ApiResponse(success=True, data=svc.get_settings(), message="Settings fetched")


@router.put("/settings")
def update_settings(payload: dict, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "manage_settings")
    return ApiResponse(success=True, data=svc.put_settings(payload), message="Settings saved")


def _report_rows(report_type: str):
    if report_type == "students":
        return svc.list_students("", "id", "asc", 1, 10000)["items"]
    if report_type == "fees":
        return svc.list_fees("", "", "id", "asc", 1, 10000)["items"]
    if report_type == "expenses":
        return svc.list_expenses("", "", "id", "asc", 1, 10000)["items"]
    if report_type == "staff":
        return svc.list_staff("", "id", "asc", 1, 10000)["items"]
    raise HTTPException(status_code=404, detail="Unknown report type")


@router.get("/reports/{report_type}.csv")
def report_csv(report_type: str, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "view_reports")
    rows = _report_rows(report_type)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    if rows:
        writer.writerow(rows[0].keys())
        for row in rows:
            writer.writerow(row.values())
    buffer.seek(0)
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={report_type}-report.csv"})


@router.get("/reports/{report_type}.pdf")
def report_pdf(report_type: str, x_role: str = Header(default="Super Admin")):
    authorize(x_role, "view_reports")
    rows = _report_rows(report_type)
    buf = io.BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A4)
    width, height = A4

    def draw_header(page_no: int):
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(40, height - 40, "Global Academy")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, height - 58, f"{report_type.title()} Report")
        pdf.drawRightString(width - 40, height - 58, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}")
        pdf.drawRightString(width - 40, 24, f"Page {page_no}")

    page_no = 1
    draw_header(page_no)
    y = height - 86
    pdf.setFont("Helvetica", 9)
    for idx, row in enumerate(rows, start=1):
        line = f"{idx}. " + " | ".join(f"{k}: {v}" for k, v in row.items())
        if y < 52:
            pdf.showPage()
            page_no += 1
            draw_header(page_no)
            pdf.setFont("Helvetica", 9)
            y = height - 86
        pdf.drawString(40, y, line[:170])
        y -= 14

    pdf.save()
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={report_type}-report.pdf"})
