import React, { useState, useEffect } from "react";

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EXERCISE_ICONS = {
  squat: "🦵", plank: "🧍", bicep_curl: "💪",
  push_up: "🤸", lunge: "🚶", tree_pose: "🧘",
};

export default function ProfilePage({ onNavigate }) {
  const [editing, setEditing] = useState(false);
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveMsg, setSaveMsg] = useState("");

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

  function handleSave() {
    fetch(`/api/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, age, height, weight })
    })
      .then(r => r.json())
      .then(() => { setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 2000); })
      .catch(() => setSaveMsg("Save failed"));
    setEditing(false);
  }

  const stats = profileData ? [
    { label: "Total Workouts", value: profileData.totalWorkouts ?? 0, icon: "🏋️", color: "#7c3aed" },
    { label: "Streak", value: `${profileData.streakDays ?? 0} days`, icon: "🔥", color: "#FF6B6B" },
    { label: "Avg Score", value: `${profileData.avgScore ?? 0}%`, icon: "⭐", color: "#06b6d4" },
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
        padding: "14px 32px",
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
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button type="button"
            onClick={() => onNavigate ? onNavigate("dashboard") : (window.location.hash = "dashboard")}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer", padding: "7px 14px" }}
          >← Back to exercises</button>
          <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>👤 {displayName}</span>
          <button type="button"
            onClick={() => {
              localStorage.removeItem("pc_demo_email");
              localStorage.removeItem("pc_demo_username");
              localStorage.removeItem("pc_demo_user_id");
              onNavigate ? onNavigate("signin") : (window.location.hash = "signin");
            }}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "rgba(255,255,255,0.6)", fontSize: "14px", padding: "7px 14px", cursor: "pointer" }}
          >Sign out</button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px" }}>

        {loading && <div style={{ textAlign: "center", opacity: 0.6, padding: 60 }}>Loading profile...</div>}
        {error && <div style={{ textAlign: "center", color: "#FF6B6B", padding: 60 }}>{error}</div>}

        {!loading && !error && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 24, marginBottom: 28,
              background: "rgba(255,255,255,0.04)",
              borderRadius: 20, padding: "24px 28px",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, fontWeight: 800
              }}>{displayName.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#e6f7f9" }}>{displayName}</h1>
                <p style={{ margin: "4px 0 10px", opacity: 0.5, fontSize: 14 }}>
                  {localStorage.getItem("pc_demo_email") || ""} · Member since {profileData?.memberSince ? new Date(profileData.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "2026"}
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { label: "Age", value: age, setter: setAge, unit: "yrs" },
                    { label: "Height", value: height, setter: setHeight, unit: "ft" },
                    { label: "Weight", value: weight, setter: setWeight, unit: "kg" },
                  ].map((field) => (
                    <div key={field.label} style={{
                      background: "rgba(255,255,255,0.06)", borderRadius: 8,
                      padding: "4px 12px", fontSize: 13,
                      display: "flex", alignItems: "center", gap: 6,
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}>
                      <span style={{ opacity: 0.5 }}>{field.label}:</span>
                      {editing ? (
                        <input type="text" value={field.value || ""}
                          onChange={(e) => field.setter(e.target.value)}
                          style={{
                            background: "transparent", border: "none",
                            borderBottom: "1px solid rgba(255,255,255,0.35)",
                            color: "#e6f7f9", fontSize: 13, padding: "2px 0",
                            outline: "none", minWidth: 40,
                          }}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{field.value ? `${field.value} ${field.unit}` : "—"}</span>
                      )}
                    </div>
                  ))}
                  {saveMsg && <span style={{ fontSize: 13, color: "#00C9A7", alignSelf: "center" }}>{saveMsg}</span>}
                </div>
              </div>
              <button
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
                  border: "none", color: "#fff", borderRadius: 10,
                  padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14,
                }}
                onClick={() => editing ? handleSave() : setEditing(true)}
              >{editing ? "Save" : "Edit Profile"}</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "20px",
                  borderTop: `3px solid ${s.color}`,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
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
                          <div style={{ fontSize: 12, opacity: 0.5 }}>{w.date} · {w.reps} reps</div>
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
                <div style={{
                  marginTop: 24, padding: "16px", borderRadius: 12,
                  background: profileData?.streakDays > 0 ? "rgba(255,107,107,0.08)" : "rgba(255,255,255,0.04)",
                  border: profileData?.streakDays > 0 ? "1px solid rgba(255,107,107,0.15)" : "1px solid rgba(255,255,255,0.07)",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 26 }}>{profileData?.streakDays > 0 ? "🔥" : "💤"}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: profileData?.streakDays > 0 ? "#FF6B6B" : "rgba(255,255,255,0.4)" }}>
                    {profileData?.streakDays > 0 ? `${profileData.streakDays} Day Streak!` : "No streak yet"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                    {profileData?.streakDays > 0 ? "Keep it going!" : "Start your first workout!"}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
