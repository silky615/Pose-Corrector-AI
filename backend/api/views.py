import os
import sys
import time
import tempfile
import mimetypes
import traceback
from datetime import datetime
from wsgiref.util import FileWrapper
from django.contrib.auth.hashers import make_password, check_password

import numpy as np
import pickle
import warnings

print("=" * 60)
print(f"✅ LOADING views.py FROM: {__file__}")
print("=" * 60)

from django.conf import settings
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    parser_classes,
)
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

# --- Exercise logic: constants and pure helpers (single place for all exercise logic) ---
from api.exercise_logic import (
    _dist,
    BICEP_IMPORTANT_LANDMARKS,
    PLANK_IMPORTANT_LANDMARKS,
    SQUAT_IMPORTANT_LANDMARKS,
    TREE_POSE_IMPORTANT_LANDMARKS,
    PUSH_UP_IMPORTANT_LANDMARKS,
    LUNGE_IMPORTANT_LANDMARKS,
    POSE_LANDMARK_INDEX,
    KEY_LANDMARKS_FOR_ACCURACY,
    IDEAL_POSES,
    _accuracy_vs_ideal,
    _ideal_landmarks_for_response,
)

# Lazy import detection modules to prevent startup crashes
def get_exercise_detection():
    """Lazy-load exercise_detection function and ensure models are loaded."""
    try:
        import detection.main as _det_main
        # Always force load — safe because load_machine_learning_models checks internally
        _det_main.load_machine_learning_models()
        print(f"[views] EXERCISE_DETECTIONS keys: {list(_det_main.EXERCISE_DETECTIONS.keys()) if _det_main.EXERCISE_DETECTIONS else 'STILL NONE'}")
        return _det_main.exercise_detection
    except Exception as e:
        import traceback
        print(f"[views] get_exercise_detection ERROR: {e}")
        traceback.print_exc()
        return None

def get_calculate_angle():
    """Lazy-load calculate_angle function."""
    try:
        from detection.utils import calculate_angle
        return calculate_angle
    except Exception as e:
        print(f"Warning: Could not import calculate_angle: {e}")
        return None

def get_static_file_url(file_name: str):
    """Lazy-load get_static_file_url function."""
    try:
        from detection.utils import get_static_file_url as _get_static_file_url
        return _get_static_file_url(file_name)
    except Exception as e:
        print(f"Warning: Could not import get_static_file_url: {e}")
        return None

# --- Configuration ---
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

MODEL_DIR = os.path.join(settings.BASE_DIR, "static", "model")

import sys as _sys
# ==============================================================
# views.py LOADED - Exercise Correction AI Server
# If you see this in terminal = correct file is running
# ==============================================================
print("=" * 60)
print("[views.py] LOADED - Exercise Correction AI Server")
print(f"[views.py] Python : {_sys.version.split()[0]}")
try:
    import numpy as _np_c; print(f"[views.py] NumPy  : {_np_c.__version__}")
except: print("[views.py] NumPy  : NOT FOUND")
try:
    import sklearn as _sk_c; print(f"[views.py] sklearn: {_sk_c.__version__}")
except: print("[views.py] sklearn: NOT FOUND")
print("=" * 60)

# Lazy-load MediaPipe to prevent startup crashes
# Use a process-level flag to avoid repeated import attempts
_mp_pose = None
_mp_import_failed = False

def get_mp_pose():
    """Lazy-load MediaPipe pose enum."""
    global _mp_pose, _mp_import_failed
    
    if _mp_import_failed:
        return None
        
    if _mp_pose is None:
        try:
            # Try importing MediaPipe - if it segfaults, Python will crash
            # but at least it won't crash on startup
            import mediapipe as mp
            _mp_pose = mp.solutions.pose
            print("MediaPipe loaded successfully")
        except Exception as e:
            print(f"Warning: Could not import MediaPipe: {e}")
            _mp_import_failed = True
            return None
    return _mp_pose

def load_machine_learning_model(model_name: str):
    """Utility to safely load pickle files from the static/model directory."""
    path = os.path.join(MODEL_DIR, model_name)
    if not os.path.exists(path):
        print(f"Warning: {model_name} not found at {path}")
        return None
    try:
        with open(path, "rb") as f:
            return pickle.load(f)
    except Exception as e:
        print(f"Error loading {model_name}: {e}")
        return None

# Lazy-load models to prevent startup crashes
# Models will be loaded on first use
_models_cache = {}
_models_loaded = False

def get_models():
    """Lazy-load models on first access."""
    global _models_cache, _models_loaded
    
    if _models_loaded:
        return _models_cache
    
    print("AI Server: Loading models (lazy load)...")
    try:
        _models_cache = {
            "bicep_curl": {
                "model": load_machine_learning_model("bicep_curl_model.pkl"),
                "scaler": load_machine_learning_model("bicep_curl_input_scaler.pkl"),
            },
            "plank": {
                "model": load_machine_learning_model("plank_model.pkl"),
                "scaler": load_machine_learning_model("plank_input_scaler.pkl"),
            },
            "squat": {
                "model": load_machine_learning_model("squat_model.pkl"),
                "scaler": load_machine_learning_model("squat_input_scaler.pkl"),
            },
            "lunge": {
                "stage_model": load_machine_learning_model("lunge_stage_model.pkl"),
                "err_model": load_machine_learning_model("lunge_err_model.pkl"),
                "scaler": load_machine_learning_model("lunge_input_scaler.pkl"),
            },
            "push_up": {
                "model": load_machine_learning_model("push_up_model.pkl"),
                "scaler": load_machine_learning_model("push_up_input_scaler.pkl"),
            },
            "tree_pose": {
                "model": load_machine_learning_model("tree_pose_model.pkl"),
                "scaler": load_machine_learning_model("tree_pose_input_scaler.pkl"),
            },
        }
        _models_loaded = True
        print("AI Server: All models ready.")
    except Exception as e:
        print(f"Error loading models: {e}")
        _models_cache = {}
    
    return _models_cache

# --- Feature extraction: build_feature_row uses constants from exercise_logic ---

def build_feature_row(ex_type: str, landmarks_json: list) -> np.ndarray:
    """
    Build a 1D feature vector for the given exercise type from
    a JSON list of MediaPipe landmarks.

    This MUST match the feature ordering used during model training,
    otherwise the StandardScaler / classifier dimensions will not align.
    """
    if ex_type == "bicep_curl":
        important = BICEP_IMPORTANT_LANDMARKS
    elif ex_type == "plank":
        important = PLANK_IMPORTANT_LANDMARKS
    elif ex_type == "squat":
        important = SQUAT_IMPORTANT_LANDMARKS
    elif ex_type == "tree_pose":
        important = TREE_POSE_IMPORTANT_LANDMARKS
    elif ex_type == "push_up":
        important = PUSH_UP_IMPORTANT_LANDMARKS
    elif ex_type == "lunge":
        important = LUNGE_IMPORTANT_LANDMARKS
    else:
        # Fallback: use all landmarks as-is (33 * 4 = 132)
        row = []
        for lm in landmarks_json:
            row.extend([lm["x"], lm["y"], lm["z"], lm["visibility"]])
        return np.array(row)

    row = []
    mp_pose = get_mp_pose()
    if mp_pose is not None:
        landmark_index = {name: mp_pose.PoseLandmark[name].value for name in important}
    else:
        landmark_index = {name: POSE_LANDMARK_INDEX[name] for name in important if name in POSE_LANDMARK_INDEX}
    
    for name in important:
        idx = landmark_index.get(name)
        if idx is None or idx >= len(landmarks_json):
            row.extend([0.5, 0.5, 0.0, 0.5])
            continue
        lm = landmarks_json[idx]
        if lm is None:
            row.extend([0.5, 0.5, 0.0, 0.5])
            continue
        if isinstance(lm, dict):
            row.extend([lm.get("x", 0.5), lm.get("y", 0.5), lm.get("z", 0.0), lm.get("visibility", 0.5)])
        else:
            row.extend([getattr(lm, "x", 0.5), getattr(lm, "y", 0.5), getattr(lm, "z", 0.0), getattr(lm, "visibility", 0.5)])

    return np.array(row)

def validate_bicep_curl_pose(landmarks_json: list) -> tuple:
    calculate_angle = get_calculate_angle()
    if calculate_angle is None:
        return False, "Angle calculation not available.", None
    """
    Validate that the user is actually performing a bicep curl by checking:
    1. Key joints are visible
    2. Arm is bent (elbow angle is in curling range)
    3. Returns (is_valid, coaching_message, best_arm_angle)
    """
    VISIBILITY_THRESHOLD = 0.6
    # Only reject wrist clearly above shoulder (hand raise rejection)
    # Full curl goes ~160 deg (arm down) to ~30 deg (fully curled) — never block by angle
    MAX_SHOULDER_WRIST_Y_DIFF = 0.05
    
    mp_pose = get_mp_pose()
    if mp_pose is not None:
        def get_landmark(name: str):
            idx = mp_pose.PoseLandmark[name].value
            return landmarks_json[idx]
    else:
        def get_landmark(name: str):
            idx = POSE_LANDMARK_INDEX.get(name)
            if idx is None or idx >= len(landmarks_json):
                return None
            return landmarks_json[idx]
    
    # Check both arms, use the one with better visibility/angle
    arms_to_check = [
        ("LEFT", "left"),
        ("RIGHT", "right"),
    ]
    
    best_angle = None
    best_arm_side = None
    best_visible = False
    
    for side_upper, side_lower in arms_to_check:
        shoulder = get_landmark(f"{side_upper}_SHOULDER")
        elbow = get_landmark(f"{side_upper}_ELBOW")
        wrist = get_landmark(f"{side_upper}_WRIST")
        if shoulder is None or elbow is None or wrist is None:
            continue
        # Handle dict or object landmarks
        def _vis(lm): return lm.get("visibility", 0.5) if isinstance(lm, dict) else getattr(lm, "visibility", 0.5)
        def _xy(lm): return (lm.get("x", 0.5), lm.get("y", 0.5)) if isinstance(lm, dict) else (getattr(lm, "x", 0.5), getattr(lm, "y", 0.5))
        # Check visibility
        if (_vis(shoulder) < VISIBILITY_THRESHOLD or
            _vis(elbow) < VISIBILITY_THRESHOLD or
            _vis(wrist) < VISIBILITY_THRESHOLD):
            continue
        
        # Calculate elbow angle (shoulder-elbow-wrist)
        shoulder_pt = [float(_xy(shoulder)[0]), float(_xy(shoulder)[1])]
        elbow_pt = [float(_xy(elbow)[0]), float(_xy(elbow)[1])]
        wrist_pt = [float(_xy(wrist)[0]), float(_xy(wrist)[1])]
        
        try:
            angle = calculate_angle(shoulder_pt, elbow_pt, wrist_pt)
            
            # Track the best arm (most bent, visible)
            if best_angle is None or angle < best_angle:
                best_angle = angle
                best_arm_side = side_lower
                best_visible = True
        except:
            continue
    
    # If no arm is visible, prompt user
    if not best_visible or best_angle is None:
        return False, "Position yourself so your arms are fully visible in the camera.", None
    
    # Enforce basic bicep‑curl geometry:
    # 1) Wrist should be roughly at or below the shoulder (in image coords y grows downward)
    #    This rejects overhead hand‑raise poses.
    # 2) Arm angle must be within curling range.
    _sh = get_landmark(f"{best_arm_side.upper()}_SHOULDER")
    _wr = get_landmark(f"{best_arm_side.upper()}_WRIST")
    if _sh is None or _wr is None:
        return True, None, best_angle
    shoulder_y = _sh.get("y", 0.5) if isinstance(_sh, dict) else getattr(_sh, "y", 0.5)
    wrist_y = _wr.get("y", 0.5) if isinstance(_wr, dict) else getattr(_wr, "y", 0.5)

    if wrist_y < shoulder_y - MAX_SHOULDER_WRIST_Y_DIFF:
        # Wrist clearly above shoulder → looks like a hand raise, not curl
        return (
            False,
            f"Lower your {best_arm_side} hand to the side of your body to start the curl.",
            best_angle,
        )
    
    # Reject arms spread horizontally (T-pose / arms out to sides)
    _el = get_landmark(f"{best_arm_side.upper()}_ELBOW")
    if _el is not None and _sh is not None:
        elbow_x = _el.get("x", 0.5) if isinstance(_el, dict) else getattr(_el, "x", 0.5)
        shoulder_x = _sh.get("x", 0.5) if isinstance(_sh, dict) else getattr(_sh, "x", 0.5)
        wrist_x = _wr.get("x", 0.5) if isinstance(_wr, dict) else getattr(_wr, "x", 0.5)
        horizontal_spread = abs(wrist_x - shoulder_x)
        vertical_drop = abs(wrist_y - shoulder_y)
        if horizontal_spread > vertical_drop * 1.5:
            return (
                False,
                f"Lower your {best_arm_side} arm to your side — arms should not be spread outward.",
                best_angle,
            )

    # Arm is visible and not an overhead raise — valid curl at any angle
    return True, None, best_angle

def validate_torso_upright(landmarks_json: list) -> tuple:
    """
    Check body position is correct for bicep curl:
    1. Torso must be upright (no forward/backward lean)
    2. Legs must be straight (no squatting/lunging)
    Returns (is_valid, coaching_message)
    """
    mp_pose_enum = get_mp_pose()
    if not landmarks_json or len(landmarks_json) < 33:
        return True, None

    calculate_angle = get_calculate_angle()

    VIS = 0.5

    if mp_pose_enum is not None:
        def get_lm(name):
            i = mp_pose_enum.PoseLandmark[name].value
            if i >= len(landmarks_json):
                return None
            return landmarks_json[i]
    else:
        def get_lm(name):
            i = POSE_LANDMARK_INDEX.get(name)
            if i is None or i >= len(landmarks_json):
                return None
            return landmarks_json[i]

    ls = get_lm("LEFT_SHOULDER")
    rs = get_lm("RIGHT_SHOULDER")
    lh = get_lm("LEFT_HIP")
    rh = get_lm("RIGHT_HIP")
    lk = get_lm("LEFT_KNEE")
    rk = get_lm("RIGHT_KNEE")
    la = get_lm("LEFT_ANKLE")
    ra = get_lm("RIGHT_ANKLE")

    if not all([ls, rs, lh, rh]):
        return True, None

    # --- Check 1: Legs must be straight (reject squatting) ---
    # If knees are visible and bent, the person is squatting not curling
    if all([lh, lk, la]) and calculate_angle is not None:
        if (lk.get("visibility", 0) > VIS and
            lh.get("visibility", 0) > VIS and
            la.get("visibility", 0) > VIS):
            left_knee_angle = calculate_angle(
                [lh["x"], lh["y"]],
                [lk["x"], lk["y"]],
                [la["x"], la["y"]]
            )
            if left_knee_angle < 150:
                return False, "Stand up straight with legs straight — do not squat during a bicep curl."

    if all([rh, rk, ra]) and calculate_angle is not None:
        if (rk.get("visibility", 0) > VIS and
            rh.get("visibility", 0) > VIS and
            ra.get("visibility", 0) > VIS):
            right_knee_angle = calculate_angle(
                [rh["x"], rh["y"]],
                [rk["x"], rk["y"]],
                [ra["x"], ra["y"]]
            )
            if right_knee_angle < 150:
                return False, "Stand up straight with legs straight — do not squat during a bicep curl."

    # --- Check 2: Torso must be upright (reject forward/backward lean) ---
    if (ls.get("visibility", 0) < VIS or rs.get("visibility", 0) < VIS or
        lh.get("visibility", 0) < VIS or rh.get("visibility", 0) < VIS):
        return True, None

    shoulder_mid_x = (ls.get("x", 0.5) + rs.get("x", 0.5)) / 2
    hip_mid_x = (lh.get("x", 0.5) + rh.get("x", 0.5)) / 2
    shoulder_mid_y = (ls.get("y", 0.5) + rs.get("y", 0.5)) / 2
    hip_mid_y = (lh.get("y", 0.5) + rh.get("y", 0.5)) / 2

    horiz_offset = shoulder_mid_x - hip_mid_x
    vert_distance = hip_mid_y - shoulder_mid_y

    if vert_distance > 0.05:
        lean_ratio = abs(horiz_offset) / vert_distance
        if lean_ratio > 0.25:
            if horiz_offset > 0:
                return False, "Stand up straight — you are leaning forward. Keep your back upright for a proper bicep curl."
            else:
                return False, "Stand up straight — you are leaning backward. Keep your back upright for a proper bicep curl."

    return True, None

