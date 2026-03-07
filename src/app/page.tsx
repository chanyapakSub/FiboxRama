"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [view, setView] = useState<"main" | "admin" | "login" | "register">("main");

  // Admin State
  const [adminPass, setAdminPass] = useState("");

  // Evaluator State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState({
    name: "",
    role: "Doctor",
    specialty: "",
    experienceYears: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPass === "Fibo999") {
      router.push("/dashboard");
    } else {
      setError("Incorrect password");
    }
  };

  const handleEvaluatorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username,
          password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Save session
        localStorage.setItem("medical_evaluator_username", username);
        localStorage.setItem("medical_evaluator_password", password);
        localStorage.setItem("medical_evaluator_profile", JSON.stringify(data.evaluator));
        // We might receive 'evaluations' in data.evaluator.evaluations. 
        // We need to transform this back to the flat structure expected by the app if possible,
        // or let the evaluation page fetch/format it.
        // Let's pass the raw data in storage and let EvaluationPage handle it.
        if (data.evaluator.evaluations) {
          // Transform DB scores to App scores
          const appScores = data.evaluator.evaluations.map((ev: any) => ({
            conversation_id: ev.conversationId,
            scores: ev.scores.reduce((acc: any, s: any) => ({ ...acc, [s.indicatorKey]: s.score }), {}),
            comment: ev.comment
          }));
          localStorage.setItem("medical_evaluation_scores", JSON.stringify(appScores));
        }

        router.push("/evaluation");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluatorRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Just save to local storage and redirect. Actual DB creation happens on first Save/Submit 
    // OR we can create the user now. Creating now is safer to validation uniqueness.
    try {
      const res = await fetch('/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save', // Implicit register
          username,
          password,
          profile,
          conversations: [] // No scores yet
        }),
      });

      if (res.ok) {
        localStorage.setItem("medical_evaluator_username", username);
        localStorage.setItem("medical_evaluator_password", password);
        localStorage.setItem("medical_evaluator_profile", JSON.stringify({ ...profile, username }));
        localStorage.removeItem("medical_evaluation_scores"); // Clear any old session
        router.push("/evaluation");
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed (Username might be taken)");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (view === "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-slate-200">
          <button onClick={() => setView("main")} className="text-sm text-slate-500 mb-4 hover:text-slate-800">← Back</button>
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Admin Dashboard Access</h2>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Passcode</label>
              <div className="relative">
                <input
                  type={showAdminPassword ? "text" : "password"}
                  className="w-full p-3 pr-10 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="Enter passcode"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                >
                  {showAdminPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-900 font-medium">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-slate-200">
          <button onClick={() => setView("main")} className="text-sm text-slate-500 mb-4 hover:text-slate-800">← Back</button>
          <h2 className="text-2xl font-bold mb-2 text-slate-800">Evaluator Login</h2>
          <p className="text-slate-500 mb-6 text-sm">Resume your evaluation progress</p>
          <form onSubmit={handleEvaluatorLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                required
                type="text"
                className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  className="w-full p-3 pr-10 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => alert('Please contact the system administrator to reset your password.')}
                className="text-sm border-none bg-transparent text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "register") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-10">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg border border-slate-200">
          <button onClick={() => setView("main")} className="text-sm text-slate-500 mb-4 hover:text-slate-800">← Back</button>
          <h2 className="text-2xl font-bold mb-2 text-slate-800">New Evaluator Registration</h2>
          <p className="text-slate-500 mb-6 text-sm">Create a profile to start the evaluation</p>

          <form onSubmit={handleEvaluatorRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input
                  required
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="user123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full p-3 pr-10 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 my-4"></div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input
                required
                type="text"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Dr. Firstname Lastname"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <div className="grid grid-cols-3 gap-3">
                <label className={`
                                    cursor-pointer p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center
                                    ${profile.role === 'Doctor' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}
                                `}>
                  <input
                    type="radio" name="role" value="Doctor" className="hidden"
                    checked={profile.role === 'Doctor'}
                    onChange={() => setProfile({ ...profile, role: 'Doctor' })}
                  />
                  <span className="font-semibold text-sm">หมอ</span>
                  <span className="text-xs opacity-75">(Doctor)</span>
                </label>
                <label className={`
                                    cursor-pointer p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center
                                    ${profile.role === 'Nurse' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}
                                `}>
                  <input
                    type="radio" name="role" value="Nurse" className="hidden"
                    checked={profile.role === 'Nurse'}
                    onChange={() => setProfile({ ...profile, role: 'Nurse' })}
                  />
                  <span className="font-semibold text-sm">พยาบาล</span>
                  <span className="text-xs opacity-75">(Nurse)</span>
                </label>
                <label className={`
                                    cursor-pointer p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all text-center
                                    ${profile.role === 'Other Expert' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}
                                `}>
                  <input
                    type="radio" name="role" value="Other Expert" className="hidden"
                    checked={profile.role === 'Other Expert'}
                    onChange={() => setProfile({ ...profile, role: 'Other Expert' })}
                  />
                  <span className="font-semibold text-sm leading-tight">ผู้เชี่ยวชาญอื่นๆ</span>
                  <span className="text-xs opacity-75">(Other Expert)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Specialty</label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Optional"
                  value={profile.specialty}
                  onChange={e => setProfile({ ...profile, specialty: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Exp (Years)</label>
                <input
                  type="number" min="0" required
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                  value={profile.experienceYears}
                  onChange={e => setProfile({ ...profile, experienceYears: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 font-bold shadow-md mt-6 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Start Evaluation"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-4xl w-full">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
            Medical Chatbot Evaluation
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Welcome to the evaluation portal. Please select your role to proceed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Admin Card */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Administrator</h2>
            <p className="text-slate-500 mb-6 text-sm">Access the dashboard to view results and analytics.</p>
            <button
              onClick={() => setView("admin")}
              className="w-full bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-900 font-medium"
            >
              Log in as Admin
            </button>
          </div>

          {/* Evaluator Card */}
          <div className="bg-white p-8 rounded-2xl shadow-md border border-blue-100 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Evaluator</h2>
            <p className="text-slate-500 mb-6 text-sm">Participate in the study or resume your previous session.</p>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setView("register")}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold shadow-sm"
              >
                Start New Evaluation
              </button>
              <button
                onClick={() => setView("login")}
                className="w-full bg-white text-blue-600 border border-blue-200 py-3 rounded-lg hover:bg-blue-50 font-medium"
              >
                Login / Resume
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
