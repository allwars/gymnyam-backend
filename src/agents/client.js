const OpenAI = require('openai');

const groq = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
});

const MODEL = 'llama-3.3-70b-versatile';

function extractJson(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = match ? match[1].trim() : text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.search(/[\[{]/);
    const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {}
    }
    throw new Error('La IA devolvio una respuesta en formato no valido. Intenta de nuevo.');
  }
}

async function chat(systemPrompt, userPrompt, maxTokens = 2000) {
  const resp = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  });
  const text = resp.choices[0]?.message?.content || '';
  return extractJson(text);
}

module.exports = { chat, extractJson };
