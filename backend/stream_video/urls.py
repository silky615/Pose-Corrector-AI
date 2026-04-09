from django.urls import path
from stream_video import views

urlpatterns = [
    # ── Video endpoints ──────────────────────────────────────────
    path("api/video/stream",  views._stream_process_with_db_save, name="stream_process"),
    path("api/video/upload",  views.upload_video,                 name="upload_video"),
    path("api/video/play",    views.stream_video,                 name="stream_video"),

    # ── Auth endpoints ───────────────────────────────────────────
    path("api/auth/signup",   views.signup,                       name="signup"),
    path("api/auth/signin",   views.signin,                       name="signin"),

    # ── Session endpoints ────────────────────────────────────────
    path("api/session/start", views.start_session,                name="start_session"),
    path("api/session/end",   views.end_session,                  name="end_session"),
]
