from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from mindmap_api import router as mindmap_router
except Exception as e:
    mindmap_router = None
    print(f"[WARN] mindmap_api import 실패: {e}")

try:
    from stt_api import router as stt_router
except Exception as e:
    stt_router = None
    print(f"[WARN] stt_api import 실패: {e}")

try:
    from query_test_api import router as query_test_router
except Exception as e:
    query_test_router = None
    print(f"[WARN] query_test_api import 실패: {e}")

try:
    from document_api import router as document_router
except Exception as e:
    document_router = None
    print(f"[WARN] document_api import 실패: {e}")

try:
    from meeting_report_api import router as meeting_report_router
except Exception as e:
    meeting_report_router = None
    print(f"[WARN] meeting_report_api import 실패: {e}")

try:
    from database import engine
    import models
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[WARN] 기존 DB 초기화 건너뜀: {e}")

try:
    from chak_runtime_api import app as chak_runtime_app
except Exception as e:
    chak_runtime_app = None
    print(f"[WARN] chak_runtime_api import 실패: {e}")

app = FastAPI(title="Project_ChakChak merged backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/base-health")
def base_health():
    return {
        "message": "Project_ChakChak base backend running",
        "merged_chak_runtime": chak_runtime_app is not None,
        "meeting_report": meeting_report_router is not None,
        "mindmap": mindmap_router is not None,
        "stt": stt_router is not None,
        "query_test": query_test_router is not None,
        "document": document_router is not None,
    }

if mindmap_router is not None:
    app.include_router(mindmap_router)

if stt_router is not None:
    app.include_router(stt_router)

if query_test_router is not None:
    app.include_router(query_test_router)

if document_router is not None:
    app.include_router(document_router, prefix="/api/document", tags=["Document"])

if meeting_report_router is not None:
    app.include_router(meeting_report_router)

if chak_runtime_app is not None:
    for route in chak_runtime_app.router.routes:
        exists = any(
            getattr(r, "path", None) == getattr(route, "path", None)
            and getattr(r, "methods", None) == getattr(route, "methods", None)
            for r in app.router.routes
        )
        if not exists:
            app.router.routes.append(route)
