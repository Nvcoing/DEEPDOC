@echo off
REM Chạy server trong CMD mới
start "" "..\tools\Git\git-bash.exe" --cd=".\deploy" -c "./start_server.sh"


REM Chạy tunnel trong CMD mới
start "" "..\tools\Git\git-bash.exe" --cd=".\deploy" -c "./start_tunnel.sh"


REM Đợi 20 giây để 2 script trên chạy
timeout /t 20 /nobreak >nul

REM Thực hiện git push
git checkout main
git add .
git commit -m "Auto deploy"
git push

echo Done!
pause