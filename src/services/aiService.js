import { getAuth } from 'firebase/auth';
import { DIAMOND_COACH_PROMPT, DAILY_BRIEFING_PROMPT } from '../utils/aiPrompt';

const FUNCTION_URL = '/.netlify/functions/get-coaching';

/**
 * Shared fetch helper — calls the Netlify proxy with the given prompt + context.
 */
const callCoachEndpoint = async (systemPrompt, userContext, userMessage) => {
    const auth = getAuth();
    const user = auth.currentUser;
    let idToken = '';
    if (user) {
        idToken = await user.getIdToken();
    }

    const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idToken ? `Bearer ${idToken}` : '',
        },
        body: JSON.stringify({ systemPrompt, userContext, userMessage }),
    });

    if (!response.ok) {
        let errorMessage = 'The Diamond Coach is tied up at the moment.';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch (_) { /* not JSON */ }
        throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.text;
};

/**
 * Diamond Coach chat — interactive coaching tab.
 */
export const getDiamondCoaching = async (userContext, userMessage = '') => {
    try {
        return await callCoachEndpoint(DIAMOND_COACH_PROMPT, userContext, userMessage);
    } catch (error) {
        console.error('[aiService getDiamondCoaching]:', error);
        throw error;
    }
};

/**
 * Daily Briefing — used on the Today tab (front page).
 * Parses the structured 4-section response into a JS object.
 *
 * @param {Object} userContext - The user's stats payload.
 * @returns {Promise<{todo: string, focus: string, strengths: string, weaknesses: string}>}
 */
export const getDailyBriefing = async (userContext) => {
    try {
        const raw = await callCoachEndpoint(
            DAILY_BRIEFING_PROMPT,
            userContext,
            'Give me my complete daily briefing based on my numbers.'
        );

        // Parse the 4 labelled sections out of the raw text robustly
        const parse = (label) => {
            const escapedLabel = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(?:\\*\\*|)?${escapedLabel}(?:\\*\\*|)?\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:\\*\\*|)?(?:WHAT TO DO TODAY|FOCUS ON|STRENGTHS|WEAKNESSES)(?:\\*\\*|)?\\s*:|$)`, 'i');
            const match = raw.match(regex);
            return match ? match[1].trim() : '';
        };

        return {
            todo: parse('WHAT TO DO TODAY'),
            focus: parse('FOCUS ON'),
            strengths: parse('STRENGTHS'),
            weaknesses: parse('WEAKNESSES'),
            raw,
        };
    } catch (error) {
        console.error('[aiService getDailyBriefing]:', error);
        throw error
    }
};
