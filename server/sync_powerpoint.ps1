<#
.SYNOPSIS
  Tự động đồng bộ Slide từ Microsoft PowerPoint sang điện thoại học sinh thời gian thực
  Hoàn toàn không cần cài thêm phần mềm, chạy trực tiếp trên Windows PowerShell có sẵn!
#>

$ServerUrl = "http://localhost:3000/api/slide"
$TempImagePath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "classlive_current_slide.png")

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   📡 POWERPOINT AUTO-SYNC BRIDGE ĐANG CHẠY" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "1. Hãy mở PowerPoint và nhấn [F5] để Trình chiếu." -ForegroundColor Green
Write-Host "2. Mỗi khi bạn bấm chuyển slide, slide sẽ tự động phát sang điện thoại học sinh!" -ForegroundColor Green
Write-Host "Nhấn Ctrl+C để dừng bộ đồng bộ.`n" -ForegroundColor Gray

$lastSlideIndex = -1
$lastPresentationName = ""

while ($true) {
    try {
        # Kết nối tới tiến trình PowerPoint đang chạy
        $ppt = [System.Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application")
        
        if ($ppt -ne $null -and $ppt.SlideShowWindows.Count -gt 0) {
            $slideShowWindow = $ppt.SlideShowWindows.Item(1)
            $slideView = $slideShowWindow.View
            $currentSlide = $slideView.Slide
            $slideIndex = $currentSlide.SlideIndex
            $totalSlides = $slideShowWindow.Presentation.Slides.Count

            # Chỉ xuất và gửi ảnh khi giáo viên chuyển sang slide mới
            if ($slideIndex -ne $lastSlideIndex) {
                Write-Host "[►] Phát hiện chuyển sang Slide $slideIndex / $totalSlides..." -ForegroundColor Yellow
                
                # Xuất slide hiện tại ra file ảnh PNG độ nét cao (1280x720)
                $currentSlide.Export($TempImagePath, "PNG", 1280, 720)

                # Đọc ảnh và chuyển sang Base64
                $imageBytes = [System.IO.File]::ReadAllBytes($TempImagePath)
                $base64Image = [System.Convert]::ToBase64String($imageBytes)

                # Gửi gói tin sang Server
                $body = @{
                    slideNumber = $slideIndex
                    totalSlides = $totalSlides
                    imageBase64 = $base64Image
                } | ConvertTo-Json

                $response = Invoke-RestMethod -Uri $ServerUrl -Method Post -Body $body -ContentType "application/json"
                
                Write-Host "[✓] Đã đồng bộ Slide $slideIndex thành công sang toàn bộ học sinh!" -ForegroundColor Green
                $lastSlideIndex = $slideIndex
            }
        } else {
            # Nếu chưa bật chế độ F5 (SlideShow), đặt lại trạng thái
            if ($lastSlideIndex -ne -1) {
                Write-Host "[!] Đã thoát chế độ trình chiếu PowerPoint." -ForegroundColor DarkGray
                $lastSlideIndex = -1
            }
        }
    } catch {
        # PowerPoint chưa mở hoặc đang bận
    }

    # Quét trạng thái mỗi 0.5 giây để phản hồi siêu nhạy
    Start-Sleep -Milliseconds 500
}
