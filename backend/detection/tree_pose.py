"""
Tree Pose Detection
Uses the trained tree_pose_model.pkl + tree_pose_input_scaler.pkl
Interface matches PlankDetection / BicepCurlDetection etc.
"""

import os
import math
import pickle
import numpy as np
import cv2
from django.conf import settings

# ── Landmark indices ──────────────────────────────────────────────────────────
IMPORTANT_LANDMARKS = [
    "NOSE",
    "LEFT_EYE_INNER",  "LEFT_EYE",   "LEFT_EYE_OUTER",
    "RIGHT_EYE_INNER", "RIGHT_EYE",  "RIGHT_EYE_OUTER",
    "LEFT_EAR",        "RIGHT_EAR",
    "MOUTH_LEFT",      "MOUTH_RIGHT",
    "LEFT_SHOULDER",   "RIGHT_SHOULDER",
    "LEFT_ELBOW",      "RIGHT_ELBOW",
    "LEFT_WRIST",      "RIGHT_WRIST",
    "LEFT_PINKY",      "RIGHT_PINKY",
    "LEFT_INDEX",      "RIGHT_INDEX",
    "LEFT_THUMB",      "RIGHT_THUMB",
    "LEFT_HIP",        "RIGHT_HIP",
    "LEFT_KNEE",       "RIGHT_KNEE",
    "LEFT_ANKLE",      "RIGHT_ANKLE",
    "LEFT_HEEL",       "RIGHT_HEEL",
    "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX",
]


def _load_model():
    model_dir = os.path.join(settings.BASE_DIR, "static", "model")
    model_path  = os.path.join(model_dir, "tree_pose_model.pkl")
    scaler_path = os.path.join(model_dir, "tree_pose_input_scaler.pkl")
    try:
        with open(model_path,  "rb") as f: model  = pickle.load(f)
        with open(scaler_path, "rb") as f: scaler = pickle.load(f)
        print("TreePoseDetection: models loaded.")
        return model, scaler
    except Exception as e:
        print(f"TreePoseDetection: could not load model — {e}")
        return None, None


class TreePoseDetection:
    """Tree Pose analysis using ML model."""

    def __init__(self):
        self.model, self.scaler = _load_model()
        self._results   = []   # list of per-frame dicts
        self._correct   = 0
        self._incorrect = 0

    # ── MediaPipe landmark → feature vector ───────────────────────────────────
    def _extract_features(self, landmarks):
        import mediapipe as mp
        mp_pose = mp.solutions.pose
        features = []
        for name in IMPORTANT_LANDMARKS:
            try:
                idx = mp_pose.PoseLandmark[name].value
                lm  = landmarks[idx]
                features.extend([lm.x, lm.y, lm.z, lm.visibility])
            except Exception:
                features.extend([0.0, 0.0, 0.0, 0.0])
        return features

    # ── called per-frame by main.py ───────────────────────────────────────────
    def detect(self, mp_results, image, timestamp: int):
        landmarks = mp_results.pose_landmarks.landmark
        features  = self._extract_features(landmarks)

        label      = "incorrect"
        accuracy   = 0
        color      = (0, 0, 255)   # red

        if self.model and self.scaler:
            try:
                X      = np.array(features).reshape(1, -1)
                X_sc   = self.scaler.transform(X)
                pred   = self.model.predict(X_sc)[0]
                proba  = self.model.predict_proba(X_sc)[0]
                label  = "correct" if pred == "correct" else "incorrect"
                accuracy = int(max(proba) * 100)
            except Exception as e:
                print(f"TreePose predict error: {e}")

        posture_ok = label == "correct"
        if posture_ok:
            self._correct   += 1
            color = (0, 255, 0)
            message = "Tree Pose: Great balance! Hold the pose."
        else:
            self._incorrect += 1
            color = (0, 0, 255)
            message = "Tree Pose: Lift one foot and place it on the inner standing leg."

        # Draw feedback text on frame
        cv2.putText(image, f"{label.upper()} ({accuracy}%)",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

        self._results.append({
            "timestamp":   timestamp,
            "posture_ok":  posture_ok,
            "accuracy":    accuracy,
            "message":     message,
            "frame":       None,   # no error frame saved for hold exercises
        })

    # ── called once after all frames processed ────────────────────────────────
    def handle_detected_results(self, video_name: str):
        if not self._results:
            return [{"posture_ok": False, "accuracy": 0,
                     "message": "No pose detected in video.", "frame": None}], 0

        total      = len(self._results)
        correct    = sum(1 for r in self._results if r["posture_ok"])
        avg_acc    = int(sum(r["accuracy"] for r in self._results) / total)
        posture_ok = correct / total >= 0.5

        summary = {
            "posture_ok": posture_ok,
            "accuracy":   avg_acc,
            "message":    (
                f"Tree Pose: Held correct form {correct}/{total} frames. Avg accuracy {avg_acc}%."
                if posture_ok
                else f"Tree Pose: Form needs improvement. Correct frames: {correct}/{total}."
            ),
            "frame": None,
        }
        return [summary], 0

    def clear_results(self):
        self._results   = []
        self._correct   = 0
        self._incorrect = 0
