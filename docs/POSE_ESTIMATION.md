# How Pose Estimation Works in Pose Corrector App

## Overview

Pose = body keypoints (landmarks): nose, shoulders, elbows, wrists, hips, knees, ankles, etc.  
The app uses **33 landmarks** in MediaPipe’s format (index 0 = nose, 11–12 = shoulders, 13–14 = elbows, …).

Two flows use these landmarks differently:

---

## 1. Live camera (stream)

**Where pose is estimated:** In the **user’s browser** (frontend).

**Flow:**

1. User opens the exercise page and allows camera access.
2. The frontend loads **MediaPipe Pose (JavaScript)** from `@mediapipe/tasks-vision` (WASM runs in the browser).
3. Every ~100 ms the frontend:
   - Captures a frame from the webcam.
   - Runs **PoseLandmarker.detectForVideo()** in the browser → gets 33 landmarks.
   - Draws the skeleton on a canvas (green/red/gray from backend feedback).
   - Sends the landmarks to your backend: `POST /api/video/stream?type=<exercise>` with body `{ landmarks: [{x,y,z,visibility}, ...] }`.
4. The **backend** (Django on the VM):
   - Does **not** run MediaPipe.
   - Uses the received landmarks to:
     - Compute angles (e.g. elbow angle for bicep curl).
     - Run exercise-specific logic and ML models (squat stage, plank accuracy, etc.).
     - Return `posture_ok`, `accuracy`, `counter`, `message`, etc.

So for **live stream**, pose is estimated entirely on the **client**. The server only does “exercise logic” on the landmarks it receives. This works on **IBM LinuxONE (s390x)** because the VM never needs to install MediaPipe for this flow.

---

## 2. Video upload

**Where pose is estimated:** On the **server** (backend).

**Flow:**

1. User uploads a video file via the frontend.
2. The backend saves the file and calls `detection/main.exercise_detection()`.
3. In `detection/main.py`:
   - **MediaPipe Pose (Python)** is used: `mp.solutions.pose.Pose()` and `pose.process(image)` on each frame.
   - That produces landmarks per frame; the exercise detectors (squat, plank, bicep, etc.) use them.
4. The backend returns analysis (reps, accuracy, feedback, optional annotated video).

So for **upload**, the server **does** need to run pose detection. On **s390x**, MediaPipe is not available, so **video upload will fail** when the backend tries to import or use MediaPipe in `detection/main.py`.

---

## Summary

| Mode   | Pose estimation runs on | Needs MediaPipe on server? | Works on s390x VM?      |
|--------|--------------------------|----------------------------|--------------------------|
| Live   | Browser (JavaScript)     | No                         | Yes (backend uses landmarks only) |
| Upload | Server (Python)          | Yes                        | No (MediaPipe not on s390x)       |

---

## If you need upload on s390x

Options:

1. **Client-side upload processing (recommended)**  
   Use the same browser MediaPipe pipeline to process the uploaded video in the frontend (e.g. read video with `<video>` + canvas, run PoseLandmarker per frame), then send either:
   - landmarks per frame to the backend for analysis, or  
   - a summary (e.g. rep count, segments) so the server doesn’t need to run pose at all.

2. **Different server-side pose model**  
   Use a pose model that supports s390x or can be built from source (e.g. OpenPose, MMPose, or a lightweight ONNX model). That would replace MediaPipe in `detection/main.py` and keep upload on the server.

3. **Leave upload as “x86/arm only”**  
   Keep upload on a different server (or your Mac) where MediaPipe is installed; the s390x VM is used only for live stream and any endpoints that don’t call `detection/main`.
