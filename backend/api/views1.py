import os
import mimetypes
from datetime import datetime
from wsgiref.util import FileWrapper
from django.contrib.auth.hashers import make_password, check_password
from api.models import User, Session, Rep, ExerciseFeedback, VideoUpload

from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from django.http import StreamingHttpResponse, JsonResponse

from detection.main import exercise_detection
from detection.utils import get_static_file_url


# ─── Stream stored video ──────────────────────────────────────────────────────
@api_view(["GET"])
def stream_video(request):
    video_name = request.GET.get("video_name")
    if not video_name:
        return JsonResponse({"message": "File name not given"}, status=400)
    static_url = get_static_file_url(f"media/{video_name}")
    if not static_url:
        return JsonResponse({"message": "File not found"}, status=404)
    video_size = os.path.getsize(static_url)
    content_type, _ = mimetypes.guess_type(static_url)
    content_type = content_type or "application/octet-stream"
    chunk_size = video_size // 10
    response = StreamingHttpResponse(
        FileWrapper(open(static_url, "rb"), chunk_size),
        content_type=content_type
    )
    response["Content-Length"] = video_size
    response["Accept-Ranges"] = "bytes"
    return response


# ─── Sign Up ──────────────────────────────────────────────────────────────────
@api_view(["POST"])
def signup(request):
    data = request.data
    print("=== SIGNUP CALLED ===", data)
    try:
        if User.objects.filter(email=data["email"]).exists():
            return JsonResponse({"error": "Email already exists"}, status=400)
        user = User.objects.create(
            first_name=data["firstName"],
            last_name=data.get("lastName", ""),
            email=data["email"],
            age=data["age"],
            height=data["height"],
            weight=data["weight"],
            password_hash=make_password(data["password"]),
        )
        print("User created:", user.email)
        return JsonResponse({"success": True, "name": user.first_name, "email": user.email, "user_id": user.id})
    except Exception as e:
        print("=== SIGNUP ERROR ===", str(e))
        return JsonResponse({"error": str(e)}, status=400)


# ─── Sign In ──────────────────────────────────────────────────────────────────
@api_view(["POST"])
def signin(request):
    data = request.data
    try:
        user = User.objects.get(email=data["email"])
        if check_password(data["password"], user.password_hash):
            return JsonResponse({"success": True, "name": user.first_name, "email": user.email, "user_id": user.id})
        return JsonResponse({"error": "Invalid password"}, status=401)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)


# ─── Start Session ────────────────────────────────────────────────────────────
@api_view(["POST"])
def start_session(request):
    """Called when user selects an exercise — creates a session row"""
    data = request.data
    try:
        user = User.objects.get(id=data["user_id"])
        session = Session.objects.create(
            user=user,
            exercise_type=data["exercise_type"],
            mode=data.get("mode", "live"),
        )
        print(f"Session started: {session.id} — {session.exercise_type} ({session.mode})")
        return JsonResponse({"success": True, "session_id": session.id})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        print("Session start error:", str(e))
        return JsonResponse({"error": str(e)}, status=400)


# ─── End Session ──────────────────────────────────────────────────────────────
@api_view(["POST"])
def end_session(request):
    """Called when user stops — updates session with end time, total reps, avg accuracy"""
    data = request.data
    try:
        session = Session.objects.get(id=data["session_id"])
        session.ended_at = datetime.now()
        session.total_reps = data.get("total_reps", 0)
        session.avg_accuracy = data.get("avg_accuracy", 0.00)
        session.save()
        print(f"Session ended: {session.id} — reps: {session.total_reps}")
        return JsonResponse({"success": True})
    except Session.DoesNotExist:
        return JsonResponse({"error": "Session not found"}, status=404)
    except Exception as e:
        print("Session end error:", str(e))
        return JsonResponse({"error": str(e)}, status=400)


