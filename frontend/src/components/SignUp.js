import React, { useState } from "react";
import useTheme from "../useTheme";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function SignUp({ onNavigate }) {
  const { theme, toggleTheme } = useTheme();
  const [step, setStep] = useState("signup");
  const [form, setForm] = useState({ fullname: "", age: "", email: "", height: "", weight: "", password: "", profilePic: "" });
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function update(k, v) { setForm(s => ({ ...s, [k]: v })); }

  function validate() {
    if (!form.fullname.trim()) return "Full name is required";
    if (!form.age || Number(form.age) <= 0) return "Enter a valid age";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(form.email)) return "Enter a valid email";
    if (!form.height || Number(form.height) <= 0) return "Enter a valid height (feet)";
    if (!form.weight || Number(form.weight) <= 0) return "Enter a valid weight (lbs)";
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
    return "";
  }

  async function submitSignup(e) {
    e.preventDefault();
    setError("");
    const v = validate();
    if (v) return setError(v);
    const parts = form.fullname.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email: form.email, password: form.password,
          age: form.age ? Number(form.age) : undefined,
          height: form.height ? Number(form.height) : undefined,
          weight: form.weight ? Number(form.weight) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong.");
      else { setStep("otp"); setOtpCode(""); setOtpError(""); }
    } catch { setError("Could not reach the server. Is the backend running?"); }
    finally { setIsLoading(false); }
  }

  async function submitOtp(e) {
    e.preventDefault();
    setOtpError("");
    if (otpCode.length < 6) return setOtpError("Please enter the full 6-digit code.");
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp_code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) setOtpError(data.error || "Verification failed.");
      else {
        if (form.profilePic && data.user_id) {
          await fetch("/api/profile/pic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: data.user_id, profile_pic: form.profilePic }),
          });
        }
        onNavigate("signin");
      }
    } catch { setOtpError("Could not reach the server."); }
    finally { setIsLoading(false); }
  }

  async function resendOtp() {
    setOtpError(""); setOtpCode(""); setIsLoading(true);
    const parts = form.fullname.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email: form.email, password: form.password,
          age: form.age ? Number(form.age) : undefined,
          height: form.height ? Number(form.height) : undefined,
          weight: form.weight ? Number(form.weight) : undefined }),
      });
      const data = await res.json();
      if (!res.ok) setOtpError(data.error || "Could not resend code.");
      else setOtpError("✅ New code sent! Check your email.");
    } catch { setOtpError("Could not reach the server."); }
    finally { setIsLoading(false); }
  }

  if (step === "otp") {
    return (
      <>
      <button onClick={toggleTheme} className="su-theme-btn" style={{ position: "fixed", top: "16px", right: "16px", zIndex: 1000 }}>
        {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </button>
    <div className="su-wrap" style={{ background: theme === "light" ? "linear-gradient(180deg, #dbeafe, #bfdbfe)" : undefined }}>
        <div className="su-card" style={{ background: theme === "light" ? "#ffffff" : undefined, color: theme === "light" ? "#0f172a" : undefined }}>
          <div className="su-header">
            <div className="su-logo">PC</div>
            <div>
              <h2 className="su-title">Check your email</h2>
              <p className="su-subtitle">We sent a 6-digit code to <strong className="su-em">{form.email}</strong></p>
            </div>
          </div>
          <p className="su-expiry" style={{ color: "#ef4444" }}>Code expires in 10 minutes</p>
          {otpError && <div className={`su-alert ${otpError.startsWith("✅") ? "su-alert--success" : "su-alert--error"}`}>{otpError}</div>}
          <form onSubmit={submitOtp} className="su-form">
            <label className="su-label">
              Verification Code
              <input type="text" value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code" maxLength={6} autoFocus
                className="su-input su-input--otp"
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = "var(--border-input)"} />
            </label>
            <button type="submit" disabled={isLoading || otpCode.length < 6} className="su-btn-primary" style={{ opacity: isLoading || otpCode.length < 6 ? 0.7 : 1 }}>
              {isLoading ? "Verifying…" : "Verify & Create Account"}
            </button>
          </form>
          <div className="su-resend">
            <p className="su-resend-text">Didn't receive the code?</p>
            <div className="su-resend-actions">
              <button onClick={resendOtp} disabled={isLoading} className="su-link">Resend code</button>
              <span className="su-dot">·</span>
              <button onClick={() => { setStep("signup"); setError(""); }} className="su-link su-link--muted">Change email</button>
            </div>
          </div>
        </div>
      </div>
    </>
    );
  }

  return (
    <>
      <button onClick={toggleTheme} className="su-theme-btn" style={{ position: "fixed", top: "16px", right: "16px", zIndex: 1000 }}>
        {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
      </button>
    <div className="su-wrap" style={{ background: theme === "light" ? "linear-gradient(180deg, #dbeafe, #bfdbfe)" : undefined }}>
      <div className="su-card" style={{ background: theme === "light" ? "#ffffff" : undefined, color: theme === "light" ? "#0f172a" : undefined }}>
        <div className="su-header">
          <div className="su-logo">PC</div>
          <div>
            <h2 className="su-title">Create Account</h2>
            <p className="su-subtitle">Fill in your details — we'll send a verification code to your email</p>
          </div>
        </div>
        <div className="su-theme-toggle">
        </div>
        <form onSubmit={submitSignup} className="su-form">
          <div className="su-grid">
            <label className="su-label su-full">
              <span>Full Name <span style={{ color:"#ef4444", marginLeft:"3px" }}>*</span></span>              <input type="text" value={form.fullname} onChange={e => update("fullname", e.target.value)}
                placeholder="Jane Doe" className="su-input" autoComplete="new-password"
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = "var(--border-input)"} />
            </label>
            <label className="su-label su-full">
              <span>Email Address <span style={{ color:"#ef4444", marginLeft:"3px" }}>*</span></span>              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                placeholder="you@example.com" className="su-input" autoComplete="new-password"
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = "var(--border-input)"} />
            </label>
            <label className="su-label">
              Age
              <input type="number" value={form.age} onChange={e => update("age", e.target.value)}
                placeholder="25" min="1" className="su-input" autoComplete="new-password"
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = "var(--border-input)"} />
            </label>
            <label className="su-label">
              Height (ft)
              <input type="number" value={form.height} onChange={e => update("height", e.target.value)}
                placeholder="5.6" min="1" step="any" className="su-input" autoComplete="new-password"
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = "var(--border-input)"} />
            </label>
            <label className="su-label">
              Weight (lb)
              <input type="number" value={form.weight} onChange={e => update("weight", e.target.value)}
                placeholder="65" min="1" className="su-input" autoComplete="new-password"
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = "var(--border-input)"} />
            </label>
            <label className="su-label">
              <span>Password <span style={{ color:"#ef4444", marginLeft:"3px" }}>*</span></span>              <input type="password" value={form.password} onChange={e => update("password", e.target.value)}
                placeholder="Min 6 characters" className="su-input" autoComplete="new-password"
                onFocus={e => e.target.style.borderColor = "var(--border-focus)"}
                onBlur={e => e.target.style.borderColor = "var(--border-input)"} />
            </label>
            <label className="su-label su-full">
              Profile Picture 
              <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:14 }}>
                {form.profilePic && <img src={form.profilePic} alt="preview" style={{ width:56, height:56, borderRadius:"50%", objectFit:"cover", border:"2px solid #7c3aed" }} />}
                <input type="file" accept="image/*" onChange={e => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX=200; const scale=Math.min(MAX/img.width,MAX/img.height,1); canvas.width=img.width*scale; canvas.height=img.height*scale; canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); update('profilePic', canvas.toDataURL('image/jpeg',0.7)); }; img.src=ev.target.result; };
                  reader.readAsDataURL(file);
                }} style={{ fontSize:13 }} />
              </div>
            </label>
          </div>
          
          <p style={{ fontSize:11, color:"#ef4444", margin:"4px 0 0", opacity:0.8 }}><span style={{ fontWeight:700 }}>*</span> Fields are compulsory</p>
          {error && <div className="su-alert su-alert--error">⚠️ {error}</div>}
          <button type="submit" disabled={isLoading} className="su-btn-primary" style={{ opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? "Sending verification code…" : "Send Verification Code"}
          </button>
          <div className="su-divider">
            <span className="su-divider-line" />
            <span className="su-divider-text">Already have an account?</span>
            <span className="su-divider-line" />
          </div>
          <button type="button" onClick={() => onNavigate("signin")} className="su-btn-secondary">
            Sign In Instead
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
