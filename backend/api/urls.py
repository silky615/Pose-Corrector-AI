from django.urls import path
from . import views

urlpatterns = [
    path("auth/signup",    views.signup,          name="signup"),
    path("auth/signin",    views.signin,          name="signin"),
    path("auth/forgot",    views.forgot_password, name="forgot_password"),
    path("auth/reset-confirm", views.reset_password_confirm, name="reset_password_confirm"),
    path("profile",       views.profile,          name="profile"),
    path("session/start",  views.start_session,   name="start_session"),
    path("session/end",    views.end_session,      name="end_session"),
    path("video/stream",   views.stream_process,  name="stream_process"),
    path("video/upload",   views.upload_video,    name="upload_video"),
]
