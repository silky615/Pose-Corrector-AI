import React, { useState } from "react";

const inputStyle = {
  width: "100%", padding: "14px 16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px", color: "white", fontSize: "16px",
  outline: "none", boxSizing: "border-box",
};

const labelStyle = {
  display: "flex", flexDirection: "column", gap: "8px",
  fontSize: "15px", fontWeight: "600", color: "rgba(255,255,255,0.7)",
};

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function SignUp({ onNavigate }) {
  const [step, setStep] = useState("signup");
  const [form, setForm] = useState({ fullname: "", age: "", email: "", height: "", weight: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
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
    if (!form.height || Number(form.height) <= 0) return "Enter a valid height (inches)";
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
      else onNavigate("signin");
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

  const wrapStyle = {
    minHeight: "100vh", width: "100vw",
    background: "radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.12), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.08), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", color: "#e6f7f9",
    padding: "40px 20px", boxSizing: "border-box", margin: 0,
  };

  const cardStyle = {
    width: "100%", maxWidth: "620px", background: "rgba(11,18,33,0.95)",
    borderRadius: "22px", border: "1px solid rgba(255,255,255,0.07)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.5)", padding: "52px", boxSizing: "border-box",
  };

  const logoBox = {
    width: "60px", height: "60px", borderRadius: "14px",
    background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "800", fontSize: "20px", color: "white", flexShrink: 0,
    boxShadow: "0 6px 20px rgba(124,58,237,0.4)",
  };

  const primaryBtn = (disabled) => ({
    width: "100%", padding: "17px", background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
    border: "none", borderRadius: "12px", color: "white", fontSize: "18px",
    fontWeight: "700", cursor: "pointer", opacity: disabled ? 0.7 : 1, marginTop: "4px",
  });

  const errorBox = {
    display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px",
    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: "12px", color: "#fca5a5", fontSize: "15px",
  };

  if (step === "otp") {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px" }}>
            <div style={logoBox}>PC</div>
            <div>
              <h2 style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "white" }}>Check your email ✉️</h2>
              <p style={{ margin: "4px 0 0", fontSize: "15px", color: "rgba(255,255,255,0.4)" }}>
                We sent a 6-digit code to <strong style={{ color: "rgba(255,255,255,0.7)" }}>{form.email}</strong>
              </p>
            </div>
          </div>
          <p style={{ margin: "0 0 24px", fontSize: "14px", color: "rgba(255,255,255,0.35)" }}>⏱ Code expires in 10 minutes</p>
          {otpError && (
            <div style={{ ...errorBox,
              background: otpError.startsWith("✅") ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              border: otpError.startsWith("✅") ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
              color: otpError.startsWith("✅") ? "#86efac" : "#fca5a5", marginBottom: "18px" }}>
              {otpError}
            </div>
          )}
          <form onSubmit={submitOtp} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div style={labelStyle}>
              Verification Code
              <input type="text" value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code" maxLength={6} autoFocus
                style={{ ...inputStyle, fontSize: "28px", letterSpacing: "0.5rem", textAlign: "center" }}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <button type="submit" disabled={isLoading || otpCode.length < 6} style={primaryBtn(isLoading || otpCode.length < 6)}>
              {isLoading ? "Verifying…" : "Verify & Create Account 🎉"}
            </button>
          </form>
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <p style={{ margin: "0 0 12px", fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>Didn't receive the code?</p>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
              <button onClick={resendOtp} disabled={isLoading}
                style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", fontSize: "15px", fontWeight: "600" }}>
                Resend code
              </button>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <button onClick={() => { setStep("signup"); setError(""); }}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "15px" }}>
                Change email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "36px" }}>
          <div style={logoBox}>PC</div>
          <div>
            <h2 style={{ margin: 0, fontSize: "26px", fontWeight: "700", color: "white" }}>Create Account </h2>
            <p style={{ margin: "4px 0 0", fontSize: "15px", color: "rgba(255,255,255,0.4)" }}>
              Fill in your details — we'll send a verification code to your email
            </p>
          </div>
        </div>
        <form onSubmit={submitSignup} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Full Name
              <input type="text" value={form.fullname} onChange={e => update("fullname", e.target.value)}
                placeholder="Jane Doe" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Email Address
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                placeholder="you@example.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div style={labelStyle}>
              Age
              <input type="number" value={form.age} onChange={e => update("age", e.target.value)}
                placeholder="25" min="1" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div style={labelStyle}>
              Height (inches)
              <input type="number" value={form.height} onChange={e => update("height", e.target.value)}
                placeholder="170" min="1" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div style={labelStyle}>
              Weight (lbs)
              <input type="number" value={form.weight} onChange={e => update("weight", e.target.value)}
                placeholder="65" min="1" style={inputStyle}
                onFocus={e => e.target.style.borderColor = "#7c3aed"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
            </div>
            <div style={labelStyle}>
              Password
              <div style={{ position: "relative" }}>
                <input type={showPassword ? "text" : "password"} value={form.password}
                  onChange={e => update("password", e.target.value)}
                  placeholder="Min 6 characters" style={{ ...inputStyle, paddingRight: "50px" }}
                  onFocus={e => e.target.style.borderColor = "#7c3aed"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                  position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}>
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.3)" }}>🔒 Password must be at least 6 characters</p>
          {error && <div style={errorBox}>⚠️ {error}</div>}
          <button type="submit" disabled={isLoading} style={primaryBtn(isLoading)}>
            {isLoading ? "Sending verification code…" : "Send Verification Code 📧"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.25)" }}>Already have an account?</span>
            <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
          </div>
          <button type="button" onClick={() => onNavigate("signin")} style={{
            width: "100%", padding: "15px", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
            color: "rgba(255,255,255,0.75)", fontSize: "17px", fontWeight: "600", cursor: "pointer" }}>
            Sign In Instead
          </button>
        </form>
      </div>
    </div>
  );
}
