# api/models.py
# Place this file at:
# /Users/perk/Desktop/MSSC/Capstone/Exercise-Correction/web/server/api/models.py

from django.db import models


class User(models.Model):
    first_name    = models.CharField(max_length=100)
    last_name     = models.CharField(max_length=100, blank=True)
    email         = models.EmailField(unique=True)
    password_hash = models.CharField(max_length=255)
    age           = models.IntegerField(null=True, blank=True)
    height    = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight    = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"


class Session(models.Model):
    MODE_CHOICES = [('live', 'Live'), ('upload', 'Upload')]

    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    exercise_type = models.CharField(max_length=50)
    mode          = models.CharField(max_length=10, choices=MODE_CHOICES, default='live')
    started_at    = models.DateTimeField(auto_now_add=True)
    ended_at      = models.DateTimeField(null=True, blank=True)
    total_reps    = models.IntegerField(default=0)
    avg_accuracy  = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'sessions'

    def __str__(self):
        return f"Session {self.id} — {self.exercise_type} ({self.mode})"


class Rep(models.Model):
    session          = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='reps')
    rep_number       = models.IntegerField()
    accuracy         = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    posture_ok       = models.BooleanField(default=False)
    feedback_message = models.CharField(max_length=500, blank=True)
    timestamp        = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reps'

    def __str__(self):
        return f"Rep {self.rep_number} — Session {self.session_id}"


class VideoUpload(models.Model):
    session          = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='video_uploads')
    user             = models.ForeignKey(User, on_delete=models.CASCADE, related_name='video_uploads')
    exercise_type    = models.CharField(max_length=50)
    file_path        = models.CharField(max_length=500)
    uploaded_at      = models.DateTimeField(auto_now_add=True)
    posture_ok       = models.BooleanField(default=False)
    accuracy         = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    total_reps       = models.IntegerField(default=0)
    feedback_message = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = 'video_uploads'

    def __str__(self):
        return f"Upload {self.id} — {self.exercise_type} by User {self.user_id}"


class ExerciseFeedback(models.Model):
    session          = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='feedback')
    posture_ok       = models.BooleanField(default=False)
    accuracy         = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    feedback_message = models.CharField(max_length=500, blank=True)
    counter          = models.IntegerField(default=0)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exercise_feedback'

    def __str__(self):
        return f"Feedback — Session {self.session_id} — {'OK' if self.posture_ok else 'BAD'}"
