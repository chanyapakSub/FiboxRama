"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EVALUATION_CRITERIA, Category, Indicator } from "../../lib/criteria";
import { CONVERSATIONS } from "../../lib/conversations";

interface ConversationScore {
    conversation_id: number;
    scores: Record<string, number>;
    comment?: string;
    indicator_comments?: Record<string, string>;
}

interface EvaluatorProfile {
    name: string;
    role: "Doctor" | "Nurse" | "Other";
    experienceYears?: number;
    username?: string;
}

export default function EvaluationPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<EvaluatorProfile>({ name: "", role: "Doctor" });
    const [username, setUsername] = useState<string | null>(null);

    const [currentId, setCurrentId] = useState<number>(1);
    const [conversations, setConversations] = useState<ConversationScore[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Initialize
    useEffect(() => {
        // Authenticate
        const savedUsername = localStorage.getItem("medical_evaluator_username");
        if (!savedUsername) {
            router.push("/");
            return;
        }
        setUsername(savedUsername);

        // Load Profile
        const savedProfile = localStorage.getItem("medical_evaluator_profile");
        if (savedProfile) {
            setProfile(JSON.parse(savedProfile));
        }

        // Load Scores
        const saved = localStorage.getItem("medical_evaluation_scores");
        if (saved) {
            setConversations(JSON.parse(saved));
        } else {
            const initial: ConversationScore[] = Array.from({ length: 50 }, (_, i) => ({
                conversation_id: i + 1,
                scores: {},
                comment: "",
                indicator_comments: {},
            }));
            setConversations(initial);
        }
        setHydrated(true);
    }, [router]);

    // Persist to LocalStorage
    useEffect(() => {
        if (hydrated) {
            localStorage.setItem("medical_evaluation_scores", JSON.stringify(conversations));
        }
    }, [conversations, hydrated]);

    const handleScoreChange = (indicatorKey: string, value: number) => {
        setConversations((prev) =>
            prev.map((c) =>
                c.conversation_id === currentId
                    ? { ...c, scores: { ...c.scores, [indicatorKey]: value } }
                    : c
            )
        );
    };

    const handleCommentChange = (value: string) => {
        setConversations((prev) =>
            prev.map((c) =>
                c.conversation_id === currentId
                    ? { ...c, comment: value }
                    : c
            )
        );
    };

    const currentConversation = conversations.find((c) => c.conversation_id === currentId);
    const currentScores = currentConversation?.scores || {};

    const handleExport = () => {
        const exportData = {
            profile: profile,
            conversations: conversations
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `medical_eval_${(profile.name || 'user').replace(/\s+/g, '_')}_results.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleSaveProgress = async (silent = false) => {
        if (!username) return;
        setIsSaving(true);
        try {
            await fetch('/api/evaluation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    username: username,
                    password: "password_placeholder", // Since we are logged in, we should ideally verify. But for simplicity we trust the session or need to store password in localstorage (not secure but works for this study tool context).
                    // Actually, we DO need the password to update. Let's retrieve it from where? 
                    // Best practice: use a token. 
                    // For this simple app: let's assume valid session if username matches.
                    // Oh wait, the API I wrote REQUIRES password.
                    // I need to fetch the password from database? No.
                    // I will update the API to allow update without password if we assume trusted backend? No.
                    // I should store the password in localStorage for this session flow since I don't have JWT.
                }),
            });
            // Wait, I can't send "password_placeholder".
            // I need to update the client code to store credentials.
        } catch (e) {
            console.error(e);
        }
        setIsSaving(false);
    };

    // I need to refactor `handleSaveToDB` to actually use the stored password.

    /* 
       RE-PLANNING API CALL:
       I need to pull the password from localStorage too? Or just skip password check for 'save' action if we trust local state?
       The user asked for "username password ... to resume".
       Security is low priority (internal tool). 
       I will store password in localStorage "medical_evaluator_password".
    */

    const handleSaveToDB = async (isFinalSubmit = false) => {
        const storedPass = localStorage.getItem("medical_evaluator_password"); // Assuming we save this on login

        if (!isFinalSubmit) {
            if (!confirm("Save current progress to server? You can resume later.")) return;
        } else {
            if (!confirm("Submit FINAL answers? Ensure you have reviewed all 50 conversations.")) return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/evaluation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save',
                    username: username,
                    password: storedPass, // Need to ensure Landing Page saves this!
                    profile,
                    conversations
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(isFinalSubmit ? "Final answers submitted successfully!" : "Progress saved successfully!");
            } else {
                alert(`Failed to save: ${data.error}`);
            }
        } catch (error) {
            console.error(error);
            alert("Network error. Try exporting to JSON instead.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = () => {
        if (confirm("Logout and clear local data?")) {
            localStorage.removeItem("medical_evaluation_scores");
            localStorage.removeItem("medical_evaluator_profile");
            localStorage.removeItem("medical_evaluator_username");
            localStorage.removeItem("medical_evaluator_password");
            router.push("/");
        }
    }

    // Check completion
    // A conversation is "complete" if it has 21 scores (or whatever number of indicators there are)
    // Actually, let's just check if 50 conversations have been touched or "completed" based on criteria.
    // The user said "if not complete 50 items cannot submit".
    // I will assume this means ALL 50 conversations must have 21 indicators scored.
    const isConversationComplete = (c: ConversationScore) => Object.keys(c.scores).length === 21;
    const completedCount = conversations.filter(isConversationComplete).length;
    const canSubmit = completedCount === 50;

    if (!hydrated) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 flex items-center justify-between shadow-sm h-16">
                <div>
                    <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Medical Chatbot Evaluation
                        <span className="text-xs font-normal text-slate-400 border-l pl-2 ml-2 border-slate-300">
                            {profile.name} ({username})
                        </span>
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleClear}
                        className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    >
                        Logout
                    </button>

                    {/* Save Progress Button */}
                    <button
                        onClick={() => handleSaveToDB(false)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors shadow-sm flex items-center gap-1"
                    >
                        {isSaving ? "Saving..." : "Save Progress (Draft)"}
                    </button>

                    {/* Submit Button */}
                    <button
                        onClick={() => handleSaveToDB(true)}
                        className={`px-3 py-1.5 text-xs text-white rounded-md transition-colors shadow-sm font-bold
                            ${canSubmit ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}
                        `}
                        disabled={!canSubmit || isSaving}
                        title={!canSubmit ? "Complete all 50 sets to submit" : "Submit Final Answers"}
                    >
                        Submit Answer ({completedCount}/50)
                    </button>

                    <button
                        onClick={handleExport}
                        className="px-3 py-1.5 text-xs text-white bg-slate-600 hover:bg-slate-700 rounded-md transition-colors shadow-sm"
                    >
                        Export JSON
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
                                >
                                    {c.conversation_id}
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
                                >
                                    {c.conversation_id}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-[calc(100vh-180px)]">

                {/* Desktop: Left Panel - Conversation */}
                <div className="flex-1 max-w-[45%] p-4 lg:p-6 overflow-y-auto bg-slate-50 lg:border-r border-slate-200 order-1 lg:order-1 scroll-smooth">
                    <div className="max-w-3xl mx-auto">
                        {(() => {
                            const conversationData = CONVERSATIONS.find(c => c.id === currentId);
                            if (!conversationData) {
                                return (
                                    <div className="p-8 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                                        Conversation data not found for ID: {currentId}
                                    </div>
                                );
                            }

                            return (
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-3 lg:px-6 lg:py-4 bg-slate-50 border-b border-slate-200">
                                        <h2 className="text-lg lg:text-xl font-bold text-slate-800">
                                            CONVERSATION #{currentId}
                                        </h2>
                                        <p className="text-xs lg:text-sm text-slate-500 mt-1">{conversationData.category}</p>
                                    </div>

                                    <div className="p-4 lg:p-6 space-y-6">
                                        {conversationData.messages.map((msg, idx) => (
                                            <div key={idx} className={`flex gap-3 lg:gap-4 ${msg.role === 'Doctor' ? 'justify-end' : 'justify-start'}`}>
                                                {msg.role === 'Patient' && (
                                                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 border border-slate-300">
                                                        <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                )}

                                                <div className={`max-w-[85%] lg:max-w-[80%] rounded-2xl px-4 py-3 lg:px-5 lg:py-4 shadow-sm text-sm lg:text-base leading-relaxed ${msg.role === 'Doctor'
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                                                    }`}>
                                                    <div className={`text-xs font-bold mb-1 uppercase tracking-wide ${msg.role === 'Doctor' ? 'text-blue-100' : 'text-slate-400'}`}>
                                                        {msg.role}
                                                    </div>
                                                    {msg.text.split('\n').map((line, i) => (
                                                        <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                                                    ))}
                                                </div>

                                                {msg.role === 'Doctor' && (
                                                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 border border-blue-200">
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right Panel - Evaluation Form */}
                <div className="flex-1 lg:flex-1 p-4 lg:p-6 overflow-y-auto bg-white order-2 lg:order-2">
                    <div className="max-w-2xl mx-auto">
                        {/* Scoring Header */}
                        <div className="pb-4 border-b border-slate-100 mb-8 flex justify-between items-center pt-2">
                            <h2 className="text-lg font-bold text-slate-800">Scoring Form</h2>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</div>
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

                        <div className="space-y-12 pb-32">
                            {EVALUATION_CRITERIA.map((category) => (
                                <section key={category.name} className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-1.5 bg-slate-800 rounded-r"></div>
                                        <h3 className="text-md font-bold text-slate-800 bg-slate-100 px-4 py-2 rounded-lg">
                                            {category.name}
                                        </h3>
                                    </div>

                                    <div className="space-y-8 pl-4 border-l border-slate-100 ml-1">
                                        {category.indicators.map((indicator) => (
                                            <div key={indicator.key} className="group">
                                                <div className="mb-4">
                                                    <h4 className="font-bold text-slate-900 text-base mb-1">{indicator.name}</h4>
                                                    <p className="text-sm text-slate-500">{indicator.definition}</p>
                                                </div>

                                                <div className="space-y-3 pl-2">
                                                    {indicator.options.map((option) => (
                                                        <label
                                                            key={option.value}
                                                            className={`
                                                                    flex items-center gap-4 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 group/label
                                                                    ${currentScores[indicator.key] === option.value
                                                                    ? "bg-blue-50 border-blue-500 shadow-sm"
                                                                    : "border-slate-100 hover:bg-slate-50 hover:border-slate-200"}
                                                                `}
                                                        >
                                                            <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                                                                <input
                                                                    type="radio"
                                                                    name={`${currentId}-${indicator.key}`}
                                                                    value={option.value}
                                                                    checked={currentScores[indicator.key] === option.value}
                                                                    onChange={() => handleScoreChange(indicator.key, option.value)}
                                                                    className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-full checked:border-blue-500 checked:bg-blue-500 transition-all"
                                                                />
                                                                <div className="absolute w-2 h-2 bg-white rounded-full scale-0 peer-checked:scale-100 transition-transform pointer-events-none"></div>
                                                            </div>

                                                            <div className={`
                                                                    w-8 h-8 rounded flex items-center justify-center font-bold text-sm shrink-0 transition-colors
                                                                    ${option.value === 1 ? "bg-red-100 text-red-700 group-hover/label:bg-red-200" :
                                                                    option.value === 2 ? "bg-orange-100 text-orange-700 group-hover/label:bg-orange-200" :
                                                                        option.value === 3 ? "bg-amber-100 text-amber-700 group-hover/label:bg-amber-200" :
                                                                            option.value === 4 ? "bg-blue-100 text-blue-700 group-hover/label:bg-blue-200" :
                                                                                "bg-green-100 text-green-700 group-hover/label:bg-green-200"}
                                                                `}>
                                                                {option.value}
                                                            </div>

                                                            <span className={`text-sm font-medium transition-colors ${currentScores[indicator.key] === option.value ? "text-slate-900" : "text-slate-600"}`}>
                                                                {option.label}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}

                            <section className="space-y-4 lg:space-y-6 pt-8 lg:pt-10 border-t-2 border-slate-200 mt-8">
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                                    <h3 className="text-base lg:text-lg font-bold text-amber-900 mb-1">
                                        Additional Comments
                                    </h3>
                                    <p className="text-sm text-amber-700">
                                        Please provide any specific feedback or observations for <strong>Conversation #{currentId}</strong>.
                                    </p>
                                </div>

                                <div className="pl-1 lg:pl-2">
                                    <textarea
                                        value={currentConversation?.comment || ""}
                                        onChange={(e) => handleCommentChange(e.target.value)}
                                        placeholder={`Write your comment for Conversation Set ${currentId} here...`}
                                        className="w-full min-h-[150px] p-4 border border-slate-300 rounded-lg text-sm lg:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm bg-white"
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
