import express from 'express';
import cors from 'cors';
import path from 'path';
import { Telegraf } from 'telegraf';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  doc, 
  getDoc as firebaseGetDoc, 
  setDoc as firebaseSetDoc, 
  updateDoc as firebaseUpdateDoc, 
  collection, 
  getDocs as firebaseGetDocs, 
  query, 
  where, 
  limit, 
  getCountFromServer as firebaseGetCountFromServer, 
  serverTimestamp 
} from 'firebase/firestore';
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

// ==========================================
// RESILIENT FIRESTORE WRAPPERS WITH OFFLINE DISK CACHE FALLBACK
// ==========================================
interface LocalDb {
  users: Record<string, any>;
  broadcasts: Record<string, any>;
  schools: Record<string, any>;
  places: Record<string, any>;
  studentRecords: Record<string, any>;
  teacherAttendance: Record<string, any>;
  [key: string]: Record<string, any>;
}

let localDbCache: LocalDb = {
  users: {},
  broadcasts: {},
  schools: {},
  places: {},
  studentRecords: {},
  teacherAttendance: {}
};

const LOCAL_DB_FILE = path.join(process.cwd(), 'local_db_backup.json');

// Initialize local database cache from backup JSON file
try {
  if (fs.existsSync(LOCAL_DB_FILE)) {
    const rawData = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
    const parsed = JSON.parse(rawData);
    localDbCache = {
      users: parsed.users || {},
      broadcasts: parsed.broadcasts || {},
      schools: parsed.schools || {},
      places: parsed.places || {},
      studentRecords: parsed.studentRecords || {},
      teacherAttendance: parsed.teacherAttendance || {}
    };
    console.log('Successfully loaded local database backup from disk.');
  } else {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localDbCache, null, 2), 'utf8');
  }
} catch (e) {
  console.error('Failed to parse local database backup file:', e);
}

const persistLocalDb = () => {
  try {
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localDbCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to local backup database file:', err);
  }
};

// Safe wrapper for getDoc
async function getDoc(docRef: any): Promise<any> {
  let colName = docRef._path?.segments?.[0] || docRef.parent?.path || '';
  if (!colName && docRef.path) {
    const parts = docRef.path.split('/');
    if (parts.length > 0) colName = parts[0];
  }
  const docId = docRef.id;

  try {
    const snap = await firebaseGetDoc(docRef);
    if (colName && docId && snap.exists()) {
      if (!localDbCache[colName]) {
        localDbCache[colName] = {};
      }
      localDbCache[colName][docId] = snap.data();
      persistLocalDb();
    }
    return snap;
  } catch (err: any) {
    const isQuota = err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit') || err.message?.toLowerCase().includes('exceeded') || err.code === 'resource-exhausted';
    if (isQuota && colName && docId && localDbCache[colName]?.[docId]) {
      console.warn(`⚠️ FIRESTORE QUOTA EXCEEDED (getDoc). Falling back to local cache of "${colName}/${docId}"`);
      const cached = localDbCache[colName][docId];
      return {
        id: docId,
        ref: docRef,
        exists: () => true,
        data: () => cached
      };
    }
    throw err;
  }
}

// Safe wrapper for setDoc
async function setDoc(docRef: any, data: any, options?: any): Promise<any> {
  let colName = docRef._path?.segments?.[0] || docRef.parent?.path || '';
  if (!colName && docRef.path) {
    const parts = docRef.path.split('/');
    if (parts.length > 0) colName = parts[0];
  }
  const docId = docRef.id;

  // Optimistically write to local JSON file
  if (colName && docId) {
    if (!localDbCache[colName]) {
      localDbCache[colName] = {};
    }
    if (options?.merge && localDbCache[colName][docId]) {
      localDbCache[colName][docId] = {
        ...localDbCache[colName][docId],
        ...data
      };
    } else {
      localDbCache[colName][docId] = data;
    }
    persistLocalDb();
  }

  try {
    return await firebaseSetDoc(docRef, data, options);
  } catch (err: any) {
    const isQuota = err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit') || err.message?.toLowerCase().includes('exceeded') || err.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`⚠️ FIRESTORE QUOTA EXCEEDED (setDoc). Written target payload directly to local disk cache only.`);
      return; // Resolve gracefully
    }
    throw err;
  }
}

