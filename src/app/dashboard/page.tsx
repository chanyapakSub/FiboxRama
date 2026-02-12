"use client";

import React, { useState, useEffect } from 'react';
import { EVALUATION_CRITERIA } from '../../lib/criteria';

interface Evaluator {
    id: string;
    name: string;
    role: string;
    specialty: string | null;
    experienceYears: number;
    createdAt: string;
    evaluations: Evaluation[];
}

interface Evaluation {
    id: string;
    conversationId: number;
    comment: string | null;
    scores: Score[];
}

interface Score {
    indicatorKey: string;
    score: number;
}

const PASSWORD = "Fibo999";

export default function DashboardPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
    const [expandedEvaluator, setExpandedEvaluator] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"table" | "analytics">("table");
    const [editingEvaluator, setEditingEvaluator] = useState<Evaluator | null>(null);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput === PASSWORD) {
            setIsAuthenticated(true);
            fetchData();
        } else {
            alert("Incorrect password");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/evaluation');
            const data = await res.json();
            setEvaluators(data);
        } catch (error) {
            console.error(error);
            alert("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (evaluatorId: string, evaluatorName: string) => {
        if (!confirm(`Are you sure you want to delete ${evaluatorName} and all their evaluations? This cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/evaluation/${evaluatorId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                alert('Evaluator deleted successfully');
                fetchData();
            } else {
                alert('Failed to delete evaluator');
            }
        } catch (error) {
            console.error(error);
            alert('Error deleting evaluator');
        }
    };

    const handleExportCSV = () => {
        // Create CSV content
        const indicators = getAllIndicators();
        const headers = ['Evaluator', 'Role', 'Experience', 'Conversation ID', ...indicators.map(i => `I${i.id}`), 'Comment'];

        const rows: string[][] = [];
        evaluators.forEach(evaluator => {
            evaluator.evaluations.forEach(ev => {
                const row = [
                    evaluator.name,
                    evaluator.role,
                    evaluator.experienceYears.toString(),
                    ev.conversationId.toString(),
                    ...indicators.map(ind => {
                        const score = ev.scores.find(s => s.indicatorKey === ind.key);
                        return score ? score.score.toString() : '';
                    }),
                    ev.comment || ''
                ];
                rows.push(row);
            });
        });

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `evaluation_data_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                    <h1 className="text-2xl font-bold text-center mb-6 text-slate-800">Dashboard Access</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <input
                                type="password"
                                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-slate-800 text-white py-2 rounded hover:bg-slate-900 transition-colors"
                        >
                            Enter
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const getAllIndicators = () => {
        const indicators: { key: string; name: string; id: number }[] = [];
        EVALUATION_CRITERIA.forEach(cat => {
            cat.indicators.forEach(ind => {
                indicators.push({ key: ind.key, name: ind.name, id: ind.id });
            });
        });
        return indicators;
    };

    const indicators = getAllIndicators();

    // Calculate analytics
    const calculateAnalytics = () => {
        const indicatorStats: Record<string, { total: number; count: number; avg: number }> = {};

        indicators.forEach(ind => {
            indicatorStats[ind.key] = { total: 0, count: 0, avg: 0 };
        });

        evaluators.forEach(evaluator => {
            evaluator.evaluations.forEach(ev => {
                ev.scores.forEach(score => {
                    if (indicatorStats[score.indicatorKey]) {
                        indicatorStats[score.indicatorKey].total += score.score;
                        indicatorStats[score.indicatorKey].count += 1;
                    }
                });
            });
        });

        Object.keys(indicatorStats).forEach(key => {
            const stat = indicatorStats[key];
            stat.avg = stat.count > 0 ? stat.total / stat.count : 0;
        });

        return indicatorStats;
    };

    const analytics = calculateAnalytics();

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Evaluation Dashboard</h1>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setViewMode(viewMode === "table" ? "analytics" : "table")}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            {viewMode === "table" ? "📊 View Analytics" : "📋 View Table"}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                        >
                            📥 Export CSV
                        </button>
                        <button
                            onClick={fetchData}
                            className="text-sm bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-500">Loading data...</div>
                ) : evaluators.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
                        <p className="text-slate-500">No submission data found yet.</p>
                    </div>
                ) : viewMode === "analytics" ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold mb-4 text-slate-800">Overview Statistics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-600 font-semibold">Total Evaluators</p>
                                    <p className="text-3xl font-bold text-blue-900">{evaluators.length}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <p className="text-sm text-green-600 font-semibold">Total Evaluations</p>
                                    <p className="text-3xl font-bold text-green-900">
                                        {evaluators.reduce((sum, e) => sum + e.evaluations.length, 0)}
                                    </p>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                    <p className="text-sm text-amber-600 font-semibold">Avg per Evaluator</p>
                                    <p className="text-3xl font-bold text-amber-900">
                                        {(evaluators.reduce((sum, e) => sum + e.evaluations.length, 0) / evaluators.length).toFixed(1)}
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                    <p className="text-sm text-purple-600 font-semibold">Completion Rate</p>
                                    <p className="text-3xl font-bold text-purple-900">
                                        {((evaluators.filter(e => e.evaluations.length === 50).length / evaluators.length) * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold mb-4 text-slate-800">Average Scores by Indicator</h2>
                            <div className="space-y-3">
                                {indicators.map(ind => {
                                    const stat = analytics[ind.key];
                                    const percentage = (stat.avg / 5) * 100;
                                    const color = stat.avg >= 4 ? 'bg-green-500' : stat.avg >= 3 ? 'bg-amber-500' : 'bg-red-500';

                                    return (
                                        <div key={ind.key} className="space-y-1">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="font-medium text-slate-700">
                                                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded mr-2">{ind.id}</span>
                                                    {ind.name}
                                                </span>
                                                <span className="font-bold text-slate-900">
                                                    {stat.avg.toFixed(2)} <span className="text-xs text-slate-400">({stat.count} scores)</span>
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${color} transition-all`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {evaluators.map((evaluator) => {
                            const isExpanded = expandedEvaluator === evaluator.id;
                            const totalScored = evaluator.evaluations.length;

                            return (
                                <div key={evaluator.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                                    <div
                                        className="p-4 lg:p-6 flex flex-col lg:flex-row justify-between lg:items-center cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => setExpandedEvaluator(isExpanded ? null : evaluator.id)}
                                    >
                                        <div className="flex items-center gap-4 mb-3 lg:mb-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${evaluator.role === 'Doctor' ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                                                {evaluator.role[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-800">{evaluator.name}</h3>
                                                <p className="text-sm text-slate-500">
                                                    {evaluator.role} • {evaluator.specialty || 'No Specialty'} • {evaluator.experienceYears} Years Exp.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Progress</p>
                                                <p className="text-xl font-bold text-slate-700">{totalScored} <span className="text-sm text-slate-400 font-normal">/ 50 Sets</span></p>
                                            </div>
                                            <div className="text-right hidden lg:block">
                                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Submitted</p>
                                                <p className="text-sm text-slate-600">{new Date(evaluator.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(evaluator.id, evaluator.name);
                                                }}
                                                className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors"
                                            >
                                                🗑️ Delete
                                            </button>
                                            <svg className={`w-5 h-5 text-slate-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50 p-4 lg:p-6 overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead>
                                                    <tr className="border-b border-slate-200">
                                                        <th className="py-2 px-3 font-semibold text-slate-700 min-w-[80px]">Set ID</th>
                                                        {indicators.map(ind => (
                                                            <th key={ind.key} className="py-2 px-2 font-medium text-slate-500 text-center min-w-[40px]" title={ind.name}>
                                                                {ind.id}
                                                            </th>
                                                        ))}
                                                        <th className="py-2 px-3 font-semibold text-slate-700 min-w-[200px]">Comment</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {evaluator.evaluations.sort((a, b) => a.conversationId - b.conversationId).map(ev => (
                                                        <tr key={ev.id} className="border-b border-slate-100 bg-white hover:bg-blue-50/30">
                                                            <td className="py-2 px-3 font-medium text-slate-900 border-r border-slate-100">
                                                                #{ev.conversationId}
                                                            </td>
                                                            {indicators.map(ind => {
                                                                const scoreObj = ev.scores.find(s => s.indicatorKey === ind.key);
                                                                const val = scoreObj ? scoreObj.score : '-';
                                                                let colorClass = "text-slate-300";
                                                                if (typeof val === 'number') {
                                                                    if (val >= 4) colorClass = "text-green-600 font-bold";
                                                                    else if (val === 3) colorClass = "text-amber-600 font-medium";
                                                                    else colorClass = "text-red-500 font-bold";
                                                                }
                                                                return (
                                                                    <td key={ind.key} className={`py-2 px-2 text-center border-r border-slate-100 ${colorClass}`}>
                                                                        {val}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="py-2 px-3 text-slate-600 italic">
                                                                {ev.comment || '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
