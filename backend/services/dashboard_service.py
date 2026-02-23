from random import randint


def get_dashboard_stats() -> dict:
    return {
        "students": 1240,
        "staff": 124,
        "attendance_rate": 94,
        "pending_fees": 31200,
        "alerts": 8,
    }


def get_dashboard_analytics() -> dict:
    return {
        "monthlyAttendance": [randint(82, 98) for _ in range(6)],
        "feeCollection": [randint(12000, 50000) for _ in range(6)],
        "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    }
