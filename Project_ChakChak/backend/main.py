from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from mindmap_api import router as mindmap_router
except Exception:
    mindmap_router = None

try:
    from stt_api import router as stt_router
except Exception:
    stt_router = None

try:
    from query_test_api import router as query_test_router
except Exception:
    query_test_router = None

try:
    from document_api import router as document_router
except Exception:
    document_router = None

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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://0.0.0.0:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/base-health")
def base_health():
    return {
        "message": "Project_ChakChak base backend running",
        "merged_chak_runtime": chak_runtime_app is not None,
    }

if mindmap_router is not None:
    app.include_router(mindmap_router)

if stt_router is not None:
    app.include_router(stt_router)

if query_test_router is not None:
    app.include_router(query_test_router)

if document_router is not None:
    app.include_router(document_router, prefix="/api/document", tags=["Document"])

if chak_runtime_app is not None:
    for route in chak_runtime_app.router.routes:
        exists = any(
            getattr(r, "path", None) == getattr(route, "path", None)
            and getattr(r, "methods", None) == getattr(route, "methods", None)
            for r in app.router.routes
        )
        if not exists:
            app.router.routes.append(route)
