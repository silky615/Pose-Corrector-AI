"""
Push-Up Detection
Uses the trained push_up_model.pkl + push_up_input_scaler.pkl
Labels: 0 = up (top position), 1 = down (bottom position)
Rep counting: down → up transition = 1 rep
"""

import os
import pickle
import numpy as np
import cv2
from django.conf import settings

# ── Landmark indices ──────────────────────────────────────────────────────────
IMPORTANT_LANDMARKS = [
    "NOSE",
    "LEFT_SHOULDER",  "RIGHT_SHOULDER",
    "LEFT_ELBOW",     "RIGHT_ELBOW",
    "LEFT_WRIST",     "RIGHT_WRIST",
    "LEFT_HIP",       "RIGHT_HIP",
    "LEFT_KNEE",      "RIGHT_KNEE",
    "LEFT_ANKLE",     "RIGHT_ANKLE",
]


def _load_model():
    model_dir   = os.path.join(settings.BASE_DIR, "static", "model")
    model_path  = os.path.join(model_dir, "push_up_model.pkl")
    scaler_path = os.path.join(model_dir, "push_up_input_scaler.pkl")
    try:
        with open(model_path,  "rb") as f: model  = pickle.load(f)
        with open(scaler_path, "rb") as f: scaler = pickle.load(f)
        print("PushUpDetection: models loaded.")
        return model, scaler
    except Exception as e:
        print(f"PushUpDetection: could not load model — {e}")
        return None, None


class PushUpDetection:
    """Push-Up analysis using ML model. Counts reps via down→up transitions."""

    def __init__(self):
        self.model, self.scaler = _load_model()
        self._results   = []
        self._counter   = 0
        self._stage     = None   # "up" or "down"

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

        stage    = "up"
        accuracy = 50
        color    = (0, 165, 255)  # orange default

        if self.model and self.scaler:
            try:
                X     = np.array(features).reshape(1, -1)
                X_sc  = self.scaler.transform(X)
                pred  = self.model.predict(X_sc)[0]
                proba = self.model.predict_proba(X_sc)[0]
                # pred is 0 (up) or 1 (down)
                stage    = "up" if int(pred) == 0 else "down"
                accuracy = int(max(proba) * 100)
            except Exception as e:
                print(f"PushUp predict error: {e}")

        # Rep counting: down → up = 1 rep
        if stage == "down":
            self._stage = "down"
            color   = (0, 255, 255)  # yellow at bottom
            message = "Push-Up: Good! Lower position detected. Push back up."
            posture_ok = True
        elif stage == "up" and self._stage == "down":
            self._counter += 1
            self._stage    = "up"
            color          = (0, 255, 0)  # green on completion
            message        = f"Push-Up: Rep {self._counter} complete! Great form."
            posture_ok     = True
        else:
            self._stage = "up"
            color       = (0, 200, 0)
            message     = "Push-Up: Lower your chest to the floor."
            posture_ok  = True

        # Draw feedback on frame
        cv2.putText(image, f"Stage: {stage.upper()}  Reps: {self._counter}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        cv2.putText(image, f"Confidence: {accuracy}%",
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        self._results.append({
            "timestamp":  timestamp,
            "posture_ok": posture_ok,
            "accuracy":   accuracy,
            "stage":      stage,
            "message":    message,
            "frame":      None,
        })

    # ── called once after all frames processed ────────────────────────────────
    def handle_detected_results(self, video_name: str):
        if not self._results:
            return [{"posture_ok": False, "accuracy": 0,
                     "message": "No pose detected in video.", "frame": None}], 0

        total   = len(self._results)
        avg_acc = int(sum(r["accuracy"] for r in self._results) / total)
        counter = self._counter

        summary = {
            "posture_ok": True,
            "accuracy":   avg_acc,
            "message":    f"Push-Up: {counter} reps completed. Avg confidence {avg_acc}%.",
            "frame":      None,
        }
        return [summary], counter

    def clear_results(self):
        self._results = []
        self._counter = 0
        self._stage   = None
