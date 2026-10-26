const P = require("../data.js");

const BASE_URL = (
  process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1"
).replace(/\/$/, "");

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

function buildContext() {
  const projects = (P.projects || [])
    .map((p, i) => {
      const tech = Array.isArray(p.tech) ? p.tech.join(", ") : "Not specified";
      const details = p.details || "No additional details available";
      const repo = p.repo
        ? `https://github.com/${P.github}/${p.repo}`
        : "Not provided";

      return `${i + 1}. ${p.title}
Description: ${p.description}
Technologies: ${tech}
Details: ${details}
GitHub: ${repo}
Live URL: ${p.live || "Not provided"}`;
    })
    .join("\n\n");

  const skills = Object.entries(P.skills || {})
    .map(([category, items]) =>
      `${category}: ${Array.isArray(items) ? items.join(", ") : items}`
    )
    .join("\n");

  return `
You are the AI assistant on ${P.name}'s personal portfolio.

Answer questions using only the portfolio information below.
Never invent personal details, skills, achievements, or project features.
If information is missing, politely say you do not have that detail.
Keep answers concise and reply in the language the visitor uses,
including English or Hinglish.

NAME: ${P.name}
INTRO: ${P.intro || ""}
ABOUT: ${(P.about || []).join(" ")}

EDUCATION:
${(P.education || [])
  .map(e => `${e.title}, ${e.place} (${e.period})`)
  .join("\n")}

SKILLS:
${skills}

PROJECTS:
${projects}

CONTACT:
Email: ${P.email || "Not provided"}
GitHub: https://github.com/${P.github}
Location: ${P.location || "Not provided"}
LinkedIn: ${P.linkedin || "Not provided"}
`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed. Please use POST."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is missing in Vercel Environment Variables."
    });
  }

  let body = req.body || {};

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON request." });
    }
  }

  // Accept both common frontend field names.
  const message = String(body.message || body.question || "")
    .trim()
    .slice(0, 500);

  if (!message) {
    return res.status(400).json({
      error: "Please enter a question."
    });
  }

  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-6)
    .filter(h =>
      h &&
      ["user", "assistant", "model"].includes(h.role) &&
      typeof (h.text || h.content) === "string"
    )
    .map(h => ({
      role: h.role === "user" ? "user" : "assistant",
      content: String(h.text || h.content).slice(0, 1000)
    }));

  const messages = [
    { role: "system", content: buildContext() },
    ...history,
    { role: "user", content: message }
  ];

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        max_completion_tokens: 800
      })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "Groq API error:",
        response.status,
        result.error?.message || "Unknown API error"
      );

      if (response.status === 429) {
        return res.status(429).json({
          error: "Groq rate limit reached. Please wait and try again."
        });
      }

      return res.status(502).json({
        error: "Groq API request failed. Check the server logs and API settings."
      });
    }

    const reply = result.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(502).json({
        error: "Groq returned an empty response."
      });
    }

    // Return both names to support either frontend response format.
    return res.status(200).json({
      reply: reply.trim(),
      answer: reply.trim()
    });

  } catch (error) {
    console.error("Chat API request failed:", error.message);

    return res.status(500).json({
      error: "Unable to connect to the AI service. Please try again."
    });
  }
};
