"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { EVALUATION_CRITERIA } from "../lib/criteria";
import { CONVERSATIONS, Message } from "../lib/conversations";

// --- Types ---
interface ConversationScore {
  conversation_id: number;
  scores: Record<string, number>;
}

interface EvaluatorProfile {
  name: string;
  role: "Doctor" | "Nurse" | "Other";
  specialty?: string;
  experienceYears?: number;
}

// --- Icons (as SVG components for better control, or use Image if prefered) ---
const DoctorIcon = () => (
  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  </div>
);

const PatientIcon = () => (
  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
    <svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  </div>
);


export default function Home() {
  // --- State ---
  const [step, setStep] = useState<"profile" | "evaluation">("profile");
  const [profile, setProfile] = useState<EvaluatorProfile>({ name: "", role: "Doctor" });
  const [profileCompleted, setProfileCompleted] = useState(false);

  const [currentId, setCurrentId] = useState<number>(1);
  const [conversations, setConversations] = useState<ConversationScore[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // --- Effects ---
  useEffect(() => {
    // Load Profile
    const savedProfile = localStorage.getItem("medical_evaluator_profile");
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
      setProfileCompleted(true);
      setStep("evaluation");
    }

    // Load Scores
    const savedScores = localStorage.getItem("medical_evaluation_scores");
    if (savedScores) {
      setConversations(JSON.parse(savedScores));
    } else {
      const initial: ConversationScore[] = Array.from({ length: 50 }, (_, i) => ({
        conversation_id: i + 1,
        scores: {},
      }));
      setConversations(initial);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && profileCompleted) {
      localStorage.setItem("medical_evaluator_profile", JSON.stringify(profile));
    }
  }, [profile, hydrated, profileCompleted]);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("medical_evaluation_scores", JSON.stringify(conversations));
    }
  }, [conversations, hydrated]);

  // --- Handlers ---
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileCompleted(true);
    setStep("evaluation");
  };

  const handleScoreChange = (indicatorKey: string, value: number) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.conversation_id === currentId
          ? { ...c, scores: { ...c.scores, [indicatorKey]: value } }
          : c
      )
    );
  };

  const handleExport = () => {
    const exportData = {
      profile: profile,
      conversations: conversations
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `medical_eval_${profile.name.replace(/\s+/g, '_')}_results.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear ALL data (including your profile)? This cannot be undone.")) {
      localStorage.removeItem("medical_evaluation_scores");
      localStorage.removeItem("medical_evaluator_profile");
      window.location.reload(); // Quickest way to reset everything
    }
  }

  // --- Derived Data ---
  const currentScoreData = conversations.find((c) => c.conversation_id === currentId);
  const currentScores = currentScoreData?.scores || {};
  const currentContent = CONVERSATIONS.find(c => c.id === currentId);

  // --- UI: Loading ---
  if (!hydrated) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
      Loading context...
    </div>
  );

  // --- UI: Profile / Screening Step ---
  if (step === "profile") {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-xl w-full bg-white p-10 rounded-2xl shadow-xl border border-blue-100">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">
            Medical Evaluation Study
          </h1>
          <p className="text-slate-500 mb-8">
            Please provide your professional details to proceed to the evaluation tool.
          </p>

          <form onSubmit={handleProfileSubmit} className="space-y-6 text-left">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input
                required
                type="text"
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Dr. Somchai ..."
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`
                                    cursor-pointer p-4 rounded-lg border flex items-center justify-center gap-2 transition-all
                                    ${profile.role === 'Doctor' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}
                                `}>
                  <input
                    type="radio" name="role" value="Doctor" className="hidden"
                    checked={profile.role === 'Doctor'}
                    onChange={() => setProfile({ ...profile, role: 'Doctor' })}
                  />
                  <span className="font-semibold">Doctor</span>
                </label>
                <label className={`
                                    cursor-pointer p-4 rounded-lg border flex items-center justify-center gap-2 transition-all
                                    ${profile.role === 'Nurse' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}
                                `}>
                  <input
                    type="radio" name="role" value="Nurse" className="hidden"
                    checked={profile.role === 'Nurse'}
                    onChange={() => setProfile({ ...profile, role: 'Nurse' })}
                  />
                  <span className="font-semibold">Nurse</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Specialty (Optional)</label>
                <input
                  type="text"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Hematology"
                  value={profile.specialty || ''}
                  onChange={e => setProfile({ ...profile, specialty: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Experience (Years)</label>
                <input
                  type="number" min="0"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="5"
                  value={profile.experienceYears || ''}
                  onChange={e => setProfile({ ...profile, experienceYears: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-[1.01] shadow-md mt-8"
            >
              Start Evaluation
            </button>
          </form>
        </div>
      </main>
    );
  }

  // --- UI: Evaluation Tool ---
  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shrink-0 z-30 px-6 py-3 flex items-center justify-between shadow-sm h-16">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Medical Chatbot Evaluation
            <span className="text-xs font-normal text-slate-400 border-l pl-2 ml-2 border-slate-300">
              {profile.role}: {profile.name}
            </span>
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
          >
            Save & Export (JSON)
          </button>
        </div>
      </header>

      {/* Navigation Bar (1-50, Split into two rows) */}
      <div className="bg-white border-b border-slate-200 shrink-0 px-4 py-4 shadow-sm z-20">
        <div className="flex flex-col gap-4">
          {/* Row 1: 1-25 */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center">
            {conversations.slice(0, 25).map((c) => {
              const scoreCount = Object.keys(c.scores).length;
              const isComplete = scoreCount === 21;
              const isStarted = scoreCount > 0;
              const isActive = c.conversation_id === currentId;
              const hasContent = CONVERSATIONS.some(conv => conv.id === c.conversation_id);

              return (
                <button
                  key={c.conversation_id}
                  onClick={() => setCurrentId(c.conversation_id)}
                  className={`
                                        w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all relative
                                        ${isActive
                      ? 'ring-2 ring-blue-600 ring-offset-1 z-10'
                      : 'hover:bg-slate-100'}
                                        ${isComplete
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : isStarted
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'}
                                    `}
                  title={hasContent ? `Set ${c.conversation_id}` : `Set ${c.conversation_id} (No Content)`}
                >
                  {c.conversation_id}
                  {isComplete && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Row 2: 26-50 */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 justify-center">
            {conversations.slice(25, 50).map((c) => {
              const scoreCount = Object.keys(c.scores).length;
              const isComplete = scoreCount === 21;
              const isStarted = scoreCount > 0;
              const isActive = c.conversation_id === currentId;
              const hasContent = CONVERSATIONS.some(conv => conv.id === c.conversation_id);

              return (
                <button
                  key={c.conversation_id}
                  onClick={() => setCurrentId(c.conversation_id)}
                  className={`
                                        w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all relative
                                        ${isActive
                      ? 'ring-2 ring-blue-600 ring-offset-1 z-10'
                      : 'hover:bg-slate-100'}
                                        ${isComplete
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : isStarted
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200'}
                                    `}
                  title={hasContent ? `Set ${c.conversation_id}` : `Set ${c.conversation_id} (No Content)`}
                >
                  {c.conversation_id}
                  {isComplete && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation Panel (Sticky/Fixed View) */}
        <section className="flex-1 lg:max-w-[45%] bg-slate-100 border-r border-slate-200 overflow-hidden flex flex-col shadow-inner">
          <div className="p-4 bg-white/50 border-b border-slate-200 shrink-0 backdrop-blur-sm z-10 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Conversation #{currentId}
              </h2>
              {currentContent && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {currentContent.category}
                </p>
              )}
            </div>
            {/* Content Status */}
            {!currentContent && (
              <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">No Text Available</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
            {currentContent ? (
              <div className="space-y-6 max-w-2xl mx-auto pb-10">
                {currentContent.messages.map((msg, index) => {
                  const isDoctor = msg.role === 'Doctor';
                  return (
                    <div key={index} className={`flex gap-4 ${isDoctor ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Icon */}
                      <div className="shrink-0 mt-2">
                        {isDoctor ? <DoctorIcon /> : <PatientIcon />}
                      </div>

                      {/* Bubble */}
                      <div className={`
                                                relative p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm
                                                ${isDoctor
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}
                                            `}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 block opacity-80 ${isDoctor ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                          {msg.role}
                        </span>
                        <p>{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <p>No conversation data for Set {currentId}.</p>
                <p className="text-xs mt-2">Please select Sets 1-5.</p>
              </div>
            )}
          </div>
        </section>

        {/* Evaluation Form Panel (Scrollable) */}
        <section className="flex-1 bg-white overflow-y-auto relative">
          {/* Sticky Header for Form */}
          <div className="sticky top-0 bg-white/95 backdrop-blur z-20 px-6 py-4 border-b shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-slate-800">Scoring Form</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-semibold text-slate-500 uppercase">Progress</div>
                <div className="text-sm font-bold text-blue-600">{Object.keys(currentScores).length} / 21</div>
              </div>
              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(Object.keys(currentScores).length / 21) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="p-6 pb-32 max-w-3xl mx-auto space-y-12">
            {EVALUATION_CRITERIA.map((category) => (
              <div key={category.name} className="space-y-6">
                <div className="flex items-center gap-3 pt-2 pb-2 bg-white/90 backdrop-blur-sm -mx-2 px-2 rounded-lg">
                  <h3 className="text-md font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded border-l-4 border-slate-800 inline-block shadow-sm">
                    {category.name}
                  </h3>
                  <div className="h-px bg-slate-200 flex-1"></div>
                </div>
                <div className="space-y-8 pl-1">
                  {category.indicators.map((indicator) => (
                    <div key={indicator.key} className="group relative pl-4 border-l-2 border-slate-100 hover:border-blue-200 transition-colors">
                      <div className="mb-4">
                        <h4 className="font-semibold text-slate-900 text-base flex items-baseline gap-2">
                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border">ID {indicator.id}</span>
                          {indicator.name}
                        </h4>
                        <p className="text-sm text-slate-500 mt-1 italic">"{indicator.definition}"</p>
                      </div>

                      <div className="space-y-2">
                        {indicator.options.map((option) => (
                          <label
                            key={option.value}
                            className={`
                                                flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all duration-200 relative overflow-hidden group/label
                                                ${currentScores[indicator.key] === option.value
                                ? "bg-blue-50 border-blue-500/50 shadow-sm"
                                : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"}
                                            `}
                          >
                            <div className={`
                                                            w-1 h-full absolute left-0 top-0 transition-colors
                                                            ${currentScores[indicator.key] === option.value ? 'bg-blue-500' : 'bg-transparent group-hover/label:bg-slate-200'}
                                                        `}></div>

                            <input
                              type="radio"
                              name={`${currentId}-${indicator.key}`}
                              value={option.value}
                              checked={currentScores[indicator.key] === option.value}
                              onChange={() => handleScoreChange(indicator.key, option.value)}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 shrink-0 ml-2"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`font-bold text-sm min-w-[1.5rem] h-6 flex items-center justify-center rounded px-1 ${option.value === 1 ? "bg-red-100 text-red-700" :
                                  option.value === 2 ? "bg-orange-100 text-orange-700" :
                                    option.value === 3 ? "bg-amber-100 text-amber-700" :
                                      option.value === 4 ? "bg-blue-100 text-blue-700" :
                                        "bg-green-100 text-green-700"
                                  }`}>{option.value}</span>
                                <span className={`text-sm ${currentScores[indicator.key] === option.value ? 'text-slate-900 font-medium' : 'text-slate-600'}`}>
                                  {option.label}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
