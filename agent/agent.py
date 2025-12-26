from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import shutil
from typing import List

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

class GenerateRequest(BaseModel):
    question: str
    file_names: List[str]

@app.post("/generate")
def generate(req: GenerateRequest):
    prompt = answer(req.question, req.file_names)
    print(prompt)
    return StreamingResponse(
        generate_stream(prompt),
        media_type="text/event-stream"
    )
@app.post("/files")
async def upload_files(files: List[UploadFile] = File(...)):
    uploaded_files = []
    collections = []

    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        collection_name = QdrantFileUploader().upload_file(file_path)

        uploaded_files.append(file.filename)
        collections.append(collection_name)

    return {
        "message": "Uploaded successfully",
        "files": uploaded_files,
        "collections": collections
    }
