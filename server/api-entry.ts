// Minimal test - no dependencies
export default async function handler(req: any, res: any) {
  res.status(200).json({ 
    message: 'Hello from serverless!',
    timestamp: new Date().toISOString(),
    url: req.url
  });
}
