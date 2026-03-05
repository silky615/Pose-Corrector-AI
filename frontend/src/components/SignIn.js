import React, { useState, useEffect } from "react";
import LogoHeader from "./LogoHeader";
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
    { icon: "🤸", title: "Real-time Pose Analysis", desc: "AI tracks your body movements live" },
    { icon: "🎯", title: "Form Correction", desc: "Instant feedback on your exercise technique" },
    { icon: "📊", title: "Progress Tracking", desc: "Monitor your improvement over time" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ── LEFT PANEL ── */}
        <div style={styles.leftPanel}>
          <div style={styles.leftContent}>
            <div style={styles.badge}>PC</div>
            <h1 style={styles.leftTitle}>Pose Corrector AI</h1>
            <p style={styles.leftSub}>Exercise form feedback — smarter, safer, stronger!</p>

            <div style={styles.featureList}>
              {features.map((f, i) => (
                <div key={i} style={styles.featureItem}>
                  <span style={styles.featureIcon}>{f.icon}</span>
                  <div>
                    <div style={styles.featureTitle}>{f.title}</div>
                    <div style={styles.featureDesc}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.statsRow}>
              <div style={styles.stat}><span style={styles.statNum}>6+</span><span style={styles.statLabel}>Exercises</span></div>
              <div style={styles.statDivider} />
              <div style={styles.stat}><span style={styles.statNum}>AI</span><span style={styles.statLabel}>Powered</span></div>
              <div style={styles.statDivider} />
              <div style={styles.stat}><span style={styles.statNum}>Live</span><span style={styles.statLabel}>Feedback</span></div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.rightPanel}>
          <div style={styles.formBox}>
            <div style={styles.formHeader}>
              <h2 style={styles.formTitle}>Welcome back 👋</h2>
              <p style={styles.formSub}>Sign in to continue your fitness journey</p>
            </div>

            <form onSubmit={submit} style={styles.form}>
              {/* Email */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Email</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    style={styles.input}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}>🔒</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    style={{ ...styles.input, paddingRight: "48px" }}
                    onFocus={e => e.target.style.borderColor = '#7c3aed'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={styles.eyeBtn}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div style={styles.rowBetween}>
                <label style={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkText}>Remember me</span>
                </label>
                <button
                  type="button"
                  style={styles.forgotBtn}
                  onClick={() => onNavigate("reset-password")}
                >
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div style={styles.errorBox}>
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                style={isLoading ? { ...styles.submitBtn, opacity: 0.7 } : styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In →"}
              </button>

              {/* Divider */}
              <div style={styles.divider}>
                <span style={styles.dividerLine} />
                <span style={styles.dividerText}>New here?</span>
                <span style={styles.dividerLine} />
              </div>

              {/* Sign up link */}
              <button
                type="button"
                style={styles.signupBtn}
                onClick={() => onNavigate("signup")}
              >
                Create an account
              </button>

              <button
                type="button"
                style={styles.backLink}
                onClick={() => onNavigate("index")}
              >
                ← Back to home
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
  },
  container: {
    display: "flex",
    width: "100%",
    maxWidth: "960px",
    minHeight: "580px",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.07)",
  },

  /* LEFT */
  leftPanel: {
    flex: 1,
    background: "linear-gradient(145deg, rgba(124,58,237,0.35), rgba(6,182,212,0.15))",
    backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px",
  },
  leftContent: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  badge: {
    width: "60px",
    height: "60px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "800",
    fontSize: "20px",
    color: "white",
    boxShadow: "0 8px 30px rgba(124,58,237,0.4)",
  },
  leftTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: "700",
    color: "white",
    lineHeight: 1.2,
  },
  leftSub: {
    margin: 0,
    fontSize: "13px",
    color: "rgba(255,255,255,0.55)",
    lineHeight: 1.5,
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginTop: "8px",
  },
  featureItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
  },
  featureIcon: {
    fontSize: "22px",
    marginTop: "2px",
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: "2px",
  },
  featureDesc: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.45)",
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginTop: "12px",
    padding: "16px",
    background: "rgba(255,255,255,0.04)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.07)",
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
  },
  statNum: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#06b6d4",
  },
  statLabel: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.4)",
    marginTop: "2px",
  },
  statDivider: {
    width: "1px",
    height: "32px",
    background: "rgba(255,255,255,0.1)",
  },

  /* RIGHT */
  rightPanel: {
    flex: 1,
    background: "rgba(15,23,42,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px",
  },
  formBox: {
    width: "100%",
    maxWidth: "360px",
  },
  formHeader: {
    marginBottom: "32px",
  },
  formTitle: {
    margin: "0 0 6px",
    fontSize: "26px",
    fontWeight: "700",
    color: "white",
  },
  formSub: {
    margin: 0,
    fontSize: "13px",
    color: "rgba(255,255,255,0.45)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "7px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    fontSize: "15px",
    pointerEvents: "none",
    zIndex: 1,
  },
  input: {
    width: "100%",
    padding: "12px 14px 12px 42px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "white",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  },
  eyeBtn: {
    position: "absolute",
    right: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px",
    lineHeight: 1,
  },
  rowBetween: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  },
  checkbox: {
    width: "15px",
    height: "15px",
    accentColor: "#7c3aed",
  },
  checkText: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.6)",
  },
  forgotBtn: {
    background: "none",
    border: "none",
    color: "#06b6d4",
    fontSize: "13px",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 14px",
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "10px",
    color: "#fca5a5",
    fontSize: "13px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "opacity 0.2s, transform 0.1s",
    letterSpacing: "0.3px",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    background: "rgba(255,255,255,0.08)",
  },
  dividerText: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.3)",
    whiteSpace: "nowrap",
  },
  signupBtn: {
    width: "100%",
    padding: "12px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    color: "rgba(255,255,255,0.8)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  backLink: {
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "center",
    padding: "4px 0",
  },
};
