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
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Medical Chatbot Evaluation</h1>
                    <p className="text-sm text-slate-500">Evaluating 50 conversation sets across 21 indicators.</p>
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

                {/* Mobile Navigation (Dropdown) */}
                <div className="lg:hidden p-4 bg-white border-b border-slate-200">
                    <label className="text-sm font-medium text-slate-700 mr-2">Select Set:</label>
                    <select
                        value={currentId}
                        onChange={(e) => setCurrentId(Number(e.target.value))}
                        className="p-2 border border-slate-300 rounded-md"
                    >
                        {conversations.map(c => (
                            <option key={c.conversation_id} value={c.conversation_id}>
                                Set {c.conversation_id} ({Object.keys(c.scores).length}/21)
                            </option>
                        ))}
                    </select>
                </div>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                    {/* Left Panel: Conversation Placeholder */}
                    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 lg:border-r border-slate-200">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                                <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                    Conversation Set #{currentId}
                                </h2>
                                <div className="p-8 bg-slate-50 rounded border border-dashed border-slate-300 text-center text-slate-400 min-h-[400px] flex flex-col justify-center items-center">
                                    <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="font-medium">Conversation Content Placeholder</p>
                                    <p className="text-sm mt-1">Isolate and display conversation text here later.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Evaluation Form */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white">
                        <div className="max-w-2xl mx-auto">
                            <div className="sticky top-0 bg-white/95 backdrop-blur z-10 pb-4 border-b mb-6 flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-800">Scoring</h2>
                                <span className="text-sm font-medium text-slate-500">
                                    {Object.keys(currentScores).length} of 21 scored
                                </span>
                            </div>

                            <div className="space-y-10 pb-20">
                                {EVALUATION_CRITERIA.map((category) => (
                                    <section key={category.name} className="space-y-6">
                                        <h3 className="text-md font-bold text-blue-800 bg-blue-50 px-3 py-2 rounded border-l-4 border-blue-600">
                                            {category.name}
                                        </h3>
                                        <div className="space-y-8">
                                            {category.indicators.map((indicator) => (
                                                <div key={indicator.key} className="pl-2">
                                                    <div className="mb-3">
                                                        <div className="flex items-baseline gap-2 mb-1">
                                                            <span className="text-sm font-bold text-slate-400">#{indicator.id}</span>
                                                            <h4 className="font-semibold text-slate-900">{indicator.name}</h4>
                                                        </div>
                                                        <p className="text-sm text-slate-600 italic mb-3">"{indicator.definition}"</p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {indicator.options.map((option) => (
                                                            <label
                                                                key={option.value}
                                                                className={`
                                                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
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
                                                                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                                                />
                                                                <div className="flex-1">
                                                                    <span className={`font-bold mr-2 ${option.value === 1 ? "text-red-600" :
                                                                            option.value === 2 ? "text-orange-600" :
                                                                                option.value === 3 ? "text-amber-600" :
                                                                                    option.value === 4 ? "text-blue-600" :
                                                                                        "text-green-600"
                                                                        }`}>{option.value}</span>
                                                                    <span className="text-sm text-slate-700">{option.label}</span>
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
                            <div className="fixed bottom-0 right-0 w-full lg:w-1/2 bg-white border-t border-slate-200 p-4 shadow-lg flex justify-between items-center z-20">
                                <button
                                    disabled={currentId <= 1}
                                    onClick={() => {
                                        setCurrentId(prev => Math.max(1, prev - 1));
                                        // Scroll to top of form
                                        const main = document.querySelector('main');
                                        if (main) main.scrollTop = 0;
                                    }}
                                    className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Previous Set
                                </button>
                                <span className="font-semibold text-slate-700">
                                    Set {currentId} of 50
                                </span>
                                <button
                                    disabled={currentId >= 50}
                                    onClick={() => {
                                        setCurrentId(prev => Math.min(50, prev + 1));
                                        // Scroll to top of form
                                        const main = document.querySelector('main');
                                        if (main) main.scrollTop = 0;
                                    }}
                                    className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 disabled:opacity-50"
                                >
                                    Next Set
                                </button>
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