// Safe wrapper for updateDoc
async function updateDoc(docRef: any, data: any): Promise<any> {
  let colName = docRef._path?.segments?.[0] || docRef.parent?.path || '';
  if (!colName && docRef.path) {
    const parts = docRef.path.split('/');
    if (parts.length > 0) colName = parts[0];
  }
  const docId = docRef.id;

  // Optimistically update local JSON file
  if (colName && docId) {
    if (!localDbCache[colName]) {
      localDbCache[colName] = {};
    }
    localDbCache[colName][docId] = {
      ...(localDbCache[colName][docId] || {}),
      ...data
    };
    persistLocalDb();
  }

  try {
    return await firebaseUpdateDoc(docRef, data);
  } catch (err: any) {
    const isQuota = err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit') || err.message?.toLowerCase().includes('exceeded') || err.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`⚠️ FIRESTORE QUOTA EXCEEDED (updateDoc). Updated local copy only.`);
      return; // Resolve gracefully
    }
    throw err;
  }
}

// Safe wrapper for getDocs
async function getDocs(queryOrColRef: any): Promise<any> {
  let colName = queryOrColRef.path;
  if (!colName && queryOrColRef._query?.path?.segments) {
    colName = queryOrColRef._query.path.segments[0];
  }
  if (!colName && queryOrColRef.query?.path?.segments) {
    colName = queryOrColRef.query.path.segments[0];
  }
  if (!colName && queryOrColRef._path?.segments) {
    colName = queryOrColRef._path.segments[0];
  }

  try {
    const snap = await firebaseGetDocs(queryOrColRef);
    if (colName) {
      if (!localDbCache[colName]) {
        localDbCache[colName] = {};
      }
      snap.docs.forEach((doc: any) => {
        localDbCache[colName][doc.id] = doc.data();
      });
      persistLocalDb();
    }
    return snap;
  } catch (err: any) {
    const isQuota = err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit') || err.message?.toLowerCase().includes('exceeded') || err.code === 'resource-exhausted';
    if (isQuota) {
      console.warn(`⚠️ FIRESTORE QUOTA EXCEEDED (getDocs). Falling back to local offline JSON cache for collection: "${colName || 'unknown'}"`);
      
      if (colName && localDbCache[colName]) {
        const cachedCol = localDbCache[colName];
        let allItems = Object.keys(cachedCol).map(id => ({
          id,
          data: () => cachedCol[id],
          exists: () => true
        }));

        // Dynamically apply filters from queries
        const queryObj = queryOrColRef._query || queryOrColRef.query;
        const filters = queryObj?.filters || [];
        for (const filter of filters) {
          try {
            const field = filter.field?.segments?.[0] || filter.field?.path || '';
            const op = filter.op;
            let val = filter.value?.stringValue || filter.value?.integerValue || filter.value?.booleanValue || filter.value;
            if (filter.value && typeof filter.value === 'object') {
              const keys = Object.keys(filter.value);
              if (keys.length > 0) {
                val = filter.value[keys[0]];
              }
            }
            if (field && val !== undefined) {
              allItems = allItems.filter(item => {
                const itemVal = item.data()?.[field];
                if (op === '==' || op === 'equal') return String(itemVal) === String(val);
                return true;
              });
            }
          } catch(filterErr) {
            console.error('Error in local filter app:', filterErr);
          }
        }

        // Apply simple descending sort
        allItems.sort((a, b) => {
          const tA = a.data()?.timestamp || a.data()?.join_date || a.id || '';
          const tB = b.data()?.timestamp || b.data()?.join_date || b.id || '';
          return String(tB).localeCompare(String(tA));
        });

        const limitVal = queryObj?.limit || 100;
        const sliced = allItems.slice(0, limitVal);

        return {
          docs: sliced,
          size: sliced.length,
          empty: sliced.length === 0,
          forEach: (cb: any) => sliced.forEach(cb)
        };
      } else {
        return {
          docs: [],
          size: 0,
          empty: true,
          forEach: () => {}
        };
      }
    }
    throw err;
  }
}

