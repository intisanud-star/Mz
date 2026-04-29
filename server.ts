import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Telegraf } from 'telegraf';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Client SDK for backend (to bypass ADC project mismatch)
const clientApp = initializeClientApp(firebaseConfig);
const db = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId || '(default)');

// Basic DB Connectivity Check
getDocs(query(collection(db, 'users'), where('source', '==', 'telegram'), limit(1)))
  .then((snap) => {
    console.log('Successfully connected to Firestore (Client SDK). Total users observed:', snap.size);
  })
  .catch(err => {
    console.error('Firestore connection error (Client SDK):', err.message);
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
      // Use chat_id as the document ID for direct lookup
      const userDocRef = doc(db, 'users', `tg_${chatId}`);
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        // If new, save their data
        await setDoc(userDocRef, {
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

  // Handle media received
  botInstance.on('photo', async (ctx) => {
    const username = ctx.from.username || ctx.from.first_name || 'Anonymous';
    await ctx.reply(`I received your photo, ${username}! It has been archived in the Exona vault.`);
  });

  botInstance.on('video', async (ctx) => {
    const username = ctx.from.username || ctx.from.first_name || 'Anonymous';
    await ctx.reply(`Presidential alert: Video received from ${username}. Processing for broadcasting...`);
  });

  // Optional: Bot command for admin stats
  botInstance.command('stats', async (ctx) => {
    try {
      const snapshot = await getDocs(query(collection(db, 'users'), where('source', '==', 'telegram')));
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
      await getDocs(query(collection(db, 'users'), limit(1)));
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
      const snapshot = await getDocs(query(collection(db, 'users'), where('source', '==', 'telegram')));
      const totalCount = snapshot.size;
      
      res.json({
        success: true,
        communitySize: totalCount,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
  });

  // 3. Broadcast API Endpoint
  app.post('/api/admin/broadcast', async (req, res) => {
    const { message, imageUrl, videoUrl, button } = req.body;
    const botInstance = getBot();

    if (!botInstance) {
      return res.status(500).json({ success: false, error: 'Telegram bot is not configured' });
    }

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    try {
      const snapshot = await getDocs(query(collection(db, 'users'), where('source', '==', 'telegram')));
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

          if (videoUrl) {
            await botInstance.telegram.sendVideo(chatId, videoUrl, { caption: message, ...extra });
          } else if (imageUrl) {
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
