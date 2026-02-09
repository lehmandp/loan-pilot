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

  const inputCls = "w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-subtle text-sm mb-3.5 outline-none bg-ivory-light focus:border-clay transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory-light p-5">
      <div className="w-[400px] max-w-full">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-clay flex items-center justify-center text-ivory-light text-lg font-extrabold">LP</div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-dark">LoanPilot</span>
          </div>
          <p className="text-slate-light text-sm m-0">Pipeline Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-ivory-medium rounded-2xl border border-subtle px-7 py-8 shadow-lg">
          <h2 className="m-0 mb-5 text-lg font-bold text-slate-dark">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-3.5 py-2.5 rounded-lg text-[13px] mb-4">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 text-green-600 px-3.5 py-2.5 rounded-lg text-[13px] mb-4">{message}</div>}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <>
                <label className="block text-detail text-slate-light mb-1.5">Full Name</label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" className={inputCls} />

                <label className="block text-detail text-slate-light mb-1.5">Role</label>
                <select required value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
                  <option>Lender</option>
                  <option>Processor</option>
                  <option>Assistant</option>
                </select>
              </>
            )}

            <label className="block text-detail text-slate-light mb-1.5">Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className={inputCls} />

            <label className="block text-detail text-slate-light mb-1.5">Password</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} className={inputCls + " mb-5"} />

            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-full border-none bg-slate-dark text-ivory-light text-sm font-semibold hover:bg-slate-medium transition-colors" style={{ cursor: loading ? "wait" : "pointer" }}>
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="text-center mt-5 text-[13px] text-slate-light">
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }} className="bg-transparent border-none text-clay font-semibold cursor-pointer text-[13px] link-underline">
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
