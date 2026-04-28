import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mock endpoint for Exon Stars (In a real app, this would use Firebase Admin SDK)
  app.post('/api/stars/transaction', (req, res) => {
    const { userId, amount, type, description } = req.body;
    console.log(`[STARS] Transaction for ${userId}: ${type} ${amount} - ${description}`);
    // Since we don't have Admin SDK configured here, we'll return success 
    // and let the client know they can proceed with their client-side transaction for demo purposes.
    res.json({ success: true, message: 'Transaction authorized by Presidential treasury' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Presidential Server active on http://localhost:${PORT}`);
  });
}

startServer();
