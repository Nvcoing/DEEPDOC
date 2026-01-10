from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import shutil
import mimetypes
import asyncio
import json

from llm.generate import generate_stream
from handler.response import answer
from doc_knowledge.vectordb_utils import QdrantFileUploader
from doc_knowledge.file_loader import load_file_pages, chunk_pages_smart

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

class ChunkBatchRequest(BaseModel):
    file_name: str
    chunks: List[Dict[str, Any]]  # [{chunk_id, text, pages}, ...]
    
class CompleteUploadRequest(BaseModel):
    file_name: str

# ================== UTILS (BLOCKING) ==================
def save_and_upload(file: UploadFile):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    collection_name = QdrantFileUploader().upload_file(file_path)
    return file.filename, collection_name

def process_chunk_batch_blocking(file_name: str, chunk_batch: List[Dict[str, Any]]):
    """Xử lý batch chunk và embedding tạm thời (chưa lưu vào vectorDB)"""
    uploader = QdrantFileUploader()
    uploader.process_chunk_batch(file_name, chunk_batch)

def finalize_upload_blocking(file_name: str):
    """Hoàn tất upload: lưu tất cả chunks đã embedding vào vectorDB"""
    file_path = os.path.join(UPLOAD_DIR, file_name)
    if not os.path.exists(file_path):
        raise ValueError(f"File {file_name} không tồn tại")
    
    pages = load_file_pages(file_path)
    uploader = QdrantFileUploader()
    collection_name = uploader.finalize_upload(file_name, pages)
    return collection_name

def get_file_chunks_blocking(file_name: str):
    """Lấy danh sách chunks từ file đã upload (để frontend biết cần upload bao nhiêu batch)"""
    file_path = os.path.join(UPLOAD_DIR, file_name)
    if not os.path.exists(file_path):
        raise ValueError(f"File {file_name} không tồn tại")
    
    pages = load_file_pages(file_path)
    chunks_with_pages = chunk_pages_smart(pages, chunk_size=2000, overlap=500)
    
    chunk_list = []
    for chunk_id, (chunk_text, pages_involved) in enumerate(chunks_with_pages):
        chunk_list.append({
            "chunk_id": chunk_id,
            "text": chunk_text,
            "pages": pages_involved
        })
    
    return {
        "file_name": file_name,
        "chunks": chunk_list,
        "total_pages": len(pages)
    }

def delete_file_and_collection(file_name: str):
    file_path = os.path.join(UPLOAD_DIR, file_name)
    os.remove(file_path)
    QdrantFileUploader().delete_collection(file_name)
    
def get_media_type(file_name: str):
    media_type, _ = mimetypes.guess_type(file_name)
    return media_type or "application/octet-stream"
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

    # Tăng timeout lên 30 phút (1800 giây) cho việc upload file lớn
    for file in files:
        try:
            filename, collection = await asyncio.wait_for(
                run_in_threadpool(save_and_upload, file),
                timeout=1800.0  # 30 phút
            )
            uploaded_files.append(filename)
            collections.append(collection)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail=f"Upload timeout for file: {file.filename}. File may be too large."
            )

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

@app.get("/files/preview/{file_name}")
def preview_file(file_name: str):
    file_path = os.path.join(UPLOAD_DIR, file_name)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    media_type = get_media_type(file_name)

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={
            "Content-Disposition": "inline"
        }
    )

@app.post("/files/chunk/upload")
async def upload_file_chunk(
    chunk_index: int = Query(...),
    total_chunks: int = Query(...),
    file_name: str = Query(...),
    chunk_data: UploadFile = File(...)
):
    """
    Upload một chunk file (phần của file lớn)
    Chunks sẽ được ghép lại thành file hoàn chỉnh trên server
    """
    try:
        # Tạo thư mục tạm cho file đang upload
        temp_dir = os.path.join(UPLOAD_DIR, f".temp_{file_name}")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Lưu chunk vào file tạm
        chunk_path = os.path.join(temp_dir, f"chunk_{chunk_index}")
        with open(chunk_path, "wb") as buffer:
            shutil.copyfileobj(chunk_data.file, buffer)
        
        return {
            "message": "Chunk uploaded successfully",
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "file_name": file_name
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading chunk: {str(e)}"
        )

