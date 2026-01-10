#!/bin/bash
# chmod +x start_server.sh
# ./start_server.sh

set -e

echo "Khởi động Uvicorn server tại http://127.0.0.1:8000 ..."
# Tăng timeout để hỗ trợ upload file lớn:
# --timeout-keep-alive: Thời gian giữ kết nối sống (30 phút)
# --timeout-graceful-shutdown: Thời gian chờ graceful shutdown (60 giây)
uvicorn agent:app --reload --timeout-keep-alive 1800 --timeout-graceful-shutdown 1800