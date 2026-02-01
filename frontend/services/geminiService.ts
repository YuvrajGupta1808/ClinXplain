import { AiSuggestion, SoapNote, TranscriptEntry } from '../types';

// Mock AI service - replace with actual Gemini API calls
export const generateSoapNote = async (transcript: TranscriptEntry[]): Promise<SoapNote> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const conversationText = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');

    return {
        subjective: `Patient reports feeling depressed for approximately three months, beginning in early November. Symptoms include increased sleep (hypersomnia) with persistent fatigue and increased carbohydrate cravings. Patient notes that symptoms are particularly pronounced during the winter months. Family history is significant for maternal seasonal depression.`,

        objective: `Patient appears alert and oriented. Affect is somewhat flat. Speech is normal in rate and tone. Patient maintains good eye contact throughout the interview. No signs of acute distress noted.`,

        assessment: `1. Major Depressive Disorder with Seasonal Pattern (Seasonal Affective Disorder)
   - Onset correlates with decreased daylight hours
   - Symptoms include hypersomnia, fatigue, and increased appetite
   - Positive family history of seasonal depression
   
2. Rule out hypothyroidism
3. Rule out vitamin D deficiency`,

        plan: `1. Initiate light therapy: 10,000 lux light box for 30 minutes each morning
2. Order laboratory studies: TSH, free T4, vitamin D levels
3. Consider SSRI therapy if symptoms persist after 2 weeks of light therapy
4. Recommend regular exercise, particularly outdoor activities during daylight hours
5. Nutritional counseling regarding carbohydrate cravings
6. Follow-up appointment in 2 weeks to assess response to treatment
7. Provide patient education materials on Seasonal Affective Disorder
8. Screen for suicidal ideation - negative at this time`
    };
};

export const generateSuggestions = async (transcript: TranscriptEntry[]): Promise<AiSuggestion[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const suggestions: AiSuggestion[] = [];
    const conversationText = transcript.map(t => t.text.toLowerCase()).join(' ');

    // Generate contextual suggestions based on conversation
    if (conversationText.includes('sleep') || conversationText.includes('tired')) {
        suggestions.push({
            id: `q-${Date.now()}-1`,
            type: 'question',
            title: 'Sleep Pattern',
            content: 'How many hours are you sleeping per night? Do you have difficulty falling asleep or staying asleep?',
            status: 'pending'
        });
    }

    if (conversationText.includes('depressed') || conversationText.includes('low')) {
        suggestions.push({
            id: `q-${Date.now()}-2`,
            type: 'question',
            title: 'Depression Screening',
            content: 'Have you experienced loss of interest in activities you usually enjoy? Any thoughts of self-harm?',
            status: 'pending'
        });

        suggestions.push({
            id: `d-${Date.now()}-1`,
            type: 'diagnosis',
            title: 'Potential Diagnosis',
            content: 'Major Depressive Disorder',
            status: 'pending'
        });
    }

    if (conversationText.includes('winter') || conversationText.includes('holiday')) {
        suggestions.push({
            id: `d-${Date.now()}-2`,
            type: 'diagnosis',
            title: 'Seasonal Pattern',
            content: 'Seasonal Affective Disorder (SAD)',
            status: 'pending'
        });
    }

    if (conversationText.includes('appetite') || conversationText.includes('craving')) {
        suggestions.push({
            id: `q-${Date.now()}-3`,
            type: 'question',
            title: 'Appetite Changes',
            content: 'Have you noticed any weight changes? What specific foods are you craving?',
            status: 'pending'
        });
    }

    return suggestions;
};
