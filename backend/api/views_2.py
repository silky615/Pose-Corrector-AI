import os
import tempfile
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

# In-memory state for rep counting per session
_posture_state = {}


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


# ─── Landmark analysis for live stream ───────────────────────────────────────
def analyze_landmarks(exercise_type, landmarks):
    def get(i):
        if i < len(landmarks):
            return landmarks[i]
        return {"x": 0, "y": 0, "z": 0, "visibility": 0}

    def angle(a, b, c):
        import math
        ax, ay = a["x"] - b["x"], a["y"] - b["y"]
        cx, cy = c["x"] - b["x"], c["y"] - b["y"]
        dot = ax * cx + ay * cy
        mag = (math.sqrt(ax**2 + ay**2) * math.sqrt(cx**2 + cy**2)) or 1
        return math.degrees(math.acos(max(-1, min(1, dot / mag))))

    if exercise_type == "hand_raise":
        l_wrist, r_wrist, nose = get(15), get(16), get(0)
        if l_wrist["y"] < nose["y"] or r_wrist["y"] < nose["y"]:
            return True, 90, "Good! Hand raised above head."
        return False, 20, "Hand Raise: Lift one or both hands above your head."

    elif exercise_type == "bicep_curl":
        elbow_angle = angle(get(11), get(13), get(15))
        if elbow_angle < 60:
            return True, 95, "Great curl! Full range of motion."
        elif elbow_angle < 100:
            return True, 70, "Good — keep curling higher."
        return False, 30, "Bicep Curl: Bend your elbow more to complete the rep."

    elif exercise_type == "squat":
        knee_angle = angle(get(23), get(25), get(27))
        if knee_angle < 100:
            return True, 95, "Deep squat! Great form."
        elif knee_angle < 140:
            return True, 65, "Go deeper for a full squat."
        return False, 25, "Squat: Bend your knees and lower your hips."

    elif exercise_type == "lunge":
        knee_angle = angle(get(23), get(25), get(27))
        if knee_angle < 110:
            return True, 90, "Good lunge depth!"
        return False, 35, "Lunge: Step forward and lower your knee toward the floor."

    elif exercise_type == "plank":
        slope = abs(get(11)["y"] - get(27)["y"])
        if slope < 0.15:
            return True, 92, "Perfect plank alignment!"
        return False, 40, "Plank: Keep your body in a straight line from head to toe."

    elif exercise_type == "push_up":
        elbow_angle = angle(get(11), get(13), get(15))
        if elbow_angle < 90:
            return True, 95, "Great push-up depth!"
        elif elbow_angle < 140:
            return True, 60, "Go lower for full range."
        return False, 30, "Push-Up: Lower your chest toward the floor."

    elif exercise_type == "lateral_raise":
        arm_angle = angle(get(23), get(11), get(13))
        if arm_angle > 70:
            return True, 90, "Arms raised to shoulder level!"
        return False, 30, "Lateral Raise: Lift your arms out to the sides to shoulder height."

    elif exercise_type == "tricep_kickback":
        elbow_angle = angle(get(11), get(13), get(15))
        if elbow_angle > 150:
            return True, 90, "Full extension! Great tricep activation."
        return False, 40, "Tricep Kickback: Extend your arm fully behind you."

    elif exercise_type == "wall_sit":
        knee_angle = angle(get(23), get(25), get(27))
        if 80 < knee_angle < 110:
            return True, 95, "Perfect wall sit position!"
        return False, 35, "Wall Sit: Keep knees at 90 degrees."

    elif exercise_type == "tree_pose":
        foot_diff = abs(get(27)["y"] - get(28)["y"])
        if foot_diff > 0.1:
            return True, 85, "Good balance! Hold the pose."
        return False, 30, "Tree Pose: Lift one foot and place it against your standing leg."

    elif exercise_type == "sit_up":
        torso_angle = angle(get(25), get(23), get(11))
        if torso_angle < 60:
            return True, 90, "Great sit-up! Full crunch."
        return False, 30, "Sit-Up: Curl your torso up toward your knees."

    return True, 50, "Keep going!"


# ─── Live Stream ──────────────────────────────────────────────────────────────
@api_view(["POST"])
def live_stream(request):
    exercise_type = request.GET.get("type")
    session_id = request.GET.get("session_id")
    data = request.data
    landmarks = data.get("landmarks", [])
    counter = data.get("counter", 0)

    posture_ok, accuracy, message = analyze_landmarks(exercise_type, landmarks)

    # Rep counting: bad → good transition = 1 rep
    new_counter = counter
    if session_id:
        cache_key = f"prev_posture_{session_id}"
        prev_ok = _posture_state.get(cache_key, False)
        if posture_ok and not prev_ok:
            new_counter = int(counter) + 1
        _posture_state[cache_key] = posture_ok

    if session_id:
        try:
            session = Session.objects.get(id=session_id)
            ExerciseFeedback.objects.create(
                session=session,
                posture_ok=posture_ok,
                accuracy=accuracy,
                feedback_message=message,
                counter=new_counter,
            )
            if new_counter > int(counter):
                Rep.objects.get_or_create(
                    session=session,
                    rep_number=new_counter,
                    defaults={"accuracy": accuracy, "posture_ok": posture_ok, "feedback_message": message}
                )
        except Session.DoesNotExist:
            pass
        except Exception as e:
            print("Feedback/Rep save error:", str(e))

    return JsonResponse({"posture_ok": posture_ok, "accuracy": accuracy, "message": message, "counter": new_counter})


# ─── Upload Video ─────────────────────────────────────────────────────────────
@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_video(request):
    exercise_type = request.GET.get("type")
    user_id = request.GET.get("user_id")

    if not exercise_type:
        return JsonResponse({"message": "Exercise type not given"}, status=400)

    try:
        video = request.FILES["file"]
        now = int(datetime.now().strftime("%Y%m%d%H%M%S"))
        name_to_save = f"video_{now}.mp4"

        # Fix: handle InMemoryUploadedFile (small files) vs TemporaryUploadedFile (large files)
        if hasattr(video, "temporary_file_path"):
            video_path = video.temporary_file_path()
        else:
            suffix = os.path.splitext(video.name)[1] or ".mp4"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            for chunk in video.chunks():
                tmp.write(chunk)
            tmp.close()
            video_path = tmp.name

        results, *other_data = exercise_detection(
            video_file_path=video_path,
            video_name_to_save=name_to_save,
            exercise_type=exercise_type,
            rescale_percent=40,
        )

        # Clean up temp file if we created one
        if not hasattr(video, "temporary_file_path"):
            try:
                os.unlink(video_path)
            except Exception:
                pass

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
                session = Session.objects.create(
                    user=user,
                    exercise_type=exercise_type,
                    mode="upload",
                    total_reps=total_reps,
                    avg_accuracy=accuracy,
                )
                session.ended_at = datetime.now()
                session.save()
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
