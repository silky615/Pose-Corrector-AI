from django.urls import path
from . import views

urlpatterns = [
    path("auth/send-otp",    views.send_otp,   name="send_otp"),
    path("auth/verify-otp",  views.verify_otp, name="verify_otp"),
    path("auth/signup",    views.signup,          name="signup"),
    path("auth/signin",    views.signin,          name="signin"),
    path("auth/forgot",    views.forgot_password, name="forgot_password"),
    path("auth/reset-confirm", views.reset_password_confirm, name="reset_password_confirm"),
    path("auth/reset-by-email", views.reset_password_by_email, name="reset_password_by_email"),
    path("profile",       views.profile,          name="profile"),
    path("chart-data",    views.chart_data,       name="chart-data"),
    path("session/start",  views.start_session,   name="start_session"),
    path("session/end",    views.end_session,      name="end_session"),
    path("video/stream",   views.stream_process,  name="stream_process"),
    path("video/upload",   views.upload_video,    name="upload_video"),
]
