const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Netlify Function: get-coaching
 * Securely communicates with Google Gemini to provide Diamond Coach responses.
 */
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

exports.handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers: CORS_HEADERS, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
    }

    // Authentication check: Verify user's Firebase Auth ID token
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        return { 
            statusCode: 401, 
            headers: CORS_HEADERS, 
            body: JSON.stringify({ error: "Unauthorized: Missing or invalid token format" }) 
        };
    }

    const idToken = authHeader.substring(7);
    try {
        const firebaseWebApiKey = process.env.FIREBASE_WEB_API_KEY || "AIzaSyB3vzQe54l3ajY2LrwF_ZlwImxvhKwvLLw";
        if (!firebaseWebApiKey) {
            // If FIREBASE_WEB_API_KEY not set, fall through (dev mode)
            console.warn("[Auth]: FIREBASE_WEB_API_KEY not set — skipping token verification.");
        } else {
            const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseWebApiKey}`;
            const verifyRes = await fetch(verifyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken })
            });

            if (!verifyRes.ok) {
                return {
                    statusCode: 401,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: "Unauthorized: Invalid or expired session" })
                };
            }

            const verifyData = await verifyRes.json();
            if (!verifyData.users || verifyData.users.length === 0) {
                return {
                    statusCode: 401,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: "Unauthorized: User account not found" })
                };
            }
        }
    } catch (authError) {
        console.error("[Auth Check Critical Error]:", authError);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: "Internal Server Error during auth check", details: authError.message }),
        };
    }

    try {
        const { systemPrompt, userContext, userMessage } = JSON.parse(event.body);

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not configured.");
        }

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

        // Direct REST approach overrides SDK version incompatibilities and 404 routing bugs
        const modelsToTry = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-pro'];
        const apiVersions = ['v1', 'v1beta'];
        
        let successData = null;
        let lastErrorDetails = "";
        let successfulModel = "";

        for (const model of modelsToTry) {
            if (successData) break;
            
            for (const api of apiVersions) {
                const url = `https://generativelanguage.googleapis.com/${api}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                            generationConfig: {
                                maxOutputTokens: 3000,
                                temperature: 0.8
                            }
                        })
                    });
                    
                    const data = await res.json();
                    
                    if (res.ok && data.candidates && data.candidates.length > 0) {
                        successData = data;
                        successfulModel = `${api}/${model}`;
                        break;
                    } else if (data.error) {
                        lastErrorDetails = `[${api}/${model}]: ${data.error.message}`;
                    }
                } catch (e) {
                    lastErrorDetails = `Fetch failed for ${model}: ${e.message}`;
                }
            }
        }

        if (!successData) {
            throw new Error(`All stable models rejected the request. Last API response: ${lastErrorDetails}`);
        }

        const rawText = successData.candidates[0]?.content?.parts?.[0]?.text || "";

        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            body: JSON.stringify({ text: rawText.trim() }),
        };
    } catch (error) {
        console.error("[Diamond Coach Critical Error]:", error);
        return {
            statusCode: 500,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            body: JSON.stringify({ 
                error: "The Diamond Coach is currently off the grid.",
                details: error.message 
            }),
        };
    }
};
