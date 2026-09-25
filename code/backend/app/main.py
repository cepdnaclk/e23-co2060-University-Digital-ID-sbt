from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

from app.routes import (
    auth_routes,
    student_routes,
    admin_routes,
    verify_routes,
    admin_auth_routes,
    technical_admin_routes,
)


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="PeraSoul Digital Identity API",
    version="1.0.0",
)


# ==========================================================
# CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# ROUTERS
# ==========================================================

app.include_router(
    auth_routes.router
)

app.include_router(
    student_routes.router
)

app.include_router(
    admin_routes.router
)

app.include_router(
    verify_routes.router
)

app.include_router(
    admin_auth_routes.router
)

app.include_router(
    technical_admin_routes.router
)


# ==========================================================
# ROOT
# ==========================================================

@app.get("/")
def root():

    return {
        "message":
            "PeraSoul Digital Identity API is running"
    }