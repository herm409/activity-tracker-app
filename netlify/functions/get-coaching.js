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

        // Select the best available model dynamically to avoid 404 deprecations
        let selectedModel = "gemini-pro"; // failover fallback
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
            const res = await fetch(listUrl);
            const data = await res.json();
            
            if (data.models) {
                // Filter for models that actually support text generation
                const textModels = data.models.filter(m => 
                    m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
                );
                
                // Prioritize stable '1.5' routing aliases which don't carry truncation limits
                const preferredAliases = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "gemini-pro"];
                
                for (const alias of preferredAliases) {
                    if (textModels.some(m => m.name === `models/${alias}`)) {
                        selectedModel = alias;
                        break;
                    }
                }
                
                // If somehow none match our prefs, pick the first valid one available
                if (!preferredAliases.includes(selectedModel) && textModels.length > 0) {
                    selectedModel = textModels[0].name.replace('models/', '');
                }
            }
        } catch (err) {
            console.error("Diagnostic fetch failed:", err);
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: selectedModel,
            generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.8,
            }
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

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            headers: {
                ...CORS_HEADERS,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: text.trim() || `[DIAGNOSTIC FACTORY: Empty response from ${selectedModel}]` }),
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
