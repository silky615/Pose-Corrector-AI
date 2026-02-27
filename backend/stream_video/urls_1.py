from django.urls import path
from django.views.decorators.csrf import csrf_exempt

# Simple wrapper functions that lazy-load views to prevent MediaPipe crash
def _lazy_upload_video(request):
    """Lazy-load upload_video view."""
    from . import views
    return views.upload_video(request)

def _lazy_stream_process(request):
    """Lazy-load stream_process view."""
    from . import views
    return views.stream_process(request)

urlpatterns = [
    # matches: /api/video/upload
    path("upload", _lazy_upload_video, name="upload_video"),
    # matches: /api/video/stream
    # Wrapped in csrf_exempt for extra security against 403 errors
    path("stream", csrf_exempt(_lazy_stream_process), name="stream_process"),
]