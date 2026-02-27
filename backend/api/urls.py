from django.urls import path
from . import views

urlpatterns = [
    path("auth/signup",    views.signup,          name="signup"),
    path("auth/signin",    views.signin,          name="signin"),
    path("session/start",  views.start_session,   name="start_session"),
    path("session/end",    views.end_session,      name="end_session"),
    path("video/stream",   views.stream_process,  name="stream_process"),
    path("video/upload",   views.upload_video,    name="upload_video"),
]
