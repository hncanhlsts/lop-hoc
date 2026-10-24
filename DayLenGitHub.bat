@echo off
chcp 65001 > nul
title ĐẨY DỰ ÁN LÊN GITHUB

echo ============================================================
echo       HỖ TRỢ ĐẨY MÃ NGUỒN LÊN GITHUB TỰ ĐỘNG
echo ============================================================
echo.
echo Bước 1: Bạn hãy vào https://github.com/new để tạo một Repository mới
echo (Ví dụ đặt tên là: class-slides và chọn Public, KHÔNG cần tích chọn README)
echo.
echo Bước 2: Dán đường dẫn Repository của bạn vào bên dưới
echo Ví dụ: https://github.com/ten-cua-ban/class-slides.git
echo ============================================================
echo.

set /p REPO_URL="Nhập link GitHub Repo của bạn: "

if "%REPO_URL%"=="" (
    echo [Lỗi] Bạn chưa nhập đường dẫn! Hãy chạy lại file.
    pause
    exit /b
)

:: Xóa remote cũ nếu có và thêm remote mới
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo.
echo [1/3] Đang chuẩn bị nhánh main...
git branch -M main

echo [2/3] Đang đẩy toàn bộ mã nguồn lên GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo [THÀNH CÔNG] Toàn bộ mã nguồn đã được tải lên GitHub!
    echo.
    echo GitHub Actions sẽ tự động phát hành Web Học Sinh lên GitHub Pages.
    echo Bạn chỉ cần vào: Settings -> Pages trên GitHub để lấy link trang web!
    echo ============================================================
) else (
    echo.
    echo [LƯU Ý] Nếu Git yêu cầu đăng nhập, hãy làm theo hướng dẫn trên màn hình
    echo hoặc kiểm tra lại đường dẫn link Repo đã chính xác chưa.
)

pause
