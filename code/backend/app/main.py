from fastapi import FastAPI

app = FastAPI(title="PeraSoul Backend API")

@app.get("/")
def root():
    return {"message": "PeraSoul backend is running"}