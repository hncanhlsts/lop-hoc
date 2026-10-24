Attribute VB_Name = "ClassLive_AddIn"
' ==============================================================================
' CLASSLIVE - POWERPOINT EVENT ADD-IN
' Tự động xuất ảnh slide hiện tại và gửi sang Server khi giáo viên bấm chuyển slide
' ==============================================================================

Public WithEvents PPTEventApp As PowerPoint.Application
Private IsInitialized As Boolean

Public Sub InitializeClassLive()
    Set PPTEventApp = Application
    IsInitialized = True
    MsgBox "ClassLive đã sẵn sàng! Mỗi khi thầy cô bấm F5 hoặc chuyển slide, bài giảng sẽ tự động đồng bộ sang máy học sinh.", vbInformation, "ClassLive Kết nối"
End Sub

' Sự kiện: Bắt đầu Trình chiếu
Private Sub PPTEventApp_SlideShowBegin(ByVal Wn As SlideShowWindow)
    SyncCurrentSlide Wn
End Sub

' Sự kiện: Chuyển sang slide tiếp theo
Private Sub PPTEventApp_SlideShowNextSlide(ByVal Wn As SlideShowWindow)
    SyncCurrentSlide Wn
End Sub

' Hàm xuất ảnh và gửi HTTP POST đến Server
Private Sub SyncCurrentSlide(ByVal Wn As SlideShowWindow)
    On Error Resume Next
    Dim currentSlide As Slide
    Set currentSlide = Wn.View.Slide
    
    If currentSlide Is Nothing Then Exit Sub
    
    Dim tempPath As String
    tempPath = Environ$("TEMP") & "\classlive_slide.png"
    
    ' Xuất slide hiện tại sang định dạng PNG
    currentSlide.Export tempPath, "PNG", 1280, 720
    
    ' Gửi thông báo đến Server cục bộ (Port 3000)
    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", "http://localhost:3000/api/slide", False
    http.setRequestHeader "Content-Type", "application/json"
    
    Dim jsonPayload As String
    jsonPayload = "{""slideNumber"":" & currentSlide.SlideIndex & ",""totalSlides"":" & Wn.Presentation.Slides.Count & "}"
    http.send jsonPayload
End Sub
