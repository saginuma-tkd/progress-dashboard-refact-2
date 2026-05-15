from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.models import models 
from app.db.database import engine
from app.core.scheduler import start_scheduler
from app.routers import auth, external, students, admin, common, charts, dashboard, exams, routes, system, reports, backup, developer, system_status, audit, csv_import, student_report, materials, attendance, chat, applications, system_admin

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Progress Dashboard API",
    description="API for Learning Progress Dashboard",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(external.router, prefix="/api", tags=["external"]) # Keep /api prefix for compatibility
app.include_router(students.router, prefix=f"{settings.API_V1_STR}/students", tags=["students"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(common.router, prefix=f"{settings.API_V1_STR}/common", tags=["common"])
app.include_router(charts.router, prefix=f"{settings.API_V1_STR}/charts", tags=["charts"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(exams.router, prefix=f"{settings.API_V1_STR}/exams", tags=["exams"])
app.include_router(routes.router, prefix=f"{settings.API_V1_STR}/routes", tags=["routes"])
app.include_router(system.router, prefix=f"{settings.API_V1_STR}/system", tags=["system"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(backup.router, prefix=f"{settings.API_V1_STR}/backup", tags=["backup"])
app.include_router(developer.router, prefix=f"{settings.API_V1_STR}/developer", tags=["developer"])
app.include_router(system_status.router, prefix=f"{settings.API_V1_STR}/system_status", tags={"system_status"})
app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags={"audit"})
app.include_router(csv_import.router, prefix=f"{settings.API_V1_STR}/csv_import", tags=["csv_import"])
app.include_router(student_report.router, prefix=f"{settings.API_V1_STR}/student_report", tags={"student_report"})
app.include_router(materials.router, prefix=f"{settings.API_V1_STR}/materials", tags={"materials"})
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags={"attendance"})
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags={"chat"})
app.include_router(applications.router, prefix=f"{settings.API_V1_STR}/applications", tags=["applications"])
app.include_router(system_admin.router, prefix=f"{settings.API_V1_STR}/system-admin", tags=["system-admin"])
from app.routers import fix_db
app.include_router(fix_db.router, prefix=settings.API_V1_STR, tags=["fix"])


@app.get("/")
def root():
    return {"message": "Hello from Progress Dashboard API"}

@app.on_event("startup")
def on_startup():
    start_scheduler()
