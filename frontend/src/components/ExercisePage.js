import React, { useState, useRef, useEffect } from "react";
import { EXERCISES, getExerciseById } from "../data/exercises";
import * as api from "../api";

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

function landmarksFromPoseResult(result) {
  if (!result?.landmarks?.[0]) return null;
  return result.landmarks[0].map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z ?? 0,
    visibility: lm.visibility ?? 1,
  }));
}

// MediaPipe Pose landmark connections (skeleton lines) – body only, no face
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // shoulders, arms
  [23, 24], [11, 23], [12, 24],                      // hips, torso
  [23, 25], [25, 27], [24, 26], [26, 28],            // legs
  [27, 29], [29, 31], [28, 30], [30, 32],            // feet
];

function drawPoseOnCanvas(canvas, video, landmarks, postureOk) {
  if (!canvas || !video || !landmarks || landmarks.length < 33) return;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  const color =
    postureOk === true ? "#22c55e" : postureOk === false ? "#ef4444" : "rgba(150,150,150,0.8)";
  const lineWidth = Math.max(2, Math.min(4, w / 160));
  const radius = Math.max(3, Math.min(6, w / 120));
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  for (const [i, j] of POSE_CONNECTIONS) {
    if (i >= landmarks.length || j >= landmarks.length) continue;
    const a = landmarks[i];
    const b = landmarks[j];
    if (!a || !b || (a.visibility !== undefined && a.visibility < 0.3) || (b.visibility !== undefined && b.visibility < 0.3)) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }
  for (let i = 0; i < landmarks.length; i++) {
    if (i <= 10) continue; // skip face landmarks (0=nose, 1-10=eyes, ears, mouth)
    const lm = landmarks[i];
    if (!lm || (lm.visibility !== undefined && lm.visibility < 0.3)) continue;
    ctx.beginPath();
    ctx.arc(lm.x * w, lm.y * h, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export default function ExercisePage({ exerciseId, onNavigate }) {
  const exercise = getExerciseById(exerciseId);
  const [mode, setMode] = useState(null); // "live" | "upload"
  const [stream, setStream] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadExerciseId, setUploadExerciseId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [liveFeedback, setLiveFeedback] = useState(null);
  const [liveError, setLiveError] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const rafRef = useRef(null);
  const lastSendRef = useRef(0);
  const landmarksRef = useRef(null);
  const postureOkRef = useRef(undefined);

  const displayName = useState(() =>
    localStorage.getItem("pc_demo_username") || localStorage.getItem("pc_demo_email") || ""
  )[0];
  const userId = localStorage.getItem("pc_demo_user_id");

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stream]);

  useEffect(() => {
    if (mode !== "live" || !videoRef.current) return;
    let s = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((mediaStream) => {
        s = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      })
      .catch((err) => {
        console.error(err);
        setUploadError("Could not access camera. Please allow camera permission.");
      });
    return () => {
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, [mode]);

  // Live: run MediaPipe Pose and send landmarks to backend
  useEffect(() => {
    if (mode !== "live" || !stream || !videoRef.current) return;
    let cancelled = false;

    async function runPoseLoop() {
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) return;
        poseRef.current = landmarker;

        function tick() {
          if (cancelled) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          const now = performance.now();
          if (now - lastSendRef.current < 100) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          lastSendRef.current = now;
          const tsMs = Math.round(now);
          try {
            const result = landmarker.detectForVideo(video, tsMs);
            const landmarks = landmarksFromPoseResult(result);
            if (landmarks && landmarks.length >= 33) {
              landmarksRef.current = landmarks;
              drawPoseOnCanvas(
                canvasRef.current,
                video,
                landmarks,
                postureOkRef.current
              );
              api
                .streamAnalysis(exerciseId, landmarks, false)
                .then((data) => {
                  if (!cancelled) {
                    postureOkRef.current = data.posture_ok;
                    setLiveFeedback(data);
                  }
                })
                .catch(() => {
                  if (!cancelled) setLiveError("Backend unavailable. Is the server running?");
                });
            } else {
              landmarksRef.current = null;
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }
              setLiveFeedback({ message: "Show your full body in frame…", accuracy: 0 });
            }
          } catch (_) {
            // ignore frame errors
          }
          rafRef.current = requestAnimationFrame(tick);
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLiveError("Could not load pose model. Check your connection.");
      }
    }
    runPoseLoop();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, stream, exerciseId]);

  function handleSignOut() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    localStorage.removeItem("pc_demo_email");
    localStorage.removeItem("pc_demo_username");
    localStorage.removeItem("pc_demo_user_id");
    onNavigate("index");
  }

  function handleBack() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setMode(null);
    setStream(null);
    setUploadFile(null);
    setUploadError("");
    setLiveError("");
    setLiveFeedback(null);
    setAnalyzing(false);
    setUploadSuccess(false);
    setUploadResult(null);
    onNavigate("dashboard");
  }

  function handleLiveStart() {
    setMode("live");
    setUploadError("");
    setLiveError("");
    setLiveFeedback(null);
    setAnalyzing(true);
  }

  function handleResetCounter() {
    api.streamAnalysis(exerciseId, [], true).then((data) => setLiveFeedback(data)).catch(() => {});
  }

  function handleUploadChange(e) {
    const file = e.target.files?.[0];
    setUploadFile(file || null);
    setUploadExerciseId("");
    setUploadError("");
    setUploadSuccess(false);
    setUploadResult(null);
  }

  async function handleUploadSubmit() {
    if (!uploadFile) {
      setUploadError("Please select a video file.");
      return;
    }
    if (!uploadExerciseId) {
      setUploadError("Please select which exercise is shown in the video.");
      return;
    }
    if (uploadExerciseId !== exerciseId) {
      setUploadError(`Use the correct exercise. This page is for ${exercise.name} only.`);
      return;
    }
    setUploadError("");
    setUploadSuccess(false);
    setUploadResult(null);
    setAnalyzing(true);
    try {
      const result = await api.uploadVideo(uploadFile, exerciseId, userId || undefined);
      setUploadResult(result);
      setUploadSuccess(true);
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (!exercise) {
    return (
      <div className="dashboard-page">
        <p>Exercise not found.</p>
        <button type="button" className="btn primary" onClick={() => onNavigate("dashboard")}>
          Back to exercises
        </button>
      </div>
    );
  }

  const welcomeName = displayName ? displayName.charAt(0).toUpperCase() + displayName.slice(1) : "Guest";
  const youtubeUrl =
    exercise.youtubeUrl ||
    `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${exercise.name} exercise tutorial`
    )}`;

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-logo">PC</span>
          <span className="dashboard-title">Pose Corrector AI</span>
        </div>
        <div className="dashboard-user">
          <span className="dashboard-username">👤 {welcomeName}</span>
          <button type="button" className="btn ghost btn-signout" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="exercise-page-main">
        <button type="button" className="btn ghost back-link" onClick={handleBack}>
          ← Back to exercises
        </button>

        <h1 className="exercise-page-title">{exercise.name}</h1>
        {exercise.description && (
          <p className="exercise-page-description">{exercise.description}</p>
        )}

        <div className="exercise-image-wrap">
          <img
            src={exercise.imageUrl}
            alt={`${exercise.name} demo`}
            className={`exercise-image${
              exercise.id === "squat" || exercise.id === "pushup"
                ? " exercise-image-cover"
                : ""
            }${exercise.id === "lunges" ? " exercise-image-light" : ""}`}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="exercise-image-fallback hidden">
            <span className="exercise-emoji-large" role="img" aria-label={exercise.name}>
              {exercise.emoji}
            </span>
            <p className="muted">{exercise.name}</p>
          </div>
        </div>

        <a
          href={youtubeUrl}
          target="_blank"
          rel="noreferrer"
          className="btn outline exercise-youtube-link"
        >
          Watch a quick YouTube demo
        </a>

        {!mode ? (
          <div className="exercise-options">
            <p className="exercise-options-prompt">How do you want to practice?</p>
            <div className="exercise-option-cards">
              <button
                type="button"
                className="exercise-option-card"
                onClick={handleLiveStart}
              >
                <span className="exercise-option-icon">📹</span>
                <span className="exercise-option-title">Live workout</span>
                <span className="exercise-option-desc">Use your camera for real-time analysis</span>
              </button>
              <button
                type="button"
                className="exercise-option-card"
                onClick={() => setMode("upload")}
              >
                <span className="exercise-option-icon">📤</span>
                <span className="exercise-option-title">Upload a video</span>
                <span className="exercise-option-desc">Upload a video of this exercise only</span>
              </button>
            </div>
          </div>
        ) : mode === "live" ? (
          <div className="exercise-live-wrap">
            <div
              className={`exercise-video-container ${
                liveFeedback && typeof liveFeedback.posture_ok === "boolean"
                  ? liveFeedback.posture_ok
                    ? "posture-correct"
                    : "posture-incorrect"
                  : ""
              }`}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="exercise-video"
              />
              <canvas
                ref={canvasRef}
                className="exercise-pose-canvas"
                aria-hidden="true"
              />
            </div>
            {analyzing && !liveFeedback && (
              <p className="exercise-analyzing">Connecting to AI… Show your full body.</p>
            )}
            {liveFeedback && (
              <div
                className={`exercise-feedback ${
                  typeof liveFeedback.posture_ok === "boolean"
                    ? liveFeedback.posture_ok
                      ? "posture-correct"
                      : "posture-incorrect"
                    : ""
                }`}
              >
                <p className="exercise-feedback-message">{liveFeedback.message}</p>
                {typeof liveFeedback.accuracy === "number" && (
                  <p className="exercise-feedback-accuracy">Accuracy: {liveFeedback.accuracy}%</p>
                )}
                {typeof liveFeedback.counter === "number" && (
                  <p className="exercise-feedback-counter">Reps: {liveFeedback.counter}</p>
                )}
              </div>
            )}
            {liveError && <div className="error">{liveError}</div>}
            {uploadError && <div className="error">{uploadError}</div>}
            <div className="exercise-live-actions">
              <button type="button" className="btn outline" onClick={handleResetCounter}>
                Reset rep count
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  if (stream) stream.getTracks().forEach((t) => t.stop());
                  setStream(null);
                  setMode(null);
                  setAnalyzing(false);
                  setLiveFeedback(null);
                }}
              >
                Stop camera
              </button>
            </div>
          </div>
        ) : (
          <div className="exercise-upload-wrap">
            <label className="exercise-upload-label">
              Select video file
              <input
                type="file"
                accept="video/*"
                onChange={handleUploadChange}
                className="exercise-upload-input"
              />
            </label>
            {uploadFile && (
              <>
                <p className="muted small">Which exercise is shown in this video?</p>
                <select
                  value={uploadExerciseId}
                  onChange={(e) => setUploadExerciseId(e.target.value)}
                  className="exercise-select"
                >
                  <option value="">Select exercise…</option>
                  {EXERCISES.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </select>
                {uploadError && <div className="error">{uploadError}</div>}
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleUploadSubmit}
                  disabled={analyzing}
                >
                  {analyzing ? "Analyzing…" : "Analyze video"}
                </button>
                {uploadSuccess && uploadResult && (
                  <div className="exercise-upload-result">
                    <p className="exercise-upload-success">{uploadResult.message}</p>
                    <p className="muted">Accuracy: {uploadResult.accuracy}%</p>
                    {uploadResult.posture_ok !== undefined && (
                      <p className="muted">Form: {uploadResult.posture_ok ? "Good" : "Needs work"}</p>
                    )}
                    {typeof uploadResult.counter === "number" && (
                      <p className="muted">Reps: {uploadResult.counter}</p>
                    )}
                  </div>
                )}
              </>
            )}
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                setMode(null);
                setUploadFile(null);
                setUploadError("");
                setUploadSuccess(false);
                setUploadResult(null);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
