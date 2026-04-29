import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Telegraf } from 'telegraf';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let adminApp;
try {
  if (getApps().length === 0) {
    // Attempting zero-config initialization (leverages ADC on Cloud Run)
    adminApp = initializeApp();
    console.log('Firebase Admin initialized with zero-config (ADC)');
  } else {
    adminApp = getApp();
  }
} catch (e: any) {
  console.log('Zero-config initialization failed, falling back to JSON config:', e.message);
  try {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('Firebase Admin initialized with JSON config project:', firebaseConfig.projectId);
  } catch (e2: any) {
    console.error('Fatal error initializing Firebase Admin:', e2.message);
  }
}

// Correct way to initialize a specific database instance in admin SDK
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId || '(default)');

// Basic DB Connectivity Check - using a simpler check
db.collection('users').limit(1).get()
  .then(() => {
    console.log('Successfully connected to Firestore with database ID:', firebaseConfig.firestoreDatabaseId);
  })
  .catch(err => {
    console.error('Firestore connection error:', err.message);
    console.log('Details: Database ID:', firebaseConfig.firestoreDatabaseId, 'Project ID:', firebaseConfig.projectId);
    
    // Fallback attempt to default database if named one fails
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
      console.log('Trying fallback to (default) database...');
      const defaultDb = getFirestore(adminApp);
      defaultDb.collection('users').limit(1).get()
        .then(() => console.log('Successfully connected to (default) database instead.'))
        .catch(e => console.error('Default database fallback also failed:', e.message));
    }
  });

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize Telegram Bot
let bot: Telegraf | null = null;

function getBot() {
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram bot will not be active.');
      return null;
    }
    bot = new Telegraf(token);
    setupBot(bot);
    bot.launch().then(() => {
      console.log('Telegram bot launched successfully');
    }).catch(err => {
      console.error('Failed to launch Telegram bot:', err);
    });
  }
  return bot;
}

function setupBot(botInstance: Telegraf) {
  // 1. Function that triggers on /start
  botInstance.start(async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const username = ctx.from.username || ctx.from.first_name || 'Anonymous';
    
    console.log(`Received /start from ${username} (${chatId})`);
    
    try {
      // Use chat_id as the document ID for direct lookup (more efficient than where query)
      const userRef = db.collection('users').doc(`tg_${chatId}`);
      const docSnap = await userRef.get();

      if (!docSnap.exists) {
        // If new, save their data
        await userRef.set({
          uid: `tg_${chatId}`,
          chat_id: chatId,
          username: username,
          displayName: username,
          email: `${chatId}@telegram.bot`,
          join_date: new Date().toISOString(),
          source: 'telegram'
        });
        await ctx.reply(`Welcome to Exona! Your account has been registered with chat ID: ${chatId}`);
        console.log(`New user registered: ${username} (${chatId})`);
      } else {
        await ctx.reply(`Welcome back, ${username}!`);
        console.log(`User returned: ${username} (${chatId})`);
      }
    } catch (error: any) {
      console.error('Error in Telegram /start command:', error);
      const errorMsg = error.message || String(error);
      const errorCode = error.code || 'N/A';
      
      // Detailed error for the user to help debug
      await ctx.reply(`System Error: ${errorMsg}\nCode: ${errorCode}\nPlease ensure your Firebase project is properly configured.`);
    }
  });

  // Optional: Bot command for admin stats
  botInstance.command('stats', async (ctx) => {
    // Basic security: only allows specific usernames or IDs if desired
    // For now, let's just implement the requested logic
    try {
      const snapshot = await db.collection('users').get();
      const count = snapshot.size;
      await ctx.reply(`Total community size: ${count} users.`);
    } catch (error) {
      console.error('Error fetching stats via bot:', error);
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'unknown';
    try {
      await db.listCollections();
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = `error: ${e.message}`;
    }
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  });

  // 2. Admin function to see total community size (API Endpoint)
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.get();
      const totalCount = snapshot.size;
      
      res.json({
        success: true,
        communitySize: totalCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

  // 3. Broadcast API Endpoint
  app.post('/api/admin/broadcast', async (req, res) => {
    const { message, imageUrl, button } = req.body;
    const botInstance = getBot();

    if (!botInstance) {
      return res.status(500).json({ success: false, error: 'Telegram bot is not configured' });
    }

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    try {
      const usersRef = db.collection('users');
      const snapshot = await usersRef.where('chat_id', '!=', null).get();
      const users = snapshot.docs.map(doc => doc.data());
      
      let successCount = 0;
      let failCount = 0;

      for (const user of users) {
        const chatId = user.chat_id;
        try {
          const extra: any = {};
          if (button?.text && button?.url) {
            extra.reply_markup = {
              inline_keyboard: [[{ text: button.text, url: button.url }]]
            };
          }

          if (imageUrl) {
            await botInstance.telegram.sendPhoto(chatId, imageUrl, { caption: message, ...extra });
          } else {
            await botInstance.telegram.sendMessage(chatId, message, extra);
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to broadcast to ${chatId}:`, err);
          failCount++;
        }
        // Mandatory delay to avoid rate limiting
        await delay(50);
      }

      res.json({
        success: true,
        stats: {
          total: users.length,
          delivered: successCount,
          failed: failCount
        }
      });
    } catch (error) {
      console.error('Broadcast error:', error);
      res.status(500).json({ success: false, error: 'Broadcast failed' });
    }
  });

  // Mock endpoint for Exon Stars
  app.post('/api/stars/transaction', (req, res) => {
    const { userId, amount, type, description } = req.body;
    console.log(`[STARS] Transaction for ${userId}: ${type} ${amount} - ${description}`);
    res.json({ success: true, message: 'Transaction authorized by Presidential treasury' });
  });

  // Start the bot
  getBot();

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
