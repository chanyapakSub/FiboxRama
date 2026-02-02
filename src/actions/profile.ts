'use server'

import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db'

export async function submitProfile(formData: FormData) {
    const role = formData.get('role') as string
    const department = formData.get('department') as string
    const experienceString = formData.get('experienceYears') as string

    if (!role || !department || !experienceString) {
        // In a real app, return validation errors to the form
        throw new Error('Missing required fields')
    }

    const experienceYears = parseInt(experienceString, 10)

    const prisma = await getDb()

    const user = await prisma.userProfile.create({
        data: {
            role,
            department,
            experienceYears
        }
    })

    // Redirect to questionnaire with userId
    redirect(`/questionnaire?userId=${user.id}`)
}
