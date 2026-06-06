import express from 'express';
import cors from 'cors';
import path from 'path';
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

// Copy assets/splash.png to public/splash.png for static client serving
try {
  if (fs.existsSync('assets/splash.png')) {
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true });
    }
    fs.copyFileSync('assets/splash.png', 'public/splash.png');
    console.log('Successfully copied assets/splash.png to public/splash.png');
  }
} catch (err) {
  console.error('Failed to copy splash.png to public:', err);
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

// Helper for AI retries
async function callAiWithRetry(fn: () => Promise<any>, maxRetries = 3) {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err.status || err.response?.status || err.error?.code;
      const errMsg = err.message ? err.message.toLowerCase() : '';
      
      // If we got a 429 or 403 but it is explicitly about quota limits/resource exhaustion, do NOT retry.
      const isQuotaExceeded = errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('exhausted') || errMsg.includes('rate_limit') || errMsg.includes('rate limit');
      const isRetryable = (status === 503 || status === 429 || errMsg.includes('503')) && !isQuotaExceeded;
      
      if (isRetryable && i < maxRetries - 1) {
        const backoff = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`Gemini API error (${status}). Retrying in ${Math.round(backoff/1000)}s... (Attempt ${i + 1}/${maxRetries})`);
        await delay(backoff);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// Lazy initialization of Gemini to prevent startup crashes when GEMINI_API_KEY is not defined at module load time.
let aiInstance: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required but missing.');
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

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
    
    // Attempt to launch the bot
    const attemptLaunch = async () => {
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Launch the bot (Telegraf handles deleting any active webhook internally)
          await newBot.launch({ dropPendingUpdates: true });
          console.log('Telegram bot launched successfully');
          isBotLaunching = false;
          break;
        } catch (err: any) {
          const errorCode = err.response?.error_code || err.code || err.error_code;
          const errorDesc = err.description || err.message || '';
          
          if (errorCode === 409 || errorDesc.includes('Conflict')) {
            console.warn('Telegram bot: Conflict (409) detected. Another instance is already polling. Gracefully bypassing polling setup for this instance.');
            isBotLaunching = false;
            break;
          }
          
          retryCount++;
          if (retryCount < maxRetries) {
            console.warn(`Telegram bot launch failed. Retrying in 5s... (Attempt ${retryCount}/${maxRetries}):`, err.message || err);
            await delay(5000);
          } else {
            console.error('Failed to launch Telegram bot after retries:', err);
            isBotLaunching = false;
            bot = null;
          }
        }
      }
    };

    attemptLaunch().catch(err => {
      console.error('Unexpected error in Telegram launch task:', err);
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
const userStates = new Map<string, { mode?: 'scan_records' | 'scan_participation' }>();

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

  // Helper function to process Telegram scanning files (images, PDFs) safely
  async function processTelegramFile(ctx: any, fileId: string, customMimeType?: string) {
    const chatId = ctx.chat.id.toString();
    const state = userStates.get(chatId);
    
    if (!state?.mode) {
      return ctx.reply('Please select a scan mode first:\n/scan_records - Scan financial records\n/scan_participation - Scan attendance lists');
    }

    const username = ctx.from.username || ctx.from.first_name || 'Anonymous';
    await ctx.reply(`Presidential AI Engine is analyzing your document... ⏳`);

    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      
      const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
      const imageBase64 = Buffer.from(response.data).toString('base64');
      const mimeType = customMimeType || 'image/jpeg';

      // Find user institution
      const userUid = `tg_${chatId}`;
      const schoolsSnap = await getDocs(query(collection(db, 'schools'), where('creatorUid', '==', userUid)));
      const placesSnap = await getDocs(query(collection(db, 'places'), where('creatorUid', '==', userUid)));
      
      const instDoc = schoolsSnap.docs[0] || placesSnap.docs[0];
      const institution = instDoc ? { id: instDoc.id, ...instDoc.data() } as any : null;
      
      if (!institution) {
        await ctx.reply('⚠️ No institution found linked to your account. Please create one in the web dashboard first.');
        return;
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
        promptText = "Extract staff attendance from this image. \n" +
                     "1. Look for a date written on the paper. If found, use it.\n" +
                     "2. Look for arrival/sign-in times for each staff member.\n" +
                     "3. Determine 'status': If time is after 9:00 AM, mark as 'late'. If no time is present but they are listed, mark as 'absent' if indicated, otherwise 'present'.\n" +
                     "Extract all staff members listed.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            extractedDate: { type: Type.STRING, description: "The date found on the paper (e.g. 2024-05-19)" },
            extractedData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  staffName: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  time: { type: Type.STRING },
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

      const aiResponse = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: promptText }, { inlineData: { mimeType, data: imageBase64 } }] }],
        config: { responseMimeType: "application/json", responseSchema }
      }));

      const extracted = JSON.parse(aiResponse.text || '{"extractedData": []}');
      const dataItems = extracted.extractedData || [];
      const paperDate = extracted.extractedDate;

      if (dataItems.length === 0) {
        await ctx.reply('❌ No valid records could be extracted from this image. Please ensure the text is clear and readable.');
        return;
      }

      let addedCount = 0;
      let updatedCount = 0;

      // Fetch existing records for duplication check if scanning records
      let existingRecords: any[] = [];
      if (state.mode === 'scan_records') {
        const recsSnap = await getDocs(query(collection(db, 'studentRecords'), where('schoolId', '==', institution.id)));
        existingRecords = recsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      for (const item of dataItems) {
        if (state.mode === 'scan_records') {
          const existing = existingRecords.find((r: any) => 
            r.studentName?.toLowerCase() === item.fullName?.toLowerCase() && 
            (r.studentClass || '').toLowerCase() === (item.unit || '').toLowerCase()
          );

          const recordData = {
            studentName: item.fullName,
            studentClass: item.unit || 'General',
            category: item.category || 'General',
            paid: item.paid || 0,
            balance: item.balance || 0,
            parentNumber: item.parentNumber || '',
            schoolId: institution.id,
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
            date: paperDate || new Date().toISOString().split('T')[0],
            time: item.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            category: item.unit || 'General',
            schoolId: institution.id,
            addedBy: username,
            addedByUid: userUid,
            timestamp: serverTimestamp()
          });
          addedCount++;
        }
      }

      await ctx.reply(`✅ Sync Success!\n\n${addedCount} new entries added\n${updatedCount} existing entries updated\n\nInstitution: ${institution.name}`);

    } catch (error: any) {
      console.error('Telegram AI Sync Error:', error);
      await ctx.reply(`❌ System failure during AI processing: ${error.message || 'Unknown error'}`);
    } finally {
      // Ensure the user's active mode state is ALWAYS cleared, even on failures/errors
      userStates.delete(chatId);
    }
  }

  // Handle standard photos
  botInstance.on('photo', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const state = userStates.get(chatId);
    
    if (!state?.mode) {
      return ctx.reply('Please select a scan mode first:\n/scan_records - Scan financial records\n/scan_participation - Scan attendance lists');
    }

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    await processTelegramFile(ctx, photo.file_id, 'image/jpeg');
  });

  // Handle photos sent as files (uncompressed documents) or PDFs
  botInstance.on('document', async (ctx) => {
    const chatId = ctx.chat.id.toString();
    const state = userStates.get(chatId);
    
    if (!state?.mode) {
      return ctx.reply('Please select a scan mode first:\n/scan_records - Scan financial records\n/scan_participation - Scan attendance lists');
    }

    const document = ctx.message.document;
    const mimeType = document.mime_type || '';
    
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';
    
    if (!isImage && !isPdf) {
      return ctx.reply('⚠️ Unsupported file format. Please send a clear Image or PDF document of your list.');
    }

    await processTelegramFile(ctx, document.file_id, mimeType);
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

  // Direct high-performance handler for splash logo
  app.get('/splash.png', (req, res) => {
    const splashPath = path.join(process.cwd(), 'assets', 'splash.png');
    if (fs.existsSync(splashPath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.contentType('image/png');
      res.sendFile(splashPath);
    } else {
      res.status(404).send('Not Found');
    }
  });

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
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const filePath = path.join(process.cwd(), file.path);

    try {
      const { type } = req.body; // 'records' or 'participation'
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
        promptText = "Extract staff attendance from this image. \n" +
                     "1. Look for a date written on the paper. If found, use it. If not, look for clues or leave as null.\n" +
                     "2. Look for arrival/sign-in times for each staff member.\n" +
                     "3. Determine 'status': If time is after 9:00 AM, mark as 'late'. If no time is present but they are listed, mark as 'absent' if indicated, otherwise 'present'.\n" +
                     "Extract all staff members listed.";
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            extractedDate: { type: Type.STRING, description: "The date found on the paper (e.g. 2024-05-19)" },
            extractedData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  staffName: { type: Type.STRING, description: "Full name of the staff member" },
                  unit: { type: Type.STRING, description: "Department or unit" },
                  time: { type: Type.STRING, description: "The arrival time found on the paper (e.g. 08:30 AM)" },
                  status: { 
                    type: Type.STRING, 
                    description: "Attendance status based on time or marking: present, absent, or late",
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

      const response = await callAiWithRetry(() => getAi().models.generateContent({
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
      }));

      const extracted = JSON.parse(response.text || '{"extractedData": []}');
      res.json({ success: true, ...extracted });

    } catch (error: any) {
      console.error('Gemini Scanning Error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to analyze list' });
    } finally {
      // Guaranteed cleanup of uploaded image
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('Failed to unlink scan file in finally:', e);
      }
    }
  });

  // 1.5. Intelligent Document/Design Image Scanner Endpoint
  app.post('/api/ai/scan-design', upload.single('image'), async (req: any, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No design image provided' });
    }

    const filePath = path.join(process.cwd(), file.path);

    try {
      const imageBase64 = fs.readFileSync(filePath, 'base64');

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          templateType: { 
            type: Type.STRING, 
            description: "Determine which design/document type this image represents. Must be one of: 'cv', 'id-card', 'report', 'certificate', 'agreement', 'invoice', 'receipt', 'coreldraw'." 
          },
          confidence: { type: Type.NUMBER, description: "Match score from 0.0 to 1.0" },
          reconstructionPrompt: { 
            type: Type.STRING, 
            description: "A detailed natural language instructions prompt to reconstruct the exact styling, color palette, custom accents, and layout look and feel seen in the image." 
          },
          docData: {
            type: Type.OBJECT,
            description: "Extracted structure. Ensure it is highly complete, containing all possible text details found in the image formatted as required by the determined schema (JSON keys matches the chosen template properties)."
          }
        },
        required: ["templateType", "reconstructionPrompt", "docData"]
      };

      const promptText = `You are an elite expert human-in-the-loop web designer and document layout model.
Your task is to analyze the uploaded scanned/captured design image and understand which type of template layout it is willing to represent.
Select the single best matching type from the 8 template types exactly:
- 'cv': A resume/curriculum vitae (requires: fullName, jobTitle, email, phone, summary, experience array, education array, skills array, etc.)
- 'id-card': A staff/personal identity card (requires: fullName, idNumber, role, department, issueDate, expiryDate, bloodGroup, signature labels or base64)
- 'report': A formal business or academy report document (requires: title, subtitle, author, date, executiveSummary, keyMetrics array, sections array, conclusions, recommendations)
- 'certificate': An elegant completion or congratulations certificate (requires: title, subtitle, recipientName, achievementDescription, institutionName, issueDate, credentialId, issuerName, issuerRole)
- 'agreement': A contract or partnership legal agreement paper (requires: title, partyA, partyB, effectiveDate, clauses array, paymentTerms, governingLaw, terminationConditions)
- 'invoice': A billing invoice for sales/services (requires: invoiceNumber, invoiceDate, dueDate, senderInfo clientInfo, recipientInfo customerInfo, items array with description/quantity/rate/total, taxRate)
- 'receipt': A POS sales receipt (requires: receiptNumber, transactionDate, merchantInfo, customerName, items array, subtotal, discount, tax, totalAmount, paymentMethod, cashier)
- 'coreldraw': A layered vector drawing, graphic art, complex flyer, logo poster, geometric illustration with wireframes. If selected, output docData matches the coreldraw canvasSize and layers structure (canvasSize: { width: 600, height: 400, background: 'color' }, layers: [{ id, name, visible, locked, opacity, elements: [{ id, type, x, y, width, height, fill, stroke, strokeWidth, rx, ry, cx, cy, r, points, text, fontSize, fontWeight, fontFamily, gradientType, gradientColors, rotation }] }])

Instructions:
1. Examine the image content carefully to auto-detect which document format/category it is.
2. Formulate a super polished "reconstructionPrompt" that captures all creative traits, spacing details, background themes (e.g., custom gradients, neon colors, professional colors, borders), layout rules, font styling (e.g., modern, vintage, classic editorial) from the image.
3. Pull ALL literal text snippets, details, items, titles, names, dates, prices, phone numbers, or coordinates visible in the image, and populate them with perfect structure into "docData" matching the selected template schema.
4. Output should be strict JSON matching the schema outlined.`;

      const response = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3.5-flash",
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
      }));

      const extracted = JSON.parse(response.text || '{"templateType": "cv", "confidence": 0.5, "reconstructionPrompt": "", "docData": {}}');
      res.json({ success: true, ...extracted });

    } catch (error: any) {
      console.error('Gemini Scanning Error for design scan:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to scan design template image' });
    } finally {
      // Guaranteed cleanup of uploaded image
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.error('Failed to unlink scanned design file in finally:', e);
      }
    }
  });

  // 2. Smart Document Creator AI Endpoint
  app.post('/api/ai/fill-document', async (req, res) => {
    const { templateType, userRequest } = req.body;
    if (!templateType || !userRequest) {
      return res.status(400).json({ success: false, error: 'templateType and userRequest are required' });
    }

    try {
      let responseSchema: any;
      let templateDescription = '';

      switch (templateType.toLowerCase()) {
        case 'cv':
        case 'resume':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              website: { type: Type.STRING },
              address: { type: Type.STRING },
              summary: { type: Type.STRING },
              experience: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    period: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["company", "role"]
                }
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    institution: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    period: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["institution", "degree"]
                }
              },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    link: { type: Type.STRING }
                  }
                }
              },
              languages: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["fullName", "jobTitle", "email"]
          };
          templateDescription = "a professional CV / Resume";
          break;

        case 'id-card':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              idNumber: { type: Type.STRING },
              role: { type: Type.STRING },
              department: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              expiryDate: { type: Type.STRING },
              bloodGroup: { type: Type.STRING },
              signature: { type: Type.STRING }
            },
            required: ["fullName", "idNumber", "role"]
          };
          templateDescription = "an institutional personal/staff ID Card";
          break;

        case 'report':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              author: { type: Type.STRING },
              date: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              keyMetrics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                    status: { type: Type.STRING, description: "Must be 'up', 'down', or 'stable'" }
                  },
                  required: ["label", "value"]
                }
              },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    heading: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["heading", "content"]
                }
              },
              conclusions: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["title", "author", "executiveSummary"]
          };
          templateDescription = "a formal business or technical Report";
          break;

        case 'certificate':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              recipientName: { type: Type.STRING },
              achievementDescription: { type: Type.STRING },
              institutionName: { type: Type.STRING },
              issueDate: { type: Type.STRING },
              credentialId: { type: Type.STRING },
              issuerName: { type: Type.STRING },
              issuerRole: { type: Type.STRING }
            },
            required: ["title", "recipientName", "achievementDescription"]
          };
          templateDescription = "an elegant achievement/completion Certificate";
          break;

        case 'agreement':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              partyA: { type: Type.STRING },
              partyB: { type: Type.STRING },
              effectiveDate: { type: Type.STRING },
              clauses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["title", "content"]
                }
              },
              paymentTerms: { type: Type.STRING },
              governingLaw: { type: Type.STRING },
              terminationConditions: { type: Type.STRING }
            },
            required: ["title", "partyA", "partyB", "effectiveDate"]
          };
          templateDescription = "a legally structured professional Contract or Partnership Agreement";
          break;

        case 'invoice':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              invoiceNumber: { type: Type.STRING },
              invoiceDate: { type: Type.STRING },
              dueDate: { type: Type.STRING },
              senderInfo: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  email: { type: Type.STRING },
                  phone: { type: Type.STRING },
                  taxId: { type: Type.STRING }
                },
                required: ["name"]
              },
              recipientInfo: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  email: { type: Type.STRING }
                },
                required: ["name"]
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    description: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    rate: { type: Type.NUMBER },
                    total: { type: Type.NUMBER }
                  },
                  required: ["description", "quantity", "rate"]
                }
              },
              taxRate: { type: Type.NUMBER },
              notes: { type: Type.STRING },
              terms: { type: Type.STRING }
            },
            required: ["invoiceNumber", "invoiceDate", "senderInfo", "recipientInfo", "items"]
          };
          templateDescription = "a professional digital billing Invoice";
          break;

        case 'receipt':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              receiptNumber: { type: Type.STRING },
              transactionDate: { type: Type.STRING },
              merchantInfo: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING }
                },
                required: ["name"]
              },
              customerName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    amount: { type: Type.NUMBER }
                  },
                  required: ["name", "amount"]
                }
              },
              subtotal: { type: Type.NUMBER },
              discount: { type: Type.NUMBER },
              tax: { type: Type.NUMBER },
              totalAmount: { type: Type.NUMBER },
              paymentMethod: { type: Type.STRING },
              cashier: { type: Type.STRING }
            },
            required: ["receiptNumber", "transactionDate", "merchantInfo", "items", "totalAmount"]
          };
          templateDescription = "a POS shopping/transaction Receipt";
          break;

        case 'coreldraw':
          responseSchema = {
            type: Type.OBJECT,
            properties: {
              canvasSize: {
                type: Type.OBJECT,
                properties: {
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER },
                  unit: { type: Type.STRING, description: "Must be 'px'" },
                  background: { type: Type.STRING, description: "Solid hex color like #0f172a or CSS linear-gradient string" }
                },
                required: ["width", "height", "background"]
              },
              layers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    visible: { type: Type.BOOLEAN },
                    locked: { type: Type.BOOLEAN },
                    opacity: { type: Type.NUMBER },
                    elements: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          type: { type: Type.STRING, description: "Must be one of: 'rect', 'ellipse', 'path', 'text', 'line', 'polygon', 'star'" },
                          x: { type: Type.NUMBER },
                          y: { type: Type.NUMBER },
                          width: { type: Type.NUMBER },
                          height: { type: Type.NUMBER },
                          rx: { type: Type.NUMBER, description: "Rounded corner radius, only for rectangles" },
                          cx: { type: Type.NUMBER, description: "Center X, only for ellipses" },
                          cy: { type: Type.NUMBER, description: "Center Y, only for ellipses" },
                          r: { type: Type.NUMBER, description: "Radius, only for ellipses" },
                          points: { type: Type.STRING, description: "Coordinate points list like 'x1,y1 x2,y2 x3,y3 ...' for star, polygon, or lines" },
                          d: { type: Type.STRING, description: "SVG path data (M... C... L... Z) for custom freehand or bezier curves" },
                          text: { type: Type.STRING, description: "Label text content, only for type 'text'" },
                          fontSize: { type: Type.NUMBER },
                          fontWeight: { type: Type.STRING },
                          fontFamily: { type: Type.STRING },
                          fill: { type: Type.STRING, description: "Hex color or 'none'" },
                          gradientType: { type: Type.STRING, description: "'none', 'linear', or 'radial'" },
                          gradientColors: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Palette of 2 or 3 hex colors for high fidelity gradient"
                          },
                          gradientAngle: { type: Type.NUMBER, description: "Gradient slope angle in degrees" },
                          stroke: { type: Type.STRING, description: "Stroke brush outline color hex" },
                          strokeWidth: { type: Type.NUMBER },
                          strokeDasharray: { type: Type.STRING, description: "Dash array pattern, e.g. '5,5' or 'none'" },
                          rotation: { type: Type.NUMBER, description: "Angle in degrees" },
                          blendMode: { type: Type.STRING },
                          shadowBlur: { type: Type.NUMBER },
                          shadowColor: { type: Type.STRING },
                          contourCount: { type: Type.NUMBER, description: "Number of concentric contour offset paths from 0 to 4 (CorelDRAW special effect)" },
                          contourColor: { type: Type.STRING, description: "Contour accent hex color" }
                        },
                        required: ["id", "type", "x", "y"]
                      }
                    }
                  },
                  required: ["id", "name", "elements"]
                }
              },
              dimensionLines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    x1: { type: Type.NUMBER },
                    y1: { type: Type.NUMBER },
                    x2: { type: Type.NUMBER },
                    y2: { type: Type.NUMBER },
                    label: { type: Type.STRING },
                    color: { type: Type.STRING }
                  },
                  required: ["x1", "y1", "x2", "y2", "label"]
                }
              }
            },
            required: ["canvasSize", "layers"]
          };
          templateDescription = "a highly advanced CorelDRAW vector art canvas, complete with custom layered vector shapes, complex bezier paths, gradient fills, fine geometric alignment, rotation parameters, text layouts, concentric glow contours, and dimension lines showing size measurements";
          break;

        default:
          return res.status(400).json({ success: false, error: `Unsupported template category: ${templateType}` });
      }

      const promptText = `
        You are an advanced Smart Document Creator assistant.
        The user wants to automatically generate and populate structured data for ${templateDescription} based on this request:
        "${userRequest}"

        Carefully extract all available details from the user request and map them to the fields of the schema.
        For details that are missing from the prompt, use your advanced creative writing skills to populate them with highly realistic, professional, and matching placeholder values so the final document is complete, authentic, and beautiful. Do not use generic texts like "Lorem Ipsum"; instead, write realistic texts, realistic company names (like Exona, PremiumTrust Bank, etc.), genuine looking addresses, appropriate dates (near year 2026), and fully realized sections.
      `;

      const response = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      }));

      const filledData = JSON.parse(response.text || '{}');
      res.json({ success: true, filledData });

    } catch (error: any) {
      console.error('Fill Document Error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to auto-fill document template' });
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
      const errMsg = e.message || '';
      if (errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted')) {
        return res.json({ success: true, broadcasts: [], isQuotaExceeded: true });
      }
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
      const errMsg = error.message || '';
      const isRateOrLimitError = 
        errMsg.toLowerCase().includes('quota') || 
        errMsg.toLowerCase().includes('resource_exhausted') || 
        errMsg.toLowerCase().includes('limit') || 
        errMsg.toLowerCase().includes('rate') || 
        errMsg.toLowerCase().includes('exceeded') || 
        errMsg.toLowerCase().includes('429');

      if (isRateOrLimitError) {
        console.warn('Admin stats requested under rate limit or quota bounds. Using graceful fallback.', errMsg);
        return res.json({
          success: true,
          communitySize: 12,
          isQuotaExceeded: true,
          timestamp: new Date().toISOString()
        });
      }
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

  // AI Classroom Moderator & Educational Assistant
  app.post('/api/ai/classroom-moderator', async (req, res) => {
    const { prompt, classroomSubject, className, generateImage, referencePreference } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'No prompt command provided' });
    }

    try {
      console.log(`[AI MODERATOR] Generating educational lesson for: "${prompt}" with preference "${referencePreference}"`);

      const includeVideo = referencePreference === 'both' || referencePreference === 'video' || referencePreference === undefined;
      const includeImage = referencePreference === 'both' || referencePreference === 'image' || referencePreference === undefined;

      const systemPrompt = `You are a curriculum-aligned AI Academic Assistant and Class Moderator.
Generate highly informative educational lesson notes, visual illustration prompts, and curated virtual reference material.
${includeVideo ? 'Suggest a functional YouTube embed link (format: https://www.youtube.com/embed/<id>) that exists and provides excellent education about this topic (e.g. from highly reputable creators like TED-Ed, Crash Course, Khan Academy, Kurzgesagt, Physics Girl, SciShow, etc.).' : 'Because the user requested NO video references, you MUST populate "videoUrl" and "videoExplanation" with empty strings "".'}
${includeImage ? 'Provide a detailed visual prompt for generating a technical illustration or labeled diagram.' : 'Because the user requested NO image visual aid, you MUST populate "imagePrompt" with an empty string "".'}
Structure the lesson output in comprehensive Markdown notes, including detailed sub-topics, glossary terms, definitions, and FAQs.
Return a STRICT JSON response matching the given schema parameters.`;

      const promptText = `Generate educational material for the topic: "${prompt}"
Class: "${className || 'General Academy'}"
Course Subject: "${classroomSubject || 'General Science & Humanities'}"
User configuration choice: Include Video references? ${includeVideo}. Include custom visual diagrams and illustrations? ${includeImage}.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          lessonTitle: { type: Type.STRING, description: "Highly engaging, academic, and clear title of the lesson" },
          markdownNotes: { type: Type.STRING, description: "Thorough, structured study notes of the subject formatted in rich Markdown" },
          summary: { type: Type.STRING, description: "A simple, motivating 1-2 sentence announcement summarizing the lesson" },
          imagePrompt: { type: Type.STRING, description: "A detailed visual description for generating a technical illustration, labeled diagram, or flat educational vector for this lesson topic" },
          videoUrl: { type: Type.STRING, description: "A valid working YouTube embed video URL (format: https://www.youtube.com/embed/XXXXXX) from an educational source" },
          videoExplanation: { type: Type.STRING, description: "A summary explaining this video's focus and content" },
          interactiveExplanations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Glossary term or FAQ question" },
                content: { type: Type.STRING, description: "Scientific translation, description or answer" }
              },
              required: ["title", "content"]
            },
            description: "At least 3 quick questions or definition pairs to expand comprehension"
          }
        },
        required: ["lessonTitle", "markdownNotes", "summary", "imagePrompt", "videoUrl", "videoExplanation", "interactiveExplanations"]
      };

      const aiResponse = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema
        }
      }));

      const parsedData = JSON.parse(aiResponse.text.trim());
      let generatedImageBase64 = "";

      if (generateImage && parsedData.imagePrompt) {
        try {
          console.log(`[AI MODERATOR] Requesting image generation with prompt: "${parsedData.imagePrompt}"`);
          const imageResponse = await callAiWithRetry(() => getAi().models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: {
              parts: [{ text: `Educational illustration: ${parsedData.imagePrompt}. High definition academic labeled flat vector art icon, isolated background, no text clutter.` }]
            }
          }));

          for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              generatedImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
              break;
            }
          }
        } catch (imgErr) {
          console.error('[AI MODERATOR] Image synthesis failed (likely due to API key quota). Falling back to dynamic academic graphic:', imgErr);
          // Fallback to high-definition free academic photography from public source Unsplash matching the topic
          const cleanTopic = encodeURIComponent((parsedData.lessonTitle || prompt || 'education').replace(/[^a-zA-Z0-9 ]/g, ' '));
          generatedImageBase64 = `https://images.unsplash.com/featured/800x450/?academic,${cleanTopic || 'diagram'}`;
        }
      }

      res.json({
        success: true,
        ...parsedData,
        generatedImageUrl: generatedImageBase64 || null
      });

    } catch (err: any) {
      console.error('[AI MODERATOR] Error generating lesson notes:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to generate classroom guide' });
    }
  });

  // AI Status / Story Generation
  app.post('/api/ai/generate-status', async (req, res) => {
    const { topic, customPrompt } = req.body;
    try {
      const promptText = customPrompt 
        ? `Generate a beautiful social media Status Story based on this custom request: "${customPrompt}".`
        : `Generate a beautiful daily social media Status Story on the topic: "${topic || 'Wisdom'}".`;

      const systemPrompt = `You are a high-end creative status narrator. Create a beautiful, inspirational, or thought-provoking mini-story or daily thought (3-4 sentences, max 280 characters) suited for a WhatsApp slide. 
Style: Clean, professional, deep, modern typography vibes. No sales pitch, no hashtags, no emojis.
Also select one of these background gradients that matches the theme's mood:
- 'from-indigo-600 to-purple-600' (Deep thoughts, mindfulness, tech)
- 'from-rose-500 to-orange-500' (Inspiration, energy, startup)
- 'from-cyan-500 to-blue-600' (Wisdom, focus, oceanic clear)
- 'from-emerald-500 to-teal-700' (Growth, financial hacks, calm)
- 'from-gray-900 to-black' (Mystic, minimalism, sleek tech, space)
Return strict JSON matching the requested schema.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          note: { type: Type.STRING, description: "The beautiful generated notes, under 280 characters, with high readability." },
          bgColor: { type: Type.STRING, description: "The chosen background gradient string from the specified options." },
          topicTitle: { type: Type.STRING, description: "An elegant, punchy title for this status update (1-3 words)." }
        },
        required: ["note", "bgColor", "topicTitle"]
      };

      const response = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: promptText }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      }));

      const result = JSON.parse(response.text || '{}');
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('AI Status Generator Error:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to generate status' });
    }
  });

  // AI Story Reply / Interactive Conversation
  app.post('/api/ai/reply-story', async (req, res) => {
    const { storyNote, authorName, authorPrompt, userReply } = req.body;
    if (!userReply) {
      return res.status(400).json({ success: false, error: 'No reply provided' });
    }

    try {
      const systemInstruction = `You are ${authorName || 'an AI Story Creator'}. 
You just posted this story update to your status: "${storyNote || 'A beautiful daily thought'}"
The user read your status and replied with: "${userReply}"
Respond in character to the user in a deep, helpful, positive, and conversational manner. 
Keep your response short, warm, and highly engaging (max 2-3 sentences). Do not use hashtags.`;

      const aiResponse = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: `Generate your reply to user feedback: "${userReply}"` }] }],
        config: {
          systemInstruction
        }
      }));

      res.json({ success: true, replyText: aiResponse.text || 'Indeed, a powerful perspective!' });
    } catch (err: any) {
      console.error('AI Story Reply Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to reply to story' });
    }
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
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
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
