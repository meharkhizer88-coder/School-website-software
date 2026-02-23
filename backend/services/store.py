from datetime import datetime
from uuid import uuid4

from backend.models.schemas import Notice, SchoolInfo, SystemSettings, UserPreferences


class InMemoryStore:
    def __init__(self) -> None:
        self.settings = SystemSettings(
            school_info=SchoolInfo(school_name="Global Academy", tagline="Learn. Lead. Succeed."),
            user_preferences=UserPreferences(),
            labels={
                "Dashboard": "Dashboard",
                "Students": "Students",
                "Staff": "Staff",
                "Finance": "Finance",
                "Attendance": "Attendance",
                "Exams": "Exams",
                "Reports": "Reports",
                "Messages": "Messages",
                "Files": "Files",
                "Settings": "Settings",
                "User Panel": "User Panel",
                "Developer Info": "Developer Info",
            },
        )
        self.notices = [
            Notice(
                id=str(uuid4()),
                title="Midterm Schedule Published",
                category="Exams",
                created_at=datetime.utcnow(),
                message="Midterm exam timetable has been published.",
            ),
            Notice(
                id=str(uuid4()),
                title="Fee Reminder",
                category="Finance",
                created_at=datetime.utcnow(),
                message="Term fee payment due in 5 days.",
            ),
        ]


store = InMemoryStore()
