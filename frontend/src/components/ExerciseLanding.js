import React, { useState } from "react";
import { EXERCISES } from "../data/exercises";

const EXERCISE_COLORS = {
  "tree-pose":  { color: "rgba(124,58,237,0.25)",  border: "rgba(124,58,237,0.4)",  shadow: "rgba(124,58,237,0.2)"  },
  "plank":      { color: "rgba(6,182,212,0.2)",    border: "rgba(6,182,212,0.4)",   shadow: "rgba(6,182,212,0.2)"   },
  "bicep-curl": { color: "rgba(245,158,11,0.2)",   border: "rgba(245,158,11,0.4)",  shadow: "rgba(245,158,11,0.2)"  },
  "squat":      { color: "rgba(16,185,129,0.2)",   border: "rgba(16,185,129,0.4)",  shadow: "rgba(16,185,129,0.2)"  },
  "pushup":     { color: "rgba(239,68,68,0.2)",    border: "rgba(239,68,68,0.4)",   shadow: "rgba(239,68,68,0.2)"   },
  "lunges":     { color: "rgba(168,85,247,0.2)",   border: "rgba(168,85,247,0.4)",  shadow: "rgba(168,85,247,0.2)"  },
};

const tips = [
  { icon: "💡", title: "Warm up first",     desc: "Spend 5 minutes warming up before any session to prevent injuries." },
  { icon: "📸", title: "Good lighting",     desc: "Make sure your full body is visible and well-lit for best AI tracking." },
  { icon: "👟", title: "Wear fitted clothes", desc: "Fitted clothing helps the AI detect your joints more accurately." },
  { icon: "📏", title: "Stand back",        desc: "Keep 5–8 feet of distance from the camera for full body detection." },
];

export default function ExerciseLanding({ onNavigate }) {
  const [hovered, setHovered] = useState(null);

  const displayName = useState(() =>
    localStorage.getItem("pc_demo_username") || localStorage.getItem("pc_demo_email") || ""
  )[0];

  function handleSignOut() {
    localStorage.removeItem("pc_demo_email");
    localStorage.removeItem("pc_demo_username");
    localStorage.removeItem("pc_demo_user_id");
    onNavigate("signin");
  }

  function handleSelect(exercise) {
    onNavigate(`exercise-${exercise.id}`);
  }

  const welcomeName = displayName
    ? displayName.charAt(0).toUpperCase() + displayName.slice(1)
    : "Guest";

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.1), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.07), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      color: "#e6f7f9", display: "flex", flexDirection: "column",
    }}>

      {/* TOP NAV */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 32px",
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "700", fontSize: "14px", color: "white",
            boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
          }}>PC</div>
          <span style={{ fontWeight: "600", fontSize: "16px", color: "#e6f7f9" }}>Pose Corrector AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer", padding: "7px 14px" }}
          >Profile</button>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>👤 {welcomeName}</span>
          <button
            type="button"
            onClick={handleSignOut}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", fontSize: "14px", padding: "7px 14px", cursor: "pointer" }}
          >Sign out</button>
        </div>
      </header>

      <main style={{
        flex: 1, maxWidth: "1200px", width: "100%",
        margin: "0 auto", padding: "40px 32px 48px", boxSizing: "border-box",
      }}>

        {/* HERO */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{
            margin: "0 0 8px", fontSize: "36px", fontWeight: "800",
            background: "linear-gradient(135deg, #e6f7f9, #bcd4d9)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Welcome back, {welcomeName}! 👋</h1>
          <p style={{ margin: 0, fontSize: "17px", color: "rgba(255,255,255,0.45)" }}>
            Choose an exercise below and let's get moving.
          </p>
        </div>

        {/* STATS BAR */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px", marginBottom: "40px",
        }}>
          {[
            { icon: "🏆", label: "Exercises Available", value: "6"      },
            { icon: "🤖", label: "AI Model",            value: "Active" },
            { icon: "📡", label: "Live Analysis",       value: "Ready"  },
            { icon: "🎯", label: "Pose Tracking",       value: "On"     },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "18px 20px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", alignItems: "center", gap: "14px",
            }}>
              <span style={{ fontSize: "26px" }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "white" }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION TITLE */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "white" }}>Choose Your Exercise</h2>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>6 exercises available</span>
        </div>

        {/* EXERCISE GRID */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px", marginBottom: "48px",
        }}>
          {EXERCISES.map((ex) => {
            const c = EXERCISE_COLORS[ex.id] || { color: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)", shadow: "rgba(0,0,0,0.2)" };
            const isHovered = hovered === ex.id;
            return (
              <button
                key={ex.id}
                type="button"
                onMouseEnter={() => setHovered(ex.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSelect(ex)}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  gap: "14px", padding: "36px 24px",
                  background: isHovered ? c.color : "rgba(255,255,255,0.04)",
                  borderRadius: "18px",
                  border: `1px solid ${isHovered ? c.border : "rgba(255,255,255,0.08)"}`,
                  color: "#e6f7f9", cursor: "pointer",
                  transition: "all 0.2s ease",
                  transform: isHovered ? "translateY(-4px)" : "none",
                  boxShadow: isHovered ? `0 16px 40px ${c.shadow}` : "none",
                  minHeight: "180px",
                }}>
                <span style={{ fontSize: "3.2rem", lineHeight: 1 }}>{ex.emoji}</span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "6px" }}>{ex.name}</div>
                  <div style={{
                    fontSize: "13px", padding: "3px 12px",
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: "20px", color: "rgba(255,255,255,0.6)",
                    display: "inline-block",
                  }}>{ex.short}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* TIPS SECTION */}
        <div>
          <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: "700", color: "white" }}>
            💡 Tips for Best Results
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {tips.map((t, i) => (
              <div key={i} style={{
                padding: "20px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: "24px", marginBottom: "10px" }}>{t.icon}</div>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "white", marginBottom: "6px" }}>{t.title}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
