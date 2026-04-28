import React, { useState, useEffect } from "react";
import * as api from "../api";
import useTheme from "../useTheme";

function ReviewCarousel({ reviews, isLight }) {
  const scrollRef = React.useRef(null);
  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += dir * 210;
    }
  };
  if (!reviews.length) return null;
  const colors = ["#6366f1","#06b6d4","#ef4444","#eab308"];
  const shortName = (name) => { const parts = name.trim().split(" "); return parts.length > 1 ? parts[0] + " " + parts[parts.length-1].charAt(0) + "." : parts[0]; };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
      <button onClick={() => scroll(-1)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: isLight ? "#475569" : "rgba(255,255,255,0.5)", flexShrink: 0, padding: "2px" }}>&#8249;</button>
      <div ref={scrollRef} style={{ display: "flex", flexDirection: "row", gap: "10px", overflowX: "scroll", flexWrap: "nowrap", flex: 1, paddingBottom: "4px", scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ padding: "16px", borderRadius: "8px", background: isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.04)", border: `1px solid ${colors[i % 4]}80`, minWidth: "180px", maxWidth: "180px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              {r.profile_pic
                ? <img src={r.profile_pic} alt={r.name} style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid #7c3aed" }} />
                : <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: "13px" }}>{r.name.charAt(0).toUpperCase()}</div>
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "12px", color: isLight ? "#0f172a" : "white" }}>{shortName(r.name)}</div>
                <div style={{ fontSize: "11px", color: isLight ? "#64748b" : "rgba(255,255,255,0.4)" }}>{"⭐".repeat(r.stars)}</div>
              </div>
            </div>
            {r.comment && <div style={{ fontSize: "12px", color: isLight ? "#475569" : "rgba(255,255,255,0.5)", fontStyle: "italic", lineHeight: 1.5 }}>"{r.comment}"</div>}
          </div>
        ))}
      </div>
      <button onClick={() => scroll(1)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: isLight ? "#475569" : "rgba(255,255,255,0.5)", flexShrink: 0, padding: "2px" }}>&#8250;</button>
    </div>
  );
}

