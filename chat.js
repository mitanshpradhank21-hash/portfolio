// Vercel Serverless Function: POST /api/chat
// Same Groq API (OpenAI-compatible /chat/completions),
// but the key lives ONLY in Vercel Environment Variables (GROQ_API_KEY) — never in the repo.
const P = require("../data.js");

const BASE_URL = (process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

function buildContext() {
  const projects = P.projects
    .map((p, i) => {
      const live = p.live ? ` Live: ${p.live}.` : "";
      return `${i + 1}. ${p.title} — ${p.description} Technologies: ${p.tech.join(", ")}. Details: ${p.details} GitHub: https://github.com/${P.github}/${p.repo}.${live}`;
    })
    .join("\n");
  const skills = Object.entries(P.skills).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ");
  return [
    `You are the AI assistant on ${P.name}'s personal portfolio website. Answer visitors' questions using ONLY the information below.`,
    `If something is not in the information, say you don't have that detail and suggest contacting ${P.name}. Never invent facts or personal information. Keep answers short (under 80 words). Reply in the language the visitor uses (English or Hinglish).`,
    `NAME: ${P.name}. ${P.intro}`,
    `ABOUT: ${P.about.join(" ")}`,
    `EDUCATION: ${P.education.map((e) => `${e.title}, ${e.place} (${e.period})`).join("; ")}`,
    `SKILLS: ${skills}`,
    `PROJECTS:\n${projects}`,
    `CONTACT: Email ${P.email}. GitHub https://github.com/${P.github}. Location ${P.location}.${P.linkedin ? " LinkedIn " + P.linkedin + "." : ""}`,
  ].join("\n\n");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) return res.status(500).json({ error: "Server is missing GROQ_API_KEY" });

  let body = req.body;
  try {
    if (typeof body === "string") body = JSON.parse(body || "{}");
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  body = body || {};

  const message = String(body.message || "").slice(0, 500).trim();
  if (!message) return res.status(400).json({ error: "Empty message" });

  const history = (Array.isArray(body.history) ? body.history.slice(-6) : [])
    .filter((h) => h && (h.role === "user" || h.role === "model" || h.role === "assistant") && typeof h.text === "string")
    .map((h) => ({ role: h.role === "user" ? "user" : "assistant", content: h.text.slice(0, 1000) }));

  const messages = [{ role: "system", content: buildContext() }, ...history, { role: "user", content: message }];

  try {
    const r = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        reasoning_effort: "low",
        max_completion_tokens: 800,
        messages,
      }),
    });
    if (r.status === 429) return res.status(429).json({ error: "Too many requests. Please wait and try again." });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("Groq error:", r.status, JSON.stringify(data));
      return res.status(502).json({ error: data.error?.message || "Upstream API error" });
    }
    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return res.status(502).json({ error: "Empty response from model" });
    return res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to reach the AI service" });
  }
};
