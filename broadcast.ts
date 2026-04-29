import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Telegraf } from 'telegraf';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase
const adminApp = getApps().length === 0 
  ? initializeApp({ projectId: firebaseConfig.projectId }) 
  : getApp();

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN environment variable is not set.');
  process.exit(1);
}

const bot = new Telegraf(token);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runBroadcast(message: string, imageUrl?: string, button?: { text: string, url: string }) {
  console.log('--- Starting Broadcast ---');
  
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('chat_id', '!=', null).get();
    const users = snapshot.docs.map(doc => doc.data());
    
    console.log(`Found ${users.length} users with Telegram chat IDs.`);

    let success = 0;
    let failed = 0;

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
          await bot.telegram.sendPhoto(chatId, imageUrl, { caption: message, ...extra });
        } else {
          await bot.telegram.sendMessage(chatId, message, extra);
        }
        success++;
        console.log(`[PASS] Sent to ${chatId}`);
      } catch (err) {
        console.error(`[FAIL] Could not send to ${chatId}:`, err);
        failed++;
      }
      
      // 50ms delay as requested
      await delay(50);
    }

    console.log(`\n--- Broadcast Complete ---`);
    console.log(`Delivered: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${users.length}`);

  } catch (error) {
    console.error('Fatal error during broadcast:', error);
  }
}

// Example usage (uncomment if running standalone via CLI)
/*
const msg = "Check out our latest update in the Exona network!";
const img = "https://exona.app/assets/broadcast_hero.jpg";
const btn = { text: "Open App", url: "https://exona.app" };
runBroadcast(msg, img, btn);
*/

export { runBroadcast };
