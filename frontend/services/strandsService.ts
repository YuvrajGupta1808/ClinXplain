// Simple AI Assistant using OpenAI API directly
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

const SYSTEM_PROMPT = `You are a helpful medical assistant for ClinXplain, a clinical documentation platform.

You can help doctors with:
- Navigating to different sections: Scribe, Patients, Dashboard
- Answering simple questions about the platform
- Providing quick information

When users ask to navigate or go to a page, respond with ONLY a JSON object:
{"action": "navigate", "page": "scribe"} or {"action": "navigate", "page": "patients"} or {"action": "navigate", "page": "dashboard"}

For other questions, provide helpful, concise answers. Keep responses brief and professional.`;

export interface StrandsResponse {
    text: string;
    action?: 'navigate';
    page?: 'scribe' | 'patients' | 'dashboard';
}

export const strandsService = {
    async chat(message: string): Promise<StrandsResponse> {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: message },
                    ],
                    max_tokens: 200,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || '';

            // Check if response contains navigation action
            const navigationMatch = text.match(/\{"action":\s*"navigate",\s*"page":\s*"(scribe|patients|dashboard)"\}/);

            if (navigationMatch) {
                return {
                    text: `Navigating to ${navigationMatch[1]}...`,
                    action: 'navigate',
                    page: navigationMatch[1] as 'scribe' | 'patients' | 'dashboard',
                };
            }

            return { text };
        } catch (error) {
            console.error('Chat error:', error);
            return {
                text: 'Sorry, I encountered an error. Please try again.',
            };
        }
    },

    async initialize(): Promise<boolean> {
        return !!OPENAI_API_KEY;
    },
};
