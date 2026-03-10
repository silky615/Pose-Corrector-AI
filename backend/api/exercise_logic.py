# api/exercise_logic.py
"""
Single place for all real-time (stream) exercise analysis logic.

This module holds:
- Landmark indices and exercise-specific constants (bicep, plank, squat, lunge, push-up, tree pose).
- Pure helpers: feature building, validation, accuracy vs ideal.
- Per-exercise logic is currently in api.views.stream_process(); you can move the
  stream_process body here into run_stream_analysis(...) and have views call
  Response(run_stream_analysis(...)) so all exercise logic lives in this file.

Constants and helpers below are used by api.views. Import them in views with:
  from api.exercise_logic import (
      POSE_LANDMARK_INDEX,
      BICEP_IMPORTANT_LANDMARKS,
      PLANK_IMPORTANT_LANDMARKS,
      SQUAT_IMPORTANT_LANDMARKS,
      TREE_POSE_IMPORTANT_LANDMARKS,
      PUSH_UP_IMPORTANT_LANDMARKS,
      IDEAL_POSES,
      KEY_LANDMARKS_FOR_ACCURACY,
      build_feature_row,
      validate_bicep_curl_pose,
      validate_torso_upright,
      validate_plank_pose,
      validate_push_up_pose,
      _accuracy_vs_ideal,
      _ideal_landmarks_for_response,
      _dist,
  )
"""

import numpy as np

# --- Lightweight geometry (used by squat and others) ---
def _dist(a, b) -> float:
    return float(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5)


# --- Landmark name lists (match training pipelines) ---
BICEP_IMPORTANT_LANDMARKS = [
    "NOSE", "LEFT_SHOULDER", "RIGHT_SHOULDER", "RIGHT_ELBOW", "LEFT_ELBOW",
    "RIGHT_WRIST", "LEFT_WRIST", "LEFT_HIP", "RIGHT_HIP",
]
PLANK_IMPORTANT_LANDMARKS = [
    "NOSE", "LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW", "RIGHT_ELBOW",
    "LEFT_WRIST", "RIGHT_WRIST", "LEFT_HIP", "RIGHT_HIP",
    "LEFT_KNEE", "RIGHT_KNEE", "LEFT_ANKLE", "RIGHT_ANKLE",
    "LEFT_HEEL", "RIGHT_HEEL", "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX",
]
SQUAT_IMPORTANT_LANDMARKS = [
    "NOSE", "LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_HIP", "RIGHT_HIP",
    "LEFT_KNEE", "RIGHT_KNEE", "LEFT_ANKLE", "RIGHT_ANKLE",
]

# Tree pose: 13 key landmarks (52 features) — same philosophy as bicep curl
TREE_POSE_IMPORTANT_LANDMARKS = [
    "NOSE",
    "LEFT_SHOULDER",  "RIGHT_SHOULDER",
    "LEFT_ELBOW",     "RIGHT_ELBOW",
    "LEFT_WRIST",     "RIGHT_WRIST",
    "LEFT_HIP",       "RIGHT_HIP",
    "LEFT_KNEE",      "RIGHT_KNEE",
    "LEFT_ANKLE",     "RIGHT_ANKLE",
]

# Push up: 13 key landmarks (52 features)
PUSH_UP_IMPORTANT_LANDMARKS = [
    "NOSE",
    "LEFT_SHOULDER",  "RIGHT_SHOULDER",
    "LEFT_ELBOW",     "RIGHT_ELBOW",
    "LEFT_WRIST",     "RIGHT_WRIST",
    "LEFT_HIP",       "RIGHT_HIP",
    "LEFT_KNEE",      "RIGHT_KNEE",
    "LEFT_ANKLE",     "RIGHT_ANKLE",
]

