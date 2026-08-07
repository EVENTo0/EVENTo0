export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  return res.status(configured ? 200 : 503).json({
    ok: configured,
    message: configured
      ? "ANTHROPIC_API_KEY is configured"
      : "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the server.",
  });
}
