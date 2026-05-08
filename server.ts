import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Telegraf } from 'telegraf';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, limit } from 'firebase/firestore';
import fs from 'fs';
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });
try {
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads', { recursive: true });
  }
} catch (err) {
  console.error('Failed to create uploads directory:', err);
}

let firebaseConfig = {};
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.warn('firebase-applet-config.json not found in', configPath);
  }
} catch (err) {
  console.error('Failed to load firebase-applet-config.json:', err);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Presidential Server: Starting initialization sequence...');
console.log('Environment:', process.env.NODE_ENV);

// Initialize Firebase Client SDK for backend (to bypass ADC project mismatch)
let db: any = null;
if ((firebaseConfig as any).projectId) {
  try {
    const clientApp = initializeClientApp(firebaseConfig);
    db = getClientFirestore(clientApp, (firebaseConfig as any).firestoreDatabaseId || '(default)');
    console.log(`Firebase Backend initialized for project: ${(firebaseConfig as any).projectId}`);
  } catch (err) {
    console.error('CRITICAL: Failed to initialize Firebase Backend:', err);
  }
} else {
  console.error('CRITICAL: Firebase projectId is missing from configuration. API functionality will be limited.');
}

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize Telegram Bot
let bot: Telegraf | null = null;
let isBotLaunching = false;

async function stopBot() {
  if (bot) {
    console.log('Stopping Telegram bot...');
    try {
      await bot.stop();
      bot = null;
    } catch (err) {
      console.error('Error stopping bot:', err);
    }
  }
}

function getBot() {
  if (isBotLaunching) return bot;
  
  if (!bot) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('TELEGRAM_BOT_TOKEN is not set. Telegram bot will not be active.');
      }
      return null;
    }
    
    isBotLaunching = true;
    const newBot = new Telegraf(token);
    setupBot(newBot);
    
    // Proactively delete any existing webhook to ensure long-polling can start
    newBot.telegram.deleteWebhook().then(async () => {
      console.log('Telegram: Webhook deleted successfully');
      
      // Add a small delay to avoid race conditions with previous instances
      await delay(2000);
      
      let retryCount = 0;
      const maxRetries = 3;
      
      const attemptLaunch = async () => {
        try {
          await newBot.launch();
          console.log('Telegram bot launched successfully');
          isBotLaunching = false;
        } catch (err: any) {
          const errorCode = err.response?.error_code || err.code || err.error_code;
          if (errorCode === 409 && retryCount < maxRetries) {
            retryCount++;
            console.warn(`Telegram conflict (409). Retrying in 3s... (Attempt ${retryCount}/${maxRetries})`);
            await delay(3000);
            return attemptLaunch();
          }
          console.error('Failed to launch Telegram bot after retries:', err);
          isBotLaunching = false;
          bot = null;
        }
      };

      return attemptLaunch();
    }).catch(err => {
      console.error('Critical failure in Telegram bot initialization sequence:', err);
      isBotLaunching = false;
      bot = null; 
    });
    
    bot = newBot;
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

  app.use(cors());
  app.use(express.json());

  // Basic root health check
  app.get('/ping', (req, res) => res.send('pong'));

  // Log all incoming requests for debugging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Health Check
  app.get('/api/health', async (req, res) => {
    console.log('Health check requested');
    let dbStatus = 'unknown';
    try {
      if (db) {
        await getDocs(query(collection(db, 'users'), limit(1)));
        dbStatus = 'connected';
      } else {
        dbStatus = 'not_initialized';
      }
    } catch (e: any) {
      dbStatus = `error: ${e.message}`;
    }
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus,
      projectId: (firebaseConfig as any).projectId || 'missing'
    });
  });

  // Global error handler for API routes
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error(`API Error on ${req.method} ${req.url}:`, err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
  });

  // 3. Broadcast API Endpoint
  app.post('/api/admin/broadcast', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req: any, res) => {
    const { message, imageUrl, videoUrl, button } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const botInstance = getBot();

    if (!botInstance) {
      return res.status(500).json({ success: false, error: 'Telegram bot is not configured' });
    }

    if (!message && !files?.image?.[0] && !files?.video?.[0]) {
      return res.status(400).json({ success: false, error: 'Message content or media is required' });
    }

    const broadcastId = `br_${Date.now()}`;
    const broadcastType = files?.video?.[0] || videoUrl ? 'video' : (files?.image?.[0] || imageUrl ? 'image' : 'text');

    try {
      const snapshot = await getDocs(query(collection(db, 'users'), where('source', '==', 'telegram')));
      const users = snapshot.docs.map(doc => doc.data());
      
      let successCount = 0;
      let failCount = 0;

      // Save Initial Broadcast record
      await setDoc(doc(db, 'broadcasts', broadcastId), {
        id: broadcastId,
        message: message || '',
        type: broadcastType,
        timestamp: new Date().toISOString(),
        stats: { total: users.length, delivered: 0, failed: 0 }
      });

      for (const user of users) {
        const chatId = user.chat_id;
        try {
          const extra: any = {};
          if (button?.text && button?.url) {
            extra.reply_markup = {
              inline_keyboard: [[{ text: button.text, url: button.url }]]
            };
          }

          let sentMsg: any;
          // Priority: Local File Video > Video URL > Local File Photo > Photo URL > Text
          if (files?.video?.[0]) {
            sentMsg = await botInstance.telegram.sendVideo(chatId, { source: files.video[0].path }, { caption: message, ...extra });
          } else if (videoUrl) {
            sentMsg = await botInstance.telegram.sendVideo(chatId, videoUrl, { caption: message, ...extra });
          } else if (files?.image?.[0]) {
            sentMsg = await botInstance.telegram.sendPhoto(chatId, { source: files.image[0].path }, { caption: message, ...extra });
          } else if (imageUrl) {
            sentMsg = await botInstance.telegram.sendPhoto(chatId, imageUrl, { caption: message, ...extra });
          } else {
            sentMsg = await botInstance.telegram.sendMessage(chatId, message, extra);
          }

          if (sentMsg) {
            // Log message ID for possibility of recall
            await setDoc(doc(db, 'broadcasts', broadcastId, 'messages', chatId), {
              chatId,
              messageId: sentMsg.message_id
            });
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to broadcast to ${chatId}:`, err);
          failCount++;
        }
        await delay(50);
      }

      // Update final stats
      await setDoc(doc(db, 'broadcasts', broadcastId), {
        stats: { total: users.length, delivered: successCount, failed: failCount }
      }, { merge: true });

      // Cleanup files
      if (files?.image?.[0]) try { fs.unlinkSync(files.image[0].path); } catch(e) {}
      if (files?.video?.[0]) try { fs.unlinkSync(files.video[0].path); } catch(e) {}

      res.json({
        success: true,
        broadcastId,
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

  // 4. API to see broadcast history
  app.get('/api/admin/broadcasts', async (req, res) => {
    console.log('GET /api/admin/broadcasts request received');
    try {
      if (!db) {
        console.error('Database not initialized for broadcasts');
        return res.status(500).json({ success: false, error: 'Database not initialized' });
      }
      const snapshot = await getDocs(query(collection(db, 'broadcasts'), limit(20)));
      const broadcasts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Robust sorting
      broadcasts.sort((a: any, b: any) => {
        const tA = a.timestamp || '';
        const tB = b.timestamp || '';
        return tB.localeCompare(tA);
      });

      res.json({ success: true, broadcasts });
    } catch (e: any) {
      console.error('Error in /api/admin/broadcasts:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 4b. API to see admin stats
  app.get('/api/admin/stats', async (req, res) => {
    console.log('GET /api/admin/stats request received');
    try {
      if (!db) {
        return res.status(500).json({ success: false, error: 'Database not initialized' });
      }
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

  // 5. API to delete/recall a broadcast
  app.delete('/api/admin/broadcast/:id', async (req, res) => {
    const broadcastId = req.params.id;
    const botInstance = getBot();
    if (!botInstance) return res.status(500).json({ success: false, error: 'Bot not ready' });

    try {
      const messagesSnap = await getDocs(collection(db, 'broadcasts', broadcastId, 'messages'));
      const messages = messagesSnap.docs.map(doc => doc.data());
      
      let deletedCount = 0;
      for (const msg of messages) {
        try {
          await botInstance.telegram.deleteMessage(msg.chatId, msg.messageId);
          deletedCount++;
        } catch (e) {
          console.error(`Failed to delete message in ${msg.chatId}:`, e);
        }
        await delay(20);
      }

      // Mark broadcast as recalled/deleted in DB instead of actually deleting the record
      await setDoc(doc(db, 'broadcasts', broadcastId), { recalled: true, recalledAt: new Date().toISOString() }, { merge: true });

      res.json({ success: true, deletedCount });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Mock endpoint for Exon Stars
  app.post('/api/stars/transaction', (req, res) => {
    const { userId, amount, type, description } = req.body;
    console.log(`[STARS] Transaction for ${userId}: ${type} ${amount} - ${description}`);
    res.json({ success: true, message: 'Transaction authorized by Presidential treasury' });
  });

  // Catch-all for API 404
  app.use('/api/*', (req, res) => {
    console.warn(`404 at API route: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, error: 'API route not found' });
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

  // Start the bot and other async services AFTER the server is listening
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Presidential Server active on http://localhost:${PORT}`);
    
    // Initialize Bot and DB connectivity checks in the background
    try {
      getBot();
      process.nextTick(async () => {
        if (db) {
          try {
            const snap = await getDocs(query(collection(db, 'users'), where('source', '==', 'telegram'), limit(1)));
            console.log('Successfully connected to Firestore. Total users observed:', snap.size);
          } catch (err: any) {
            console.error('Initial Firestore connectivity check failed:', err.message);
          }
        }
      });
    } catch (err) {
      console.error('Failed to initialize background services:', err);
    }
  });

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down Presidential server...`);
    
    // Set a timeout for the entire shutdown process
    const shutdownTimeout = setTimeout(() => {
      console.error('Shutdown timed out, forcing exit.');
      process.exit(1);
    }, 10000);

    try {
      await stopBot();
      console.log('Bot stopped. Closing server...');
      
      server.close(() => {
        clearTimeout(shutdownTimeout);
        console.log('Server closed gracefully. Exit.');
        process.exit(0);
      });
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch(err => {
  console.error('FATAL ERROR STARTING PRESIDENTIAL SERVER:', err);
  process.exit(1);
});
