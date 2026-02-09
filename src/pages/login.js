import { useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";

export default function Login() {
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Processor");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        // Create profile row
        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            full_name: fullName,
            role,
          });
        }
        setMessage("Account created! Check your email to confirm, then sign in.");
        setIsSignUp(false);
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
      } else {
        router.push("/");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa", padding: 20 }}>
      <div style={{ width: 400, maxWidth: "100%" }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18, fontWeight: 800 }}>LP</div>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: "#0f172a" }}>LoanPilot</span>
          </div>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Pipeline Tracker</p>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8ecf1", padding: "32px 28px", boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
          <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {message && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{message}</div>}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, marginBottom: 14, outline: "none", boxSizing: "border-box" }} />

                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Role</label>
                <select required value={role} onChange={e => setRole(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, marginBottom: 14, outline: "none", boxSizing: "border-box", background: "#fff" }}>
                  <option>Lender</option>
                  <option>Processor</option>
                  <option>Assistant</option>
                </select>
              </>
            )}

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, marginBottom: 14, outline: "none", boxSizing: "border-box" }} />

            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>Password</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 14, marginBottom: 20, outline: "none", boxSizing: "border-box" }} />

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "11px", borderRadius: 8, border: "none", background: "#1e293b", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748b" }}>
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }} style={{ background: "none", border: "none", color: "#2563eb", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
