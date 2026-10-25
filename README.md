# Mitansh Pradhan Portfolio (Groq AI Chatbot)

## Files
- `index.html`, `style.css`, `script.js`: portfolio frontend
- `api/chat.js`: Vercel serverless API route that calls Groq without exposing the secret key
- `profile.jpg.jpeg`: profile image

## Deploy on Vercel
1. Upload all files and the `api` folder to the root of a GitHub repository.
2. Import that repository in Vercel.
3. In Vercel, open Project Settings → Environment Variables.
4. Add `GROQ_API_KEY` with your secret key from https://console.groq.com/keys.
5. Optionally add `GROQ_MODEL` with `openai/gpt-oss-20b` (the default used by this project).
6. Save and redeploy.

Do not put your real API key in HTML, frontend JavaScript, or a public GitHub repository.
The API endpoint is `/api/chat`. It answers using the portfolio facts embedded in `api/chat.js`.

## Local note
Opening `index.html` directly from the file system will not run the `/api/chat` serverless function. Test the live deployment on Vercel, or use the Vercel CLI for local development.
