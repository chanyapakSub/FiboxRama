import { redirect } from 'next/navigation'

export default async function QuestionnairePage(props: { searchParams: Promise<{ userId?: string }> }) {
    const searchParams = await props.searchParams

    if (!searchParams.userId) {
        redirect('/profile')
    }

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-2xl bg-white p-10 rounded-2xl shadow-xl border border-blue-100">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-4">You are ready!</h1>
                <p className="text-slate-600 mb-8">
                    This is a placeholder for the questionnaire content.<br />
                    Your profile has been created with ID: <span className="font-mono text-sm bg-slate-100 p-1 rounded text-slate-700">{searchParams.userId}</span>
                </p>
                <div className="p-6 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                    <strong>System Status:</strong> The questionnaire module is currently under development.
                </div>
            </div>
        </main>
    )
}
