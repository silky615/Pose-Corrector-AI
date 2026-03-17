import React, { useState, useRef, useEffect } from "react";
import { EXERCISES, getExerciseById } from "../data/exercises";
import * as api from "../api";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

function landmarksFromPoseResult(result) {
  if (!result?.landmarks?.[0]) return null;
  return result.landmarks[0].map((lm) => ({
    x: lm.x, y: lm.y, z: lm.z ?? 0, visibility: lm.visibility ?? 1,
  }));
}

const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [23,24],[11,23],[12,24],
  [23,25],[25,27],[24,26],[26,28],
  [27,29],[29,31],[28,30],[30,32],
];

function drawPoseOnCanvas(canvas, video, landmarks, postureOk) {
  if (!canvas || !video || !landmarks || landmarks.length < 33) return;
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return;
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  const color = postureOk === true ? "#22c55e" : postureOk === false ? "#ef4444" : "rgba(150,150,150,0.8)";
  const lineWidth = Math.max(2, Math.min(4, w / 160));
  const radius = Math.max(3, Math.min(6, w / 120));
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = "round";
  for (const [i, j] of POSE_CONNECTIONS) {
    if (i >= landmarks.length || j >= landmarks.length) continue;
    const a = landmarks[i]; const b = landmarks[j];
    if (!a || !b || (a.visibility !== undefined && a.visibility < 0.3) || (b.visibility !== undefined && b.visibility < 0.3)) continue;
    ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.stroke();
  }
  for (let i = 0; i < landmarks.length; i++) {
    if (i <= 10) continue;
    const lm = landmarks[i];
    if (!lm || (lm.visibility !== undefined && lm.visibility < 0.3)) continue;
    ctx.beginPath(); ctx.arc(lm.x * w, lm.y * h, radius, 0, 2 * Math.PI); ctx.fill();
  }
}

const difficultyStyle = {
  Beginner:     { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  text: "#4ade80" },
  Intermediate: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#fbbf24" },
  Advanced:     { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  text: "#f87171" },
};

