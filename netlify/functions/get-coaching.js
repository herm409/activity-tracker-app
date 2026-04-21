const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Netlify Function: get-coaching
 * Securely communicates with Google Gemini to provide Diamond Coach responses.
 */
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event, context) => {
    // Handle browser CORS preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: CORS_HEADERS, body: "" };
    }

    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { 
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: "Method Not Allowed" }) 
        };
    }

    try {
        const { systemPrompt, userContext, userMessage } = JSON.parse(event.body);

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured in Netlify environment variables.");
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // gemini-2.5-flash: fast, generous free tier, actively supported
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                maxOutputTokens: 200,
                temperature: 0.75,
            }
        });

        const fullPrompt = `
${systemPrompt}

CURRENT PROGRESS SNAPSHOT:
${JSON.stringify(userContext, null, 2)}

USER QUESTION/INPUT:
"${userMessage || "Coach me based on my numbers today."}"

DIAMOND COACH RESPONSE:
`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: text.trim() }),
        };
    } catch (error) {
        console.error("[Diamond Coach Error]:", error);
        return {
            statusCode: 500,
            headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
                error: "The Diamond Coach is currently off the grid. Try again in a minute.",
                details: error.message 
            }),
        };
    }
};
