const stats = [
  { label: "Total Workouts", value: 24, icon: "🏋️", color: "#6C63FF" },
  { label: "Streak", value: "7 days", icon: "🔥", color: "#FF6B6B" },
  { label: "Avg Score", value: "87%", icon: "⭐", color: "#FFD93D" },
];

const recentWorkouts = [
  { exercise: "Squat", date: "Today", reps: 20, score: 92, icon: "🦵" },
  { exercise: "Plank", date: "Yesterday", reps: 3, score: 85, icon: "🧍" },
  { exercise: "Bicep Curl", date: "Mar 2", reps: 15, score: 78, icon: "💪" },
  { exercise: "Push-up", date: "Mar 1", reps: 12, score: 90, icon: "🤸" },
  { exercise: "Lunges", date: "Feb 28", reps: 16, score: 88, icon: "🚶" },
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekActivity = [1, 0, 1, 1, 0, 1, 1];

export default function ProfilePage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #1a1a2e, #16213e)",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#fff",
    }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px",
        background: "rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6C63FF, #00C9A7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14
          }}>PC</div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Pose Corrector AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ opacity: 0.7, fontSize: 14 }}>👤 Silky</span>
          <button style={{
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 13
          }}>Sign out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px" }}>

        {/* Profile Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 24, marginBottom: 28,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 20, padding: "24px 28px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #6C63FF, #00C9A7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800
          }}>S</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Silky Sindhani</h1>
            <p style={{ margin: "4px 0 10px", opacity: 0.6, fontSize: 14 }}>silky@example.com · Member since Jan 2026</p>
            <div style={{ display: "flex", gap: 12 }}>
              {[["Age", "23"], ["Height", "5'4\""], ["Weight", "130 lbs"]].map(([k, v]) => (
                <div key={k} style={{
                  background: "rgba(255,255,255,0.08)", borderRadius: 8,
                  padding: "4px 12px", fontSize: 13
                }}>
                  <span style={{ opacity: 0.6 }}>{k}: </span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <button style={{
            background: "linear-gradient(135deg, #6C63FF, #00C9A7)",
            border: "none", color: "#fff", borderRadius: 10,
            padding: "10px 20px", cursor: "pointer", fontWeight: 600, fontSize: 14
          }}>Edit Profile</button>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "20px",
              borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>

          {/* Recent Workouts */}
          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "24px",
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Recent Workouts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentWorkouts.map((w, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 14px"
                }}>
                  <span style={{ fontSize: 22 }}>{w.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{w.exercise}</div>
                    <div style={{ fontSize: 12, opacity: 0.5 }}>{w.date} · {w.reps} reps</div>
                  </div>
                  <div style={{
                    background: w.score >= 90 ? "rgba(0,201,167,0.2)" : "rgba(108,99,255,0.2)",
                    color: w.score >= 90 ? "#00C9A7" : "#6C63FF",
                    borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700
                  }}>{w.score}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* This Week */}
          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16, padding: "24px",
          }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>This Week</h3>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {weekDays.map((day, i) => (
                <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: weekActivity[i]
                      ? "linear-gradient(135deg, #6C63FF, #00C9A7)"
                      : "rgba(255,255,255,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    boxShadow: weekActivity[i] ? "0 0 10px rgba(108,99,255,0.4)" : "none"
                  }}>{weekActivity[i] ? "✓" : ""}</div>
                  <span style={{ fontSize: 11, opacity: 0.5 }}>{day}</span>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 24, padding: "16px", borderRadius: 12,
              background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 26 }}>🔥</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#FF6B6B" }}>7 Day Streak!</div>
              <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>Keep it going!</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}