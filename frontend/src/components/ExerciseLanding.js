import React, { useState, useEffect } from "react";
import useTheme from "../useTheme";
import { EXERCISES } from "../data/exercises";

const EXERCISE_COLORS = {
  "tree-pose":  { color: "rgba(124,58,237,0.25)",  border: "rgba(124,58,237,0.4)",  shadow: "rgba(124,58,237,0.2)"  },
  "plank":      { color: "rgba(6,182,212,0.2)",    border: "rgba(6,182,212,0.4)",   shadow: "rgba(6,182,212,0.2)"   },
  "bicep-curl": { color: "rgba(245,158,11,0.2)",   border: "rgba(245,158,11,0.4)",  shadow: "rgba(245,158,11,0.2)"  },
  "squat":      { color: "rgba(16,185,129,0.2)",   border: "rgba(16,185,129,0.4)",  shadow: "rgba(16,185,129,0.2)"  },
  "pushup":     { color: "rgba(239,68,68,0.2)",    border: "rgba(239,68,68,0.4)",   shadow: "rgba(239,68,68,0.2)"   },
  "lunges":     { color: "rgba(168,85,247,0.2)",   border: "rgba(168,85,247,0.4)",  shadow: "rgba(168,85,247,0.2)"  },
};


function ReviewsSection({ theme }) {
  const [reviews, setReviews] = React.useState([]);
  React.useEffect(() => {
    fetch("/api/reviews")
      .then(r => r.json())
      .then(d => setReviews(d.reviews || []))
      .catch(() => {});
  }, []);

  if (reviews.length === 0) return null;

  return (
    <div style={{ marginBottom: "48px" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontWeight: "700", color: theme === "light" ? "#0f172a" : "white" }}>
        What Our Users Say
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
        {reviews.map((r, i) => (
          <div key={i} style={{
            padding: "20px",
            background: theme === "light" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.04)",
            borderRadius: "16px",
            border: theme === "light" ? "1px solid rgba(30,64,175,0.2)" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: theme === "light" ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              {r.profile_pic
                ? <img src={r.profile_pic} alt={r.name} style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", border: "2px solid #7c3aed" }} />
                : <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: "16px" }}>{r.name.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div style={{ fontWeight: "600", fontSize: "14px", color: theme === "light" ? "#0f172a" : "white" }}>{r.name}</div>
                <div style={{ fontSize: "12px", color: theme === "light" ? "#64748b" : "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{r.exercise_type.replace(/-/g," ")}</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: "16px" }}>{"⭐".repeat(r.stars)}</div>
            </div>
            {r.comment && <div style={{ fontSize: "13px", color: theme === "light" ? "#475569" : "rgba(255,255,255,0.6)", lineHeight: 1.6, fontStyle: "italic" }}>"{r.comment}"</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExerciseLanding({ onNavigate }) {
  const [hovered, setHovered] = useState(null);

  const displayName = useState(() =>
    localStorage.getItem("pc_demo_username") || localStorage.getItem("pc_demo_email") || ""
  )[0];

  const [userStats, setUserStats] = useState({ total: "—", streak: "—", score: "—", lastEx: "—" });

  useEffect(() => {
    const userId = localStorage.getItem("pc_demo_user_id");
    if (!userId) return;
    fetch(`/api/profile?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        setUserStats({
          total: data.totalWorkouts ?? "—",
          streak: data.streakDays ?? "—",
          score: data.avgScore != null ? Math.round(data.avgScore) + "%" : "—",
          lastEx: data.recentWorkouts?.[0]?.exercise_type?.replace(/_/g," ") || "None",
        });
      })
      .catch(() => {});
  }, []);

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
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: theme === "light" ? "linear-gradient(180deg, #dbeafe, #bfdbfe)" : "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.1), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.07), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      color: theme === "light" ? "#0f172a" : "#e6f7f9", display: "flex", flexDirection: "column",
    }}>

      {/* TOP NAV */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px clamp(14px, 4vw, 32px)",
        background: theme === "light" ? "rgba(255,255,255,0.9)" : "rgba(15,23,42,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: theme === "light" ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.06)",
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
          <span style={{ fontWeight: "600", fontSize: "16px", color: theme === "light" ? "#0f172a" : "#e6f7f9" }}>Pose Corrector AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            style={{ background: "none", border: "none", color: theme === "light" ? "#475569" : "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer", padding: "7px 14px" }}
          >Profile</button>
          
<button onClick={toggleTheme} className="su-theme-btn" style={{ fontSize: "13px", padding: "7px 14px" }}>{theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}</button>
          <button
            type="button"
            onClick={handleSignOut}
            className="su-theme-btn" style={{ fontSize: "13px", padding: "7px 14px" }}>Sign out</button>
        </div>
      </header>

      <main style={{
        flex: 1, maxWidth: "1200px", width: "100%",
        margin: "0 auto", padding: "clamp(20px, 4vw, 40px) clamp(16px, 4vw, 32px) 48px", boxSizing: "border-box",
      }}>

        {/* HERO */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{
            margin: "0 0 8px", fontSize: "clamp(22px, 5vw, 36px)", fontWeight: "800",
            color: theme === "light" ? "#0f172a" : "transparent",
            background: theme === "light" ? "none" : "linear-gradient(135deg, #e6f7f9, #bcd4d9)",
            WebkitBackgroundClip: theme === "light" ? "unset" : "text",
            WebkitTextFillColor: theme === "light" ? "#0f172a" : "transparent",
          }}>Welcome back, {welcomeName}! 👋</h1>
          <p style={{ margin: 0, fontSize: "17px", color: theme === "light" ? "#475569" : "rgba(255,255,255,0.45)" }}>
            Choose an exercise below and let's get moving.
          </p>
        </div>

        {/* STATS BAR */}
        <div className="landing-stats" style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px", marginBottom: "40px",
        }}>
          {[
            { icon: "🏆", label: "Total Workouts", value: userStats.total,  color: "#6366f1" },
            { icon: "🔥", label: "Day Streak",     value: userStats.streak !== "—" ? userStats.streak + " days" : "—", color: "#ef4444" },
            { icon: "⭐", label: "Avg Accuracy",   value: userStats.score,  color: "#eab308" },
            { icon: "CAL", label: "Last Exercise",  value: userStats.lastEx, color: "#06b6d4" },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "18px 20px",
              background: theme === "light" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.04)",
              borderRadius: "14px",
              border: `1px solid ${s.color}80`,
              boxShadow: theme === "light" ? "0 2px 12px rgba(0,0,0,0.08)" : "none",
              display: "flex", alignItems: "center", gap: "14px",
            }}>
              {s.icon === "CAL" ? <img src="/calendar.png" alt="calendar" style={{ width:"30px", height:"30px", objectFit:"contain" }} /> : <span style={{ fontSize: "26px" }}>{s.icon}</span>}
              <div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: theme === "light" ? "#64748b" : "rgba(255,255,255,0.4)", marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* SECTION TITLE */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: theme === "light" ? "#0f172a" : "white" }}>Choose Your Exercise</h2>
          
        </div>

        {/* EXERCISE GRID */}
        <div className="landing-exercise-grid" style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px", marginBottom: "48px",
        }}>
          {EXERCISES.map((ex) => {
            const c = EXERCISE_COLORS[ex.id] || { color: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)", shadow: "rgba(0,0,0,0.2)" };
            const isHovered = hovered === ex.id;
            return (
              <div key={ex.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                onMouseEnter={() => setHovered(ex.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handleSelect(ex)}
                style={{
                  display: "flex", flexDirection: "column",
                  width: "100%",
                  alignItems: "center", justifyContent: "center",
                  gap: "0px", padding: "0px", overflow: "hidden",
                  background: isHovered ? c.color : theme === "light" ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.04)",
                  borderRadius: "18px",
                  border: `1px solid ${isHovered ? c.border : theme === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)"}`,
                  boxShadow: theme === "light" && !isHovered ? "0 2px 12px rgba(0,0,0,0.08)" : isHovered ? `0 16px 40px ${c.shadow}` : "none",
                  color: "#e6f7f9", cursor: "pointer",
                  transition: "all 0.2s ease",
                  transform: isHovered ? "translateY(-4px)" : "none",
                  boxShadow: isHovered ? `0 16px 40px ${c.shadow}` : "none",
                  height: "234px", minHeight: "unset",
                }}>
                <img
                  src={ex.imageUrl}
                  alt={ex.name}
                  style={{
                    width: "100%",
                    height: "234px",
                    objectFit: ex.id === "tree-pose" ? "cover" : "contain",
                    objectPosition: "center",
                    borderRadius: "12px 12px 12px 12px",
                    display: "block",
                    backgroundColor: "white",
                  }}
                />

              </button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: theme === "light" ? "#0f172a" : "white" }}>{ex.name}</div>
                <div style={{ fontSize: "12px", color: theme === "light" ? "#64748b" : "rgba(255,255,255,0.5)", marginTop: "3px" }}>{ex.short}</div>
              </div>
              </div>
            );
          })}
        </div>



      </main>
    </div>
  );
}
