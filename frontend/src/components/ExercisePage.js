import React, { useState, useRef, useEffect } from "react";
import { EXERCISES, getExerciseById } from "../data/exercises";

export default function ExercisePage({ exerciseId, onNavigate }) {
  const exercise = getExerciseById(exerciseId);
  const [mode, setMode] = useState(null); // "live" | "upload"
  const [stream, setStream] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadExerciseId, setUploadExerciseId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const videoRef = useRef(null);

  const displayName = useState(() =>
    localStorage.getItem("pc_demo_username") || localStorage.getItem("pc_demo_email") || ""
  )[0];

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
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

  function handleSignOut() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    localStorage.removeItem("pc_demo_email");
    localStorage.removeItem("pc_demo_username");
    onNavigate("index");
  }

  function handleBack() {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setMode(null);
    setStream(null);
    setUploadFile(null);
    setUploadError("");
    setAnalyzing(false);
    setUploadSuccess(false);
    onNavigate("dashboard");
  }

  function handleLiveStart() {
    setMode("live");
    setUploadError("");
    setAnalyzing(true);
  }

  function handleUploadChange(e) {
    const file = e.target.files?.[0];
    setUploadFile(file || null);
    setUploadExerciseId("");
    setUploadError("");
    setUploadSuccess(false);
  }

  function handleUploadSubmit() {
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
    setAnalyzing(true);
    // Placeholder: in real app would upload and run analysis
    setTimeout(() => {
      setAnalyzing(false);
      setUploadSuccess(true);
    }, 2000);
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
            <div className="exercise-video-container">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="exercise-video"
              />
            </div>
            {analyzing && (
              <p className="exercise-analyzing">Analyzing your form…</p>
            )}
            {uploadError && <div className="error">{uploadError}</div>}
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                if (stream) stream.getTracks().forEach((t) => t.stop());
                setStream(null);
                setMode(null);
                setAnalyzing(false);
              }}
            >
              Stop camera
            </button>
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
                {uploadSuccess && (
                  <p className="exercise-upload-success">Analysis complete (demo).</p>
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