// Safe wrapper for getCountFromServer
async function getCountFromServer(queryOrColRef: any): Promise<any> {
  try {
    return await firebaseGetCountFromServer(queryOrColRef);
  } catch (err: any) {
    const isQuota = err.message?.toLowerCase().includes('quota') || err.message?.toLowerCase().includes('limit') || err.message?.toLowerCase().includes('exceeded') || err.code === 'resource-exhausted';
    if (isQuota) {
      let colName = queryOrColRef.path;
      if (!colName && queryOrColRef._query?.path?.segments) {
        colName = queryOrColRef._query.path.segments[0];
      }
      if (!colName && queryOrColRef.query?.path?.segments) {
        colName = queryOrColRef.query.path.segments[0];
      }
      if (!colName && queryOrColRef._path?.segments) {
        colName = queryOrColRef._path.segments[0];
      }

      console.warn(`⚠️ FIRESTORE QUOTA EXCEEDED (getCountFromServer). Falling back to local cache count for: "${colName || 'unknown'}"`);
      
      let count = 0;
      if (colName && localDbCache[colName]) {
        const cachedCol = localDbCache[colName];
        let allItems = Object.keys(cachedCol).map(id => cachedCol[id]);

        const queryObj = queryOrColRef._query || queryOrColRef.query;
        const filters = queryObj?.filters || [];
        for (const filter of filters) {
          try {
            const field = filter.field?.segments?.[0] || filter.field?.path || '';
            const op = filter.op;
            let val = filter.value?.stringValue || filter.value?.integerValue || filter.value?.booleanValue || filter.value;
            if (filter.value && typeof filter.value === 'object') {
              const keys = Object.keys(filter.value);
              if (keys.length > 0) {
                val = filter.value[keys[0]];
              }
            }
            if (field && val !== undefined) {
              allItems = allItems.filter(item => {
                const itemVal = item?.[field];
                if (op === '==' || op === 'equal') return String(itemVal) === String(val);
                return true;
              });
            }
          } catch(e) {}
        }
        count = allItems.length;
      }

      return {
        data: () => ({ count })
      };
    }
    throw err;
  }
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

  // Serve uploads directory statically for live media streaming & playback
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Live media HTTP Upload endpoint with real binary streaming
  app.post('/api/upload-media', upload.single('file'), (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file received' });
      }
      const file = req.file;
      const ext = path.extname(file.originalname) || '.mp4';
      const newFilename = `${file.filename}${ext}`;
      const oldPath = path.join(uploadsDir, file.filename);
      const newPath = path.join(uploadsDir, newFilename);
      
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }

      const url = `/uploads/${newFilename}`;
      console.log(`Live media upload success: ${url} (${file.size} bytes)`);
      res.json({ success: true, url, filename: newFilename, size: file.size });
    } catch (err: any) {
      console.error('Error during media upload:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Proxy endpoint to resolve and stream Instagram Reels & external videos directly as pure MP4 without UI
  app.get('/api/proxy-video', async (req, res) => {
    try {
      const rawUrl = req.query.url as string;
      if (!rawUrl) return res.status(400).send('No URL provided');

      if (rawUrl.startsWith('/uploads/') || rawUrl.startsWith('http://localhost:3000')) {
        return res.redirect(rawUrl);
      }

      // If it's already a direct Google Cloud Sample video or unproxied CDN, redirect directly for max performance
      if (rawUrl.includes('commondatastorage.googleapis.com')) {
        return res.redirect(rawUrl);
      }

      // Handle Google Drive direct conversion
      if (rawUrl.includes('drive.google.com')) {
        const dMatch = rawUrl.match(/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (dMatch && dMatch[1]) {
          return res.redirect(`https://drive.google.com/uc?export=download&id=${dMatch[1]}`);
        }
      }

      // Handle Dropbox direct conversion
      if (rawUrl.includes('dropbox.com')) {
        return res.redirect(rawUrl.replace('dl=0', 'raw=1').replace('dl=1', 'raw=1'));
      }

      const safeHash = Buffer.from(rawUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(-25);
      const cachePath = path.join(uploadsDir, `cache_${safeHash}.mp4`);
      const dlFlagPath = path.join(uploadsDir, `dl_${safeHash}.flag`);

      const serveFile = () => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Accept-Ranges', 'bytes');
        res.contentType('video/mp4');
        return res.sendFile(cachePath);
      };

      // If valid cached file exists and is not currently being written
      if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 50000 && !fs.existsSync(dlFlagPath)) {
        return serveFile();
      }

      // If another concurrent request is downloading this exact video, wait up to 12 seconds
      if (fs.existsSync(dlFlagPath)) {
        let attempts = 0;
        while (fs.existsSync(dlFlagPath) && attempts < 24) {
          await new Promise(r => setTimeout(r, 500));
          attempts++;
        }
        if (fs.existsSync(cachePath) && fs.statSync(cachePath).size > 50000) {
          return serveFile();
        }
      }

      let directVideoUrl = '';

      if (rawUrl.includes('instagram.com') || rawUrl.includes('instagr.am')) {
        const match = rawUrl.match(/(?:reels?|p|tv)\/([^/?#&]+)/i);
        const shortcode = match ? match[1] : '';

        if (shortcode) {
          // Scrape official Instagram embed player page
          try {
            const embedRes = await axios.get(`https://www.instagram.com/reel/${shortcode}/embed/`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
              timeout: 6000
            });
            if (typeof embedRes.data === 'string') {
              const vMatch = embedRes.data.match(/"video_url"\s*:\s*"([^"]+)"/i) || embedRes.data.match(/src="([^"]+\.mp4[^"]*)"/i);
              if (vMatch && vMatch[1]) {
                const parsed = JSON.parse(`"${vMatch[1]}"`);
                if (parsed.startsWith('http')) directVideoUrl = parsed;
              }
            }
          } catch (e) {}

          if (!directVideoUrl) {
            try {
              const cobRes = await axios.post('https://api.cobalt.tools/api/json', {
                url: `https://www.instagram.com/reel/${shortcode}/`
              }, {
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                timeout: 6000
              });
              if (cobRes.data?.url) {
                directVideoUrl = cobRes.data.url;
              } else if (cobRes.data?.picker?.[0]?.url) {
                directVideoUrl = cobRes.data.picker[0].url;
              }
            } catch (e: any) {
              console.warn('Cobalt API fallback trigger:', e.message);
            }
          }
        }

        if (!directVideoUrl && shortcode) {
          const mirrors = [
            `https://ddinstagram.com/reel/${shortcode}`,
            `https://vxinstagram.com/reel/${shortcode}`
          ];
          for (const mirror of mirrors) {
            try {
              const pRes = await axios.get(mirror, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                timeout: 5000
              });
              if (typeof pRes.data === 'string') {
                const og = pRes.data.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i) ||
                           pRes.data.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video["']/i);
                if (og && og[1]) {
                  const clean = og[1].replace(/&amp;/g, '&');
                  if (clean.startsWith('http')) {
                    directVideoUrl = clean;
                    break;
                  }
                }
              }
            } catch (err) { /* continue */ }
          }
        }
      } else {
        directVideoUrl = rawUrl;
      }

      if (!directVideoUrl) {
        directVideoUrl = rawUrl;
      }

      fs.writeFileSync(dlFlagPath, '1');
      try {
        const dlRes = await axios.get(directVideoUrl, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          timeout: 25000,
          maxContentLength: 75 * 1024 * 1024
        });

        const contentType = String(dlRes.headers['content-type'] || '').toLowerCase();
        const buf = Buffer.isBuffer(dlRes.data) ? dlRes.data : Buffer.from(dlRes.data || '');
        const headerStr = buf.toString('utf8', 0, 30).trim().toLowerCase();
        const isHtmlOrJson = contentType.includes('text/html') || contentType.includes('application/json') || headerStr.startsWith('<!do') || headerStr.startsWith('<html');

        if (!isHtmlOrJson && buf.length > 5000) {
          fs.writeFileSync(cachePath, buf);
          if (fs.existsSync(dlFlagPath)) fs.unlinkSync(dlFlagPath);
          return serveFile();
        }
      } finally {
        if (fs.existsSync(dlFlagPath)) fs.unlinkSync(dlFlagPath);
      }

      // If downloading binary failed or returned HTML web page, redirect client to universal HD fallback video
      res.redirect('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');

    } catch (err: any) {
      console.error('Error proxying video:', err.message);
      res.redirect('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    }
  });

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

  // Resilient High-Performance Live HLS/M3U8 Stream Proxy
  app.get('/api/live-proxy', async (req, res) => {
    const streamUrl = req.query.url;
    if (!streamUrl || typeof streamUrl !== 'string') {
      return res.status(400).send('URL is required');
    }

    try {
      const decodedUrl = decodeURIComponent(streamUrl.trim());
      
      // Determine if accessing a binary video slice (.ts chunk) or media segment
      const isSegment = /\.(ts|mp4|aac|mp3|m4s|ts\?|mp4\?)/i.test(decodedUrl);
      
      if (isSegment) {
        const streamResponse = await axios({
          method: 'get',
          url: decodedUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
          },
          timeout: 20000
        });
        
        if (streamResponse.headers['content-type']) {
          res.setHeader('Content-Type', String(streamResponse.headers['content-type']));
        } else {
          res.setHeader('Content-Type', 'video/mp2t');
        }
        res.setHeader('Access-Control-Allow-Origin', '*');
        streamResponse.data.pipe(res);
        return;
      }
      
      // Otherwise, load, parse, and absolute-path modify .m3u8 manifest playlists
      const playlistResponse = await axios.get(decodedUrl, {
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        },
        timeout: 10000
      });
      
      const m3u8Content = playlistResponse.data;
      if (typeof m3u8Content !== 'string') {
        return res.status(500).send('Invalid manifest returned');
      }
      
      const parsedUrl = new URL(decodedUrl);
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
      const origin = parsedUrl.origin;
      
      const lines = m3u8Content.split('\n');
      const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        
        // Pre-resolve URLs in tag attributes (such as encryption keys or subtitles paths)
        if (trimmed.startsWith('#')) {
          return line.replace(/URI="([^"]+)"/g, (match, path) => {
            if (path.startsWith('http://') || path.startsWith('https://')) {
              return `URI="/api/live-proxy?url=${encodeURIComponent(path)}"`;
            }
            let resolved = '';
            if (path.startsWith('/')) {
              resolved = origin + path;
            } else {
              resolved = baseUrl + path;
            }
            return `URI="/api/live-proxy?url=${encodeURIComponent(resolved)}"`;
          });
        }
        
        // Resolve raw sequence stream lines
        let resolvedUrl = '';
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          resolvedUrl = trimmed;
        } else if (trimmed.startsWith('/')) {
          resolvedUrl = origin + trimmed;
        } else {
          resolvedUrl = baseUrl + trimmed;
        }
        
        return `/api/live-proxy?url=${encodeURIComponent(resolvedUrl)}`;
      });
      
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(processedLines.join('\n'));
      
    } catch (err: any) {
      console.error(`Live stream proxy error for ${streamUrl}:`, err.message);
      res.status(500).send(`Stream fetch failed: ${err.message}`);
    }
  });

  // YouTube Channel/Video URL Resolver Endpoint
  app.post('/api/youtube/resolve', async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const trimmed = url.trim();
      
      // 1. Direct regex checks for video ID or channel ID
      if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return res.json({ type: 'video', id: trimmed });
      }
      if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) {
        return res.json({ type: 'channel', id: trimmed });
      }

      // 2. Direct watch or channel matching if straightforward
      if (trimmed.includes('youtube.com/watch?v=')) {
        const urlParams = new URL(trimmed);
        const v = urlParams.searchParams.get('v');
        if (v) return res.json({ type: 'video', id: v });
      } else if (trimmed.includes('youtu.be/')) {
        const parts = trimmed.split('youtu.be/');
        if (parts[1]) {
          const id = parts[1].split(/[/?#]/)[0];
          return res.json({ type: 'video', id });
        }
      } else if (trimmed.includes('youtube.com/live/')) {
        const parts = trimmed.split('youtube.com/live/');
        if (parts[1]) {
          const id = parts[1].split(/[/?#]/)[0];
          return res.json({ type: 'video', id });
        }
      } else if (trimmed.includes('youtube.com/embed/')) {
        const parts = trimmed.split('youtube.com/embed/');
        if (parts[1]) {
          const id = parts[1].split(/[/?#]/)[0];
          return res.json({ type: 'video', id });
        }
      } else if (trimmed.includes('youtube.com/channel/')) {
        const parts = trimmed.split('youtube.com/channel/');
        if (parts[1]) {
          const id = parts[1].split(/[/?#]/)[0];
          if (id.startsWith('UC')) return res.json({ type: 'channel', id });
        }
      }

      // 3. Resolve using HTTP Scraping for handles and nicknames
      console.log(`Resolving YouTube URL via scraper / fetch: ${trimmed}`);
      const cleanUrl = trimmed.startsWith('http') ? trimmed : `https://www.youtube.com/${trimmed.startsWith('@') ? '' : '@'}${trimmed}`;
      
      const response = await axios.get(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000,
      });

      const html = response.data;
      if (typeof html === 'string') {
        const match1 = html.match(/"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/);
        if (match1) return res.json({ type: 'channel', id: match1[1] });

        const match2 = html.match(/channel\/has_content\/owner\?owner_id=(UC[a-zA-Z0-9_-]{22})/);
        if (match2) return res.json({ type: 'channel', id: match2[1] });

        const match3 = html.match(/href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
        if (match3) return res.json({ type: 'channel', id: match3[1] });

        const match4 = html.match(/"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/);
        if (match4) return res.json({ type: 'channel', id: match4[1] });

        const match5 = html.match(/meta itemProp="channelId" content="(UC[a-zA-Z0-9_-]{22})"/);
        if (match5) return res.json({ type: 'channel', id: match5[1] });
      }

      // 4. Try Gemini AI as direct backup if scraper didn't extract it
      try {
        console.log(`Scraper didn't find channel ID. Trying Gemini to resolve handle for: ${cleanUrl}`);
        const prompt = `Identify the YouTube channel ID (which starts with 'UC' and is 24 characters long) or YouTube Video ID (which is 11 characters long) for: "${cleanUrl}". If you are sure of the channel ID or Video ID, return it. Respond ONLY with a valid JSON block of schema: {"type": "channel" | "video", "id": "the_id"}`;
        const aiResponse = await getAi().models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        const parsed = JSON.parse(aiResponse.text || '{}');
        if (parsed.type && parsed.id) {
          return res.json(parsed);
        }
      } catch (aiErr) {
        console.error("Gemini backup resolution error:", aiErr);
      }

      return res.status(404).json({ error: 'Could not resolve channel ID from YouTube URL' });
    } catch (err: any) {
      console.error('YouTube resolution error:', err);
      return res.status(500).json({ error: `Failed to resolve YouTube URL: ${err.message}` });
    }
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

  // Exona AI Assistant Route
  app.post('/api/ai/exona', async (req, res) => {
    const { prompt, chatHistory } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'No prompt provided' });
    }

    try {
      const systemInstruction = `You are Exona AI, the advanced, high-end artificial intelligence engine integrated directly into the Exona platform. 
Exona represents a modern, beautiful full-stack platform linking local communities, institutions (schools, places of worship, businesses), custom broadcasts, and financial workspaces. 
Provide elegant, authoritative, and extremely polished responses in clean Markdown styling. 
You can help users:
1. Formulate institutional announcements & updates.
2. Develop creative story status scripts.
3. Plan business or community events.
4. Compose engaging broadcast scripts.
5. Provide helpful and deep explanations on any topic.

Maintain the Exona design-centric, premium tone: balanced, professional, concise, with sleek spacing. Use markdown headers, bold items, or lists beautifully as needed.`;

      // Build chat history matching @google/genai schema
      const contents: any[] = [];
      if (chatHistory && Array.isArray(chatHistory)) {
        for (const turn of chatHistory) {
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const response = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.8
        }
      }));

      res.json({ success: true, replyText: response.text || 'Exona AI is here to elevate your experience.' });
    } catch (err: any) {
      console.error('Exona AI Helper Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to generate AI response' });
    }
  });

  // Satellite Speech & Live Translation Engine using Gemini 3.5 Flash SDK
  app.post('/api/ai/translate-stream', async (req, res) => {
    const { text, sourceLang, targetLang } = req.body;
    
    if (!text || String(text).trim() === "") {
      return res.json({ success: true, translatedText: "" });
    }

    try {
      const srcLanguageName = sourceLang || 'Auto-Detected Language';
      const tgtLanguageName = targetLang || 'English';

      const systemInstruction = `You are a real-time, zero-delay satellite stream audio translation translator.
Your job is to translate the spoken text from the audio input into natural, clean, beautifully structured subtitles.
Original audio language context: ${srcLanguageName}
Target subtitle translation language: ${tgtLanguageName}

Strict requirements:
- ONLY output the translated text. Do NOT include any intro, outro, matching quotes, explanations, or system telemetry.
- Keep the style matching conversational, human cinematic subtitles.
- If the phrase is unclear or partial, make the most semantically logical translation.
- Never repeat the original language if it's different.`;

      const response = await callAiWithRetry(() => getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          { role: 'user', parts: [{ text: `Translate this captured broadcast text instantly: "${text}"` }] }
        ],
        config: {
          systemInstruction,
          temperature: 0.3, // Lower temperature means more stable and literal translation
        }
      }));

      const translatedText = response.text ? response.text.replace(/^["'\s]+|["'\s]+$/g, '').trim() : text;
      res.json({ success: true, translatedText });
    } catch (err: any) {
      console.error('Gemini Translator Error:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to translate stream text' });
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
