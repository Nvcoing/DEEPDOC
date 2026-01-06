from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List
import os
import shutil

from llm.generate import generate_stream
from handler.response import answer
from doc_knowledge.vectordb_utils import QdrantFileUploader

app = FastAPI(
    title="Document QA Agent",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "Collections"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ================== MODELS ==================
class GenerateRequest(BaseModel):
    question: str
    file_names: List[str]

# ================== UTILS (BLOCKING) ==================
def save_and_upload(file: UploadFile):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    collection_name = QdrantFileUploader().upload_file(file_path)
    return file.filename, collection_name

def delete_file_and_collection(file_name: str):
    file_path = os.path.join(UPLOAD_DIR, file_name)
    os.remove(file_path)
    QdrantFileUploader().delete_collection(file_name)

# ================== API ==================
@app.post("/generate")
def generate(req: GenerateRequest):
    prompt = answer(req.question, req.file_names)
    return StreamingResponse(
        generate_stream(prompt),
        media_type="text/plain"
    )

@app.post("/files")
async def upload_files(files: List[UploadFile] = File(...)):
    uploaded_files = []
    collections = []

    for file in files:
        filename, collection = await run_in_threadpool(
            save_and_upload, file
        )
        uploaded_files.append(filename)
        collections.append(collection)

    return {
        "message": "Uploaded successfully",
        "files": uploaded_files,
        "collections": collections
    }

@app.get("/files/{file_name}")
def download_file(file_name: str):
    file_path = os.path.join(UPLOAD_DIR, file_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/octet-stream"
    )

@app.delete("/files/{file_name}")
async def delete_file(file_name: str):
    file_path = os.path.join(UPLOAD_DIR, file_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    await run_in_threadpool(delete_file_and_collection, file_name)

    return {
        "message": "Deleted successfully",
        "file": file_name
    }
