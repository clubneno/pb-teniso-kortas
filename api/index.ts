// Minimal test - let Vercel compile this directly
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ 
    message: 'Hello from Vercel serverless!',
    timestamp: new Date().toISOString(),
    url: req.url
  });
}