function ReviewsMini({ isLight }) {
  const [reviews, setReviews] = React.useState([]);
  React.useEffect(() => {
    fetch("/api/reviews")
      .then(r => r.json())
      .then(d => setReviews((d.reviews || []).slice(0, 15)))
      .catch(() => {});
  }, []);
  if (reviews.length === 0) return null;
  return (
    <div style={{ marginTop: "28px", width: "100%" }}>
      <div style={{ fontSize: "13px", fontWeight: "600", color: isLight ? "#64748b" : "rgba(255,255,255,0.4)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>What users say</div>
      <ReviewCarousel reviews={reviews} isLight={isLight} />
    </div>
  );
}


function ReviewsMobile({ isLight }) {
  const [reviews, setReviews] = React.useState([]);
  React.useEffect(() => {
    fetch("/api/reviews")
      .then(r => r.json())
      .then(d => setReviews((d.reviews || []).slice(0, 4)))
      .catch(() => {});
  }, []);
  if (reviews.length === 0) return null;
  const colors = ["#6366f1","#06b6d4","#ef4444","#eab308"];
  const shortName = (name) => { const parts = name.trim().split(" "); return parts.length > 1 ? parts[0] + " " + parts[parts.length-1].charAt(0) + "." : parts[0]; };
  return (
    <div style={{ marginTop: "28px", width: "100%" }}>
      <div style={{ fontSize: "13px", fontWeight: "600", color: isLight ? "#64748b" : "rgba(255,255,255,0.4)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>What users say</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ padding: "12px", borderRadius: "8px", background: isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.04)", border: `1px solid ${colors[i % 4]}80`, boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              {r.profile_pic
                ? <img src={r.profile_pic} alt={r.name} style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", border: "2px solid #7c3aed" }} />
                : <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: "11px", flexShrink: 0 }}>{r.name.charAt(0).toUpperCase()}</div>
              }
              <div>
                <div style={{ fontWeight: "600", fontSize: "11px", color: isLight ? "#0f172a" : "white" }}>{shortName(r.name)}</div>
                <div style={{ fontSize: "10px" }}>{"⭐".repeat(r.stars)}</div>
              </div>
            </div>
            {r.comment && <div style={{ fontSize: "11px", color: isLight ? "#475569" : "rgba(255,255,255,0.5)", fontStyle: "italic", lineHeight: 1.4 }}>"{r.comment}"</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignIn({ onNavigate }) {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    
    
  }, []);

  function validate() {
    if (!email.trim()) return "Email is required";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return "Enter a valid email";
    if (!password) return "Password is required";
    return "";
  }

  function handleGuestLogin() {
    localStorage.setItem("pc_demo_email", "guest");
    localStorage.setItem("pc_demo_username", "Guest");
    localStorage.setItem("pc_demo_user_id", "0");
    onNavigate("dashboard");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);
    setIsLoading(true);
    try {
      const data = await api.signin(email, password);
      
      
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
    { icon: "1", title: "Real-time Pose Analysis", desc: "AI tracks your body movements frame by frame" },
    { icon: "2", title: "Form Correction", desc: "Instant feedback on your exercise technique" },
    { icon: "3", title: "Progress Tracking", desc: "Monitor your improvement over time" },
    { icon: "4", title: "6+ Exercises", desc: "Squats, planks, curls, lunges and more" },
  ];

  const isLight = theme === "light";

  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", position: "relative" }}>
    {/* Desktop theme button */}
    <button onClick={toggleTheme} className="su-theme-btn" style={{ position: "fixed", top: "8px", right: "16px", zIndex: 1000, display: window.innerWidth < 640 ? "none" : "block" }}>
      {isLight ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </button>

    {/* Mobile hamburger button */}
    <button onClick={() => setMenuOpen(true)} style={{ display: window.innerWidth < 640 ? "flex" : "none", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "5px", position: "fixed", top: "12px", right: "16px", zIndex: 1001, background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
      <span style={{ display: "block", width: "22px", height: "2px", background: isLight ? "#0f172a" : "white", borderRadius: "2px" }} />
      <span style={{ display: "block", width: "22px", height: "2px", background: isLight ? "#0f172a" : "white", borderRadius: "2px" }} />
      <span style={{ display: "block", width: "22px", height: "2px", background: isLight ? "#0f172a" : "white", borderRadius: "2px" }} />
    </button>

    {/* Mobile slide-in menu */}
    {menuOpen && (
      <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1002 }}>
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, width: "220px", height: "100%", background: isLight ? "white" : "#0f172a", boxShadow: "-4px 0 20px rgba(0,0,0,0.2)", padding: "24px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <button onClick={() => setMenuOpen(false)} style={{ alignSelf: "flex-end", background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: isLight ? "#0f172a" : "white" }}>✕</button>
          <button onClick={() => { toggleTheme(); setMenuOpen(false); }} className="su-theme-btn" style={{ width: "100%", textAlign: "center" }}>
            {isLight ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </button>
        </div>
      </div>
    )}
    <div className="si-wrap" style={{ overflowX: "hidden", width: "100%", maxWidth: "100%",
      background: isLight
        ? "linear-gradient(180deg, #e0f2fe, #bae6fd)"
        : "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.12), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.08), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      color: isLight ? "#0f172a" : "#e6f7f9",
    }}>

      {/* LEFT PANEL */}
      <div className="si-left" style={{
        background: isLight
          ? "linear-gradient(145deg, rgba(124,58,237,0.08), rgba(6,182,212,0.04))"
          : "linear-gradient(145deg, rgba(124,58,237,0.3), rgba(6,182,212,0.1))",
        borderRight: isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.07)",
      }}>
        <div className="si-left-inner">
          <div className="si-logo-row">
            <div className="si-logo-box">PC</div>
            <div>
              <h1 className="si-app-name" style={{ color: isLight ? "#0f172a" : "white" }}>Pose Corrector AI</h1>
              <p className="si-app-sub" style={{ color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
                Exercise form feedback — smarter, safer, stronger!
              </p>
            </div>
          </div>

          <div>
            <h2 className="si-tagline" style={{ color: isLight ? "#0f172a" : "white" }}>
              Train smarter,<br />
              <span className="si-tagline-gradient">not harder.</span>
            </h2>
            <p className="si-tagline-sub" style={{ color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
              Get real-time AI feedback on your workout form and prevent injuries before they happen.
            </p>
          </div>

          <div className="si-features">
            {features.map((f, i) => (
              <div key={i} className="si-feature" style={{
                background: isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.04)",
                border: isLight ? "1px solid rgba(30,64,175,0.5)" : "1px solid rgba(255,255,255,0.06)",
              }}>
                <span className="si-feature-icon" style={{ fontSize: "48px", fontWeight: "900", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", minWidth: "52px", textAlign: "center", lineHeight: 1, fontStyle: "italic", letterSpacing: "-2px" }}>{f.icon}</span>
                <div>
                  <div className="si-feature-title" style={{ color: isLight ? "#0f172a" : "rgba(255,255,255,0.9)" }}>{f.title}</div>
                  <div className="si-feature-desc" style={{ color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.45)" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="si-stats" style={{
            background: isLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.04)",
            border: isLight ? "1px solid rgba(30,64,175,0.5)" : "1px solid rgba(255,255,255,0.07)",
          }}>
            {[["6+", "Exercises"], ["AI", "Powered"], ["Live", "Feedback"], ["Free", "To Use"]].map(([num, label], i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="si-stat-divider" style={{ background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }} />}
                <div className="si-stat">
                  <span className="si-stat-num">{num}</span>
                  <span className="si-stat-label" style={{ color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.35)" }}>{label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", background: isLight ? "#ffffff" : "rgba(11,18,33,0.98)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(60px,8vw,100px) clamp(24px,6vw,56px) 24px", width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
        <div className="si-right-inner">

          <div className="si-welcome">
            <h2 className="si-welcome-title" style={{ color: isLight ? "#0f172a" : "white" }}>Welcome</h2>
            <p className="si-welcome-sub" style={{ color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.4)" }}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={submit} className="si-form">
            <div className="si-field">
              <label className="si-label" style={{ color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)" }}>Email address</label>
              <div style={{ position: "relative" }}>
                
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="off"
                  className="si-input si-input--icon"
                  style={{ background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)", border: isLight ? "1px solid rgba(30,64,175,0.55)" : "1px solid rgba(255,255,255,0.1)", color: isLight ? "#0f172a" : "white" }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'}
                  onBlur={e => e.target.style.borderColor = isLight ? 'rgba(30,64,175,0.55)' : 'rgba(255,255,255,0.1)'} />
              </div>
            </div>

            <div className="si-field">
              <label className="si-label" style={{ color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.9)" }}>Password</label>
              <div style={{ position: "relative" }}>
                
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password" autoComplete="new-password"
                  className="si-input si-input--icon si-input--icon-right"
                  style={{ background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)", border: isLight ? "1px solid rgba(30,64,175,0.55)" : "1px solid rgba(255,255,255,0.1)", color: isLight ? "#0f172a" : "white" }}
                  onFocus={e => e.target.style.borderColor = '#7c3aed'}
                  onBlur={e => e.target.style.borderColor = isLight ? 'rgba(30,64,175,0.55)' : 'rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="si-eye-btn">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>


            {error && (
              <div className="su-alert su-alert--error">⚠️ {error}</div>
            )}

            <button type="submit" disabled={isLoading} className="su-btn-primary" style={{ opacity: isLoading ? 0.7 : 1 }}>
              {isLoading ? "Signing in..." : "Sign In →"}
            </button>

            <div className="su-divider">
              <span className="su-divider-line" style={{ background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)" }} />
              <span className="su-divider-text" style={{ color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.25)" }}>New here?</span>
              <span className="su-divider-line" style={{ background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)" }} />
            </div>

            <button type="button" onClick={() => onNavigate("signup")} className="su-btn-secondary">
              Create an account
            </button>

            <div className="su-divider">
              <span className="su-divider-line" style={{ background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)" }} />
              <span className="su-divider-text" style={{ color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.25)" }}>or</span>
              <span className="su-divider-line" style={{ background: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)" }} />
            </div>

            <button type="button" onClick={handleGuestLogin} style={{ width:"100%", padding:"13px", borderRadius:"10px", border:"2px dashed", borderColor: isLight ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.2)", background:"none", color: isLight ? "#7c3aed" : "rgba(255,255,255,0.7)", fontSize:"15px", fontWeight:"600", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px" }}>
              👤 Continue as Guest
            </button>
          </form>
          {window.innerWidth < 640 && (
            <ReviewsMobile isLight={isLight} />
          )}
          {window.innerWidth >= 640 && (
            <div style={{ marginTop: "32px", overflow: "hidden", width: "calc(100% + 350px)", marginLeft: "-175px" }}>
              <ReviewsMini isLight={isLight} />
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
    </div>
  );
}