export default function ExercisePage({ exerciseId, onNavigate }) {
  const exercise = getExerciseById(exerciseId);
  const [mode, setMode] = useState(null);
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
  const sessionIdRef = useRef(null);
  const repAccuraciesRef = useRef([]);
  const lastSpokenRef = useRef("");
  const lastSpokenTimeRef = useRef(0);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  function speak(text) {
    if (isMutedRef.current) return;
    const now = Date.now();
    if (text === lastSpokenRef.current && now - lastSpokenTimeRef.current < 4000) return;
    lastSpokenRef.current = text;
    lastSpokenTimeRef.current = now;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.0;
      u.volume = 1.0;
      window.speechSynthesis.speak(u);
    }
  }
  const maxCounterRef = useRef(0);
  const plankIntervalRef = useRef(null);
  const plankSecondsRef = useRef(0);
  const [plankSeconds, setPlankSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState(null);
  const [uploadVideoUrl, setUploadVideoUrl] = useState(null);

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
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((err) => {
        console.error(err);
        setLiveError("Could not access camera. Please allow camera permission.");
        setAnalyzing(false);
      });
    return () => { if (s) s.getTracks().forEach((t) => t.stop()); };
  }, [mode]);

  useEffect(() => {
    if (mode !== "live" || !stream) return;
    let cancelled = false;
    async function loadPose() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        poseRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO", numPoses: 1,
        });
        setAnalyzing(false);
      } catch (e) {
        console.error("Pose model load error:", e);
        setLiveError("Could not load pose model. Check your connection.");
      }
    }
    async function runPoseLoop() {
      await loadPose();
      function loop(ts) {
        if (cancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && video.readyState >= 2 && poseRef.current) {
          try {
            const result = poseRef.current.detectForVideo(video, ts);
            const lms = landmarksFromPoseResult(result);
            landmarksRef.current = lms;
            drawPoseOnCanvas(canvas, video, lms, postureOkRef.current);
            const now = Date.now();
            if (lms && now - lastSendRef.current > 100) {
              lastSendRef.current = now;
              api.streamAnalysis(exerciseId, lms).then((data) => {
                if (!cancelled) {
                  setLiveFeedback(data);
                  postureOkRef.current = data.posture_ok;
                  const msg = data.message || (data.posture_ok ? "Good form" : "Adjust your form");
                  speak(msg);
                  if (exerciseId === "plank" || exerciseId === "tree-pose") {
                    if (data.posture_ok) {
                      if (!plankIntervalRef.current) {
                        plankIntervalRef.current = setInterval(() => {
                          plankSecondsRef.current += 1;
                          setPlankSeconds(plankSecondsRef.current);
                        }, 1000);
                      }
                    } else {
                      if (plankIntervalRef.current) {
                        clearInterval(plankIntervalRef.current);
                        plankIntervalRef.current = null;
                      }
                    }
                  }
                  if (data.accuracy) repAccuraciesRef.current.push(data.accuracy);
                  if (data.counter && data.counter > maxCounterRef.current) maxCounterRef.current = data.counter;
                }
              }).catch(() => {});
            }
          } catch (e) { console.error(e); }
        }
        rafRef.current = requestAnimationFrame(loop);
      }
      rafRef.current = requestAnimationFrame(loop);
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
    onNavigate("signin");
  }

  function handleBack() {
    if (sessionIdRef.current) {
      const reps = (exerciseId === "plank" || exerciseId === "tree-pose") ? plankSecondsRef.current : (maxCounterRef.current || (liveFeedback ? liveFeedback.counter || 0 : 0));
      const acc = repAccuraciesRef.current.length > 0 ? Math.round(repAccuraciesRef.current.reduce((a,b) => a+b, 0) / repAccuraciesRef.current.length) : 0;
      api.endSession(sessionIdRef.current, reps, acc).catch(() => {});
      sessionIdRef.current = null;
    }
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setMode(null); setStream(null); setUploadFile(null);
    setUploadError(""); setLiveError(""); setLiveFeedback(null);
    setAnalyzing(false); setUploadSuccess(false); setUploadResult(null);
    onNavigate("dashboard");
  }

  function handleLiveStart() {
    if (userId) {
      api.startSession(userId, api.toBackendExerciseType(exerciseId), "live")
        .then(data => { sessionIdRef.current = data.session_id; })
        .catch(() => {});
    }
    setMode("live"); setUploadError(""); setLiveError(""); setLiveFeedback(null); setAnalyzing(true);
  }

  function handleResetCounter() {
    api.streamAnalysis(exerciseId, [], true).then((data) => setLiveFeedback(data)).catch(() => {});
  }

  function handleUploadChange(e) {
    const file = e.target.files?.[0];
    setUploadFile(file || null); setUploadExerciseId(exerciseId); setUploadError(""); setUploadSuccess(false); setUploadResult(null);
    if (file) setUploadVideoUrl(URL.createObjectURL(file));
    else setUploadVideoUrl(null);
  }

  async function handleUploadSubmit() {
    if (!uploadFile) { setUploadError("Please select a video file."); return; }
    if (!uploadExerciseId) { setUploadError("Please select which exercise is shown in the video."); return; }
    if (uploadExerciseId !== exerciseId) { setUploadError(`Use the correct exercise. This page is for ${exercise.name} only.`); return; }
    setUploadError(""); setUploadSuccess(false); setUploadResult(null); setAnalyzing(true);
    setUploadProgress(0);

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO", numPoses: 1,
      });

      const videoEl = document.createElement("video");
      videoEl.src = URL.createObjectURL(uploadFile);
      videoEl.muted = true;
      await new Promise((res) => { videoEl.onloadedmetadata = res; });
      const duration = videoEl.duration;

      const accuracies = [];
      let maxReps = 0;
      let goodFrames = 0;
      const frameInterval = 1 / 10;
      let currentTime = 0;

      await new Promise((resolve, reject) => {
        videoEl.onseeked = async () => {
          try {
            const ts = Math.round(currentTime * 1000);
            const result = poseLandmarker.detectForVideo(videoEl, ts);
            const lms = landmarksFromPoseResult(result);
            if (lms) {
              const data = await api.streamAnalysis(exerciseId, lms).catch(() => null);
              if (data) {
                if (data.accuracy) accuracies.push(data.accuracy);
                if (data.counter && data.counter > maxReps) maxReps = data.counter;
                if (data.posture_ok) goodFrames += 1;
              }
            }
            setUploadProgress(Math.round((currentTime / duration) * 100));
            currentTime += frameInterval;
            // Sync preview video
            const prev = document.getElementById("upload-preview-video");
            if (prev) prev.currentTime = currentTime;
            if (currentTime < duration) {
              videoEl.currentTime = currentTime;
            } else {
              resolve();
            }
          } catch(e) { reject(e); }
        };
        videoEl.onerror = reject;
        videoEl.currentTime = 0;
        // Sync preview video
        const previewVid = document.getElementById("upload-preview-video");
        if (previewVid) { previewVid.currentTime = 0; previewVid.play().catch(()=>{}); }
      });

      const avgAccuracy = accuracies.length > 0
        ? Math.round(accuracies.reduce((a,b) => a+b, 0) / accuracies.length) : 0;

      const holdSeconds = Math.round(goodFrames * frameInterval);
      const result = {
        total_reps: (exerciseId === "plank" || exerciseId === "tree-pose") ? holdSeconds : maxReps,
        avg_accuracy: avgAccuracy,
        feedback: avgAccuracy >= 70 ? "Great form overall!" : "Keep practicing to improve your form."
      };
      setUploadResult(result);
      setUploadSuccess(true);
      setUploadProgress(100);

      if (userId) {
        const sid = await api.startSession(userId, api.toBackendExerciseType(exerciseId), "upload").then(d => d.session_id).catch(() => null);
        if (sid) await api.endSession(sid, maxReps, avgAccuracy).catch(() => {});
      }

      poseLandmarker.close();
      URL.revokeObjectURL(videoEl.src);
    } catch (err) {
      setUploadError("Analysis failed: " + (err.message || "Unknown error"));
    } finally {
      setAnalyzing(false);
    }
  }

  if (!exercise) {
    return (
      <div className="dashboard-page">
        <p>Exercise not found.</p>
        <button type="button" className="btn primary" onClick={() => onNavigate("dashboard")}>Back to exercises</button>
      </div>
    );
  }

  const welcomeName = displayName ? displayName.charAt(0).toUpperCase() + displayName.slice(1) : "Guest";
  const youtubeUrl = exercise.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exercise.name} exercise tutorial`)}`;
  const diff = difficultyStyle[exercise.difficulty] || difficultyStyle["Beginner"];

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.1), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.07), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      color: "#e6f7f9", display: "flex", flexDirection: "column",
    }}>

      {/* TOPBAR */}
      <header style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 32px", background:"rgba(15,23,42,0.85)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ width:"40px", height:"40px", borderRadius:"10px", background:"linear-gradient(135deg,#7c3aed,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700", fontSize:"14px", color:"white", boxShadow:"0 4px 14px rgba(124,58,237,0.3)" }}>PC</div>
          <span style={{ fontWeight:"600", fontSize:"16px", color:"#e6f7f9" }}>Pose Corrector AI</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.5)" }}>👤 {welcomeName}</span>
          <button type="button" onClick={handleSignOut} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"8px", color:"rgba(255,255,255,0.6)", fontSize:"14px", padding:"7px 14px", cursor:"pointer" }}>Sign out</button>
        </div>
      </header>

      <main style={{ flex:1, maxWidth:"1400px", width:"100%", margin:"0 auto", padding:"32px 48px 64px", boxSizing:"border-box" }}>

        {/* BACK */}
        <button type="button" onClick={handleBack} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:"15px", cursor:"pointer", marginBottom:"24px", padding:0 }}>
          ← Back to exercises
        </button>

        {/* TOP: image left, info right */}
        {!mode && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"40px", marginBottom:"36px", alignItems:"start" }}>

              {/* IMAGE */}
              <div style={{ position:"relative", borderRadius:"18px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.08)", background:"rgba(0,0,0,0.2)", aspectRatio:"4/3" }}>
                <img
                  src={exercise.imageUrl}
                  alt={`${exercise.name} demo`}
                  style={{ width:"100%", height:"100%", objectFit: (exercise.id === "squat" || exercise.id === "pushup") ? "cover" : "contain", objectPosition:"center", background: exercise.id === "lunges" ? "#fff" : "#000" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="exercise-image-fallback hidden">
                  <span style={{ fontSize:"5rem" }}>{exercise.emoji}</span>
                  <p style={{ color:"rgba(255,255,255,0.5)", margin:0 }}>{exercise.name}</p>
                </div>
              </div>

              {/* INFO */}
              <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>

                {/* Title + difficulty */}
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"10px", flexWrap:"wrap" }}>
                    <h1 style={{ margin:0, fontSize:"34px", fontWeight:"800", color:"white" }}>{exercise.name}</h1>
                    {exercise.difficulty && (
                      <span style={{ padding:"5px 16px", borderRadius:"20px", fontSize:"13px", fontWeight:"600", background: diff.bg, border:`1px solid ${diff.border}`, color: diff.text }}>
                        {exercise.difficulty}
                      </span>
                    )}
                  </div>
                  <p style={{ margin:0, fontSize:"16px", color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>{exercise.description}</p>
                </div>

                {/* Quick stats */}
                {(exercise.sets || exercise.reps || exercise.calories) && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px" }}>
                    {[
                      { icon:"🔁", label:"Sets",     value: exercise.sets     },
                      { icon:"⏱️", label:"Duration",  value: exercise.reps     },
                      { icon:"🔥", label:"Calories",  value: exercise.calories },
                    ].map((s, i) => (
                      <div key={i} style={{ padding:"14px 10px", background:"rgba(255,255,255,0.05)", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.07)", textAlign:"center" }}>
                        <div style={{ fontSize:"20px", marginBottom:"6px" }}>{s.icon}</div>
                        <div style={{ fontSize:"15px", fontWeight:"700", color:"white" }}>{s.value}</div>
                        <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.35)", marginTop:"2px" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Muscles targeted */}
                {exercise.muscles?.length > 0 && (
                  <div>
                    <p style={{ margin:"0 0 10px", fontSize:"13px", fontWeight:"600", color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"1px" }}>Muscles Targeted</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
                      {exercise.muscles.map((m, i) => (
                        <span key={i} style={{ padding:"5px 14px", borderRadius:"20px", fontSize:"13px", background:"rgba(6,182,212,0.12)", border:"1px solid rgba(6,182,212,0.25)", color:"#67e8f9" }}>{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* YouTube */}
                <a href={youtubeUrl} target="_blank" rel="noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:"8px", padding:"12px 20px", background:"rgba(255,0,0,0.12)", border:"1px solid rgba(255,0,0,0.3)", borderRadius:"10px", color:"#fca5a5", fontSize:"15px", fontWeight:"600", textDecoration:"none", width:"fit-content" }}>
                  ▶ Watch YouTube Demo
                </a>
              </div>
            </div>

            {/* FORM CHECKLIST */}
            {exercise.checklist?.length > 0 && (
              <div style={{ marginBottom:"36px" }}>
                <h2 style={{ margin:"0 0 16px", fontSize:"20px", fontWeight:"700", color:"white" }}>✅ Form Checklist</h2>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                  {exercise.checklist.map((tip, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"12px", padding:"16px 18px", background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)", borderRadius:"12px" }}>
                      <span style={{ fontSize:"16px", flexShrink:0, marginTop:"1px" }}>✅</span>
                      <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.75)", lineHeight:1.6 }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRACTICE OPTIONS */}
            <div>
              <h2 style={{ margin:"0 0 16px", fontSize:"20px", fontWeight:"700", color:"white" }}>How do you want to practice?</h2>
              <div className="exercise-option-cards">
                <button type="button" className="exercise-option-card" onClick={handleLiveStart}>
                  <span className="exercise-option-icon">📹</span>
                  <span className="exercise-option-title">Live Workout</span>
                  <span className="exercise-option-desc">Use your camera for real-time analysis</span>
                </button>
                <button type="button" className="exercise-option-card" onClick={() => setMode("upload")}>
                  <span className="exercise-option-icon">📤</span>
                  <span className="exercise-option-title">Upload a Video</span>
                  <span className="exercise-option-desc">Upload a video of this exercise only</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* LIVE MODE */}
        {mode === "live" && (
          <div className="exercise-live-wrap">

            <h2 style={{ margin:"0 0 16px", fontSize:"22px", fontWeight:"700", color:"white" }}>{exercise.name} — Live</h2>
            {analyzing && <p className="exercise-analyzing">⏳ Starting camera & loading pose model…</p>}
            {liveError && <p style={{ color:"#fca5a5" }}>{liveError}</p>}
            <div className={`exercise-video-container${liveFeedback ? (liveFeedback.posture_ok ? " posture-correct" : " posture-incorrect") : ""}`}>
              <video ref={videoRef} className="exercise-video" autoPlay playsInline muted webkit-playsinline="true" style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}} />
              <canvas ref={canvasRef} className="exercise-pose-canvas" />
            </div>
            {liveFeedback && (
              <div className={`exercise-feedback${liveFeedback.posture_ok ? " posture-correct" : " posture-incorrect"}`}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"4px" }}>
                  <p className="exercise-feedback-message" style={{margin:0}}>{liveFeedback.message || (liveFeedback.posture_ok ? "✅ Good form!" : "⚠️ Adjust your form")}</p>
                  <button type="button" onClick={() => { isMutedRef.current = !isMutedRef.current; setIsMuted(isMutedRef.current); window.speechSynthesis.cancel(); }} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"8px", color:"white", padding:"4px 10px", fontSize:"13px", cursor:"pointer" }}>
                    {isMuted ? "🔇 Unmute" : "🔊 Mute"}
                  </button>
                </div>
                {liveFeedback.accuracy != null && <p className="exercise-feedback-accuracy">Accuracy: {Math.round(liveFeedback.accuracy)}%</p>}
                {(exerciseId === "plank" || exerciseId === "tree-pose") && (
                  <p className="exercise-feedback-counter" style={{fontSize:"20px", fontWeight:"700", color: liveFeedback.posture_ok ? "#4ade80" : "#fca5a5"}}>
                    ⏱ {Math.floor(plankSeconds / 60).toString().padStart(2,"0")}:{(plankSeconds % 60).toString().padStart(2,"0")}
                    <button type="button" className="btn ghost" onClick={() => { plankSecondsRef.current = 0; setPlankSeconds(0); }} style={{ marginLeft:"12px", fontSize:"12px", padding:"3px 10px", minWidth:"auto" }}>Reset</button>
                  </p>
                )}
                {liveFeedback.counter != null && (
                  <p className="exercise-feedback-counter">
                    Reps: {liveFeedback.counter}
                    <button type="button" className="btn ghost" onClick={handleResetCounter} style={{ marginLeft:"12px", fontSize:"12px", padding:"3px 10px", minWidth:"auto" }}>Reset</button>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* UPLOAD MODE */}
        {mode === "upload" && (
          <div className="exercise-upload-wrap">

            <h2 style={{ margin:"0 0 16px", fontSize:"22px", fontWeight:"700", color:"white" }}>{exercise.name} — Upload Video</h2>
            <label className="exercise-upload-label">
              Select video file:
              <input type="file" accept="video/*" onChange={handleUploadChange} className="exercise-upload-input" />
            </label>

            {!analyzing && !uploadSuccess && uploadVideoUrl && (
              <button type="button" className="btn primary" onClick={handleUploadSubmit}>Analyse Video</button>
            )}
            {uploadVideoUrl && (
              <>
              {analyzing && <p className="exercise-analyzing" style={{margin:"8px 0", textAlign:"center"}}>⏳ Analysing video… {uploadProgress}%</p>}
              <div style={{ display:"flex", flexDirection:"column", gap:"16px", marginTop:"8px" }}>
                {uploadSuccess && uploadResult && (
                  <div style={{ background:"rgba(6,182,212,0.08)", border:"1px solid rgba(6,182,212,0.2)", borderRadius:"12px", padding:"16px", fontSize:"14px" }}>
                    <p className="exercise-upload-success">✅ Analysis complete!</p>
                    {uploadResult.total_reps != null && (
                      exerciseId === "plank" || exerciseId === "tree-pose"
                        ? <p className="muted small">Hold time: {uploadResult.total_reps} seconds</p>
                        : <p className="muted small">Reps detected: {uploadResult.total_reps}</p>
                    )}
                    {uploadResult.avg_accuracy != null && <p className="muted small">Avg accuracy: {Math.round(uploadResult.avg_accuracy)}%</p>}
                    {uploadResult.feedback && <p className="muted small">{uploadResult.feedback}</p>}
                  </div>
                )}
                <div style={{ borderRadius:"12px", overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)", width:"100%" }}>
                  <video
                    id="upload-preview-video"
                    src={uploadVideoUrl}
                    muted
                    style={{ width:"100%", width:"100%", height:"75vh", display:"block", background:"#000", objectFit:"cover" }}
                  />
                  {analyzing && (
                    <div style={{ padding:"10px 16px", background:"rgba(6,182,212,0.08)", display:"flex", alignItems:"center", gap:"12px" }}>
                      <div style={{ flex:1, height:"6px", background:"rgba(255,255,255,0.1)", borderRadius:"4px", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${uploadProgress}%`, background:"linear-gradient(90deg,#7c3aed,#06b6d4)", borderRadius:"4px", transition:"width 0.3s ease" }} />
                      </div>
                      <span style={{ fontSize:"13px", color:"#67e8f9", whiteSpace:"nowrap" }}>{uploadProgress}%</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop:"8px" }}>
                  <p style={{ fontWeight:"600", marginBottom:"14px", fontSize:"15px", color:"#e2e8f0" }}>💡 Tips for Best Results</p>
                  <div style={{ display:"flex", flexDirection:"row", gap:"16px", flexWrap:"wrap" }}>
                    {[
                      { icon:"💪", title:"Warm up first", desc:"Spend 5 minutes warming up before any session to prevent injuries." },
                      { icon:"📸", title:"Good lighting", desc:"Make sure your full body is visible and well-lit for best AI tracking." },
                      { icon:"👟", title:"Wear fitted clothes", desc:"Fitted clothing helps the AI detect your joints more accurately." },
                      { icon:"📏", title:"Stand back", desc:"Keep 5–8 feet of distance from the camera for full body detection." },
                    ].map((tip, i) => (
                      <div key={i} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", padding:"20px", flex:"1 1 200px", minWidth:"180px" }}>
                        <span style={{ fontSize:"28px", display:"block", marginBottom:"10px" }}>{tip.icon}</span>
                        <p style={{ fontWeight:"600", margin:"0 0 6px", fontSize:"13px", color:"#e2e8f0" }}>{tip.title}</p>
                        <p style={{ margin:0, fontSize:"12px", color:"#94a3b8", lineHeight:"1.6" }}>{tip.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </>
            )}
            {uploadError && <p style={{ color:"#fca5a5", margin:0 }}>⚠️ {uploadError}</p>}
          </div>
        )}

      </main>
    </div>
  );
}
// session tracking enabled
