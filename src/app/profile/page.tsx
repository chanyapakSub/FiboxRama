import { submitProfile } from '@/actions/profile'

export default function ProfilePage() {
    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-blue-50">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Your Profile</h1>
                <p className="text-slate-500 mb-6">Please provide your professional details.</p>

                <form action={submitProfile} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Professional Role</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 w-full justify-center has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors">
                                <input type="radio" name="role" value="doctor" className="accent-blue-600 w-4 h-4" required />
                                <span className="text-slate-700 font-medium">Doctor</span>
                            </label>
                            <label className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 w-full justify-center has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors">
                                <input type="radio" name="role" value="nurse" className="accent-blue-600 w-4 h-4" required />
                                <span className="text-slate-700 font-medium">Nurse</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-1">Department / Specialty</label>
                        <input
                            type="text"
                            name="department"
                            id="department"
                            required
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-700"
                            placeholder="e.g. Cardiology, ER, Pediatrics"
                        />
                    </div>

                    <div>
                        <label htmlFor="experienceYears" className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                        <input
                            type="number"
                            name="experienceYears"
                            id="experienceYears"
                            required
                            min="0"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-700"
                            placeholder="e.g. 5"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm mt-2"
                    >
                        Continue to Questionnaire
                    </button>
                </form>
            </div>
        </main>
    )
}
