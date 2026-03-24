import React, { useState, useEffect } from "react";

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EXERCISE_ICONS = {
  squat: "🦵", plank: "🧍", bicep_curl: "💪",
  push_up: "🤸", lunge: "🚶", tree_pose: "🧘",
};


function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}
export default function ProfilePage({ onNavigate }) {
  const [editing, setEditing] = useState(false);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");
  const isMobile = useIsMobile();

  const userId = localStorage.getItem("pc_demo_user_id");
  const userName = localStorage.getItem("pc_demo_username") || localStorage.getItem("pc_demo_email") || "User";
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  useEffect(() => {
    if (!userId) { setLoading(false); setError("Not logged in"); return; }
    fetch(`/api/profile?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        setProfileData(data);
        setAge(data.age || "");
        setHeight(data.height || "");
        setWeight(data.weight || "");
        setLoading(false);
      })
      .catch(() => { setError("Could not load profile data"); setLoading(false); });
  }, [userId]);

  async function handleSave() {
    try {
      const r = await fetch(`/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, age, height, weight })
      });
      const data = await r.json();
      if (data.success) {
        setSaveMsg("Saved successfully!");
        setEditing(false);
        setTimeout(() => setSaveMsg(""), 2500);
      } else {
        setSaveMsg("Save failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Save error:", err);
      setSaveMsg("Save failed — please try again.");
    }
  }

  const stats = profileData ? [
    { label: "Total Workouts", value: profileData.totalWorkouts ?? 0, icon: "🏆", color: "#6366f1" },
    { label: "Streak", value: `${profileData.streakDays ?? 0} days`, icon: "🔥", color: "#ef4444" },
    { label: "Avg Score", value: `${profileData.avgScore ?? 0}%`, icon: "⭐", color: "#eab308" },
    { label: "This Week", value: profileData.thisWeek ?? 0, icon: "📅", color: "#06b6d4" },
  ] : [];

  const recentWorkouts = profileData?.recentWorkouts || [];
  const weeklyActivity = profileData?.weeklyActivity || [false, false, false, false, false, false, false];

  return (
    <div style={{
      minHeight: "100vh", width: "100%",
      background: "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.1), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.07), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      color: "#e6f7f9",
    }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "12px 16px" : "14px 32px",
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
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
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16 }}>
          <button type="button"
            onClick={() => onNavigate ? onNavigate("dashboard") : (window.location.hash = "dashboard")}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer", padding: isMobile ? "6px 8px" : "7px 14px" }}
          >← Back</button>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>👤 {displayName}</span>
          <button type="button"
            onClick={() => {
              localStorage.removeItem("pc_demo_email");
              localStorage.removeItem("pc_demo_username");
              localStorage.removeItem("pc_demo_user_id");
              onNavigate ? onNavigate("signin") : (window.location.hash = "signin");
            }}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", fontSize: isMobile ? 12 : 14, padding: isMobile ? "5px 10px" : "7px 14px", cursor: "pointer" }}
          >Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px 40px" }}>

        {loading && <div style={{ textAlign: "center", opacity: 0.6, padding: 60 }}>Loading profile...</div>}
        {error && <div style={{ textAlign: "center", color: "#FF6B6B", padding: 60 }}>{error}</div>}

        {!loading && !error && (
          <>
            <div style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 20, padding: isMobile ? "20px 16px" : "28px",
              border: "1px solid rgba(255,255,255,0.07)",
              marginBottom: 20,
            }}>
              {/* Avatar + name row */}
              <div style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "center" : "flex-start",
                textAlign: isMobile ? "center" : "left",
                gap: 16, marginBottom: 20,
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, fontWeight: 800, color: "#fff",
                  boxShadow: "0 0 24px rgba(124,58,237,0.4)",
                }}>{displayName.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 22, fontWeight: 700, color: "#e6f7f9", lineHeight: 1.2 }}>{displayName}</h1>
                  <p style={{ margin: "5px 0 2px", opacity: 0.45, fontSize: 13 }}>
                    {localStorage.getItem("pc_demo_email") || ""}
                  </p>
                  <p style={{ margin: 0, opacity: 0.35, fontSize: 12 }}>
                    Member since {profileData?.memberSince ? new Date(profileData.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Mar 2026"}
                  </p>
                </div>
              </div>

              {/* Age / Height / Weight */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: isMobile ? 10 : 14, marginBottom: 16 }}>
                {[
                  { label: "Age",    value: age,    setter: setAge,    unit: "yrs", icon: "🎂" },
                  { label: "Height", value: height, setter: setHeight, unit: "in",  icon: "📏" },
                  { label: "Weight", value: weight, setter: setWeight, unit: "lb",  icon: "⚖️" },
                ].map((field) => (
                  <div key={field.label} style={{
                    background: "rgba(255,255,255,0.05)", borderRadius: 12,
                    padding: isMobile ? "12px 10px" : "14px 16px",
                    display: "flex", flexDirection: "column", gap: 6,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}>
                    <span style={{ fontSize: isMobile ? 10 : 11, opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {field.icon} {field.label}
                    </span>
                    {editing ? (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <input type="text" value={field.value || ""}
                          onChange={(e) => field.setter(e.target.value)}
                          style={{
                            background: "transparent", border: "none",
                            borderBottom: "1px solid rgba(255,255,255,0.35)",
                            color: "#e6f7f9", fontSize: isMobile ? 17 : 20, fontWeight: 700,
                            padding: "2px 0", outline: "none", width: isMobile ? "44px" : "60px",
                          }}
                        />
                        <span style={{ fontSize: 11, opacity: 0.5 }}>{field.unit}</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#e6f7f9" }}>
                          {field.value || "—"}
                        </span>
                        {field.value && <span style={{ fontSize: 11, opacity: 0.5 }}>{field.unit}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Edit / Save button - below stats */}
              <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end", gap: 8 }}>
                <button
                  style={{
                    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                    border: "none", color: "#fff", borderRadius: 12,
                    padding: "11px 28px", cursor: "pointer", fontWeight: 600, fontSize: 14,
                    width: isMobile ? "100%" : "auto",
                  }}
                  onClick={() => editing ? handleSave() : setEditing(true)}
                >{editing ? "Save Changes" : "Edit Profile"}</button>
              </div>
              {saveMsg && <p style={{ fontSize: 13, color: "#00C9A7", textAlign: "center", margin: "8px 0 0" }}>{saveMsg}</p>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 12 : 16, marginBottom: 20 }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${s.color}80`,
                  borderRadius: 16, padding: "20px",
                  display: "flex", alignItems: "center", gap: "16px",
                }}>
                  <span style={{ fontSize: "32px" }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: "28px", fontWeight: "800", color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "24px",
              }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#e6f7f9" }}>Recent Workouts</h3>
                {recentWorkouts.length === 0 ? (
                  <div style={{ opacity: 0.5, fontSize: 14, textAlign: "center", padding: "20px 0" }}>No workouts yet — start exercising! 💪</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {recentWorkouts.map((w, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <span style={{ fontSize: 22 }}>{EXERCISE_ICONS[w.exercise_type] || "🏋️"}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{(w.exercise_type || "").replace(/_/g, " ")}</div>
                          <div style={{ fontSize: 12, opacity: 0.5 }}>{w.date ? w.date.split("-").slice(1).concat(w.date.split("-")[0]).join("/") : ""} · {w.mode === "upload" ? "Upload" : "Live"} · {(w.exercise_type === "plank" || w.exercise_type === "tree_pose") ? `${w.reps}s` : `${w.reps} reps`}</div>
                        </div>
                        <div style={{
                          background: w.accuracy >= 90 ? "rgba(6,182,212,0.15)" : "rgba(124,58,237,0.15)",
                          color: w.accuracy >= 90 ? "#06b6d4" : "#7c3aed",
                          borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700
                        }}>{w.accuracy}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "24px",
              }}>
                <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#e6f7f9" }}>This Week</h3>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  {weekDayLabels.map((day, i) => (
                    <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: weeklyActivity[i] ? "linear-gradient(135deg, #7c3aed, #06b6d4)" : "rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700,
                        boxShadow: weeklyActivity[i] ? "0 0 10px rgba(124,58,237,0.4)" : "none"
                      }}>{weeklyActivity[i] ? "✓" : ""}</div>
                      <span style={{ fontSize: 11, opacity: 0.5 }}>{day}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