@app.post("/files/chunk/merge")
async def merge_file_chunks(file_name: str = Query(...)):
    """
    Ghép tất cả chunks thành file hoàn chỉnh và trả về thông tin file
    """
    try:
        temp_dir = os.path.join(UPLOAD_DIR, f".temp_{file_name}")
        if not os.path.exists(temp_dir):
            raise HTTPException(status_code=404, detail="Temporary chunks not found")
        
        # Lấy tất cả chunks và sắp xếp
        chunk_files = sorted(
            [f for f in os.listdir(temp_dir) if f.startswith("chunk_")],
            key=lambda x: int(x.split("_")[1])
        )
        
        # Ghép file
        final_path = os.path.join(UPLOAD_DIR, file_name)
        with open(final_path, "wb") as final_file:
            for chunk_file in chunk_files:
                chunk_path = os.path.join(temp_dir, chunk_file)
                with open(chunk_path, "rb") as chunk:
                    shutil.copyfileobj(chunk, final_file)
                os.remove(chunk_path)
        
        # Xóa thư mục tạm
        os.rmdir(temp_dir)
        
        # Load file và chunk thành text chunks
        pages = load_file_pages(final_path)
        chunks_with_pages = chunk_pages_smart(pages, chunk_size=2000, overlap=500)
        
        # Chuyển đổi format
        chunk_list = []
        for chunk_id, (chunk_text, pages_involved) in enumerate(chunks_with_pages):
            chunk_list.append({
                "chunk_id": chunk_id,
                "text": chunk_text,
                "pages": pages_involved
            })
        
        return {
            "message": "File merged successfully",
            "file_name": file_name,
            "total_chunks": len(chunk_list),
            "total_pages": len(pages)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error merging chunks: {str(e)}"
        )

@app.post("/files/chunk")
async def upload_chunk_batch(req: ChunkBatchRequest):
    """
    Upload một batch chunks và embedding tạm thời (chưa lưu vào vectorDB)
    """
    try:
        await asyncio.wait_for(
            run_in_threadpool(process_chunk_batch_blocking, req.file_name, req.chunks),
            timeout=600.0  # 10 phút timeout cho mỗi batch
        )
        return {
            "message": "Chunk batch processed successfully",
            "file_name": req.file_name,
            "chunks_processed": len(req.chunks)
        }
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Processing timeout for chunk batch of file: {req.file_name}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chunk batch: {str(e)}"
        )

@app.get("/files/chunk/list/{file_name}")
async def get_file_chunks(file_name: str):
    """
    Lấy danh sách chunks từ file đã upload (sau khi merge)
    Frontend dùng để biết cần embedding bao nhiêu batch
    """
    try:
        result = await asyncio.wait_for(
            run_in_threadpool(get_file_chunks_blocking, file_name),
            timeout=300.0  # 5 phút timeout
        )
        return result
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Timeout loading chunks for file: {file_name}"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting chunks: {str(e)}"
        )

@app.post("/files/chunk/complete")
async def complete_file_upload(req: CompleteUploadRequest):
    """
    Hoàn tất upload: lưu tất cả chunks đã embedding vào vectorDB
    """
    try:
        collection_name = await asyncio.wait_for(
            run_in_threadpool(finalize_upload_blocking, req.file_name),
            timeout=1800.0  # 30 phút timeout
        )
        return {
            "message": "File upload completed successfully",
            "file_name": req.file_name,
            "collection_name": collection_name
        }
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Finalization timeout for file: {req.file_name}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error finalizing upload: {str(e)}"
        )
