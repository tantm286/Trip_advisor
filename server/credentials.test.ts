import { describe, it, expect } from "vitest";

describe("API Credentials", () => {
  it("should have SUPABASE_URL and SUPABASE_ANON_KEY set", () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.SUPABASE_URL).toMatch(/^https:\/\//);
  });

  it("should have GEMINI_API_KEY set", () => {
    expect(process.env.GEMINI_API_KEY).toBeDefined();
    expect(process.env.GEMINI_API_KEY).toHaveLength(39); // Standard Gemini key length
  });

  it("should be able to connect to Supabase", async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not set");
    }

    // Test basic Supabase connectivity by checking if we can reach the API
    const response = await fetch(`${supabaseUrl}/rest/v1/locations?limit=1`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    // Should get a 200 or 206 (partial content) response
    expect([200, 206]).toContain(response.status);
  });

  it("should be able to call Gemini API", async () => {
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      throw new Error("Gemini API key not set");
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        geminiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Say hello in Vietnamese",
                },
              ],
            },
          ],
        }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.candidates).toBeDefined();
  });
});
