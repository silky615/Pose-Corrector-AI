import React, { useState } from "react";
import * as api from "../api";

export default function ResetPassword({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setMessage("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    try {
      setBusy(true);
      await api.resetPasswordByEmail(email, password);
      setMessage("Password updated! You can now sign in with your new password.");
      setPassword(""); setConfirm(""); setEmail("");
    } catch (err) {
      setError(err.message || "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

  const features = [
    { icon: "🤸", title: "Real-time Pose Analysis", desc: "AI tracks your body movements frame by frame" },
    { icon: "⚡", title: "Form Correction", desc: "Instant feedback on your exercise technique" },
    { icon: "📊", title: "Progress Tracking", desc: "Monitor your improvement over time" },
    { icon: "💪", title: "6+ Exercises", desc: "Squats, planks, curls, lunges and more" },
  ];

  return (
    <div style={{
      minHeight:"100vh", width:"100vw",
      background:"radial-gradient(1200px 600px at 10% 20%, rgba(124,58,237,0.12), transparent), radial-gradient(800px 400px at 90% 80%, rgba(6,182,212,0.08), transparent), linear-gradient(180deg,#0f172a,#0b3140)",
      display:"flex", alignItems:"stretch", flexWrap:"wrap",
      fontFamily:"Inter, ui-sans-serif, system-ui, sans-serif", color:"#e6f7f9", overflowX:"hidden", margin:0, padding:0,
    }}>

      {/* LEFT PANEL */}
      <div style={{
        flex:"1 1 300px",
        background:"linear-gradient(145deg, rgba(124,58,237,0.3), rgba(6,182,212,0.1))",
        borderRight:"1px solid rgba(255,255,255,0.07)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"clamp(32px, 6vw, 60px) clamp(24px, 6vw, 56px)", minHeight:"auto",
      }}>
        <div style={{ display:"flex", flexDirection:"column", gap:"28px", maxWidth:"480px", width:"100%" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"18px" }}>
            <div style={{ width:"72px", height:"72px", borderRadius:"18px", background:"linear-gradient(135deg, #7c3aed, #06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"800", fontSize:"26px", color:"white", boxShadow:"0 8px 30px rgba(124,58,237,0.4)", flexShrink:0 }}>PC</div>
            <div>
              <h1 style={{ margin:0, fontSize:"clamp(18px, 4vw, 26px)", fontWeight:"700", color:"white" }}>Pose Corrector AI</h1>
              <p style={{ margin:"5px 0 0", fontSize:"16px", color:"rgba(255,255,255,0.5)" }}>Exercise form feedback — smarter, safer, stronger!</p>
            </div>
          </div>
          <div>
            <h2 style={{ margin:"0 0 12px", fontSize:"clamp(26px, 5vw, 38px)", fontWeight:"800", color:"white", lineHeight:1.2 }}>
              Train smarter,<br />
              <span style={{ background:"linear-gradient(90deg, #7c3aed, #06b6d4)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>not harder.</span>
            </h2>
            <p style={{ margin:0, fontSize:"17px", color:"rgba(255,255,255,0.5)", lineHeight:1.7 }}>Get real-time AI feedback on your workout form and prevent injuries before they happen.</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            {features.map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"16px", padding:"16px 20px", background:"rgba(255,255,255,0.04)", borderRadius:"14px", border:"1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize:"26px", flexShrink:0, marginTop:"2px" }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize:"17px", fontWeight:"600", color:"rgba(255,255,255,0.9)", marginBottom:"4px" }}>{f.title}</div>
                  <div style={{ fontSize:"14px", color:"rgba(255,255,255,0.45)", lineHeight:1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", padding:"20px 24px", background:"rgba(255,255,255,0.04)", borderRadius:"14px", border:"1px solid rgba(255,255,255,0.07)" }}>
            {[["6+","Exercises"],["AI","Powered"],["Live","Feedback"],["Free","To Use"]].map(([num, label], i) => (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width:"1px", height:"38px", background:"rgba(255,255,255,0.08)", margin:"0 16px" }} />}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flex:1 }}>
                  <span style={{ fontSize:"22px", fontWeight:"700", color:"#06b6d4" }}>{num}</span>
                  <span style={{ fontSize:"13px", color:"rgba(255,255,255,0.35)", marginTop:"3px" }}>{label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ flex:"1 1 300px", background:"rgba(11,18,33,0.98)", display:"flex", alignItems:"center", justifyContent:"center", padding:"clamp(32px, 6vw, 60px) clamp(24px, 6vw, 56px)", minHeight:"auto" }}>
        <div style={{ width:"100%", maxWidth:"440px" }}>
          <div style={{ marginBottom:"36px" }}>
            <h2 style={{ margin:"0 0 10px", fontSize:"36px", fontWeight:"700", color:"white" }}>Reset password</h2>
            <p style={{ margin:0, fontSize:"17px", color:"rgba(255,255,255,0.4)" }}>Enter your email and choose a new password.</p>
          </div>
          <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              <label style={{ fontSize:"15px", fontWeight:"600", color:"rgba(255,255,255,0.7)" }}>Email address</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)", fontSize:"18px" }}>✉️</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  style={{ width:"100%", padding:"16px 16px 16px 48px", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.06)", color:"#e6f7f9", fontSize:"16px", outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              <label style={{ fontSize:"15px", fontWeight:"600", color:"rgba(255,255,255,0.7)" }}>New password</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)", fontSize:"18px" }}>🔒</span>
                <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
                  style={{ width:"100%", padding:"16px 48px 16px 48px", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.06)", color:"#e6f7f9", fontSize:"16px", outline:"none", boxSizing:"border-box" }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position:"absolute", right:"16px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"18px" }}>👁</button>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              <label style={{ fontSize:"15px", fontWeight:"600", color:"rgba(255,255,255,0.7)" }}>Confirm new password</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)", fontSize:"18px" }}>🔒</span>
                <input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password"
                  style={{ width:"100%", padding:"16px 48px 16px 48px", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.06)", color:"#e6f7f9", fontSize:"16px", outline:"none", boxSizing:"border-box" }} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position:"absolute", right:"16px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"18px" }}>👁</button>
              </div>
            </div>
            {error && <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"14px 16px", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"12px", color:"#fca5a5", fontSize:"15px" }}>{error}</div>}
            {message && <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"14px 16px", background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:"12px", color:"#4ade80", fontSize:"15px" }}>{message}</div>}
            <button type="submit" disabled={busy} style={{ width:"100%", padding:"17px", background:"linear-gradient(135deg, #7c3aed, #06b6d4)", border:"none", borderRadius:"12px", color:"white", fontSize:"18px", fontWeight:"700", cursor:"pointer", opacity: busy ? 0.7 : 1, marginTop:"4px" }}>
              {busy ? "Updating…" : "Update password →"}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", margin:"4px 0" }}>
              <span style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.07)" }} />
              <span style={{ fontSize:"14px", color:"rgba(255,255,255,0.3)" }}>or</span>
              <span style={{ flex:1, height:"1px", background:"rgba(255,255,255,0.07)" }} />
            </div>
            <button type="button" onClick={() => onNavigate("signin")} style={{ width:"100%", padding:"15px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"12px", color:"rgba(255,255,255,0.75)", fontSize:"17px", fontWeight:"600", cursor:"pointer" }}>
              Back to Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