# ─── Live Stream ──────────────────────────────────────────────────────────────
@api_view(["POST"])
def live_stream(request):
    """Receives landmarks, returns AI feedback, saves ExerciseFeedback + Rep rows"""
    exercise_type = request.GET.get("type")
    session_id = request.GET.get("session_id")
    data = request.data

    # Replace with your actual detection logic
    posture_ok = True
    accuracy = 85
    message = "Good form!"
    counter = data.get("counter", 0)

    if session_id:
        try:
            session = Session.objects.get(id=session_id)

            # Save feedback row
            ExerciseFeedback.objects.create(
                session=session,
                posture_ok=posture_ok,
                accuracy=accuracy,
                feedback_message=message,
                counter=counter,
            )

            # Save rep row when a new rep is detected
            if counter and int(counter) > 0:
                Rep.objects.get_or_create(
                    session=session,
                    rep_number=int(counter),
                    defaults={
                        "accuracy": accuracy,
                        "posture_ok": posture_ok,
                        "feedback_message": message,
                    }
                )
        except Session.DoesNotExist:
            print(f"Session {session_id} not found")
        except Exception as e:
            print("Feedback/Rep save error:", str(e))

    return JsonResponse({
        "posture_ok": posture_ok,
        "accuracy": accuracy,
        "message": message,
        "counter": counter,
    })


# ─── Upload Video ─────────────────────────────────────────────────────────────
@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_video(request):
    """Processes uploaded video, saves Session + VideoUpload rows"""
    exercise_type = request.GET.get("type")
    user_id = request.GET.get("user_id")

    if not exercise_type:
        return JsonResponse({"message": "Exercise type not given"}, status=400)

    try:
        video = request.FILES["file"]
        now = int(datetime.now().strftime("%Y%m%d%H%M%S"))
        name_to_save = f"video_{now}.mp4"

        results, *other_data = exercise_detection(
            video_file_path=video.temporary_file_path(),
            video_name_to_save=name_to_save,
            exercise_type=exercise_type,
            rescale_percent=40,
        )

        host = request.build_absolute_uri("/")
        for index, error in enumerate(results):
            if error["frame"]:
                results[index]["frame"] = host + f"static/images/{error['frame']}"

        total_reps = other_data[0] if exercise_type in ["squat", "lunge", "bicep_curl"] else 0
        posture_ok = all(r.get("posture_ok", True) for r in results) if results else True
        accuracy = sum(r.get("accuracy", 0) for r in results) // len(results) if results else 0
        feedback_message = results[0].get("message", "") if results else ""

        if user_id:
            try:
                user = User.objects.get(id=user_id)

                # Create a session for this upload
                session = Session.objects.create(
                    user=user,
                    exercise_type=exercise_type,
                    mode="upload",
                    total_reps=total_reps,
                    avg_accuracy=accuracy,
                )
                session.ended_at = datetime.now()
                session.save()

                # Save to video_uploads table
                VideoUpload.objects.create(
                    session=session,
                    user=user,
                    exercise_type=exercise_type,
                    file_path=name_to_save,
                    posture_ok=posture_ok,
                    accuracy=accuracy,
                    total_reps=total_reps,
                    feedback_message=feedback_message,
                )
                print(f"VideoUpload saved — user {user_id}, session {session.id}")

            except User.DoesNotExist:
                print(f"User {user_id} not found, skipping DB save")
            except Exception as e:
                print("VideoUpload save error:", str(e))

        response_data = {
            "type": exercise_type,
            "processed": True,
            "file_name": name_to_save,
            "details": results,
            "posture_ok": posture_ok,
            "accuracy": accuracy,
            "message": feedback_message or "Analysis complete",
        }
        if exercise_type in ["squat", "lunge", "bicep_curl"]:
            response_data["counter"] = total_reps

        return JsonResponse(response_data, status=200)

    except Exception as e:
        print("Upload error:", str(e))
        return JsonResponse({"error": str(e)}, status=400)
