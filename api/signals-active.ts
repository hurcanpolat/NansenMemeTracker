import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Note: This is a simplified version for Vercel
    // In production, you'd connect to a hosted database (Turso, PlanetScale, etc.)
    res.status(200).json({
      success: true,
      data: [],
      message: 'SQLite not supported on Vercel serverless. Please use a hosted database.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch signals'
    });
  }
}
