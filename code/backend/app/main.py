from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app import models 
from app.routes import auth_routes, student_routes, admin_routes, verify_routes, admin_auth_routes

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PeraSoul Backend API")

app.add_middleware (
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)

app.include_router(auth_routes.router)
app.include_router(student_routes.router)
app.include_router(admin_routes.router)
app.include_router(verify_routes.router)
app.include_router(admin_auth_routes.router)

@app.get("/")
def root():
    return {
        "message": "PeraSoul backend is running",
        "status" : "succes"
        }