def validate_plank_pose(landmarks_json: list) -> tuple:
    """
    Only reject clearly standing poses (hips much lower than shoulders).
    Returns (is_plank_like, coaching_message). Safe with None/missing landmarks.
    """
    if not landmarks_json or len(landmarks_json) < 33:
        return False, "Show your full body in the frame."
    mp_pose_enum = get_mp_pose()
    if mp_pose_enum is not None:
        def get_y(name):
            i = mp_pose_enum.PoseLandmark[name].value
            if i >= len(landmarks_json):
                return 0.5
            lm = landmarks_json[i]
            if lm is None:
                return 0.5
            if isinstance(lm, dict):
                return lm.get("y", 0.5)
            return getattr(lm, "y", 0.5)
    else:
        def get_y(name):
            i = POSE_LANDMARK_INDEX.get(name)
            if i is None or i >= len(landmarks_json):
                return 0.5
            lm = landmarks_json[i]
            if lm is None:
                return 0.5
            if isinstance(lm, dict):
                return lm.get("y", 0.5)
            return getattr(lm, "y", 0.5)

    shoulder_y = (get_y("LEFT_SHOULDER") + get_y("RIGHT_SHOULDER")) / 2
    hip_y = (get_y("LEFT_HIP") + get_y("RIGHT_HIP")) / 2
    # Only reject clearly standing: hips much lower than shoulders (very upright)
    if hip_y - shoulder_y > 0.4:
        return False, "Get into plank position. Position yourself face-down with arms straight and body in a line."
    return True, None

def validate_push_up_pose(landmarks_json: list) -> tuple:
    """
    Check that the user is in a push-up-like position (body horizontal, not standing or all-fours).
    Returns (is_ok, coaching_message). Safe with None/missing landmarks.
    """
    if not landmarks_json or len(landmarks_json) < 33:
        return False, "Show your full body in the frame."
    mp_pose_enum = get_mp_pose()
    if mp_pose_enum is not None:
        def get_y(name):
            i = mp_pose_enum.PoseLandmark[name].value
            if i >= len(landmarks_json):
                return 0.5
            lm = landmarks_json[i]
            if lm is None:
                return 0.5
            if isinstance(lm, dict):
                return lm.get("y", 0.5)
            return getattr(lm, "y", 0.5)
    else:
        def get_y(name):
            i = POSE_LANDMARK_INDEX.get(name)
            if i is None or i >= len(landmarks_json):
                return 0.5
            lm = landmarks_json[i]
            if lm is None:
                return 0.5
            if isinstance(lm, dict):
                return lm.get("y", 0.5)
            return getattr(lm, "y", 0.5)

    shoulder_y = (get_y("LEFT_SHOULDER") + get_y("RIGHT_SHOULDER")) / 2
    hip_y = (get_y("LEFT_HIP") + get_y("RIGHT_HIP")) / 2
    wrist_y = (get_y("LEFT_WRIST") + get_y("RIGHT_WRIST")) / 2
    # Reject clearly standing (hips much lower than shoulders)
    if hip_y - shoulder_y > 0.4:
        return False, "Get into push-up position. Face down, hands under shoulders, body in a straight line."
    # Reject only obvious all-fours/tabletop (torso very upright: shoulder well above hip). Allow knee push-up from any angle.
    if shoulder_y < hip_y - 0.28:
        return False, "Get into push-up position. Lower your chest and keep your body in a straight line from head to knees or feet."
    # Reject only if hands are clearly above shoulders (e.g. standing). Allow small tolerance for camera angle.
    if wrist_y < shoulder_y - 0.06:
        return False, "Place your hands on the floor under your shoulders in push-up position."
    return True, None

# --- Real-time bicep curl logic (ported from detection/bicep_curl.py) ---
# Keeps small in-memory state per client IP for rep counting and error prompts.
_BICEP_RT_STATE = {}

def _reset_exercise_counter(client_key: str, ex_type: str) -> None:
    """Reset rep/hold state for the given exercise and client (e.g. when user clicks Reset)."""
    if ex_type == "bicep_curl":
        _BICEP_RT_STATE[client_key] = {
            "left": {"stage": "down", "counter": 0, "loose_upper_arm": False, "peak_contraction_angle": 1000},
            "right": {"stage": "down", "counter": 0, "loose_upper_arm": False, "peak_contraction_angle": 1000},
            "last_peak_error_at_left": -1,
            "last_peak_error_at_right": -1,
        }
    elif ex_type == "squat":
        _SQUAT_RT_STATE[client_key] = {
            "current_stage": "",
            "counter": 0,
            "prev_feet": "",
            "prev_knee": "",
            "started_frames": 0,
            "has_seen_down": False,
        }
    elif ex_type == "push_up":
        _PUSH_UP_RT_STATE[client_key] = {"stage": "up", "counter": 0}
        _LUNGE_RT_STATE[client_key]    = {"stage": "up", "counter": 0}
    elif ex_type == "sit_up":
        _SITUP_RT_STATE[client_key] = {"stage": "down", "counter": 0}
    elif ex_type == "wall_sit":
        _WALL_SIT_RT_STATE[client_key] = {"hold_start_ts": None, "hold_seconds": 0}
    elif ex_type == "tree_pose":
        _TREE_POSE_RT_STATE[client_key] = {"hold_start": None, "rep_counted": False, "counter": 0}

def _get_client_key(request) -> str:
    # Basic keying; good enough for local demo.
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "local")

def _ensure_bicep_state(client_key: str):
    if client_key in _BICEP_RT_STATE:
        return
    _BICEP_RT_STATE[client_key] = {
        "left": {
            "stage": "down",
            "counter": 0,
            "loose_upper_arm": False,
            "peak_contraction_angle": 1000,
        },
        "right": {
            "stage": "down",
            "counter": 0,
            "loose_upper_arm": False,
            "peak_contraction_angle": 1000,
        },
        "last_peak_error_at_left": -1,
        "last_peak_error_at_right": -1,
    }

def _bicep_realtime_update(landmarks_json: list, side: str, state: dict):
    """
    Returns:
      dict with keys:
        visible(bool), bicep_angle(int|None), upper_arm_angle(int|None),
        rep_inc(bool), loose_upper_arm(bool), peak_error(bool)
    """
    calculate_angle = get_calculate_angle()
    mp_pose = get_mp_pose()
    if calculate_angle is None:
        return {"visible": False}

    SIDE = side.upper()
    VIS = 0.65
    STAGE_UP = 100
    STAGE_DOWN = 120
    PEAK_CONTRACTION_THRESHOLD = 60
    LOOSE_UPPER_ARM_ANGLE_THRESHOLD = 55  # was 40, too strict for natural curl

    if mp_pose is not None:
        shoulder = landmarks_json[mp_pose.PoseLandmark[f"{SIDE}_SHOULDER"].value]
        elbow = landmarks_json[mp_pose.PoseLandmark[f"{SIDE}_ELBOW"].value]
        wrist = landmarks_json[mp_pose.PoseLandmark[f"{SIDE}_WRIST"].value]
    else:
        def _lm(name):
            idx = POSE_LANDMARK_INDEX.get(name)
            if idx is None or idx >= len(landmarks_json):
                return None
            return landmarks_json[idx]
        shoulder = _lm(f"{SIDE}_SHOULDER")
        elbow = _lm(f"{SIDE}_ELBOW")
        wrist = _lm(f"{SIDE}_WRIST")

    if shoulder is None or elbow is None or wrist is None:
        return {"visible": False}
    if isinstance(shoulder, dict):
        def _vis(lm): return lm.get("visibility", 0)
        def _xy(lm): return (lm["x"], lm["y"])
    else:
        def _vis(lm): return getattr(lm, "visibility", 0)
        def _xy(lm): return (getattr(lm, "x", 0.5), getattr(lm, "y", 0.5))

    if (_vis(shoulder) < VIS or _vis(elbow) < VIS or _vis(wrist) < VIS):
        return {"visible": False}

    shoulder_pt = [float(_xy(shoulder)[0]), float(_xy(shoulder)[1])]
    elbow_pt = [float(_xy(elbow)[0]), float(_xy(elbow)[1])]
    wrist_pt = [float(_xy(wrist)[0]), float(_xy(wrist)[1])]

    # Curl angle (for stage/counter)
    # One rep = full circle: down -> up -> down (count when we return to down)
    bicep_angle = int(calculate_angle(shoulder_pt, elbow_pt, wrist_pt))

    rep_inc = False
    if bicep_angle > STAGE_DOWN:
        if state["stage"] == "up":
            state["counter"] += 1
            rep_inc = True
        state["stage"] = "down"
    elif bicep_angle < STAGE_UP:
        state["stage"] = "up"

    # Check elbow swing using hip as anchor (stable through full curl range)
    # Compare horizontal distance between elbow and shoulder vs shoulder-to-hip distance
    # If elbow drifts far forward/backward from shoulder line, it is swinging
    loose_upper_arm = False
    if mp_pose is not None:
        try:
            hip = landmarks_json[mp_pose.PoseLandmark[f"{SIDE}_HIP"].value]
            hip_pt = [hip["x"], hip["y"]]
            shoulder_hip_dist = max(abs(shoulder_pt[1] - hip_pt[1]), 0.05)
            elbow_horizontal_drift = abs(elbow_pt[0] - shoulder_pt[0])
            drift_ratio = elbow_horizontal_drift / shoulder_hip_dist
            loose_upper_arm = drift_ratio > 0.45
        except Exception:
            loose_upper_arm = False
    else:
        hip_idx = POSE_LANDMARK_INDEX.get(f"{SIDE}_HIP")
        if hip_idx is not None and hip_idx < len(landmarks_json):
            hip = landmarks_json[hip_idx]
            if hip is not None:
                hx = hip.get("x", 0.5) if isinstance(hip, dict) else getattr(hip, "x", 0.5)
                hy = hip.get("y", 0.5) if isinstance(hip, dict) else getattr(hip, "y", 0.5)
                hip_pt = [float(hx), float(hy)]
                shoulder_hip_dist = max(abs(shoulder_pt[1] - hip_pt[1]), 0.05)
                elbow_horizontal_drift = abs(elbow_pt[0] - shoulder_pt[0])
                drift_ratio = elbow_horizontal_drift / shoulder_hip_dist
                loose_upper_arm = drift_ratio > 0.45
    state["loose_upper_arm"] = loose_upper_arm

    # Peak contraction tracking (detect weak peak when coming back down)
    peak_error = False
    if state["stage"] == "up" and bicep_angle < state["peak_contraction_angle"]:
        state["peak_contraction_angle"] = bicep_angle
    elif state["stage"] == "down":
        if (
            state["peak_contraction_angle"] != 1000
            and state["peak_contraction_angle"] >= PEAK_CONTRACTION_THRESHOLD
        ):
            peak_error = True
        state["peak_contraction_angle"] = 1000

    return {
        "visible": True,
        "bicep_angle": bicep_angle,
        "upper_arm_angle": 0,  # no longer calculated, kept for API compatibility
        "rep_inc": rep_inc,
        "loose_upper_arm": loose_upper_arm,
        "peak_error": peak_error,
        "counter": state["counter"],
    }

# --- Real-time squat state (ported from detection/squat.py concepts) ---
_SQUAT_RT_STATE = {}

def _ensure_squat_state(client_key: str):
    if client_key in _SQUAT_RT_STATE:
        return
    _SQUAT_RT_STATE[client_key] = {
        "current_stage": "",
        "counter": 0,
        "prev_feet": "",
        "prev_knee": "",
        # Debounce / gating so "standing still" doesn't become a rep
        "started_frames": 0,
        "has_seen_down": False,
    }

# --- Real-time push-up state ---
_PUSH_UP_RT_STATE = {}
_LUNGE_RT_STATE    = {}

def _ensure_push_up_state(client_key: str):
    if client_key in _PUSH_UP_RT_STATE:
        return
    _PUSH_UP_RT_STATE[client_key] = {
        "stage": "up",   # "up" = arms extended, "down" = chest low
        "counter": 0,
    }

# --- Real-time wall sit state (hold timer) ---
_WALL_SIT_RT_STATE = {}

# ── Tree Pose: time-based hold state ──────────────────────────────────────────
_TREE_POSE_RT_STATE  = {}
TREE_POSE_HOLD_SECS  = 3  # seconds of correct hold = 1 rep

def _ensure_tree_pose_state(client_key: str):
    if client_key not in _TREE_POSE_RT_STATE:
        _TREE_POSE_RT_STATE[client_key] = {
            "hold_start":  None,
            "rep_counted": False,
            "counter":     0,
            "timer_start": None,
            "elapsed":     0.0,
        }

def _ensure_wall_sit_state(client_key: str):
    if client_key in _WALL_SIT_RT_STATE:
        return
    _WALL_SIT_RT_STATE[client_key] = {
        "hold_start_ts": None,  # float timestamp when user entered good hold
        "hold_seconds": 0,
    }

# --- Real-time sit-up / crunch state (rep count) ---
_SITUP_RT_STATE = {}

def _ensure_situp_state(client_key: str):
    if client_key in _SITUP_RT_STATE:
        return
    _SITUP_RT_STATE[client_key] = {
        "stage": "down",  # "down" = flat, "up" = curled
        "counter": 0,
    }

