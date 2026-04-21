import { DIAMOND_COACH_PROMPT } from '../utils/aiPrompt';

/**
 * Service to communicate with the Diamond Coach backend.
 * 
 * @param {Object} userContext - Structured data about the user's current stats and team position.
 * @param {string} userMessage - (Optional) Specific message or question from the user.
 * @returns {Promise<string>} The AI's coaching response.
 */
export const getDiamondCoaching = async (userContext, userMessage = "") => {
    try {
        // Netlify Functions are automatically served at /.netlify/functions/[filename]
        const response = await fetch('/.netlify/functions/get-coaching', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                systemPrompt: DIAMOND_COACH_PROMPT,
                userContext,
                userMessage
            })
        });

        if (!response.ok) {
            let errorMessage = 'The Diamond Coach is tied up at the moment.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                // Not JSON
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error("[aiService]:", error);
        throw error;
    }
};
