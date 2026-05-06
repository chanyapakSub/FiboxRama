"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EVALUATION_CRITERIA } from "../../lib/criteria";
import { CONVERSATIONS } from "../../lib/conversations";

interface ConversationScore {
    conversation_id: number;
    scores: Record<string, number>;
    comment?: string;
    indicator_comments?: Record<string, string>;
}

interface EvaluatorProfile {
    name: string;
    role: "Doctor" | "Nurse" | "Other Expert";
    experienceYears?: number;
    username?: string;
    specialty?: string;
}

export default function EvaluationPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<EvaluatorProfile>({ name: "", role: "Doctor" });
    const [username, setUsername] = useState<string | null>(null);

    const [currentId, setCurrentId] = useState<number>(1);
    const [conversations, setConversations] = useState<ConversationScore[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);

    // Initialize
    useEffect(() => {
        const savedUsername = localStorage.getItem("medical_evaluator_username");
        if (!savedUsername) {
            router.push("/");
            return;
        }
        setUsername(savedUsername);

        const savedProfile = localStorage.getItem("medical_evaluator_profile");
        if (savedProfile) {
            try {
                const parsed = JSON.parse(savedProfile);
                setProfile(parsed);
            } catch (e) {
                console.error("Failed to parse profile", e);
            }
        }

        const saved = localStorage.getItem("medical_evaluation_scores");
        const initial: ConversationScore[] = Array.from({ length: 50 }, (_, i) => ({
            conversation_id: i + 1,
            scores: {},
            comment: "",
            indicator_comments: {},
        }));

        if (saved) {
            try {
                const savedData = JSON.parse(saved);
                const merged = initial.map(item => {
                    const found = savedData.find((s: any) => s.conversation_id === item.conversation_id);
                    return found ? { ...item, ...found } : item;
                });
                setConversations(merged);
            } catch (e) {
                setConversations(initial);
            }
        } else {
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
        const exportData = { profile, conversations };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `medical_eval_${(profile.name || 'user').replace(/\s+/g, '_')}_results.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleSaveToDB = async (isFinalSubmit = false) => {
        const storedPass = localStorage.getItem("medical_evaluator_password");

        if (!isFinalSubmit) {
            if (!confirm("บันทึกความคืบหน้าไปยังเซิร์ฟเวอร์? (แบ่งส่งทีละ 2 ข้อเพื่อความเสถียร)")) return;
        } else {
            if (!confirm("ส่งคำตอบสุดท้าย? กรุณาตรวจสอบให้ครบทั้ง 50 ข้อ")) return;
        }

        setIsSaving(true);
        try {
            const filledConversations = conversations.filter(c =>
                Object.keys(c.scores).length > 0 || (c.comment && c.comment.trim().length > 0)
            );

            if (filledConversations.length === 0) {
                alert("ไม่มีข้อมูลใหม่ให้บันทึก");
                setIsSaving(false);
                return;
            }

            // แบ่งส่งทีละ 2 ข้อ (Chunking)
            const chunkSize = 2;
            const totalChunks = Math.ceil(filledConversations.length / chunkSize);
            setSaveProgress({ current: 0, total: filledConversations.length });

            for (let i = 0; i < filledConversations.length; i += chunkSize) {
                const chunk = filledConversations.slice(i, i + chunkSize);
                const currentCount = Math.min(i + chunkSize, filledConversations.length);
                setSaveProgress({ current: currentCount, total: filledConversations.length });

                const response = await fetch('/api/evaluation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'save',
                        username: username,
                        password: storedPass,
                        conversations: chunk
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `เซฟล้มเหลวที่ข้อ ${i + 1}`);
                }
            }

            alert(isFinalSubmit ? "ส่งคำตอบเรียบร้อยแล้ว!" : "บันทึกข้อมูลเรียบร้อย!");
        } catch (error: any) {
            console.error(error);
            alert(`เกิดข้อผิดพลาด: ${error.message}\nแนะนำให้ใช้ปุ่ม Export JSON เพื่อเก็บไฟล์ไว้กันข้อมูลหายครับ`);
        } finally {
            setIsSaving(false);
            setSaveProgress(null);
        }
    };

    const handleClear = () => {
        if (confirm("ออกจากระบบและล้างข้อมูลในเครื่องนี้?")) {
            localStorage.removeItem("medical_evaluation_scores");
            localStorage.removeItem("medical_evaluator_profile");
            localStorage.removeItem("medical_evaluator_username");
            localStorage.removeItem("medical_evaluator_password");
            router.push("/");
        }
    }

    const isConversationComplete = (c: ConversationScore) => Object.keys(c.scores).length === 21;
    const completedCount = conversations.filter(isConversationComplete).length;
    const canSubmit = completedCount === 50;

    if (!hydrated) return <div className="p-8 text-center">กำลังโหลด...</div>;

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
                    <button onClick={handleClear} className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors">
                        ออกจากระบบ
                    </button>

                    <button
                        onClick={() => handleSaveToDB(false)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors shadow-sm flex items-center gap-1 min-w-[120px] justify-center"
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                {saveProgress ? `เซฟ ${saveProgress.current}/${saveProgress.total}` : "กำลังเซฟ..."}
                            </span>
                        ) : "บันทึกความคืบหน้า"}
                    </button>

                    <button
                        onClick={() => handleSaveToDB(true)}
                        className={`px-3 py-1.5 text-xs text-white rounded-md transition-colors shadow-sm font-bold
                            ${canSubmit ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'}
                        `}
                        disabled={!canSubmit || isSaving}
                    >
                        ส่งคำตอบ ({completedCount}/50)
                    </button>

                    <button onClick={handleExport} className="px-3 py-1.5 text-xs text-white bg-slate-600 hover:bg-slate-700 rounded-md transition-colors shadow-sm">
                        Export JSON
                    </button>
                </div>
            </header>

            {/* Navigation Grid */}
            <div className="bg-white border-b border-slate-200 p-4 shadow-sm">
                <div className="grid grid-cols-10 sm:grid-cols-13 md:grid-cols-25 gap-2 max-w-6xl mx-auto">
                    {conversations.map((c) => {
                        const scoreCount = Object.keys(c.scores).length;
                        const isComplete = scoreCount === 21;
                        const isStarted = scoreCount > 0;
                        const isActive = c.conversation_id === currentId;

                        return (
                            <button
                                key={c.conversation_id}
                                onClick={() => setCurrentId(c.conversation_id)}
                                className={`
                                    w-8 h-8 rounded flex items-center justify-center text-xs font-bold transition-all
                                    ${isActive ? 'ring-2 ring-blue-600 ring-offset-1 z-10' : 'hover:bg-slate-100'}
                                    ${isComplete ? 'bg-green-100 text-green-700 border border-green-200' : 
                                      isStarted ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                                      'bg-slate-50 text-slate-400 border border-slate-200'}
                                `}
                            >
                                {c.conversation_id}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden h-[calc(100vh-180px)]">
                {/* Left Panel - Conversation */}
                <div className="flex-1 max-w-[45%] p-6 overflow-y-auto bg-slate-50 border-r border-slate-200">
                    <div className="max-w-3xl mx-auto">
                        {(() => {
                            const conversationData = CONVERSATIONS.find(c => c.id === currentId);
                            if (!conversationData) return <div className="p-8 text-center text-slate-400">ไม่พบข้อมูลบทสนทนา</div>;

                            return (
                                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <h2 className="text-xl font-bold text-slate-800">บทสนทนาที่ {currentId}</h2>
                                        <p className="text-sm text-slate-500 mt-1">{conversationData.category}</p>
                                    </div>

                                    <div className="p-6 space-y-6">
                                        {conversationData.messages.map((msg, idx) => (
                                            <div key={idx} className={`flex gap-4 ${msg.role === 'Doctor' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm text-base leading-relaxed ${
                                                    msg.role === 'Doctor' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                                                }`}>
                                                    <div className={`text-xs font-bold mb-1 uppercase tracking-wide ${msg.role === 'Doctor' ? 'text-blue-100' : 'text-slate-400'}`}>
                                                        {msg.role === 'Doctor' ? 'CHATBOT' : 'PATIENT'}
                                                    </div>
                                                    {msg.text.split('\n').map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right Panel - Scoring Form */}
                <div className="flex-1 p-6 overflow-y-auto bg-white">
                    <div className="max-w-2xl mx-auto">
                        <div className="pb-4 border-b border-slate-100 mb-8 flex justify-between items-center pt-2">
                            <h2 className="text-lg font-bold text-slate-800">แบบประเมิน</h2>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ความคืบหน้า</div>
                                    <div className="text-sm font-bold text-blue-600">{Object.keys(currentScores).length} / 21</div>
                                </div>
                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${(Object.keys(currentScores).length / 21) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12 pb-32">
                            {EVALUATION_CRITERIA.map((category) => (
                                <section key={category.name} className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-1.5 bg-slate-800 rounded-r"></div>
                                        <h3 className="text-md font-bold text-slate-800 bg-slate-100 px-4 py-2 rounded-lg">{category.name}</h3>
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
                                                        <label key={option.value} className={`flex items-center gap-4 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${currentScores[indicator.key] === option.value ? "bg-blue-50 border-blue-500 shadow-sm" : "border-slate-100 hover:bg-slate-50"}`}>
                                                            <input type="radio" name={`${currentId}-${indicator.key}`} value={option.value} checked={currentScores[indicator.key] === option.value} onChange={() => handleScoreChange(indicator.key, option.value)} className="hidden" />
                                                            <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm shrink-0 ${
                                                                option.value === 1 ? "bg-red-100 text-red-700" :
                                                                option.value === 2 ? "bg-orange-100 text-orange-700" :
                                                                option.value === 3 ? "bg-amber-100 text-amber-700" :
                                                                option.value === 4 ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                                                            }`}>{option.value}</div>
                                                            <span className="text-sm font-medium text-slate-600">{option.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}

                            <section className="pt-10 border-t-2 border-slate-200 mt-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">ความคิดเห็นเพิ่มเติม (สำหรับข้อที่ {currentId})</h3>
                                <textarea
                                    value={currentConversation?.comment || ""}
                                    onChange={(e) => handleCommentChange(e.target.value)}
                                    placeholder="พิมพ์ความคิดเห็นของคุณที่นี่..."
                                    className="w-full min-h-[150px] p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