def _squat_analyze_foot_knee_from_json(landmarks_json: list, stage: str):
    """
    Port of detection/squat.py analyze_foot_knee_placement, but using landmarks_json (list of {x,y,z,visibility})
    instead of MediaPipe results.
    Returns dict:
      foot_placement: -1 unknown, 0 correct, 1 too tight, 2 too wide
      knee_placement: -1 unknown, 0 correct, 1 too tight, 2 too wide
    """
    mp_pose = get_mp_pose()
    if mp_pose is not None:
        def lm(name: str):
            return landmarks_json[mp_pose.PoseLandmark[name].value]
    else:
        def lm(name: str):
            idx = POSE_LANDMARK_INDEX.get(name)
            if idx is None or idx >= len(landmarks_json):
                return {"visibility": 0.0, "x": 0.5, "y": 0.5}
            p = landmarks_json[idx]
            if p is None:
                return {"visibility": 0.0, "x": 0.5, "y": 0.5}
            if isinstance(p, dict):
                return p
            return {"x": getattr(p, "x", 0.5), "y": getattr(p, "y", 0.5), "visibility": getattr(p, "visibility", 0.0)}

    analyzed = {"foot_placement": -1, "knee_placement": -1}

    VISIBILITY_THRESHOLD = 0.6
    FOOT_SHOULDER_RATIO_THRESHOLDS = (1.2, 2.8)
    KNEE_FOOT_RATIO_THRESHOLDS = {
        "up": (0.5, 1.0),
        "middle": (0.7, 1.0),
        "down": (0.7, 1.1),
    }

    lf = lm("LEFT_FOOT_INDEX")
    rf = lm("RIGHT_FOOT_INDEX")
    lk = lm("LEFT_KNEE")
    rk = lm("RIGHT_KNEE")
    ls = lm("LEFT_SHOULDER")
    rs = lm("RIGHT_SHOULDER")

    if (
        lf.get("visibility", 0) < VISIBILITY_THRESHOLD
        or rf.get("visibility", 0) < VISIBILITY_THRESHOLD
        or lk.get("visibility", 0) < VISIBILITY_THRESHOLD
        or rk.get("visibility", 0) < VISIBILITY_THRESHOLD
    ):
        return analyzed

    shoulder_w = _dist((ls["x"], ls["y"]), (rs["x"], rs["y"]))
    foot_w = _dist((lf["x"], lf["y"]), (rf["x"], rf["y"]))
    if shoulder_w <= 1e-6 or foot_w <= 1e-6:
        return analyzed

    foot_shoulder_ratio = round(foot_w / shoulder_w, 1)
    min_ratio, max_ratio = FOOT_SHOULDER_RATIO_THRESHOLDS
    if min_ratio <= foot_shoulder_ratio <= max_ratio:
        analyzed["foot_placement"] = 0
    elif foot_shoulder_ratio < min_ratio:
        analyzed["foot_placement"] = 1
    else:
        analyzed["foot_placement"] = 2

    # Knee placement only evaluated if feet placement is correct (same as repo)
    if analyzed["foot_placement"] != 0:
        analyzed["knee_placement"] = -1
        return analyzed

    knee_w = _dist((lk["x"], lk["y"]), (rk["x"], rk["y"]))
    knee_foot_ratio = round(knee_w / foot_w, 1)

    stage_key = stage if stage in KNEE_FOOT_RATIO_THRESHOLDS else "middle"
    kmin, kmax = KNEE_FOOT_RATIO_THRESHOLDS[stage_key]
    if kmin <= knee_foot_ratio <= kmax:
        analyzed["knee_placement"] = 0
    elif knee_foot_ratio < kmin:
        analyzed["knee_placement"] = 1
    else:
        analyzed["knee_placement"] = 2

    return analyzed

def _squat_is_started(landmarks_json: list):
    """
    Check if squat movement has started.
    Like tree_pose, we'll use landmark positions even with low visibility.
    Returns (started: bool, debug: dict)
    """
    calculate_angle = get_calculate_angle()
    mp_pose = get_mp_pose()
    if calculate_angle is None:
        return True, {"fallback": "no_tools"}

    # Use default values for missing landmarks (like tree_pose does)
    _def = {"x": 0.5, "y": 0.5, "visibility": 0.0}

    if mp_pose is not None:
        def lm(name: str):
            i = mp_pose.PoseLandmark[name].value
            if i >= len(landmarks_json):
                return _def.copy()
            p = landmarks_json[i]
            if p is None:
                return _def.copy()
            if isinstance(p, dict):
                return {"x": p.get("x", 0.5), "y": p.get("y", 0.5), "visibility": p.get("visibility", 0.0)}
            return {"x": getattr(p, "x", 0.5), "y": getattr(p, "y", 0.5), "visibility": getattr(p, "visibility", 0.0)}
    else:
        def lm(name: str):
            i = POSE_LANDMARK_INDEX.get(name)
            if i is None or i >= len(landmarks_json):
                return _def.copy()
            p = landmarks_json[i]
            if p is None:
                return _def.copy()
            if isinstance(p, dict):
                return {"x": p.get("x", 0.5), "y": p.get("y", 0.5), "visibility": p.get("visibility", 0.0)}
            return {"x": getattr(p, "x", 0.5), "y": getattr(p, "y", 0.5), "visibility": getattr(p, "visibility", 0.0)}

    # Get landmarks - even if visibility is low, we'll use the x/y positions
    left = {
        "hip": lm("LEFT_HIP"),
        "knee": lm("LEFT_KNEE"),
        "ankle": lm("LEFT_ANKLE"),
        "shoulder": lm("LEFT_SHOULDER"),
    }
    right = {
        "hip": lm("RIGHT_HIP"),
        "knee": lm("RIGHT_KNEE"),
        "ankle": lm("RIGHT_ANKLE"),
        "shoulder": lm("RIGHT_SHOULDER"),
    }

    # Choose the side with better total visibility (but don't block if low)
    left_vis_sum = sum([
        left["hip"].get("visibility", 0),
        left["knee"].get("visibility", 0),
        left["ankle"].get("visibility", 0),
        left["shoulder"].get("visibility", 0)
    ])
    right_vis_sum = sum([
        right["hip"].get("visibility", 0),
        right["knee"].get("visibility", 0),
        right["ankle"].get("visibility", 0),
        right["shoulder"].get("visibility", 0)
    ])

    # Use whichever side has more visibility
    # Even if both are low, we still pick one and try
    use = left if left_vis_sum >= right_vis_sum else right

    # Extract positions - we'll use these even if visibility is 0
    hip = [use["hip"]["x"], use["hip"]["y"]]
    knee = [use["knee"]["x"], use["knee"]["y"]]
    ankle = [use["ankle"]["x"], use["ankle"]["y"]]
    shoulder = [use["shoulder"]["x"], use["shoulder"]["y"]]

    try:
        # Calculate angles using the positions
        knee_angle = float(calculate_angle(hip, knee, ankle))
        hip_angle = float(calculate_angle(shoulder, hip, knee))

        # Hip drop calculation
        hip_drop = use["hip"]["y"] - use["knee"]["y"]
        shin_len = max(1e-6, use["knee"]["y"] - use["ankle"]["y"])
        hip_drop_ratio = float(hip_drop / shin_len)

        # More permissive thresholds
        started = (knee_angle < 175 or hip_angle < 175)

        return started, {
            "knee_angle": knee_angle,
            "hip_angle": hip_angle,
            "hip_drop_ratio": hip_drop_ratio,
            "visibility_sum": max(left_vis_sum, right_vis_sum)
        }
    except Exception as e:
        # If angle calculation fails, still return True to let ML model handle it
        return True, {"error": str(e), "fallback": True}

