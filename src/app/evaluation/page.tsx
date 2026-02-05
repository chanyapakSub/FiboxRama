"use client";

import React, { useState, useEffect } from "react";
import { EVALUATION_CRITERIA, Category, Indicator } from "../../lib/criteria";

interface ConversationScore {
    conversation_id: number;
    scores: Record<string, number>;
}

export default function EvaluationPage() {
    const [currentId, setCurrentId] = useState<number>(1);
    const [conversations, setConversations] = useState<ConversationScore[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Initialize 50 conversations
    useEffect(() => {
        const saved = localStorage.getItem("medical_evaluation_scores");
        if (saved) {
            setConversations(JSON.parse(saved));
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

    const currentConversation = conversations.find((c) => c.conversation_id === currentId);
    const currentScores = currentConversation?.scores || {};

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(conversations, null, 2));
        const downloadAnchorNode = document.createElement("a");
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "medical_evaluation_results.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleClear = () => {
        if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
            const initial: ConversationScore[] = Array.from({ length: 50 }, (_, i) => ({
                conversation_id: i + 1,
                scores: {},
            }));
            setConversations(initial);
            localStorage.removeItem("medical_evaluation_scores");
        }
    }

    if (!hydrated) return <div className="p-8 text-center">Loading evaluation context...</div>;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <img
                        src="/img/fibo_logo.png"
                        alt="FIBO Logo"
                        className="h-10 w-10 object-contain"
                    />
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Medical Chatbot Evaluation</h1>
                        <p className="text-sm text-slate-500">Evaluating 50 conversation sets across 21 indicators.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    >
                        Clear Data
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
                    >
                        Export JSON
                    </button>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
                {/* Sidebar / Navigation */}
                <aside className="w-full lg:w-64 bg-white border-r border-slate-200 overflow-y-auto hidden lg:block">
                    <div className="p-4">
                        <h3 className="font-semibold text-slate-700 mb-3 px-2">Conversations</h3>
                        <div className="space-y-1">
                            {conversations.map((c) => {
                                const scoreCount = Object.keys(c.scores).length;
                                const isComplete = scoreCount === 21;
                                const isStarted = scoreCount > 0;

                                return (
                                    <button
                                        key={c.conversation_id}
                                        onClick={() => setCurrentId(c.conversation_id)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${currentId === c.conversation_id
                                            ? "bg-blue-50 text-blue-700 font-medium"
                                            : "text-slate-600 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span>Set {c.conversation_id}</span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${isComplete ? "bg-green-100 text-green-700" :
                                            isStarted ? "bg-amber-100 text-amber-700" :
                                                "bg-slate-100 text-slate-400"
                                            }`}>
                                            {scoreCount}/21
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* Mobile Navigation (Compact Top Bar) */}
                <div className="lg:hidden p-3 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-2 flex-1">
                        <label className="text-xs font-medium text-slate-600">Set:</label>
                        <select
                            value={currentId}
                            onChange={(e) => setCurrentId(Number(e.target.value))}
                            className="text-sm p-1.5 border border-slate-300 rounded-md flex-1 max-w-[120px]"
                        >
                            {conversations.map(c => (
                                <option key={c.conversation_id} value={c.conversation_id}>
                                    #{c.conversation_id} ({Object.keys(c.scores).length}/21)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${Object.keys(currentScores).length === 21 ? "bg-green-100 text-green-700" :
                            Object.keys(currentScores).length > 0 ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-400"
                            }`}>
                            {Object.keys(currentScores).length}/21
                        </span>
                    </div>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                    {/* Desktop: Left Panel - Conversation */}
                    {/* Mobile: Top Section - Conversation */}
                    <div className="flex-1 lg:flex-1 p-4 lg:p-6 overflow-y-auto bg-slate-50 lg:border-r border-slate-200 order-1 lg:order-1">
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-white p-4 lg:p-6 rounded-lg border border-slate-200 shadow-sm">
                                <h2 className="text-base lg:text-lg font-semibold text-slate-800 mb-3 lg:mb-4 border-b border-slate-100 pb-2">
                                    Conversation #{currentId}
                                </h2>
                                <div className="p-6 lg:p-8 bg-slate-50 rounded border border-dashed border-slate-300 text-center text-slate-400 min-h-[200px] lg:min-h-[400px] flex flex-col justify-center items-center">
                                    <svg className="w-10 h-10 lg:w-12 lg:h-12 mb-2 lg:mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="font-medium text-sm lg:text-base">Conversation Content</p>
                                    <p className="text-xs lg:text-sm mt-1">Display conversation here</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop: Right Panel - Evaluation Form */}
                    {/* Mobile: Bottom Section - Evaluation Form */}
                    <div className="flex-1 lg:flex-1 p-4 lg:p-6 overflow-y-auto bg-white order-2 lg:order-2">
                        <div className="max-w-2xl mx-auto">
                            <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-3 lg:pb-4 border-b mb-4 lg:mb-6 flex justify-between items-center">
                                <h2 className="text-base lg:text-lg font-bold text-slate-800">Scoring Form</h2>
                                <span className="text-xs lg:text-sm font-medium text-blue-600">
                                    Progress: {Object.keys(currentScores).length} / 21
                                </span>
                            </div>

                            <div className="space-y-6 lg:space-y-10 pb-20">
                                {EVALUATION_CRITERIA.map((category) => (
                                    <section key={category.name} className="space-y-4 lg:space-y-6">
                                        <h3 className="text-sm lg:text-md font-bold text-blue-800 bg-blue-50 px-2 lg:px-3 py-1.5 lg:py-2 rounded border-l-4 border-blue-600">
                                            {category.name}
                                        </h3>
                                        <div className="space-y-6 lg:space-y-8">
                                            {category.indicators.map((indicator) => (
                                                <div key={indicator.key} className="pl-1 lg:pl-2">
                                                    <div className="mb-2 lg:mb-3">
                                                        <div className="flex items-baseline gap-2 mb-1">
                                                            <span className="text-xs lg:text-sm font-bold text-slate-400">#{indicator.id}</span>
                                                            <h4 className="font-semibold text-slate-900 text-sm lg:text-base">{indicator.name}</h4>
                                                        </div>
                                                        <p className="text-xs lg:text-sm text-slate-600 italic mb-2 lg:mb-3">"{indicator.definition}"</p>
                                                    </div>

                                                    <div className="space-y-1.5 lg:space-y-2">
                                                        {indicator.options.map((option) => (
                                                            <label
                                                                key={option.value}
                                                                className={`
                                                        flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg border cursor-pointer transition-all
                                                        ${currentScores[indicator.key] === option.value
                                                                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                                                                        : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"}
                                                    `}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name={`${currentId}-${indicator.key}`}
                                                                    value={option.value}
                                                                    checked={currentScores[indicator.key] === option.value}
                                                                    onChange={() => handleScoreChange(indicator.key, option.value)}
                                                                    className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                                                />
                                                                <div className="flex-1">
                                                                    <span className={`font-bold mr-1.5 lg:mr-2 text-sm lg:text-base ${option.value === 1 ? "text-red-600" :
                                                                        option.value === 2 ? "text-orange-600" :
                                                                            option.value === 3 ? "text-amber-600" :
                                                                                option.value === 4 ? "text-blue-600" :
                                                                                    "text-green-600"
                                                                        }`}>{option.value}</span>
                                                                    <span className="text-xs lg:text-sm text-slate-700">{option.label}</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                ))}
                            </div>

                            {/* Navigation Footer */}
                            <div className="fixed bottom-0 right-0 w-full lg:w-1/2 bg-white border-t border-slate-200 p-3 lg:p-4 shadow-lg flex justify-between items-center z-20">
                                <button
                                    disabled={currentId <= 1}
                                    onClick={() => {
                                        setCurrentId(prev => Math.max(1, prev - 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base border border-slate-300 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    ← Prev
                                </button>
                                <span className="font-semibold text-slate-700 text-sm lg:text-base">
                                    {currentId} / 50
                                </span>
                                <button
                                    disabled={currentId >= 50}
                                    onClick={() => {
                                        setCurrentId(prev => Math.min(50, prev + 1));
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base bg-slate-800 text-white rounded hover:bg-slate-900 disabled:opacity-50"
                                >
                                    Next →
                                </button>
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
