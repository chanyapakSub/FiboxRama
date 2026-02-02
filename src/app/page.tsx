import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl bg-white p-10 rounded-2xl shadow-xl border border-blue-100">
        <h1 className="text-4xl font-bold text-slate-800 mb-6 tracking-tight">
          Medical Professional Questionnaire
        </h1>
        <p className="text-lg text-slate-600 mb-8 leading-relaxed">
          We are conducting a study to understand the current challenges in medical practice.
          Your input as a Doctor or Nurse is invaluable to us.
        </p>

        <div className="bg-blue-50 p-6 rounded-lg mb-8 text-left">
          <h2 className="font-semibold text-blue-900 mb-2">Study Information</h2>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>Estimated time: 5-10 minutes</li>
            <li>Anonymous data collection</li>
            <li>Results used for academic research</li>
          </ul>
        </div>

        <Link
          href="/profile"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-full transition-all transform hover:scale-105 shadow-md"
        >
          Start Questionnaire
        </Link>
      </div>
    </main>
  )
}
