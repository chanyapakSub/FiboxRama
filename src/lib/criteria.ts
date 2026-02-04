export type Indicator = {
    id: number;
    key: string;
    name: string;
    definition: string;
    options: { value: number; label: string }[];
};

export type Category = {
    name: string;
    indicators: Indicator[];
};

export const EVALUATION_CRITERIA: Category[] = [
    {
        name: "CATEGORY A: Medical Accuracy & Safety",
        indicators: [
            {
                id: 1,
                key: "1_medical_accuracy",
                name: "Indicator 1: Medical Accuracy",
                definition: "Medical information is scientifically correct and evidence-based.",
                options: [
                    { value: 5, label: "Completely correct and aligned with medical standards" },
                    { value: 4, label: "Mostly correct, only minor insignificant inaccuracies" },
                    { value: 3, label: "Acceptable but missing important medical details" },
                    { value: 2, label: "Partially incorrect information" },
                    { value: 1, label: "Severely incorrect, misleading, or harmful information" },
                ],
            },
            {
                id: 2,
                key: "2_safety",
                name: "Indicator 2: Safety of Recommendations",
                definition: "No dangerous, unsafe, or inappropriate advice.",
                options: [
                    { value: 5, label: "Completely safe, no concerns" },
                    { value: 4, label: "Safe but may need minor warnings" },
                    { value: 3, label: "Generally safe but caution is required" },
                    { value: 2, label: "Moderate safety risk" },
                    { value: 1, label: "Serious danger, requires immediate correction" },
                ],
            },
            {
                id: 3,
                key: "3_red_flags",
                name: "Indicator 3: Referral / Red Flags",
                definition: "Appropriate identification of red flags and urgency.",
                options: [
                    { value: 5, label: "Clearly identifies all red flags and advises medical attention" },
                    { value: 4, label: "Identifies red flags but urgency could be clearer" },
                    { value: 3, label: "Identifies some red flags" },
                    { value: 2, label: "Misses important red flags" },
                    { value: 1, label: "Fails to recommend medical care despite clear red flags" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY B: Clarity of Information",
        indicators: [
            {
                id: 4,
                key: "4_language_clarity",
                name: "Indicator 4: Language Simplicity",
                definition: "Language is easy to understand for Thai patients, avoids unnecessary jargon.",
                options: [
                    { value: 5, label: "Very clear and easy to understand" },
                    { value: 4, label: "Mostly clear, minor medical terms not explained" },
                    { value: 3, label: "Understandable but unnecessarily complex" },
                    { value: 2, label: "Too complex for patients" },
                    { value: 1, label: "Confusing and unclear" },
                ],
            },
            {
                id: 5,
                key: "5_reasoning",
                name: "Indicator 5: Explanation of Reasoning ('Why')",
                definition: "Provides clinical reasoning, not superficial answers.",
                options: [
                    { value: 5, label: "Clear and thorough explanation" },
                    { value: 4, label: "Good explanation with minor gaps" },
                    { value: 3, label: "Some explanation but lacks depth" },
                    { value: 2, label: "Minimal explanation" },
                    { value: 1, label: "No explanation" },
                ],
            },
            {
                id: 6,
                key: "6_understanding_check",
                name: "Indicator 6: Checking Patient Understanding",
                definition: "Asks follow-up questions or confirms understanding.",
                options: [
                    { value: 5, label: "Clearly checks understanding" },
                    { value: 4, label: "Checks understanding but not comprehensively" },
                    { value: 3, label: "Limited checking" },
                    { value: 2, label: "Very minimal checking" },
                    { value: 1, label: "No attempt to check understanding" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY C: Relevance & Completeness",
        indicators: [
            {
                id: 7,
                key: "7_relevance",
                name: "Indicator 7: Addressing the Main Complaint",
                definition: "Stays on topic and addresses the main symptom or concern.",
                options: [
                    { value: 5, label: "Fully focused and relevant" },
                    { value: 4, label: "Mostly relevant, minor unnecessary content" },
                    { value: 3, label: "Somewhat relevant but slightly off-topic" },
                    { value: 2, label: "Largely off-topic" },
                    { value: 1, label: "Completely irrelevant" },
                ],
            },
            {
                id: 8,
                key: "8_completeness",
                name: "Indicator 8: Completeness of Key Information",
                definition: "Covers essential questions, warnings, and advice.",
                options: [
                    { value: 5, label: "Fully comprehensive" },
                    { value: 4, label: "Mostly complete, minor missing points" },
                    { value: 3, label: "Adequate but needs more detail" },
                    { value: 2, label: "Missing many key elements" },
                    { value: 1, label: "Severely incomplete" },
                ],
            },
            {
                id: 9,
                key: "9_clinical_logic",
                name: "Indicator 9: Clinical Logic Flow",
                definition: "Reasoning is coherent and internally consistent.",
                options: [
                    { value: 5, label: "Clear, logical, and consistent" },
                    { value: 4, label: "Mostly logical with minor gaps" },
                    { value: 3, label: "Acceptable but jumps in logic" },
                    { value: 2, label: "Confusing and inconsistent" },
                    { value: 1, label: "No logical flow" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY D: Empathy & Patient-Centeredness",
        indicators: [
            {
                id: 10,
                key: "10_empathy",
                name: "Indicator 10: Empathy",
                definition: "Acknowledges and validates patient emotions.",
                options: [
                    { value: 5, label: "Strong and appropriate empathy" },
                    { value: 4, label: "Good empathy but could be deeper" },
                    { value: 3, label: "Some empathy shown" },
                    { value: 2, label: "Minimal empathy" },
                    { value: 1, label: "No empathy or inappropriate response" },
                ],
            },
            {
                id: 11,
                key: "11_reflection",
                name: "Indicator 11: Reflection of Patient Concerns",
                definition: "Acknowledges and responds to patient worries.",
                options: [
                    { value: 5, label: "Fully reflects and addresses all concerns" },
                    { value: 4, label: "Addresses most concerns" },
                    { value: 3, label: "Addresses some concerns" },
                    { value: 2, label: "Rarely addresses concerns" },
                    { value: 1, label: "Ignores patient concerns" },
                ],
            },
            {
                id: 12,
                key: "12_tone",
                name: "Indicator 12: Professional Tone",
                definition: "Polite, calm, and non-judgmental tone.",
                options: [
                    { value: 5, label: "Fully professional and gentle" },
                    { value: 4, label: "Professional but slightly too formal" },
                    { value: 3, label: "Acceptable but could improve" },
                    { value: 2, label: "Inappropriate tone" },
                    { value: 1, label: "Rude, blaming, or unprofessional" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY E: Shared Decision-Making",
        indicators: [
            {
                id: 13,
                key: "13_options",
                name: "Indicator 13: Care Options Provided",
                definition: "Offers more than one management option.",
                options: [
                    { value: 5, label: "Multiple options with pros and cons" },
                    { value: 4, label: "Options provided but incomplete" },
                    { value: 3, label: "Limited options" },
                    { value: 2, label: "Almost no options" },
                    { value: 1, label: "No options, purely directive" },
                ],
            },
            {
                id: 14,
                key: "14_participation",
                name: "Indicator 14: Patient Participation",
                definition: "Invites patient questions and preferences.",
                options: [
                    { value: 5, label: "Actively encourages participation" },
                    { value: 4, label: "Encourages participation adequately" },
                    { value: 3, label: "Limited encouragement" },
                    { value: 2, label: "Rarely encourages" },
                    { value: 1, label: "No encouragement, purely directive" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY F: Context Management",
        indicators: [
            {
                id: 15,
                key: "15_context",
                name: "Indicator 15: Context Retention",
                definition: "Remembers prior conversation details.",
                options: [
                    { value: 5, label: "Fully retains context" },
                    { value: 4, label: "Retains most context" },
                    { value: 3, label: "Retains some context" },
                    { value: 2, label: "Misses key context" },
                    { value: 1, label: "No context retention" },
                ],
            },
            {
                id: 16,
                key: "16_adaptation",
                name: "Indicator 16: Adaptation to New Information",
                definition: "Adjusts recommendations when new symptoms appear.",
                options: [
                    { value: 5, label: "Adapts appropriately and promptly" },
                    { value: 4, label: "Adapts well but slightly delayed" },
                    { value: 3, label: "Partial adaptation" },
                    { value: 2, label: "Minimal adaptation" },
                    { value: 1, label: "No adaptation" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY G: Clinical Usability",
        indicators: [
            {
                id: 17,
                key: "17_timing",
                name: "Indicator 17: Timing & Length",
                definition: "Appropriate length, not too long or too short.",
                options: [
                    { value: 5, label: "Perfectly balanced" },
                    { value: 4, label: "Slightly long or short" },
                    { value: 3, label: "Somewhat too long" },
                    { value: 2, label: "Poor length" },
                    { value: 1, label: "Completely inappropriate length" },
                ],
            },
            {
                id: 18,
                key: "18_professionalism",
                name: "Indicator 18: Professional Level",
                definition: "Matches expected clinical professionalism.",
                options: [
                    { value: 5, label: "Fully professional and context-appropriate" },
                    { value: 4, label: "Mostly professional" },
                    { value: 3, label: "Acceptable but needs improvement" },
                    { value: 2, label: "Low professionalism" },
                    { value: 1, label: "Unprofessional" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY H: Overall Trustworthiness",
        indicators: [
            {
                id: 19,
                key: "19_trust",
                name: "Indicator 19: Trustworthiness",
                definition: "Inspires confidence and trust.",
                options: [
                    { value: 5, label: "Highly trustworthy" },
                    { value: 4, label: "Trustworthy with minor doubts" },
                    { value: 3, label: "Moderately trustworthy" },
                    { value: 2, label: "Low trustworthiness" },
                    { value: 1, label: "Not trustworthy / potentially harmful" },
                ],
            },
        ],
    },
    {
        name: "CATEGORY I: Thai Language & Healthcare Context",
        indicators: [
            {
                id: 20,
                key: "20_thai_language",
                name: "Indicator 20: Thai Language Register",
                definition: "Polite, appropriate for Thai medical context.",
                options: [
                    { value: 5, label: "Fully appropriate and polite" },
                    { value: 4, label: "Mostly appropriate" },
                    { value: 3, label: "Acceptable but inconsistent" },
                    { value: 2, label: "Inappropriate register" },
                    { value: 1, label: "Completely inappropriate" },
                ],
            },
            {
                id: 21,
                key: "21_thai_healthcare_system",
                name: "Indicator 21: Thai Healthcare System Accuracy",
                definition: "Correct use of Thai healthcare system (referral, insurance, access).",
                options: [
                    { value: 5, label: "Fully accurate" },
                    { value: 4, label: "Mostly accurate with minor issues" },
                    { value: 3, label: "Some inaccuracies" },
                    { value: 2, label: "Many inaccuracies" },
                    { value: 1, label: "Severely incorrect" },
                ],
            },
        ],
    },
];