@csrf_exempt
@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def stream_process(request):
    """
    Real-time body landmark analysis.

    Expects:
    - query param: ?type=<exercise_type>
    - JSON body: { "landmarks": [ {x, y, z, visibility}, ... ], optional "reset_counter": true }
    """
    ex_type = request.query_params.get("type", "bicep_curl")
    if ex_type == "lunges": ex_type = "lunge"  # normalize frontend id
    landmarks = request.data.get("landmarks", [])
    client_key = _get_client_key(request)
    reset_counter = request.data.get("reset_counter", False)

    print(f"🎯 stream_process: ex={ex_type}, landmarks={len(landmarks)}, file={__file__}")

    if reset_counter:
        client_key = _get_client_key(request)
        _reset_exercise_counter(client_key, ex_type)
        if not landmarks or len(landmarks) < 33:
            return Response(
                {
                    "message": "Count reset.",
                    "counter": 0,
                    "stage": "down",
                    "accuracy": 0,
                    "posture_ok": None,
                }
            )

    if not landmarks or len(landmarks) < 33:
        return Response(
            {
                "message": "Connecting to AI server... (Please show full body)",
                "accuracy": 0,
                "posture_ok": None,
            }
        )

    try:
        # Build feature vector consistent with how the models were trained
        input_row = build_feature_row(ex_type, landmarks)
        X = np.array([input_row])

        # Bicep Curl: use repo-style real-time angle + rep logic, plus lean-back ML.
        if ex_type == "bicep_curl":
            models = get_models()

            current = models.get(ex_type)
            if not current or not current["model"]:
                return Response(
                    {"message": f"Model {ex_type} not found", "accuracy": 0, "posture_ok": False}
                )
            
            # Per-client state: ensure we have it so we can always return the current rep count (even when pose invalid)
            client_key = _get_client_key(request)
            _ensure_bicep_state(client_key)
            st = _BICEP_RT_STATE[client_key]

            # First, validate that user is actually curling (geometric check)
            is_valid_pose, validation_msg, arm_angle = validate_bicep_curl_pose(landmarks)

            if not is_valid_pose:
                # Not in curl position: show 0% but keep showing the actual rep count until reset
                return Response(
                    {
                        "message": f"Bicep Curl: {validation_msg}",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": "down",
                        "counter": max(st["left"]["counter"], st["right"]["counter"]),
                    }
                )

            # Check torso is upright — reject forward/backward lean at waist
            torso_ok, torso_msg = validate_torso_upright(landmarks)
            if not torso_ok:
                return Response(
                    {
                        "message": f"Bicep Curl: {torso_msg}",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": "down",
                        "counter": max(st["left"]["counter"], st["right"]["counter"]),
                    }
                )

            # Update rep/error state (left + right)
            left_info = _bicep_realtime_update(landmarks, "left", st["left"])
            right_info = _bicep_realtime_update(landmarks, "right", st["right"])
            bicep_counter = max(st["left"]["counter"], st["right"]["counter"])
            bicep_stage = "up" if (st["left"]["stage"] == "up" or st["right"]["stage"] == "up") else "down"

            # Lean-back ML (same as repo) – only when very confident
            lean_back = False
            lean_conf = 0
            if current["scaler"]:
                try:
                    Xs = current["scaler"].transform(X)
                    pred = current["model"].predict(Xs)[0]
                    probs = current["model"].predict_proba(Xs)[0]
                    lean_conf = int(max(probs) * 100)
                    # Repo uses "L" as lean-back error
                    if str(pred) == "L" and max(probs) >= 0.75:  # lowered from 0.95 — was too strict
                        lean_back = True
                except Exception:
                    pass

            # Compose coaching message (POSTURE-first priorities)
            if lean_back:
                return Response(
                    {
                        "message": "Bicep Curl: Don’t lean back. Stand tall, tighten your core, and keep your back straight.",
                        "accuracy": max(0, min(100, lean_conf)),
                        "posture_ok": False,
                        "stage": bicep_stage,
                        "counter": bicep_counter,
                    }
                )

            # If arms not visible, keep guiding
            if not left_info.get("visible") and not right_info.get("visible"):
                return Response(
                    {
                        "message": "Bicep Curl: Show both elbows and wrists clearly to the camera.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": bicep_stage,
                        "counter": bicep_counter,
                    }
                )

            # Loose upper arm prompt (elbow swing)
            if left_info.get("loose_upper_arm") or right_info.get("loose_upper_arm"):
                side_txt = (
                    "both arms"
                    if left_info.get("loose_upper_arm") and right_info.get("loose_upper_arm")
                    else ("left arm" if left_info.get("loose_upper_arm") else "right arm")
                )
                return Response(
                    {
                        "message": f"Bicep Curl: Keep your upper {side_txt} still. Pin your elbow to your side—no swinging.",
                        "accuracy": 60,
                        "posture_ok": False,
                        "stage": bicep_stage,
                        "counter": bicep_counter,
                    }
                )

            # Weak peak contraction prompt (range of motion)
            peak_left = left_info.get("peak_error") and st["last_peak_error_at_left"] != st["left"]["counter"]
            peak_right = right_info.get("peak_error") and st["last_peak_error_at_right"] != st["right"]["counter"]
            if peak_left:
                st["last_peak_error_at_left"] = st["left"]["counter"]
            if peak_right:
                st["last_peak_error_at_right"] = st["right"]["counter"]
            if peak_left or peak_right:
                return Response(
                    {
                        "message": "Bicep Curl: Bring your hand higher toward your shoulder at the top—full range of motion.",
                        "accuracy": 65,
                        "posture_ok": False,
                        "stage": bicep_stage,
                        "counter": bicep_counter,
                    }
                )

            # Otherwise: posture looks good (keep this posture-focused)
            return Response(
                {
                    "message": "Bicep Curl: Good posture. Keep elbows fixed at your sides and move smoothly.",
                    "accuracy": 100,
                    "posture_ok": True,
                    "stage": bicep_stage,
                    "counter": bicep_counter,
                }
            )
        
        # Plank: always run model for continuous accuracy; gate only affects message and posture_ok
        if ex_type == "plank":
            is_plank_like, gate_msg = validate_plank_pose(landmarks)
            gate_failed = not is_plank_like

            models = get_models()

            current = models.get(ex_type)
            if not current or not current["model"]:
                return Response(
                    {"message": f"Model {ex_type} not found", "accuracy": 0, "posture_ok": False}
                )

            # Build plank input exactly like detection/plank.py; always run model so user sees continuous accuracy.
            # Use numpy arrays only so we don't depend on pandas in the runtime environment.
            input_row = build_feature_row("plank", landmarks)
            X_df = np.array([input_row])
            try:
                if current["scaler"]:
                    X_df = current["scaler"].transform(X_df)
                prediction = current["model"].predict(X_df)[0]
                probs = current["model"].predict_proba(X_df)[0]
            except Exception as e:
                # If ML isn't available (env mismatch), fall back to geometric + ideal-pose accuracy.
                print(f"Plank model error: {e}")
                ideal_dict = IDEAL_POSES.get("plank", {}).get("hold")
                ideal_landmarks = _ideal_landmarks_for_response(ideal_dict) if ideal_dict else None

                def _get_y(idx, default=0.5):
                    if idx >= len(landmarks):
                        return default
                    lm = landmarks[idx]
                    if lm is None:
                        return default
                    if isinstance(lm, dict):
                        return float(lm.get("y", default))
                    return float(getattr(lm, "y", default))

                shoulder_y = (_get_y(11) + _get_y(12)) / 2
                hip_y = (_get_y(23) + _get_y(24)) / 2
                # Hips too low => hip is significantly below shoulders (y much larger)
                if hip_y - shoulder_y > 0.08:
                    coaching_msg = "Hips too low. Raise your hips to align with your shoulders."
                    posture_ok = False
                # Hips too high => hip is significantly above shoulders (y smaller)
                elif hip_y - shoulder_y < -0.05:
                    coaching_msg = "Hips too high. Lower your hips to form a straight line."
                    posture_ok = False
                else:
                    coaching_msg = "Perfect plank. Body is straight. Keep holding."
                    posture_ok = True

                if gate_failed:
                    return Response(
                        {
                            "message": f"Plank: {gate_msg}",
                            "accuracy": 0,
                            "posture_ok": False,
                        }
                    )

                try:
                    acc = int(round(_accuracy_vs_ideal(landmarks, ideal_dict))) if ideal_dict else 0
                except Exception:
                    acc = 0
                if posture_ok and acc < 95:
                    acc = 95
                if not posture_ok:
                    acc = min(99, acc) if acc else 70

                return Response(
                    {
                        "message": f"Plank: {coaching_msg}",
                        "accuracy": max(0, min(100, acc)),
                        "posture_ok": posture_ok,
                        "ideal_landmarks": ideal_landmarks,
                    }
                )

            max_prob = float(max(probs))
            confidence = int(round(max_prob * 100))

            if gate_failed:
                # Not in plank position: show 0% so user sees they're not correct
                return Response({
                    "message": f"Plank: {gate_msg}",
                    "accuracy": 0,
                    "posture_ok": False,
                })

            # Correct = C with enough confidence; wrong = L, H, or low confidence. Always boolean for green/red.
            PREDICTION_THRESHOLD = 0.5
            trust_prediction = max_prob >= PREDICTION_THRESHOLD
            pred_str = str(prediction).strip().upper()
            posture_ok = bool(trust_prediction and pred_str == "C")

            label_to_msg = {
                "C": "Perfect plank. Body is straight. Keep holding.",
                "L": "Hips too low. Raise your hips to align with your shoulders.",
                "H": "Hips too high. Lower your hips to form a straight line.",
            }
            default_msg = "Adjust your plank position. Keep body in a straight line."
            if trust_prediction:
                coaching_msg = label_to_msg.get(pred_str, default_msg)
            else:
                coaching_msg = "Get into plank position. Position yourself face-down with arms straight and body in a line."

            ideal_dict = IDEAL_POSES.get("plank", {}).get("hold")
            ideal_landmarks = _ideal_landmarks_for_response(ideal_dict) if ideal_dict else None

            # Correct posture = 100%; in position but wrong form = accuracy from distance to ideal (like tree pose)
            # Geometric override: even if ML says "C", check hip alignment
            def _get_y_plank(idx, default=0.5):
                if idx >= len(landmarks): return default
                lm = landmarks[idx]
                if lm is None: return default
                return float(lm.get("y", default) if isinstance(lm, dict) else getattr(lm, "y", default))

            shoulder_y = (_get_y_plank(11) + _get_y_plank(12)) / 2
            hip_y = (_get_y_plank(23) + _get_y_plank(24)) / 2
            ankle_y = (_get_y_plank(27) + _get_y_plank(28)) / 2
            hip_shoulder_diff = hip_y - shoulder_y
            hip_ankle_diff = ankle_y - hip_y

            if hip_shoulder_diff < -0.05:
                posture_ok = False
                coaching_msg = "Hips too high. Lower your hips to form a straight line."
            elif hip_shoulder_diff > 0.10:
                posture_ok = False
                coaching_msg = "Hips too low. Raise your hips to align with your shoulders."

            # Smooth accuracy: gradual 0->100 based on hip alignment
            # posture_ok = True means hips are within correct range -> always 100%
            # posture_ok = False -> smooth gradient based on how far from correct range
            if posture_ok:
                acc = 100
            else:
                if hip_shoulder_diff < -0.05:
                    # Hips too high: further above -0.05 = lower score
                    over = abs(hip_shoulder_diff + 0.05)
                    acc = max(0, int(84 - (over / 0.15) * 84))
                elif hip_shoulder_diff > 0.10:
                    # Hips too low: further below 0.10 = lower score
                    over = abs(hip_shoulder_diff - 0.10)
                    acc = max(0, int(84 - (over / 0.15) * 84))
                else:
                    acc = 70
            return Response(
                {
                    "message": f"Plank: {coaching_msg}",
                    "accuracy": acc,
                    "posture_ok": posture_ok,
                    "ideal_landmarks": ideal_landmarks,
                }
            )

        # Squat: ML stage (up/down) + simple feet/knee placement heuristics for posture_ok
        if ex_type == "squat":
            models = get_models()

            s = models.get("squat")
            if not s or not s.get("model"):
                pass  # Skip model, use geometric detection below

            # Stage prediction (up/down) from model trained on 9 landmarks (repo uses prob threshold).
            # If the model cannot be used (e.g. sklearn version mismatch), we gracefully fall back to
            # geometric squat analysis only instead of returning an error to the user.
            pred = "middle"
            prob = 0.0
            conf = 0
            prediction_probability = 0.0
            model_predicted = False
            try:
                # The original repo predicts using a pandas DataFrame with a stable column order.
                # Some sklearn models are sensitive to feature ordering/shapes, so keep it consistent.
                input_row = build_feature_row("squat", landmarks)
                try:
                    import pandas as pd  # local import; available in the backend env

                    cols = []
                    for lm_name in SQUAT_IMPORTANT_LANDMARKS:
                        cols += [
                            f"{lm_name.lower()}_x",
                            f"{lm_name.lower()}_y",
                            f"{lm_name.lower()}_z",
                            f"{lm_name.lower()}_v",
                        ]
                    X_in = pd.DataFrame([input_row], columns=cols)
                except Exception:
                    # Fallback to numpy if pandas isn't available for some reason
                    X_in = np.array([input_row])

                model = s.get("model")
                scaler = s.get("scaler")
                if scaler is not None:
                    X_in = scaler.transform(np.array([input_row]))
                if model is not None:
                    # Some environments may have sklearn versions that cannot unpickle the
                    # original DecisionTree/ensemble objects cleanly. Wrap in try so we
                    # can still provide rule-based squat guidance without crashing.
                    probs = model.predict_proba(X_in)[0]
                    conf = int(max(probs) * 100)
                    prob = float(max(probs))
                    prediction_probability = round(prob, 2)
                    raw_pred = model.predict(X_in)[0]
                    pred = "down" if str(raw_pred) in ["0", "down"] else "up"
                    model_predicted = True
            except Exception as e:
                print(f"Squat model error: {e}")

            # Require reasonable confidence before we treat stage changes as real
            PREDICTION_PROB_THRESHOLD = 0.7

            client_key = _get_client_key(request)
            _ensure_squat_state(client_key)
            st = _SQUAT_RT_STATE[client_key]

            # If ML isn't usable, derive "up/down" stage from knee angles so squat still works.
            if not model_predicted:
                calculate_angle = get_calculate_angle()
                if calculate_angle is not None:
                    def _get(idx, key, default=0.5):
                        if idx >= len(landmarks):
                            return default
                        lm = landmarks[idx]
                        if lm is None:
                            return default
                        if isinstance(lm, dict):
                            return lm.get(key, default)
                        return getattr(lm, key, default)

                    # Left knee angle: hip-knee-ankle
                    lh = [_get(23, "x"), _get(23, "y")]
                    lk = [_get(25, "x"), _get(25, "y")]
                    la = [_get(27, "x"), _get(27, "y")]
                    rh = [_get(24, "x"), _get(24, "y")]
                    rk = [_get(26, "x"), _get(26, "y")]
                    ra = [_get(28, "x"), _get(28, "y")]
                    try:
                        left_knee = float(calculate_angle(lh, lk, la))
                        right_knee = float(calculate_angle(rh, rk, ra))
                        knee = min(left_knee, right_knee)
                    except Exception:
                        knee = 180.0

                    # Heuristic stage from knee bend
                    if knee < 125:
                        pred = "down"
                        prob = 0.95
                        conf = 95
                    elif knee > 160:
                        pred = "up"
                        prob = 0.95
                        conf = 95
                    else:
                        pred = st.get("current_stage") or "middle"
                        prob = 0.75
                        conf = 75
                    prediction_probability = round(float(prob), 2)

            # Gate: require a few consecutive frames showing real squat movement.
            started, _dbg = _squat_is_started(landmarks)
            if started:
                st["started_frames"] = min(st["started_frames"] + 1, 10)
            else:
                st["started_frames"] = max(st["started_frames"] - 1, 0)

            if st["started_frames"] < 3 and st["current_stage"] == "":
                return Response(
                    {
                        "message": "Squat: Start the squat—bend your knees and push hips back.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                    }
                )

            # Update stage/counter similar to detection/squat.py, but with probability gating
            pred_class = str(pred)
            if pred_class == "down" and prob >= PREDICTION_PROB_THRESHOLD:
                # Enter "down" stage and remember that we've been down at least once
                st["current_stage"] = "down"
                st["has_seen_down"] = True
            elif (
                pred_class == "up"
                and prob >= PREDICTION_PROB_THRESHOLD
                and st["current_stage"] == "down"
                and st["has_seen_down"]
            ):
                # Transition from down -> up counts as one rep
                st["current_stage"] = "up"
                st["counter"] += 1

            # If we still haven't entered a stable stage, keep instructing instead of "good posture"
            if st["current_stage"] == "":
                return Response(
                    {
                        "message": "Squat: Get into position and begin the squat movement.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                    }
                )

            # If we have a stage but user hasn't actually started moving, keep it red.
            if st["started_frames"] < 3:
                return Response(
                    {
                        "message": "Squat: Begin the movement—bend knees and lower your hips.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": st["current_stage"],
                        "prob": prediction_probability,
                        "counter": st["counter"],
                    }
                )

            # If we don't have a stable stage yet, use "middle" thresholds for knee placement
            stage_for_rules = st["current_stage"] if st["current_stage"] else "middle"

            analyzed = _squat_analyze_foot_knee_from_json(landmarks, stage_for_rules)
            foot_eval = analyzed["foot_placement"]
            knee_eval = analyzed["knee_placement"]

            def _placement_txt(v: int) -> str:
                if v == -1:
                    return "unknown"
                if v == 0:
                    return "correct"
                if v == 1:
                    return "too tight"
                if v == 2:
                    return "too wide"
                return "unknown"

            feet_txt = _placement_txt(foot_eval)
            knee_txt = _placement_txt(knee_eval)

            if foot_eval == -1:
                return Response(
                    {
                        "message": "Squat: Step back so your feet and knees are clearly visible.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": st["current_stage"] or str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                        "feet": feet_txt,
                        "knee": knee_txt,
                    }
                )

            if foot_eval == 1:
                return Response(
                    {
                        "message": "Squat: Feet too close. Step a bit wider—about shoulder width.",
                        "accuracy": conf,
                        "posture_ok": False,
                        "stage": st["current_stage"] or str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                        "feet": feet_txt,
                        "knee": knee_txt,
                    }
                )
            if foot_eval == 2:
                return Response(
                    {
                        "message": "Squat: Feet too wide. Bring your stance slightly narrower—about shoulder width.",
                        "accuracy": conf,
                        "posture_ok": False,
                        "stage": st["current_stage"] or str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                        "feet": feet_txt,
                        "knee": knee_txt,
                    }
                )

            # Feet are correct; now evaluate knees
            if knee_eval == -1:
                return Response(
                    {
                        "message": "Squat: Keep your knees visible and face the camera more squarely.",
                        "accuracy": conf,
                        "posture_ok": False,
                        "stage": st["current_stage"] or str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                        "feet": feet_txt,
                        "knee": knee_txt,
                    }
                )
            if knee_eval == 1:
                return Response(
                    {
                        "message": "Squat: Knees too close. Push your knees outward—track over your toes.",
                        "accuracy": conf,
                        "posture_ok": False,
                        "stage": st["current_stage"] or str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                        "feet": feet_txt,
                        "knee": knee_txt,
                    }
                )
            if knee_eval == 2:
                return Response(
                    {
                        "message": "Squat: Knees too wide. Bring them slightly in—track over your toes.",
                        "accuracy": conf,
                        "posture_ok": False,
                        "stage": st["current_stage"] or str(pred),
                        "prob": prediction_probability,
                        "counter": st["counter"],
                        "feet": feet_txt,
                        "knee": knee_txt,
                    }
                )

            # Correct posture = 100%; in position but wrong form uses conf (calculated above)
            return Response(
                {
                    "message": f"Squat: Good posture.",
                    "accuracy": 100,
                    "posture_ok": True,
                    "stage": st["current_stage"] or str(pred),
                    "prob": prediction_probability,
                    "counter": st["counter"],
                    "feet": feet_txt,
                    "knee": knee_txt,
                }
            )

        # Lunge: SIDE VIEW detection
        if ex_type == "lunge":
            calculate_angle = get_calculate_angle()

            def _get(idx, key, default=0.5):
                if idx >= len(landmarks): return default
                lm = landmarks[idx]
                if lm is None: return default
                return lm.get(key, default) if isinstance(lm, dict) else getattr(lm, key, default)

            def _get_vis(idx, default=0.0):
                if idx >= len(landmarks): return default
                lm = landmarks[idx]
                if lm is None: return default
                return lm.get("visibility", default) if isinstance(lm, dict) else getattr(lm, "visibility", default)

            # Side view: always use LEFT side landmarks (ignore visibility — unreliable for side view)
            # MediaPipe still tracks x/y correctly even with low visibility score
            l_hip_x   = _get(23,"x"); l_hip_y   = _get(23,"y")
            l_knee_x  = _get(25,"x"); l_knee_y  = _get(25,"y")
            l_ankle_x = _get(27,"x"); l_ankle_y = _get(27,"y")
            r_hip_x   = _get(24,"x"); r_hip_y   = _get(24,"y")
            r_knee_x  = _get(26,"x"); r_knee_y  = _get(26,"y")
            r_ankle_x = _get(28,"x"); r_ankle_y = _get(28,"y")

            # Use z coordinate for angle calculation (world coords: x,y,z)
            # For side view lunge, use x and z instead of x and y
            l_hip_z   = _get(23,"z"); r_hip_z   = _get(24,"z")
            l_knee_z  = _get(25,"z"); r_knee_z  = _get(26,"z")
            l_ankle_z = _get(27,"z"); r_ankle_z = _get(28,"z")

            if calculate_angle:
                try:
                    # Use y and z for angle (vertical drop + depth)
                    l_knee_ang_raw = float(calculate_angle([l_hip_y,l_hip_z],[l_knee_y,l_knee_z],[l_ankle_y,l_ankle_z]))
                    r_knee_ang_raw = float(calculate_angle([r_hip_y,r_hip_z],[r_knee_y,r_knee_z],[r_ankle_y,r_ankle_z]))
                    print(f"[LUNGE YZ] l={l_knee_ang_raw:.1f} r={r_knee_ang_raw:.1f} l_hip_z={l_hip_z:.3f} l_knee_z={l_knee_z:.3f} l_ankle_z={l_ankle_z:.3f}")
                except Exception:
                    l_knee_ang_raw, r_knee_ang_raw = 180.0, 180.0
            else:
                l_knee_ang_raw, r_knee_ang_raw = 180.0, 180.0

            # Front leg = more bent (smaller angle)
            if l_knee_ang_raw <= r_knee_ang_raw:
                hip      = [l_hip_x, l_hip_y]
                knee     = [l_knee_x, l_knee_y]
                ankle    = [l_ankle_x, l_ankle_y]
                shoulder = [_get(11,"x"), _get(11,"y")]
                side     = "left"
            else:
                hip      = [r_hip_x, r_hip_y]
                knee     = [r_knee_x, r_knee_y]
                ankle    = [r_ankle_x, r_ankle_y]
                shoulder = [_get(12,"x"), _get(12,"y")]
                side     = "right"

            print(f"[LUNGE SIDE] side={side} l_knee={l_knee_ang_raw:.1f} r_knee={r_knee_ang_raw:.1f}")

            # Sanity check: person must be standing (hip y must be above ankle y in world coords)
            # In world coords, y increases downward, so hip_y should be LESS than ankle_y
            hip_y_check  = _get(23,"y") if side == "left" else _get(24,"y")
            ankle_y_check = _get(27,"y") if side == "left" else _get(28,"y")
            # Require side profile: shoulders must be stacked (small x distance between them)
            ls_x = _get(11,"x"); rs_x = _get(12,"x")
            shoulder_spread = abs(ls_x - rs_x)
            print(f"[LUNGE STAND] shoulder_spread={shoulder_spread:.3f}")
            if shoulder_spread > 0.15:
                return Response({"message": "Lunge: Stand sideways to the camera — your side should face the lens.", "accuracy": 0, "posture_ok": False, "stage": "up", "counter": 0})
            print(f"[LUNGE COORDS] l_hip=({l_hip_x:.3f},{l_hip_y:.3f}) l_knee=({l_knee_x:.3f},{l_knee_y:.3f}) l_ankle=({l_ankle_x:.3f},{l_ankle_y:.3f})")
            print(f"[LUNGE COORDS] r_hip=({r_hip_x:.3f},{r_hip_y:.3f}) r_knee=({r_knee_x:.3f},{r_knee_y:.3f}) r_ankle=({r_ankle_x:.3f},{r_ankle_y:.3f})")

            # Use the already-calculated YZ angles
            knee_ang = min(l_knee_ang_raw, r_knee_ang_raw)

            print(f"[LUNGE SIDE] knee_ang={knee_ang:.1f}")

            # Not lunging at all
            if knee_ang > 160:
                return Response({
                    "message": "Lunge: Step one foot forward and lower your body.",
                    "accuracy": 0, "posture_ok": False, "stage": "up", "counter": 0
                })

            stage = "down" if knee_ang < 115 else "up"

            # Torso upright check (shoulder should be above hip vertically)
            shoulder_y = float(shoulder[1])
            hip_y      = float(hip[1])
            shoulder_x = float(shoulder[0])
            hip_x      = float(hip[0])
            vert_dist  = abs(hip_y - shoulder_y)
            horiz_off  = abs(shoulder_x - hip_x)
            lean_ratio = horiz_off / vert_dist if vert_dist > 0.05 else 0
            print(f"[LUNGE SIDE] lean_ratio={lean_ratio:.3f} stage={stage}")

            if lean_ratio > 0.5:
                return Response({
                    "message": "Lunge: Keep your torso upright — do not lean forward.",
                    "accuracy": 50, "posture_ok": False, "stage": stage
                })

            # Depth check
            if stage == "up" and knee_ang > 140:
                return Response({
                    "message": "Lunge: Lower your body more — aim for 90 degrees in your front knee.",
                    "accuracy": 55, "posture_ok": False, "stage": stage
                })

            # Rep counter: up→down→up = 1 rep
            if client_key not in _LUNGE_RT_STATE:
                _LUNGE_RT_STATE[client_key] = {"stage": "up", "counter": 0}
            ls = _LUNGE_RT_STATE[client_key]
            if stage == "down" and ls["stage"] == "up":
                ls["stage"] = "down"
            elif stage == "up" and ls["stage"] == "down":
                ls["counter"] += 1
                ls["stage"] = "up"

            # Run ML for final verdict
            models = get_models()
            l_data = models.get("lunge") or {}
            stage_model = l_data.get("stage_model")
            err_model   = l_data.get("err_model")
            scaler      = l_data.get("scaler")

            if stage_model and err_model:
                X_in = X
                if scaler is not None:
                    try:
                        X_in = scaler.transform(X)
                    except Exception as e:
                        print(f"Lunge scaler error: {e}")
                try:
                    err        = err_model.predict(X_in)[0]
                    err_probs  = err_model.predict_proba(X_in)[0]
                    err_conf   = max(err_probs)
                    is_correct = str(err) == "C" and err_conf >= 0.55
                    print(f"[LUNGE SIDE] ML err={err} conf={err_conf:.2f} is_correct={is_correct}")
                except Exception as e:
                    print(f"Lunge ML error: {e}")
                    is_correct = True
                    err_conf   = 0.8
            else:
                is_correct = True
                err_conf   = 0.8

            acc = int(round(err_conf * 100))

            if is_correct and stage == "down":
                return Response({"message": "Lunge: Excellent! Great depth and form.", "accuracy": acc, "posture_ok": True, "stage": stage, "counter": ls.get("counter", 0)})
            elif is_correct:
                return Response({"message": "Lunge: Good form! Lower your front knee to 90 degrees.", "accuracy": acc, "posture_ok": True, "stage": stage, "counter": ls.get("counter", 0)})
            else:
                return Response({"message": "Lunge: Keep your front knee over your toes and step further forward.", "accuracy": max(40, int(err_conf * 60)), "posture_ok": False, "stage": stage, "counter": ls.get("counter", 0)})

        # Simple geometric coaching for hand raise (no ML). Dynamic accuracy 0–100.
        if ex_type == "hand_raise":
            # MediaPipe: 15 = LEFT_WRIST, 16 = RIGHT_WRIST, 0 = NOSE
            nose_y = landmarks[0]["y"] if len(landmarks) > 0 else 0.5
            left_wrist_y = landmarks[15]["y"] if len(landmarks) > 15 else 0.5
            right_wrist_y = landmarks[16]["y"] if len(landmarks) > 16 else 0.5

            # Each hand contributes 0–50% based on how far above the nose (smaller y = higher).
            # When wrist is at or below nose: 0%. When well above: up to 50%. Smooth in between.
            RAISE_THRESH = 0.15  # nose_y - wrist_y >= this → full 50% for that hand
            def contrib(wrist_y, nose_y):
                if wrist_y >= nose_y:
                    return 0.0
                diff = nose_y - wrist_y
                return 50.0 * min(1.0, diff / RAISE_THRESH)

            left_contrib = contrib(left_wrist_y, nose_y)
            right_contrib = contrib(right_wrist_y, nose_y)
            acc = min(100, int(round(left_contrib + right_contrib)))

            left_up = left_wrist_y < nose_y
            right_up = right_wrist_y < nose_y

            if left_up and right_up and acc >= 95:
                msg = "Hand Raise: Great! Both hands are raised above your head."
                ok = True
            elif left_up and not right_up:
                msg = "Hand Raise: Good. Left hand is up. Now raise your right hand too."
                ok = False
            elif right_up and not left_up:
                msg = "Hand Raise: Good. Right hand is up. Now raise your left hand too."
                ok = False
            elif left_up and right_up:
                msg = "Hand Raise: Raise both hands a bit higher above your head."
                ok = False
            else:
                msg = "Hand Raise: Lift one or both hands above your head."
                ok = False

            return Response({"message": msg, "accuracy": acc, "posture_ok": ok})

        # Lateral raise: arms out to the side at or above shoulder height (rule-based, no ML)
        if ex_type == "lateral_raise":
            def _get(landmarks_list, idx, key, default=0.5):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get(key, default)
                return getattr(lm, key, default)

            def _get_vis(landmarks_list, idx, default=0.0):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get("visibility", default)
                return getattr(lm, "visibility", default)

            # MediaPipe: 11=L_SHOULDER, 12=R_SHOULDER, 13=L_ELBOW, 14=R_ELBOW, 15=L_WRIST, 16=R_WRIST
            VIS_THRESHOLD = 0.5
            
            ls_x = _get(landmarks, 11, "x")
            ls_y = _get(landmarks, 11, "y")
            ls_vis = _get_vis(landmarks, 11)
            rs_x = _get(landmarks, 12, "x")
            rs_y = _get(landmarks, 12, "y")
            rs_vis = _get_vis(landmarks, 12)
            
            le_x = _get(landmarks, 13, "x")
            le_y = _get(landmarks, 13, "y")
            le_vis = _get_vis(landmarks, 13)
            re_x = _get(landmarks, 14, "x")
            re_y = _get(landmarks, 14, "y")
            re_vis = _get_vis(landmarks, 14)
            
            lw_x = _get(landmarks, 15, "x")
            lw_y = _get(landmarks, 15, "y")
            lw_vis = _get_vis(landmarks, 15)
            rw_x = _get(landmarks, 16, "x")
            rw_y = _get(landmarks, 16, "y")
            rw_vis = _get_vis(landmarks, 16)

            # Check visibility first
            if ls_vis < VIS_THRESHOLD or rs_vis < VIS_THRESHOLD:
                return Response({
                    "message": "Lateral Raise: Position yourself so your shoulders are clearly visible.",
                    "accuracy": 0,
                    "posture_ok": False,
                })

            # Lateral raise: arms out to the sides at shoulder height.
            # We want wrists roughly at shoulder height (not too far above or below),
            # and clearly to the side of the shoulders.
            TOL_Y_ABOVE = 0.10  # wrist can be at most this much above shoulder
            TOL_Y_BELOW = 0.20  # wrist can be at most this much below shoulder
            TOL_Y = TOL_Y_BELOW  # keep for progress scoring below
            TOL_X = 0.0          # horizontal: just need wrist to be to the side (no minimum distance required)
            
            # Left arm: when raised laterally, left wrist goes further RIGHT (larger x) than left shoulder
            # and stays in a vertical band around shoulder height.
            left_ok = (
                lw_vis >= VIS_THRESHOLD
                and lw_x > ls_x                     # left wrist further right than left shoulder
                and lw_y >= ls_y - TOL_Y_ABOVE      # not too far above shoulder
                and lw_y <= ls_y + TOL_Y_BELOW      # not too far below shoulder
            )
            
            # Right arm: wrist further left than right shoulder, and within same vertical band
            right_ok = (
                rw_vis >= VIS_THRESHOLD
                and rw_x < rs_x                    # right wrist further left than right shoulder
                and rw_y >= rs_y - TOL_Y_ABOVE     # not too far above shoulder
                and rw_y <= rs_y + TOL_Y_BELOW     # not too far below shoulder
            )

            # Calculate how close each arm is to correct position (for partial credit)
            # Left: wrist should be further right (larger x) than shoulder
            left_x_diff = lw_x - ls_x if lw_vis >= VIS_THRESHOLD else 0  # positive if wrist is right of shoulder
            left_y_diff = lw_y - ls_y if lw_vis >= VIS_THRESHOLD else 1  # positive if wrist below shoulder
            # Right: wrist should be further left (smaller x) than shoulder
            right_x_diff = rs_x - rw_x if rw_vis >= VIS_THRESHOLD else 0  # positive if wrist is left of shoulder
            right_y_diff = rw_y - rs_y if rw_vis >= VIS_THRESHOLD else 1  # positive if wrist below shoulder
            
            # Score: 50% for horizontal position, 50% for vertical position
            left_progress = max(0, min(100, int((min(left_x_diff, 0.15) / 0.15) * 50 + (max(0, TOL_Y - left_y_diff) / TOL_Y) * 50))) if lw_vis >= VIS_THRESHOLD else 0
            right_progress = max(0, min(100, int((min(right_x_diff, 0.15) / 0.15) * 50 + (max(0, TOL_Y - right_y_diff) / TOL_Y) * 50))) if rw_vis >= VIS_THRESHOLD else 0

            if left_ok and right_ok:
                msg = "Lateral Raise: Great! Both arms are out to the sides at shoulder height."
                acc = 100
                ok = True
            elif left_ok:
                msg = "Lateral Raise: Good. Left arm is up. Now raise your right arm out to the side."
                acc = 70
                ok = False
            elif right_ok:
                msg = "Lateral Raise: Good. Right arm is up. Now raise your left arm out to the side."
                acc = 70
                ok = False
            elif lw_vis < VIS_THRESHOLD and rw_vis < VIS_THRESHOLD:
                msg = "Lateral Raise: Position yourself so your arms are fully visible to the camera."
                acc = 0
                ok = False
            elif left_progress > 0 or right_progress > 0:
                # Partial progress: show calculated accuracy
                acc = int((left_progress + right_progress) / 2)
                # Never show 100% when posture_ok is False – cap partial progress.
                if acc >= 100:
                    acc = 95
                if acc < 30:
                    msg = "Lateral Raise: Raise your arms higher and further out to the sides."
                elif acc < 50:
                    msg = "Lateral Raise: Keep raising your arms until they reach shoulder height."
                else:
                    msg = "Lateral Raise: Almost there! Raise both arms out to your sides at shoulder height."
                ok = False
            else:
                msg = "Lateral Raise: Raise both arms out to your sides until they are at shoulder height."
                acc = 0
                ok = False

            return Response({"message": msg, "accuracy": acc, "posture_ok": ok})

        # Tricep kickback: evaluated from SIDE profile (arm extends backward). Front view cannot see extension.
        if ex_type == "tricep_kickback":
            def _get_tk(landmarks_list, idx, key, default=0.5):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get(key, default)
                return getattr(lm, key, default)

            def _get_vis_tk(landmarks_list, idx, default=0.0):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get("visibility", default)
                return getattr(lm, "visibility", default)

            calculate_angle = get_calculate_angle()
            if calculate_angle is None:
                return Response({
                    "message": "Tricep Kickback: Pose analysis not available.",
                    "accuracy": 0,
                    "posture_ok": False,
                })

            # 11=L_SHOULDER, 12=R_SHOULDER, 13=L_ELBOW, 14=R_ELBOW, 15=L_WRIST, 16=R_WRIST
            # 23=L_HIP, 24=R_HIP, 25=L_KNEE, 26=R_KNEE
            VIS_THRESHOLD = 0.5
            ANGLE_EXTENDED = 150  # elbow angle when arm is extended (kickback); bent ~90°
            HIP_BEND_MAX = 165   # shoulder-hip-knee angle: above this = standing too upright; bent forward = smaller

            ls_x = _get_tk(landmarks, 11, "x")
            ls_y = _get_tk(landmarks, 11, "y")
            rs_x = _get_tk(landmarks, 12, "x")
            rs_y = _get_tk(landmarks, 12, "y")
            ls_vis = _get_vis_tk(landmarks, 11)
            rs_vis = _get_vis_tk(landmarks, 12)
            lh_x = _get_tk(landmarks, 23, "x")
            lh_y = _get_tk(landmarks, 23, "y")
            rh_x = _get_tk(landmarks, 24, "x")
            rh_y = _get_tk(landmarks, 24, "y")
            lk_x = _get_tk(landmarks, 25, "x")
            lk_y = _get_tk(landmarks, 25, "y")
            rk_x = _get_tk(landmarks, 26, "x")
            rk_y = _get_tk(landmarks, 26, "y")
            le_x = _get_tk(landmarks, 13, "x")
            le_y = _get_tk(landmarks, 13, "y")
            re_x = _get_tk(landmarks, 14, "x")
            re_y = _get_tk(landmarks, 14, "y")
            lw_x = _get_tk(landmarks, 15, "x")
            lw_y = _get_tk(landmarks, 15, "y")
            rw_x = _get_tk(landmarks, 16, "x")
            rw_y = _get_tk(landmarks, 16, "y")
            lw_vis = _get_vis_tk(landmarks, 15)
            rw_vis = _get_vis_tk(landmarks, 16)
            le_vis = _get_vis_tk(landmarks, 13)
            re_vis = _get_vis_tk(landmarks, 14)

            # Side profile check: from front, shoulders are far apart in x; from side, they stack (small span).
            shoulder_span_x = abs(rs_x - ls_x)
            SIDE_PROFILE_THRESHOLD = 0.12  # below this = side view (shoulders overlap in 2D)
            is_side_profile = shoulder_span_x < SIDE_PROFILE_THRESHOLD and (ls_vis >= VIS_THRESHOLD or rs_vis >= VIS_THRESHOLD)

            if not is_side_profile:
                return Response({
                    "message": "Tricep Kickback: Stand sideways to the camera so we can see your arm extension.",
                    "accuracy": 0,
                    "posture_ok": False,
                })

            # Detect which side is facing the camera from posture (visibility: the facing side is more visible).
            left_arm_vis = (ls_vis + le_vis + lw_vis) / 3.0
            right_arm_vis = (rs_vis + re_vis + rw_vis) / 3.0
            VIS_MARGIN = 0.08  # need clear difference to decide side
            if left_arm_vis >= right_arm_vis + VIS_MARGIN:
                profile_side = "left"   # left side facing camera → evaluate left arm
            elif right_arm_vis >= left_arm_vis + VIS_MARGIN:
                profile_side = "right"  # right side facing camera → evaluate right arm
            else:
                profile_side = "unknown"  # ambiguous (e.g. 3/4 view); use best visible arm

            # Bent-forward check: proper tricep kickback has torso bent at hips (shoulder-hip-knee angle < 165°).
            left_hip_angle = float(calculate_angle([ls_x, ls_y], [lh_x, lh_y], [lk_x, lk_y]))
            right_hip_angle = float(calculate_angle([rs_x, rs_y], [rh_x, rh_y], [rk_x, rk_y]))
            # Use the side we're evaluating (or the more bent side if unknown)
            if profile_side == "left":
                hip_angle = left_hip_angle
            elif profile_side == "right":
                hip_angle = right_hip_angle
            else:
                hip_angle = min(left_hip_angle, right_hip_angle)
            bent_forward = hip_angle <= HIP_BEND_MAX

            if not bent_forward:
                return Response({
                    "message": "Tricep Kickback: Bend forward at the hips, then extend your arm back.",
                    "accuracy": 0,
                    "posture_ok": False,
                    "profile_side": profile_side,
                })

            left_shoulder_pt = [ls_x, ls_y]
            left_elbow_pt = [le_x, le_y]
            left_wrist_pt = [lw_x, lw_y]
            right_shoulder_pt = [rs_x, rs_y]
            right_elbow_pt = [re_x, re_y]
            right_wrist_pt = [rw_x, rw_y]

            left_angle = float(calculate_angle(left_shoulder_pt, left_elbow_pt, left_wrist_pt))
            right_angle = float(calculate_angle(right_shoulder_pt, right_elbow_pt, right_wrist_pt))

            # Arm is "good" when extended (high elbow angle) and landmarks visible
            left_ok = (lw_vis >= VIS_THRESHOLD and le_vis >= VIS_THRESHOLD and
                      left_angle >= ANGLE_EXTENDED)
            right_ok = (rw_vis >= VIS_THRESHOLD and re_vis >= VIS_THRESHOLD and
                        right_angle >= ANGLE_EXTENDED)

            # Score only the side we detected as facing the camera (that's the arm we can see for kickback).
            if profile_side == "left":
                arm_ok = left_ok
                arm_angle = left_angle
                arm_vis = lw_vis >= VIS_THRESHOLD and le_vis >= VIS_THRESHOLD
                side_label = "left"
            elif profile_side == "right":
                arm_ok = right_ok
                arm_angle = right_angle
                arm_vis = rw_vis >= VIS_THRESHOLD and re_vis >= VIS_THRESHOLD
                side_label = "right"
            else:
                # unknown: use best arm
                if left_ok or right_ok:
                    arm_ok = left_ok or right_ok
                    arm_angle = max(left_angle if lw_vis >= VIS_THRESHOLD else 0,
                                   right_angle if rw_vis >= VIS_THRESHOLD else 0)
                    arm_vis = True
                    side_label = "left" if left_ok else "right"
                else:
                    arm_ok = False
                    arm_angle = max(left_angle if lw_vis >= VIS_THRESHOLD else 0,
                                   right_angle if rw_vis >= VIS_THRESHOLD else 0)
                    arm_vis = lw_vis >= VIS_THRESHOLD or rw_vis >= VIS_THRESHOLD
                    side_label = "left" if left_arm_vis >= right_arm_vis else "right"

            if arm_ok:
                msg = f"Tricep Kickback: Great! Your {side_label} arm is extended back."
                acc = 100
                ok = True
            elif not arm_vis:
                msg = "Tricep Kickback: Stand sideways so your arm is visible to the camera."
                acc = 0
                ok = False
            else:
                # Partial: scale by how extended the visible arm is
                acc = max(0, min(99, int((arm_angle - 90) / (ANGLE_EXTENDED - 90) * 99))) if arm_angle >= 90 else 0
                if acc < 30:
                    msg = f"Tricep Kickback: Bend elbow then extend your {side_label} arm back, upper arm still."
                elif acc < 60:
                    msg = "Tricep Kickback: Keep extending your arm back until the elbow is straight."
                else:
                    msg = f"Tricep Kickback: Almost there! Extend your {side_label} arm back fully."
                ok = False

            return Response({
                "message": msg,
                "accuracy": acc,
                "posture_ok": ok,
                "profile_side": profile_side,
            })

        # Push-up: body in straight line (plank-like), elbow angle for phase + rep count
        if ex_type == "push_up":
            is_push_up_like, gate_msg = validate_push_up_pose(landmarks)
            if not is_push_up_like:
                return Response({
                    "message": f"Push-up: {gate_msg}",
                    "accuracy": 0, "posture_ok": False,
                    "stage": "up", "counter": 0,
                })

            client_key = _get_client_key(request)
            _ensure_push_up_state(client_key)
            st = _PUSH_UP_RT_STATE[client_key]

            def _get_pu(landmarks_list, idx, key, default=0.5):
                if idx >= len(landmarks_list): return default
                lm = landmarks_list[idx]
                if lm is None: return default
                return lm.get(key, default) if isinstance(lm, dict) else getattr(lm, key, default)

            # ── Geometry: body line + elbow angle ────────────────────────────
            calculate_angle = get_calculate_angle()
            ls_x = _get_pu(landmarks, 11, "x"); ls_y = _get_pu(landmarks, 11, "y")
            rs_x = _get_pu(landmarks, 12, "x"); rs_y = _get_pu(landmarks, 12, "y")
            le_x = _get_pu(landmarks, 13, "x"); le_y = _get_pu(landmarks, 13, "y")
            re_x = _get_pu(landmarks, 14, "x"); re_y = _get_pu(landmarks, 14, "y")
            lw_x = _get_pu(landmarks, 15, "x"); lw_y = _get_pu(landmarks, 15, "y")
            rw_x = _get_pu(landmarks, 16, "x"); rw_y = _get_pu(landmarks, 16, "y")
            lh_x = _get_pu(landmarks, 23, "x"); lh_y = _get_pu(landmarks, 23, "y")
            rh_x = _get_pu(landmarks, 24, "x"); rh_y = _get_pu(landmarks, 24, "y")
            lk_x = _get_pu(landmarks, 25, "x"); lk_y = _get_pu(landmarks, 25, "y")
            rk_x = _get_pu(landmarks, 26, "x"); rk_y = _get_pu(landmarks, 26, "y")
            la_x = _get_pu(landmarks, 27, "x"); la_y = _get_pu(landmarks, 27, "y")
            ra_x = _get_pu(landmarks, 28, "x"); ra_y = _get_pu(landmarks, 28, "y")

            shoulder_pt = [(ls_x+rs_x)/2, (ls_y+rs_y)/2]
            hip_pt      = [(lh_x+rh_x)/2, (lh_y+rh_y)/2]
            knee_pt     = [(lk_x+rk_x)/2, (lk_y+rk_y)/2]
            ankle_pt    = [(la_x+ra_x)/2, (la_y+ra_y)/2]
            knee_y_mid  = (lk_y+rk_y)/2
            ankle_y_mid = (la_y+ra_y)/2
            is_knee_pushup = ankle_y_mid < knee_y_mid + 0.08
            label = "Knee push-up" if is_knee_pushup else "Push-up"

            body_line_angle = 180.0
            left_elbow_angle = 160.0
            right_elbow_angle = 160.0
            if calculate_angle:
                try:
                    end_pt = knee_pt if is_knee_pushup else ankle_pt
                    body_line_angle   = float(calculate_angle(shoulder_pt, hip_pt, end_pt))
                    left_elbow_angle  = float(calculate_angle([ls_x,ls_y],[le_x,le_y],[lw_x,lw_y]))
                    right_elbow_angle = float(calculate_angle([rs_x,rs_y],[re_x,re_y],[rw_x,rw_y]))
                except Exception:
                    pass

            elbow_angle   = min(left_elbow_angle, right_elbow_angle)
            body_straight = body_line_angle >= 160
            body_ok       = body_line_angle >= 152

            # ── ML model: predict stage (0=up, 1=down) ───────────────────────
            ml_stage  = None
            ml_conf   = 0
            try:
                models   = get_models()
                pu_data  = models.get("push_up", {})
                ml_model = pu_data.get("model")
                ml_scaler= pu_data.get("scaler")
                if ml_model and ml_scaler:
                    row      = build_feature_row("push_up", landmarks)
                    X        = ml_scaler.transform(row.reshape(1, -1))
                    pred     = ml_model.predict(X)[0]
                    proba    = ml_model.predict_proba(X)[0]
                    ml_stage = "up" if int(pred) == 0 else "down"
                    ml_conf  = int(round(float(max(proba)) * 100))
                    print(f"[PUSHUP ML] pred={pred} stage={ml_stage} conf={ml_conf}")
            except Exception as e:
                print(f"[PUSHUP] ML error: {e}")

            # ── Rep counting: use ML stage, fallback to geometry ──────────────
            PUSH_UP_TOP    = 160
            PUSH_UP_BOTTOM = 90
            if ml_stage == "down" or (ml_stage is None and elbow_angle < PUSH_UP_BOTTOM):
                st["stage"] = "down"
            elif ml_stage == "up" or (ml_stage is None and elbow_angle > PUSH_UP_TOP):
                if st["stage"] == "down":
                    st["counter"] += 1
                st["stage"] = "up"

            # ── Coaching message ──────────────────────────────────────────────
            if not body_ok:
                msg = f"{label}: Keep your body in a straight line. Don't let your hips sag or pike up."
                acc = max(0, min(45, int(body_line_angle / 180 * 50)))
                ok  = False
            elif st["stage"] == "down":
                if body_straight:
                    msg = f"{label}: Good depth! Push back up to complete the rep."
                    acc = ml_conf if ml_conf > 0 else 85
                    ok  = True
                else:
                    msg = f"{label}: Keep a straight line as you push back up."
                    acc = max(50, min(75, int(body_line_angle / 180 * 100)))
                    ok  = False
            elif st["stage"] == "up" and body_straight:
                msg = f"{label}: Great form! Lower your chest for the next rep."
                acc = ml_conf if ml_conf > 0 else 100
                ok  = True
            elif st["stage"] == "up" and not body_straight:
                msg = f"{label}: Straighten your body from shoulders to knees."
                acc = max(60, min(85, int(body_line_angle / 180 * 100)))
                ok  = False
            else:
                if elbow_angle < PUSH_UP_BOTTOM + 30:
                    msg = f"{label}: Lower until your elbows reach about 90 degrees, then push up."
                else:
                    msg = f"{label}: Push up until your arms are fully extended."
                acc = max(0, min(99, int((elbow_angle - PUSH_UP_BOTTOM) / (PUSH_UP_TOP - PUSH_UP_BOTTOM) * 99)))
                ok  = False

            return Response({
                "message":    msg,
                "accuracy":   acc,
                "posture_ok": ok,
                "stage":      st["stage"],
                "counter":    st["counter"],
            })

        # Wall sit: SIDE view only; check ~90° hip + knee angles and hold timer
        if ex_type == "wall_sit":
            calculate_angle = get_calculate_angle()
            mp_pose = get_mp_pose()
            if calculate_angle is None or mp_pose is None:
                return Response(
                    {
                        "message": "Wall Sit: Pose analysis not available.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "hold_seconds": 0,
                        "profile_side": "unknown",
                    }
                )

            def _get_ws(landmarks_list, idx, key, default=0.5):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get(key, default)
                return getattr(lm, key, default)

            def _get_vis_ws(landmarks_list, idx, default=0.0):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get("visibility", default)
                return getattr(lm, "visibility", default)

            # Indices: 11/12 shoulders, 23/24 hips, 25/26 knees, 27/28 ankles
            VIS = 0.5
            ls_x, ls_y, ls_v = _get_ws(landmarks, 11, "x"), _get_ws(landmarks, 11, "y"), _get_vis_ws(landmarks, 11)
            rs_x, rs_y, rs_v = _get_ws(landmarks, 12, "x"), _get_ws(landmarks, 12, "y"), _get_vis_ws(landmarks, 12)
            lh_x, lh_y, lh_v = _get_ws(landmarks, 23, "x"), _get_ws(landmarks, 23, "y"), _get_vis_ws(landmarks, 23)
            rh_x, rh_y, rh_v = _get_ws(landmarks, 24, "x"), _get_ws(landmarks, 24, "y"), _get_vis_ws(landmarks, 24)
            lk_x, lk_y, lk_v = _get_ws(landmarks, 25, "x"), _get_ws(landmarks, 25, "y"), _get_vis_ws(landmarks, 25)
            rk_x, rk_y, rk_v = _get_ws(landmarks, 26, "x"), _get_ws(landmarks, 26, "y"), _get_vis_ws(landmarks, 26)
            la_x, la_y, la_v = _get_ws(landmarks, 27, "x"), _get_ws(landmarks, 27, "y"), _get_vis_ws(landmarks, 27)
            ra_x, ra_y, ra_v = _get_ws(landmarks, 28, "x"), _get_ws(landmarks, 28, "y"), _get_vis_ws(landmarks, 28)

            # Side profile gate (same idea as tricep): shoulders stacked in x.
            shoulder_span_x = abs(rs_x - ls_x)
            SIDE_PROFILE_THRESHOLD = 0.12
            is_side = shoulder_span_x < SIDE_PROFILE_THRESHOLD and (ls_v >= VIS or rs_v >= VIS)
            if not is_side:
                return Response(
                    {
                        "message": "Wall Sit: Stand sideways to the camera so we can see your knee and hip angles.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "hold_seconds": 0,
                        "profile_side": "unknown",
                    }
                )

            # Decide which side is facing camera via visibility.
            left_vis = (ls_v + lh_v + lk_v + la_v) / 4.0
            right_vis = (rs_v + rh_v + rk_v + ra_v) / 4.0
            if left_vis >= right_vis + 0.08:
                side = "left"
            elif right_vis >= left_vis + 0.08:
                side = "right"
            else:
                side = "unknown"

            if side == "right":
                s_sh, s_hip, s_knee, s_ank = [rs_x, rs_y, rs_v], [rh_x, rh_y, rh_v], [rk_x, rk_y, rk_v], [ra_x, ra_y, ra_v]
            else:
                # default to left if unknown
                side = "left" if side == "unknown" else side
                s_sh, s_hip, s_knee, s_ank = [ls_x, ls_y, ls_v], [lh_x, lh_y, lh_v], [lk_x, lk_y, lk_v], [la_x, la_y, la_v]

            if min(s_sh[2], s_hip[2], s_knee[2], s_ank[2]) < VIS:
                return Response(
                    {
                        "message": "Wall Sit: Show your shoulder, hip, knee, and ankle clearly (side view).",
                        "accuracy": 0,
                        "posture_ok": False,
                        "hold_seconds": 0,
                        "profile_side": side,
                    }
                )

            hip_angle = float(calculate_angle([s_sh[0], s_sh[1]], [s_hip[0], s_hip[1]], [s_knee[0], s_knee[1]]))
            knee_angle = float(calculate_angle([s_hip[0], s_hip[1]], [s_knee[0], s_knee[1]], [s_ank[0], s_ank[1]]))

            # Thigh parallel cue: hip and knee at similar height
            thigh_parallel = abs(s_hip[1] - s_knee[1]) < 0.10

            # Target angles ~90°
            hip_ok = 75 <= hip_angle <= 115
            knee_ok = 75 <= knee_angle <= 115
            posture_ok = bool(hip_ok and knee_ok and thigh_parallel)

            client_key = _get_client_key(request)
            _ensure_wall_sit_state(client_key)
            st = _WALL_SIT_RT_STATE[client_key]
            now_ts = datetime.now().timestamp()

            if posture_ok:
                if st["hold_start_ts"] is None:
                    st["hold_start_ts"] = now_ts
                st["hold_seconds"] = int(max(0, round(now_ts - float(st["hold_start_ts"]))))
                return Response(
                    {
                        "message": f"Wall Sit: Great! Hold it. Time: {st['hold_seconds']}s",
                        "accuracy": 100,
                        "posture_ok": True,
                        "hold_seconds": st["hold_seconds"],
                        "profile_side": side,
                    }
                )

            # Not holding: reset timer
            st["hold_start_ts"] = None
            st["hold_seconds"] = 0

            # Partial accuracy based on closeness to 90°
            def _score_angle(a: float) -> int:
                # 90° = 100, 140° or 40° = 0
                diff = abs(a - 90.0)
                return int(max(0, min(100, 100 - diff * 2.0)))

            hip_score = _score_angle(hip_angle)
            knee_score = _score_angle(knee_angle)
            parallel_score = 100 if thigh_parallel else 60
            acc = int(max(0, min(99, round((hip_score + knee_score + parallel_score) / 3))))

            if not thigh_parallel:
                msg = "Wall Sit: Drop your hips until your thighs are parallel to the floor (knees about 90°)."
            elif knee_angle > 115:
                msg = "Wall Sit: Sit lower. Bend your knees closer to 90°."
            elif knee_angle < 75:
                msg = "Wall Sit: Sit a bit higher. Your knees are too bent."
            else:
                msg = "Wall Sit: Adjust to 90° at hips and knees. Keep your back tall."

            return Response(
                {
                    "message": msg,
                    "accuracy": acc,
                    "posture_ok": False,
                    "hold_seconds": 0,
                    "profile_side": side,
                }
            )

        # Sit-up / Crunch: SIDE view only; hip angle (shoulder-hip-knee) for up/down + rep count
        if ex_type == "sit_up":
            calculate_angle = get_calculate_angle()
            mp_pose = get_mp_pose()
            if calculate_angle is None or mp_pose is None:
                return Response(
                    {
                        "message": "Sit-up: Pose analysis not available.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": "down",
                        "counter": 0,
                    }
                )

            def _get_su(landmarks_list, idx, key, default=0.5):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get(key, default)
                return getattr(lm, key, default)

            def _get_vis_su(landmarks_list, idx, default=0.0):
                if idx >= len(landmarks_list):
                    return default
                lm = landmarks_list[idx]
                if lm is None:
                    return default
                if isinstance(lm, dict):
                    return lm.get("visibility", default)
                return getattr(lm, "visibility", default)

            VIS = 0.5
            ls_x, ls_y, ls_v = _get_su(landmarks, 11, "x"), _get_su(landmarks, 11, "y"), _get_vis_su(landmarks, 11)
            rs_x, rs_y, rs_v = _get_su(landmarks, 12, "x"), _get_su(landmarks, 12, "y"), _get_vis_su(landmarks, 12)
            lh_x, lh_y, lh_v = _get_su(landmarks, 23, "x"), _get_su(landmarks, 23, "y"), _get_vis_su(landmarks, 23)
            rh_x, rh_y, rh_v = _get_su(landmarks, 24, "x"), _get_su(landmarks, 24, "y"), _get_vis_su(landmarks, 24)
            lk_x, lk_y, lk_v = _get_su(landmarks, 25, "x"), _get_su(landmarks, 25, "y"), _get_vis_su(landmarks, 25)
            rk_x, rk_y, rk_v = _get_su(landmarks, 26, "x"), _get_su(landmarks, 26, "y"), _get_vis_su(landmarks, 26)

            shoulder_span_x = abs(rs_x - ls_x)
            SIDE_PROFILE_THRESHOLD = 0.12
            is_side = shoulder_span_x < SIDE_PROFILE_THRESHOLD and (ls_v >= VIS or rs_v >= VIS)
            if not is_side:
                return Response(
                    {
                        "message": "Sit-up: Stand sideways to the camera. Lie on your back, then curl up.",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": "down",
                        "counter": 0,
                    }
                )

            left_vis = (ls_v + lh_v + lk_v) / 3.0
            right_vis = (rs_v + rh_v + rk_v) / 3.0
            if left_vis >= right_vis + 0.08:
                side = "left"
                sh_pt = [ls_x, ls_y]
                hip_pt = [lh_x, lh_y]
                knee_pt = [lk_x, lk_y]
            elif right_vis >= left_vis + 0.08:
                side = "right"
                sh_pt = [rs_x, rs_y]
                hip_pt = [rh_x, rh_y]
                knee_pt = [rk_x, rk_y]
            else:
                side = "left"
                sh_pt = [ls_x, ls_y]
                hip_pt = [lh_x, lh_y]
                knee_pt = [lk_x, lk_y]

            if min(ls_v, lh_v, lk_v, rs_v, rh_v, rk_v) < VIS:
                return Response(
                    {
                        "message": "Sit-up: Show your shoulder, hip, and knee clearly (side view).",
                        "accuracy": 0,
                        "posture_ok": False,
                        "stage": "down",
                        "counter": 0,
                    }
                )

            # Hip angle: shoulder-hip-knee. Flat (down) ~180°, curled (up) ~90–120°
            hip_angle = float(calculate_angle(sh_pt, hip_pt, knee_pt))
            SITUP_DOWN = 155   # above = lying flat
            SITUP_UP = 125     # below = curled up

            client_key = _get_client_key(request)
            _ensure_situp_state(client_key)
            st = _SITUP_RT_STATE[client_key]

            if hip_angle > SITUP_DOWN:
                if st["stage"] == "up":
                    st["counter"] += 1
                st["stage"] = "down"
            elif hip_angle < SITUP_UP:
                st["stage"] = "up"

            # Accuracy and message
            if st["stage"] == "up" and hip_angle < SITUP_UP:
                msg = "Sit-up: Good curl. Lower back down with control to complete the rep."
                acc = 100
                ok = True
            elif st["stage"] == "down" and hip_angle > SITUP_DOWN:
                msg = "Sit-up: Lie flat, then curl up (shoulders toward knees)."
                acc = 85
                ok = False
            else:
                if hip_angle >= SITUP_UP and hip_angle <= SITUP_DOWN:
                    msg = "Sit-up: Curl up until your shoulders are off the floor, then lower."
                elif hip_angle > SITUP_DOWN:
                    msg = "Sit-up: Curl up from the floor."
                else:
                    msg = "Sit-up: Lower back down to complete the rep."
                acc = max(0, min(99, int((180 - hip_angle) / 90 * 99))) if hip_angle < 180 else 50
                ok = False

            return Response(
                {
                    "message": msg,
                    "accuracy": acc,
                    "posture_ok": ok,
                    "stage": st["stage"],
                    "counter": st["counter"],
                }
            )

        # Tree pose: rule-based + ideal-pose accuracy so user always sees a number
        if ex_type == "tree_pose":
            client_key = _get_client_key(request)
            _ensure_tree_pose_state(client_key)
            tp = _TREE_POSE_RT_STATE[client_key]

            def _timer_elapsed(tp, now_ts):
                return tp["elapsed"] + (now_ts - tp["timer_start"]) if tp["timer_start"] else tp["elapsed"]

            # Require 33 landmarks
            if len(landmarks) < 33:
                tp["timer_start"] = None
                return Response({
                    "message":    "Tree Pose: Step back so your full body is visible.",
                    "accuracy":   0, "posture_ok": False,
                    "timer": round(tp.get("elapsed", 0.0), 1), "timer_display": "00:00",
                })

            # ── Geometry gate: arms must be raised ───────────────────────────
            def _gy(name):
                i = POSE_LANDMARK_INDEX.get(name)
                if i is None or i >= len(landmarks): return 0.5
                p = landmarks[i]
                if p is None: return 0.5
                return p.get("y", 0.5) if isinstance(p, dict) else getattr(p, "y", 0.5)

            l_wrist_y  = _gy("LEFT_WRIST");  r_wrist_y  = _gy("RIGHT_WRIST")
            l_shldr_y  = _gy("LEFT_SHOULDER"); r_shldr_y = _gy("RIGHT_SHOULDER")
            avg_shldr_y   = (l_shldr_y + r_shldr_y) / 2
            best_wrist_y  = min(l_wrist_y, r_wrist_y)
            l_hip_y       = _gy("LEFT_HIP"); r_hip_y = _gy("RIGHT_HIP")
            avg_hip_y     = (l_hip_y + r_hip_y) / 2
            # Arms must be raised at least above the hips
            # Arms check: wrists above shoulders (overhead) OR close together (prayer)
            # Get X coords inline using same pattern as _gy
            def _gx(name):
                i = POSE_LANDMARK_INDEX.get(name)
                if i is None or i >= len(landmarks): return 0.5
                p = landmarks[i]
                return p.get("x", 0.5) if isinstance(p, dict) else getattr(p, "x", 0.5)
            l_wrist_x = _gx("LEFT_WRIST"); r_wrist_x = _gx("RIGHT_WRIST")
            wrist_spread = abs(l_wrist_x - r_wrist_x)
            # Overhead: both wrists clearly above shoulders (y smaller = higher on screen)
            arms_overhead = best_wrist_y < avg_shldr_y - 0.05
            # Prayer: wrists close together AND above hips
            l_hip_y = _gy("LEFT_HIP"); r_hip_y = _gy("RIGHT_HIP")
            avg_hip_y = (l_hip_y + r_hip_y) / 2
            arms_prayer = wrist_spread < 0.20 and best_wrist_y < avg_shldr_y + 0.05
            arms_ok = arms_overhead or arms_prayer
            print(f"[TREE ARMS] overhead={arms_overhead} prayer={arms_prayer} spread={wrist_spread:.3f} best_wrist_y={best_wrist_y:.3f} avg_shldr_y={avg_shldr_y:.3f}", flush=True)
            if not arms_ok:
                if tp.get("timer_start") is not None:
                    tp["elapsed"] = tp.get("elapsed", 0) + time.time() - tp["timer_start"]
                    tp["timer_start"] = None
                return Response({
                    "message":    "Tree Pose: Raise arms overhead or bring hands to prayer at chest.",
                    "accuracy":   20, "posture_ok": False,
                    "timer": round(tp.get("elapsed", 0.0), 1), "timer_display": "00:00",
                })

            # ── Geometry gate: one leg must be lifted ───
            l_knee_y  = _gy("LEFT_KNEE");  r_knee_y  = _gy("RIGHT_KNEE")
            l_ankle_y = _gy("LEFT_ANKLE"); r_ankle_y = _gy("RIGHT_ANKLE")
            ankle_diff = abs(l_ankle_y - r_ankle_y)
            knee_diff  = abs(l_knee_y  - r_knee_y)
            one_leg_lifted = ankle_diff > 0.10 or knee_diff > 0.08
            if not one_leg_lifted:
                if tp.get("timer_start") is not None:
                    tp["elapsed"] = tp.get("elapsed", 0) + time.time() - tp["timer_start"]
                    tp["timer_start"] = None
                return Response({
                    "message":    "Tree Pose: Lift one foot and place it on your inner thigh.",
                    "accuracy":   20, "posture_ok": False,
                    "timer": round(tp.get("elapsed", 0.0), 1), "timer_display": "00:00",
                })

            # ── ML model ─────────────────────────────────────────────────────
            posture_ok   = False
            conf         = 0
            feedback_msg = "Tree Pose: Stand on one leg and raise arms above your head."
            try:
                models   = get_models()
                tp_data  = models.get("tree_pose", {})
                ml_model = tp_data.get("model")
                scaler   = tp_data.get("scaler")

                if ml_model and scaler:
                    row        = build_feature_row("tree_pose", landmarks)
                    X          = scaler.transform(row.reshape(1, -1))
                    pred       = ml_model.predict(X)[0]
                    proba      = ml_model.predict_proba(X)[0]
                    conf       = int(round(float(max(proba)) * 100))
                    posture_ok = (str(pred).strip().lower() == "correct")
                    print(f"[TREE ML] pred={pred} conf={conf} posture_ok={posture_ok}", flush=True)
                    if not posture_ok:
                        feedback_msg = "Tree Pose: Lift one foot, place it on your inner thigh."
                else:
                    feedback_msg = "Tree Pose: Model not loaded."
            except Exception as e:
                print(f"[TREE] ML error: {e}")
                feedback_msg = "Tree Pose: Could not analyse pose."

            # ── Timer ─────────────────────────────────────────────────────────
            now_ts = time.time()
            if posture_ok:
                if tp.get("timer_start") is None:
                    tp["timer_start"] = now_ts
                total_elapsed = _timer_elapsed(tp, now_ts)
                mins  = int(total_elapsed) // 60
                secs  = int(total_elapsed) % 60
                msg   = f"Tree Pose: Great! Hold steady — {mins:02d}:{secs:02d}"
                acc   = conf
            else:
                if tp.get("timer_start") is not None:
                    tp["elapsed"] = tp.get("elapsed", 0) + now_ts - tp["timer_start"]
                    tp["timer_start"] = None
                total_elapsed = tp.get("elapsed", 0)
                mins  = int(total_elapsed) // 60
                secs  = int(total_elapsed) % 60
                msg   = feedback_msg
                acc   = 0

            return Response({
                "message":       msg,
                "accuracy":      acc,
                "posture_ok":    posture_ok,
                "timer":         round(_timer_elapsed(tp, now_ts) if posture_ok and tp.get("timer_start") else tp.get("elapsed", 0), 1),
                "timer_display": f"{mins:02d}:{secs:02d}",
            })

        # Fallback for squat or any other type
        exercise_name = ex_type.replace("_", " ").title()
        return Response(
            {
                "message": f"Analyzing {exercise_name} posture...",
                "accuracy": 50,
                "posture_ok": None,
            }
        )

    except Exception as e:
        print(f"Server Error in stream_process: {e}")
        return Response({"message": "AI Processing Error", "accuracy": 0, "posture_ok": False})

@api_view(["POST"])
@parser_classes([MultiPartParser])
def upload_video(request):
    """
    Analyze an uploaded exercise video.

    Endpoint: POST /api/video/upload?type=<exercise>
    - Form-data: file=<video_file>
    """
    exercise_type = request.GET.get("type")
    if not exercise_type:
        return JsonResponse(
            status=status.HTTP_400_BAD_REQUEST,
            data={"message": "Exercise type not given"},
        )

    user_id = request.GET.get("user_id")
    session_id = request.GET.get("session_id")

    try:
        video = request.FILES["file"]
        now = int(datetime.now().strftime("%Y%m%d%H%M%S"))
        name_to_save = f"video_{now}.mp4"

        # Always write to temp file — works for both small and large uploads
        suffix = os.path.splitext(video.name)[1] or ".mp4"
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        for chunk in video.chunks():
            tmp.write(chunk)
        tmp.close()
        video_path = tmp.name

        exercise_detection = get_exercise_detection()
        if exercise_detection is None:
            os.unlink(video_path)
            return JsonResponse(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data={"error": "Exercise detection module not available"}
            )

        print(f"📥 upload_video: exercise={exercise_type}, file={video_path}")
        try:
            results, *other_data = exercise_detection(
                video_file_path=video_path,
                video_name_to_save=name_to_save,
                exercise_type=exercise_type,
                rescale_percent=40,
            )
            print(f"✅ exercise_detection done: {len(results)} results, other_data={other_data}")
        except Exception as det_err:
            print(f"❌ exercise_detection CRASHED for {exercise_type}:")
            traceback.print_exc()
            try: os.unlink(video_path)
            except: pass
            return JsonResponse({
                "type": exercise_type, "processed": False,
                "posture_ok": False, "accuracy": 0,
                "message": f"Detection failed: {str(det_err)}",
            }, status=200)

        # Clean up temp file
        try:
            os.unlink(video_path)
        except Exception:
            pass

        host = request.build_absolute_uri("/")
        for index, error in enumerate(results):
            if error is None or not isinstance(error, dict):
                continue
            if error.get("frame"):
                results[index]["frame"] = host + f"static/images/{error['frame']}"

        total_reps = other_data[0] if exercise_type in ["squat", "lunge", "bicep_curl"] else 0

        # Filter out None results safely
        valid_results = [r for r in results if r is not None and isinstance(r, dict)]
        posture_ok       = all(r.get("posture_ok", True) for r in valid_results) if valid_results else True
        accuracy         = int(sum(r.get("accuracy", 0) for r in valid_results) / len(valid_results)) if valid_results else 0
        feedback_message = valid_results[0].get("message", "") if valid_results else "Analysis complete"

        # Save to DB if user_id provided
        if user_id:
            try:
                from api.models import User, Session, VideoUpload
                user = User.objects.get(id=user_id)
                db_session = Session.objects.create(
                    user=user,
                    exercise_type=exercise_type,
                    mode="upload",
                    total_reps=total_reps,
                    avg_accuracy=accuracy,
                    ended_at=datetime.now(),
                )
                VideoUpload.objects.create(
                    session=db_session,
                    user=user,
                    exercise_type=exercise_type,
                    file_path=name_to_save,
                    posture_ok=posture_ok,
                    accuracy=accuracy,
                    total_reps=total_reps,
                    feedback_message=feedback_message,
                )
                print(f"VideoUpload saved — user {user_id}, session {db_session.id}")
            except Exception as db_err:
                print(f"DB save error (non-fatal): {db_err}")

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

        return JsonResponse(status=status.HTTP_200_OK, data=response_data)

    except Exception as e:
        print(f"Upload error: {e}")
        return JsonResponse(
            status=status.HTTP_400_BAD_REQUEST, data={"error": str(e)}
        )

@api_view(["GET"])
def stream_video(request):
    """
    Stream a processed video back to the client.

    Endpoint: GET /api/video/stream?video_name=<file_name>
    """
    video_name = request.GET.get("video_name")
    if not video_name:
        return JsonResponse(
            status=status.HTTP_400_BAD_REQUEST,
            data={"message": "File name not given"},
        )

    file_path = f"media/{video_name}"
    static_url = get_static_file_url(file_path)
    if not static_url:
        return JsonResponse(
            status=status.HTTP_404_NOT_FOUND,
            data={"message": "File not found"},
        )

    video_size = os.path.getsize(static_url)
    content_type, _ = mimetypes.guess_type(static_url)
    content_type = content_type or "application/octet-stream"

    chunk_size = max(video_size // 10, 1024 * 64)
    response = StreamingHttpResponse(
        FileWrapper(open(static_url, "rb"), chunk_size),
        content_type=content_type,
    )
    response["Content-Length"] = video_size
    response["Accept-Ranges"] = "bytes"
    return response

# ─── In-memory posture state for rep counting ─────────────────────────────────
_posture_state = {}


# ─── Sign Up ──────────────────────────────────────────────────────────────────
@api_view(["POST"])
def signup(request):
    from api.models import User
    data = request.data
    try:
        if User.objects.filter(email=data["email"]).exists():
            return JsonResponse({"error": "Email already registered"}, status=400)
        user = User.objects.create(
            first_name    = data.get("firstName", ""),
            last_name     = data.get("lastName", ""),
            email         = data["email"],
            password_hash = make_password(data["password"]),
            age           = data.get("age") or None,
            height        = data.get("height") or None,
            weight        = data.get("weight") or None,
        )
        print(f"New user created: {user.email}")
        return JsonResponse({"success": True, "user_id": user.id,
                             "name": user.first_name, "email": user.email})
    except Exception as e:
        print(f"Signup error: {e}")
        return JsonResponse({"error": str(e)}, status=400)


# ─── Sign In ──────────────────────────────────────────────────────────────────
@api_view(["POST"])
def signin(request):
    from api.models import User
    data = request.data
    try:
        user = User.objects.get(email=data["email"])
        if check_password(data["password"], user.password_hash):
            return JsonResponse(
                {"success": True, "user_id": user.id, "name": user.first_name, "email": user.email}
            )
        return JsonResponse({"error": "Incorrect password"}, status=401)
    except User.DoesNotExist:
        return JsonResponse({"error": "No account found with that email"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# ─── Forgot / Reset Password (email link) ─────────────────────────────────────
@api_view(["POST"])
def forgot_password(request):
    """
    Request a password reset link.
    Body: { "email": "user@example.com" }
    For local/dev, the reset URL is printed to the backend console.
    """
    from api.models import User

    data = request.data
    email = data.get("email")
    if not email:
        return JsonResponse({"error": "email required"}, status=400)

    # Always respond success to avoid leaking which emails exist
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return JsonResponse({"success": True})

    token = default_token_generator.make_token(user)
    uid = str(user.id)
    origin = request.headers.get("Origin") or "http://localhost:3002"
    origin = origin.rstrip("/")
    reset_url = f"{origin}/#reset-password?uid={uid}&token={token}"

    subject = "Reset your Pose Corrector AI password"
    message = (
        "Hi,\n\n"
        "Click the link below to reset your password:\n"
        f"{reset_url}\n\n"
        "If you didn’t request this, you can ignore this email.\n"
    )
    try:
        send_mail(
            subject,
            message,
            getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@localhost"),
            [user.email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"[forgot_password] send_mail error: {e}")
    print(f"[RESET LINK] {reset_url}")
    return JsonResponse({"success": True})


@api_view(["POST"])
def reset_password_confirm(request):
    """
    Confirm password reset.
    Body: { "uid": "<user_id>", "token": "<token>", "new_password": "..." }
    """
    from api.models import User

    data = request.data
    uid = data.get("uid")
    token = data.get("token")
    new_password = data.get("new_password")
    if not uid or not token or not new_password:
        return JsonResponse({"error": "uid, token, new_password required"}, status=400)
    if len(new_password) < 6:
        return JsonResponse({"error": "Password must be at least 6 characters"}, status=400)

    try:
        user = User.objects.get(id=int(uid))
    except (User.DoesNotExist, ValueError):
        return JsonResponse({"error": "Invalid user"}, status=400)

    if not default_token_generator.check_token(user, token):
        return JsonResponse({"error": "Invalid or expired token"}, status=400)

    try:
        user.password_hash = make_password(new_password)
        user.save(update_fields=["password_hash"])
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# ─── Profile (stats + recent workouts) ────────────────────────────────────────
@api_view(["GET"])
def profile(request):
    from api.models import User, Session
    from django.utils import timezone
    from django.db.models import Avg
    from datetime import timedelta
    if request.method == "POST":
        user_id = request.data.get("user_id")
        try:
            user = User.objects.get(id=int(user_id))
            if "age" in request.data: user.age = request.data["age"]
            if "height" in request.data: user.height = request.data["height"]
            if "weight" in request.data: user.weight = request.data["weight"]
            user.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
    user_id = request.query_params.get("user_id")
    if not user_id:
        return JsonResponse({"error": "user_id required"}, status=400)
    try:
        user = User.objects.get(id=int(user_id))
    except (User.DoesNotExist, ValueError):
        return JsonResponse({"error": "User not found"}, status=404)
    from datetime import timezone as dt_timezone
    PST = dt_timezone(timedelta(hours=-8))
    today = timezone.now().astimezone(PST).date()
    week_start = today - timedelta(days=today.weekday())
    sessions = Session.objects.filter(user=user).exclude(ended_at__isnull=True)
    total_workouts = sessions.count()
    this_week = sessions.filter(ended_at__date__gte=week_start).count()
    recent = sessions.order_by("-ended_at")[:10]
    recent_workouts = [
        {
            "exercise_type": s.exercise_type,
            "date": s.ended_at.astimezone(__import__("datetime").timezone(__import__("datetime").timedelta(hours=-8))).strftime("%Y-%m-%d") if s.ended_at else "",
            "reps": s.total_reps or 0,
            "accuracy": float(s.avg_accuracy) if s.avg_accuracy is not None else 0,
        }
        for s in recent
    ]
    avg_score = sessions.aggregate(avg=Avg("avg_accuracy"))["avg"]
    avg_score = round(float(avg_score), 0) if avg_score is not None else 0
    # Simple streak: days with at least one session ending that day, going back from today
    streak = 0
    d = today
    while True:
        if sessions.filter(ended_at__date=d).exists():
            streak += 1
            d -= timedelta(days=1)
        else:
            break
    # Weekly activity: current week Mon–Sun
    week_days = [week_start + timedelta(days=i) for i in range(7)]
    weekly_activity = [d <= today and sessions.filter(ended_at__date=d).exists() for d in week_days]
    # Exercise summary: per exercise_type -> sessions, total reps, avg accuracy
    from django.db.models import Sum
    from collections import defaultdict
    summary = defaultdict(lambda: {"sessions": 0, "totalReps": 0, "avgAccuracy": 0})
    for s in sessions:
        summary[s.exercise_type]["sessions"] += 1
        summary[s.exercise_type]["totalReps"] += s.total_reps or 0
        acc = float(s.avg_accuracy) if s.avg_accuracy is not None else 0
        n = summary[s.exercise_type]["sessions"]
        prev_avg = summary[s.exercise_type]["avgAccuracy"]
        summary[s.exercise_type]["avgAccuracy"] = round((prev_avg * (n - 1) + acc) / n, 0)
    exerciseSummary = [
        {"exercise_type": k, "sessions": v["sessions"], "totalReps": v["totalReps"], "avgAccuracy": int(v["avgAccuracy"])}
        for k, v in summary.items()
    ]
    return JsonResponse({
        "name": f"{user.first_name} {user.last_name}".strip() or user.email,
        "email": user.email,
        "age": user.age,
        "height": float(user.height) if user.height is not None else None,
        "weight": float(user.weight) if user.weight is not None else None,
        "memberSince": user.created_at.strftime("%Y-%m-%d") if getattr(user, "created_at", None) else None,
        "totalWorkouts": total_workouts,
        "thisWeek": this_week,
        "streakDays": streak,
        "avgScore": int(avg_score),
        "recentWorkouts": recent_workouts,
        "weeklyActivity": weekly_activity,
        "exerciseSummary": exerciseSummary,
    })


# ─── Start Session ────────────────────────────────────────────────────────────
@api_view(["POST"])
def start_session(request):
    from api.models import User, Session
    data = request.data
    try:
        user = User.objects.get(id=data["user_id"])
        session = Session.objects.create(
            user          = user,
            exercise_type = data["exercise_type"],
            mode          = data.get("mode", "live"),
        )
        print(f"Session started: {session.id} — {session.exercise_type}")
        return JsonResponse({"success": True, "session_id": session.id})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# ─── End Session ──────────────────────────────────────────────────────────────
@api_view(["POST"])
def end_session(request):
    from api.models import Session
    data = request.data
    try:
        session = Session.objects.get(id=data["session_id"])
        session.ended_at    = datetime.now()
        session.total_reps  = data.get("total_reps", 0)
        session.avg_accuracy = data.get("avg_accuracy", 0.00)
        session.save()
        print(f"Session ended: {session.id} — reps: {session.total_reps}")
        return JsonResponse({"success": True})
    except Session.DoesNotExist:
        return JsonResponse({"error": "Session not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)
