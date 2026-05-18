import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Telegraf } from 'telegraf';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit, getCountFromServer, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';
import multer from 'multer';
import axios from 'axios';
import { GoogleGenAI, Type } from "@google/genai";

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

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

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
    newBot.telegram.deleteWebhook({ drop_pending_updates: true }).then(async () => {
      console.log('Telegram: Webhook deleted and updates dropped');
      
      // Add a delay to avoid race conditions with previous instances
      await delay(5000);
      
      let retryCount = 0;
      const maxRetries = 5;
      
      const attemptLaunch = async () => {
        try {
          await newBot.launch();
          console.log('Telegram bot launched successfully');
          isBotLaunching = false;
        } catch (err: any) {
          const errorCode = err.response?.error_code || err.code || err.error_code;
          const errorDesc = err.description || err.message || '';
          
          if ((errorCode === 409 || errorDesc.includes('Conflict')) && retryCount < maxRetries) {
            retryCount++;
            const backoff = retryCount * 5000;
            console.warn(`Telegram conflict (409). Retrying in ${backoff/1000}s... (Attempt ${retryCount}/${maxRetries})`);
            await delay(backoff);
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
    
    // Add global error handler to prevent crashing on runtime issues
    newBot.catch((err, ctx) => {
      console.error(`Telegraf error for ${ctx.updateType}:`, err);
    });

    bot = newBot;
  }
  return bot;
}

// Simple in-memory state store for Telegram users
const userStates = new Map<string, { mode?: 'scan_records' | 'scan_participation', extractedData?: any[], institutionId?: string }>();

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
        await ctx.reply(`Welcome to Exona! 🏛️\n\nYou can now manage your institution directly from here.\n\nCommands:\n/scan_records - Scan an image of financial records\n/scan_participation - Scan an attendance list\n/stats - Community stats`);
        console.log(`New user registered: ${username} (${chatId})`);
      } else {
        await ctx.reply(`Welcome back, ${username}! 🏛️\n\nCommands:\n/scan_records - Scan an image of financial records\n/scan_participation - Scan an attendance list\n/stats - View community stats`);
      }
    } catch (error: any) {
      console.error('Error in Telegram /start command:', error);
      await ctx.reply(`System Error encountered. Please ensure your project is properly configured.`);
    }
  });

  botInstance.command('scan_records', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    userStates.set(chatId, { mode: 'scan_records' });
    await ctx.reply('Record Scanning Mode Active 📄\n\nPlease send a clear photo of the financial list or records. I will extract the details and sync them to your institution.');
  });

  botInstance.command('scan_participation', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    userStates.set(chatId, { mode: 'scan_participation' });
    await ctx.reply('Participation Scanning Mode Active 📝\n\nPlease send a clear photo of the attendance or participation list. I will sync the entries for today.');
  });

  // Handle media received
  botInstance.on('photo', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const state = userStates.get(chatId);
    
    if (!state?.mode) {
      return ctx.reply('Please select a scan mode first:\n/scan_records - Scan financial records\n/scan_participation - Scan attendance lists');
    }

    const username = ctx.from.username || ctx.from.first_name || 'Anonymous';
    await ctx.reply(`Presidential AI Engine is analyzing your document... ⏳`);

    try {
      // Get photo file link
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      
      const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
      const imageBase64 = Buffer.from(response.data).toString('base64');
      const mimeType = 'image/jpeg'; // Telegram photos are usually JPEGs

      // Find user institution
      const userUid = `tg_${chatId}`;
      const schoolsSnap = await getDocs(query(collection(db, 'schools'), where('creatorUid', '==', userUid)));
      const placesSnap = await getDocs(query(collection(db, 'places'), where('creatorUid', '==', userUid)));
      
      const institution = schoolsSnap.docs[0]?.data() || placesSnap.docs[0]?.data();
      
      if (!institution) {
        return ctx.reply('⚠️ No institution found linked to your account. Please create one in the web dashboard first.');
      }

      let responseSchema: any;
      let promptText = "";

      if (state.mode === 'scan_records') {
        promptText = "Extract institutional member records from this image. Look for names, departments/units, categories (like 'fees', 'dues'), paid amounts, and balances. If details are missing, leave them null.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            extractedData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fullName: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  category: { type: Type.STRING },
                  paid: { type: Type.NUMBER },
                  balance: { type: Type.NUMBER },
                  parentNumber: { type: Type.STRING }
                },
                required: ["fullName"]
              }
            }
          }
        };
      } else {
        promptText = "Extract member participation/attendance from this image. Look for names, departments/units, and status (present, absent, or late). Default to 'present' if unclear.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            extractedData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  staffName: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  status: { 
                    type: Type.STRING, 
                    enum: ["present", "absent", "late"]
                  }
                },
                required: ["staffName", "status"]
              }
            }
          }
        };
      }

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType, data: imageBase64 } }] }],
        config: { responseMimeType: "application/json", responseSchema }
      });

      const extracted = JSON.parse(aiResponse.text || '{"extractedData": []}');
      const dataItems = extracted.extractedData || [];

      if (dataItems.length === 0) {
        return ctx.reply('❌ No valid records could be extracted from this image. Please ensure the text is clear and readable.');
      }

      // Instead of immediate sync, store data and ask for category
      userStates.set(chatId, { ...state, extractedData: dataItems, institutionId: institution.id });

      const categories = (institution.educationalLevels || []).slice(0, 8); // Max 8 buttons
      const buttons = categories.map((cat: string) => [{ text: cat, callback_data: `sync_cat:${cat}` }]);
      buttons.push([{ text: 'Use Default Categories', callback_data: 'sync_cat:default' }]);

      await ctx.reply(`🔍 Analysis Complete!\n\nI detected ${dataItems.length} entries.\n\nWhich department/category should I assign these to?`, {
        reply_markup: {
          inline_keyboard: buttons
        }
      });

    } catch (error: any) {
      console.error('Telegram AI Sync Error:', error);
      await ctx.reply(`❌ System failure during AI processing: ${error.message || 'Unknown error'}`);
    }
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

  // Handle category selection and sync
  botInstance.on('callback_query', async (ctx: any) => {
    const chatId = ctx.callbackQuery.message.chat.id.toString();
    const queryData = ctx.callbackQuery.data;
    if (!queryData?.startsWith('sync_cat:')) return;

    const state = userStates.get(chatId);
    if (!state?.extractedData || !state.institutionId) {
      return ctx.answerCbQuery('Session expired or invalid.');
    }

    const requestedCategory = queryData.split(':')[1];
    const finalCategory = requestedCategory === 'default' ? null : requestedCategory;
    const username = ctx.from.username || ctx.from.first_name || 'Anonymous';
    const userUid = `tg_${chatId}`;

    await ctx.answerCbQuery('Executing Institutional Sync...');
    await ctx.editMessageText('🔄 Syncing to Ledger... Please wait.');

    try {
      let addedCount = 0;
      let updatedCount = 0;

      // Fetch existing if records
      let existingRecords: any[] = [];
      if (state.mode === 'scan_records') {
        const recsSnap = await getDocs(query(collection(db, 'studentRecords'), where('schoolId', '==', state.institutionId)));
        existingRecords = recsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      for (const item of state.extractedData) {
        if (state.mode === 'scan_records') {
          const itemFullName = item.fullName;
          const existing = existingRecords.find((r: any) => 
            r.studentName?.toLowerCase() === itemFullName?.toLowerCase()
          );

          const recordData = {
            studentName: itemFullName,
            studentClass: finalCategory || item.unit || 'General',
            category: item.category || 'General',
            paid: item.paid || 0,
            balance: item.balance || 0,
            parentNumber: item.parentNumber || '',
            schoolId: state.institutionId,
            timestamp: serverTimestamp(),
            addedBy: username,
            addedByUid: userUid,
            type: 'general'
          };

          if (existing) {
            await updateDoc(doc(db, 'studentRecords', existing.id), {
              ...recordData,
              paid: (existing.paid || 0) + (item.paid || 0),
              balance: item.balance !== undefined ? item.balance : existing.balance
            });
            updatedCount++;
          } else {
            const newId = `tg_rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            await setDoc(doc(db, 'studentRecords', newId), { ...recordData, id: newId });
            addedCount++;
          }
        } else {
          // Participation
          const id = `tg_att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          await setDoc(doc(db, 'teacherAttendance', id), {
            id,
            teacherName: item.staffName,
            status: item.status || 'present',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            category: finalCategory || item.unit || 'General',
            schoolId: state.institutionId,
            addedBy: username,
            addedByUid: userUid,
            timestamp: serverTimestamp()
          });
          addedCount++;
        }
      }

      await ctx.editMessageText(`✅ Institutional Lead Sync Completed!\n\nCategory set to: ${finalCategory || 'System Default'}\nEntries Added: ${addedCount}\nEntries Updated: ${updatedCount}`);
      userStates.delete(chatId);

    } catch (error: any) {
      console.error('CB Sync Error:', error);
      await ctx.editMessageText(`❌ Sync failed: ${error.message}`);
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
        // Use count for minimal impact
        const coll = collection(db, 'users');
        const snapshot = await getCountFromServer(query(coll, limit(1)));
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

  // AI List Scanning Endpoint
  app.post('/api/ai/scan-list', upload.single('image'), async (req: any, res) => {
    try {
      const file = req.file;
      const { type } = req.body; // 'records' or 'participation'
      
      if (!file) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      const filePath = path.join(process.cwd(), file.path);
      const imageBase64 = fs.readFileSync(filePath, 'base64');

      let responseSchema: any;
      let promptText = "";

      if (type === 'records') {
        promptText = "Extract institutional member records from this image. Look for names, departments/units, categories (like 'fees', 'dues'), paid amounts, and balances. If details are missing, leave them null.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            extractedData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fullName: { type: Type.STRING, description: "Full name of the person" },
                  unit: { type: Type.STRING, description: "Department, class, or operational unit" },
                  category: { type: Type.STRING, description: "Type of payment or record category" },
                  paid: { type: Type.NUMBER, description: "Amount paid" },
                  balance: { type: Type.NUMBER, description: "Outstanding balance" },
                  parentNumber: { type: Type.STRING, description: "Any reference phone number if visible" }
                },
                required: ["fullName"]
              }
            }
          },
          required: ["extractedData"]
        };
      } else {
        promptText = "Extract member participation/attendance from this image. Look for names, departments/units, and status (present, absent, or late). If status is not clear, default to 'present'.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            extractedData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  staffName: { type: Type.STRING, description: "Full name of the person" },
                  unit: { type: Type.STRING, description: "Department, class, or operational unit" },
                  status: { 
                    type: Type.STRING, 
                    description: "Attendance status: present, absent, or late",
                    enum: ["present", "absent", "late"]
                  }
                },
                required: ["staffName", "status"]
              }
            }
          },
          required: ["extractedData"]
        };
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: file.mimetype,
                  data: imageBase64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });

      // Cleanup
      try { fs.unlinkSync(filePath); } catch(e) {}

      const extracted = JSON.parse(response.text || '{"extractedData": []}');
      res.json({ success: true, ...extracted });

    } catch (error: any) {
      console.error('Gemini Scanning Error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to analyze list' });
    }
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
      
      const coll = collection(db, 'users');
      const q = query(coll, where('source', '==', 'telegram'));
      const snapshot = await getCountFromServer(q);
      const totalCount = snapshot.data().count;
      
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

  // Global error handler for API routes (Must be after all routes)
  app.use('/api', (err: any, req: any, res: any, next: any) => {
    console.error(`API Error on ${req.method} ${req.url}:`, err);
    res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
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
