export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to send a chatbot question." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Chatbot setup is incomplete: add GROQ_API_KEY in Vercel Project Settings > Environment Variables, then redeploy."
    });
  }

  const question = typeof req.body?.question === "string"
    ? req.body.question.trim()
    : "";

  if (!question) {
    return res.status(400).json({ error: "Please type a question first." });
  }

  if (question.length > 1000) {
    return res.status(400).json({ error: "Please keep your question under 1000 characters." });
  }

  const portfolioContext = `
You are the AI assistant on Mitansh Pradhan's personal portfolio website.
Answer visitor questions helpfully, clearly, and concisely, using only the portfolio facts below.
If the portfolio does not contain the answer, say that you do not have that detail and suggest contacting Mitansh. Do not invent accomplishments, skills, project features, or personal facts.
If asked unrelated questions, politely bring the conversation back to Mitansh's portfolio.

PROFILE
- Name: Mitansh Pradhan
- Education: B.Tech in Computer Science and Engineering, specialization in Artificial Intelligence and Machine Learning.
- Current year: Second year.
- University: JECRC University, Jaipur.
- Skills listed: Python, HTML, CSS, JavaScript, Git and GitHub, Cursor AI; AI and Machine Learning (learning).
- Interests: building programs and web applications; learning AI and ML.

PROJECTS
1. Python Programs Collection:
   - Python programs include Factorial, Fibonacci, and Structure-to-Dictionary conversion.
   - Repository: https://github.com/mitanshpradhank21-hash/pythonbasic-25bcon2074
   - Additional Python basics repository: https://github.com/mitanshpradhank21-hash/pythonbasic3-25bcon2074
2. Messy Python Code Improvement:
   - A Python script cleaned up for readability and structure with AI assistance.
   - Repository: https://github.com/mitanshpradhank21-hash/pythonbasic2-25bcon2074
3. Bug Fixing Using Cursor AI:
   - A Python debugging project focused on identifying and correcting an error with Cursor AI. The exact bug details are not specified in the portfolio.
   - Repository: https://github.com/mitanshpradhank21-hash/buggyfix-25bcon2074
4. Interactive Quiz Application:
   - A five-question "Code With AI" quiz that tracks the score and displays the final result.
   - Repository: https://github.com/mitanshpradhank21-hash/Quiz-25bcon2074
   - Live app: https://quiz-ten-puce.vercel.app/
5. Book Reading List Application:
   - An app to add and track books.
   - Repository: https://github.com/mitanshpradhank21-hash/readinglist-25bcon2074
   - Live app: https://reading-list-lake.vercel.app/

CONTACT
- GitHub: https://github.com/mitanshpradhank21-hash
- LinkedIn: https://www.linkedin.com/in/mitansh-pradhan-4136b4380
- Email: mitanshpradhank21@gmail.com
- Location listed on portfolio: Jaipur, India
`;

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: portfolioContext },
          { role: "user", content: question }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const result = await groqResponse.json().catch(() => ({}));

    if (!groqResponse.ok) {
      console.error("Groq API error:", groqResponse.status, result?.error?.message || "Unknown error");
      return res.status(502).json({
        error: "The AI service could not answer right now. Please check the Groq API key/model settings and try again."
      });
    }

    const answer = result?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({ error: "The AI service returned an empty answer. Please try again." });
    }

    return res.status(200).json({ answer: answer.trim() });
  } catch (error) {
    console.error("Chatbot request failed:", error);
    return res.status(500).json({
      error: "A server error occurred while contacting the AI service. Please try again later."
    });
  }
}
