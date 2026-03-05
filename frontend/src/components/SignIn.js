import React, { useState, useEffect } from "react";
import * as api from "../api";

export default function SignIn({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pc_demo_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  function validate() {
    if (!email.trim()) return "Email is required";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return "Enter a valid email";
    if (!password) return "Password is required";
    return "";
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);
    setIsLoading(true);
    try {
      const data = await api.signin(email, password);
      if (remember) localStorage.setItem("pc_demo_email", email);
      else localStorage.removeItem("pc_demo_email");
      localStorage.setItem("pc_demo_user_id", String(data.user_id));
      localStorage.setItem("pc_demo_username", data.name || data.email || email);
      onNavigate("dashboard");
    } catch (err) {
      setError(err.message || "Sign in failed");
    } finally {
      setIsLoading(false);
    }
  }

  const features = [
    { icon: "🤸", title: "Real-time Pose Analysis", desc: "AI tracks your body movements frame by frame" },
    { icon: "🎯", title: "Form Correction", desc: "Instant feedback on your exercise technique" },
    { icon: "📊", title: "Progress Tracking", desc: "Monitor your improvement over time" },
    { icon: "💪", title: "6+ Exercises", desc: "Squats, planks, curls, lunges and more" },
  ];

  return (
    <div style={{
      minHeight: "100vh", width: "100vw",
      background: "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.12), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.08), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      display: "flex", alignItems: "stretch",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      color: "#e6f7f9", overflow: "hidden", margin: 0, padding: 0,
    }}>

      {/* ── LEFT PANEL ── */}
      <div style={{
        flex: "1 1 50%",
        background: "linear-gradient(145deg, rgba(124,58,237,0.3), rgba(6,182,212,0.1))",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "60px 56px", minHeight: "100vh",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "26px", maxWidth: "460px", width: "100%" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "16px",
              background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "800", fontSize: "20px", color: "white",
              boxShadow: "0 8px 30px rgba(124,58,237,0.4)", flexShrink: 0,
            }}>PC</div>
            <div>
              <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "white" }}>Pose Corrector AI</h1>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
                Exercise form feedback — smarter, safer, stronger!
              </p>
            </div>
          </div>

          <div>
            <h2 style={{ margin: "0 0 10px", fontSize: "30px", fontWeight: "800", color: "white", lineHeight: 1.2 }}>
              Train smarter,<br />
              <span style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                not harder.
              </span>
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Get real-time AI feedback on your workout form and prevent injuries before they happen.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "14px",
                padding: "14px 16px", background: "rgba(255,255,255,0.04)",
                borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontSize: "22px", flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,0.9)", marginBottom: "2px" }}>{f.title}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "flex", alignItems: "center", padding: "18px 22px",
            background: "rgba(255,255,255,0.04)", borderRadius: "14px",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            {[["6+", "Exercises"], ["AI", "Powered"], ["Live", "Feedback"], ["Free", "To Use"]].map(([num, label], i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width: "1px", height: "34px", background: "rgba(255,255,255,0.08)", margin: "0 14px" }} />}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                  <span style={{ fontSize: "18px", fontWeight: "700", color: "#06b6d4" }}>{num}</span>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        flex: "1 1 50%", background: "rgba(11,18,33,0.98)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "60px 56px", minHeight: "100vh",
      }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          <div style={{ marginBottom: "36px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "30px", fontWeight: "700", color: "white" }}>Welcome back 👋</h2>
            <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
              Sign in to continue your fitness journey
            </p>
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>Email address</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "15px" }}>✉️</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"
                  style={{ width: "100%", padding: "13px 14px 13px 44px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,255,255,0.7)" }}>Password</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", fontSize: "15px" }}>🔒</span>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password"
                  style={{ width: "100%", padding: "13px 46px 13px 44px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ width: "15px", height: "15px", accentColor: "#7c3aed" }} />
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>Remember me</span>
              </label>
              <button type="button" style={{ background: "none", border: "none", color: "#06b6d4", fontSize: "13px", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                onClick={() => onNavigate("reset-password")}>Forgot password?</button>
            </div>

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", color: "#fca5a5", fontSize: "13px" }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", border: "none", borderRadius: "12px", color: "white", fontSize: "15px", fontWeight: "700", cursor: "pointer", opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? "Signing in..." : "Sign In →"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>New here?</span>
              <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
            </div>

            <button type="button" onClick={() => onNavigate("signup")} style={{ width: "100%", padding: "13px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.75)", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>
              Create an account
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
