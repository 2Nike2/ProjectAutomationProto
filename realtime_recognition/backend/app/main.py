import os
import shutil

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount("/static", StaticFiles(directory="backend/static"), name="static")

@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
  with open(f"backend/app/audio/{file.filename}", "wb") as buffer:
    shutil.copyfileobj(file.file, buffer)
  return {"filename": file.filename}

@app.get("/")
async def serve_frontend():
  return FileResponse("backend/static/index.html")