# MediaPipe Pose landmark indices (use when mediapipe package is not loaded)
POSE_LANDMARK_INDEX = {
    "NOSE": 0, "LEFT_EYE_INNER": 1, "LEFT_EYE": 2, "LEFT_EYE_OUTER": 3,
    "RIGHT_EYE_INNER": 4, "RIGHT_EYE": 5, "RIGHT_EYE_OUTER": 6,
    "LEFT_EAR": 7, "RIGHT_EAR": 8, "MOUTH_LEFT": 9, "MOUTH_RIGHT": 10,
    "LEFT_SHOULDER": 11, "RIGHT_SHOULDER": 12, "LEFT_ELBOW": 13, "RIGHT_ELBOW": 14,
    "LEFT_WRIST": 15, "RIGHT_WRIST": 16, "LEFT_PINKY": 17, "RIGHT_PINKY": 18,
    "LEFT_INDEX": 19, "RIGHT_INDEX": 20, "LEFT_THUMB": 21, "RIGHT_THUMB": 22,
    "LEFT_HIP": 23, "RIGHT_HIP": 24, "LEFT_KNEE": 25, "RIGHT_KNEE": 26,
    "LEFT_ANKLE": 27, "RIGHT_ANKLE": 28, "LEFT_HEEL": 29, "RIGHT_HEEL": 30,
    "LEFT_FOOT_INDEX": 31, "RIGHT_FOOT_INDEX": 32,
}

KEY_LANDMARKS_FOR_ACCURACY = [11, 12, 23, 24, 25, 26, 27, 28]

# Ideal pose landmarks (normalized 0-1) for tree_pose and plank accuracy
IDEAL_POSES = {
    "tree_pose": {
        "hold": {
            0: (0.50, 0.10), 11: (0.45, 0.25), 12: (0.55, 0.25),
            13: (0.40, 0.35), 14: (0.60, 0.35), 15: (0.42, 0.15), 16: (0.58, 0.15),
            23: (0.48, 0.45), 24: (0.52, 0.45), 25: (0.48, 0.65), 26: (0.52, 0.55),
            27: (0.48, 0.90), 28: (0.52, 0.60),
        },
    },
    "plank": {
        "hold": {
            0: (0.50, 0.40), 11: (0.40, 0.35), 12: (0.60, 0.35),
            13: (0.30, 0.45), 14: (0.70, 0.45), 15: (0.25, 0.50), 16: (0.75, 0.50),
            23: (0.43, 0.35), 24: (0.57, 0.35), 25: (0.43, 0.55), 26: (0.57, 0.55),
            27: (0.43, 0.70), 28: (0.57, 0.70),
        },
    },
}


def _accuracy_vs_ideal(landmarks_json: list, ideal_dict: dict) -> float:
    """Compare actual landmarks to ideal pose; return 0-100 accuracy."""
    if not ideal_dict or not landmarks_json or len(landmarks_json) < 29:
        return 0.0
    total_error = 0.0
    valid = 0
    for idx in KEY_LANDMARKS_FOR_ACCURACY:
        if idx >= len(landmarks_json) or idx not in ideal_dict:
            continue
        lm = landmarks_json[idx]
        if lm is None:
            continue
        if isinstance(lm, dict):
            vis = lm.get("visibility", 1.0)
            ax, ay = lm.get("x", 0), lm.get("y", 0)
        else:
            vis = getattr(lm, "visibility", 1.0)
            ax, ay = getattr(lm, "x", 0), getattr(lm, "y", 0)
        if vis < 0.5:
            continue
        ix, iy = ideal_dict[idx]
        total_error += float(((ax - ix) ** 2 + (ay - iy) ** 2) ** 0.5)
        valid += 1
    if valid == 0:
        return 0.0
    avg_error = total_error / valid
    acc = (1.0 - (avg_error / 0.25)) * 100.0
    return max(0.0, min(100.0, acc))


def _ideal_landmarks_for_response(ideal_dict: dict):
    """Return ideal landmarks as JSON-friendly dict for frontend (string keys)."""
    if not ideal_dict:
        return None
    return {str(k): [float(v[0]), float(v[1])] for k, v in ideal_dict.items()}
