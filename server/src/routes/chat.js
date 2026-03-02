import { Router } from 'express';

const router = Router();

let anthropic;
async function getClient() {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'your-api-key-here' && apiKey.startsWith('sk-');
    if (!hasValidKey) return null;
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

function isKeyConfigured() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return apiKey && apiKey !== 'your-api-key-here' && apiKey.startsWith('sk-');
}

function buildSystemPrompt(portfolio) {
  let portfolioSection;

  if (portfolio && portfolio.length > 0) {
    const lines = portfolio.map(
      (s) => `- $${s.symbol} (${s.name}): ${s.shares} shares, bought at $${s.buyPrice}`
    );
    portfolioSection = `Carl's current portfolio:\n${lines.join('\n')}`;
  } else {
    portfolioSection = 'Carl has not added any stocks to his portfolio yet.';
  }

  return `You are CarlBot, an AI stock portfolio assistant. You help Carl manage and analyze his stock investments.

${portfolioSection}

Guidelines:
- Reference Carl's specific holdings when relevant
- Format ticker symbols as $SYMBOL (e.g., $AAPL)
- When discussing gains/losses, calculate based on his buy prices above
- Provide balanced, nuanced analysis - never guarantee outcomes
- Be conversational but knowledgeable
- Keep responses concise (2-4 paragraphs max unless asked for detail)
- If asked about stocks not in the portfolio, still provide analysis
- You can suggest portfolio diversification ideas when asked
- End portfolio-related advice with a brief disclaimer that this is for informational purposes, not financial advice`;
}

router.post('/', async (req, res, next) => {
  try {
    const { message, portfolio, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!isKeyConfigured()) {
      return res.status(503).json({
        error: 'API_KEY_MISSING',
        reply:
          "I'm not connected yet! To activate me, add your Anthropic API key to `server/.env`:\n\n```\nANTHROPIC_API_KEY=sk-ant-your-key-here\n```\n\nThen restart the server. You can get a key at [console.anthropic.com](https://console.anthropic.com).",
      });
    }

    const client = await getClient();
    if (!client) {
      return res.status(503).json({
        error: 'API_KEY_MISSING',
        reply: "Failed to initialize the AI client. Please check your API key in `server/.env`.",
      });
    }

    const messages = [];
    if (history && history.length > 0) {
      for (const msg of history) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: 'user', content: message });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: buildSystemPrompt(portfolio),
      messages,
    });

    const reply = response.content[0].text;
    res.json({ reply });
  } catch (err) {
    if (err.status === 401) {
      return res.json({
        reply: "My API key seems to be invalid. Please check the `ANTHROPIC_API_KEY` in `server/.env` and make sure it's correct, then restart the server.",
      });
    }
    const errMsg = err.message || '';
    if (errMsg.includes('credit balance is too low') || err.status === 400) {
      return res.json({
        reply: "Your Anthropic account needs credits to use the API. Go to [console.anthropic.com/settings/billing](https://console.anthropic.com/settings/billing) to add credits or upgrade your plan, then try again!",
      });
    }
    next(err);
  }
});

export default router;
