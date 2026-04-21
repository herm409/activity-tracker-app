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
        
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-pro-latest",
        });

        const fullPrompt = `You are the Diamond Coach, an elite virtual mentor. 
Please follow the instructions below to compose your coaching response.

--- SYSTEM INSTRUCTIONS ---
${systemPrompt}
You MUST output a full, comprehensive paragraph. Read the data, acknowledge wins, identify a gap, and close it out.

--- USER PROGRESS SNAPSHOT ---
${JSON.stringify(userContext, null, 2)}

--- USER QUESTION ---
"${userMessage || "Coach me based on my numbers today."}"

--- YOUR COACHING RESPONSE ---
`;

        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
            generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.8,
            }
        });
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
