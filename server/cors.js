const ALLOWED = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED.includes('*')) return true;
  return ALLOWED.includes(origin);
}

export function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin || !isOriginAllowed(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}