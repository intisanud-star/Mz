const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const navSearchStr = `(['workspace', 'videos', 'records', 'attendance', 'classroom', 'daily-routine', 'reels'].includes(view)) ? null : activeInstForBroadcast ?`;
const navReplaceStr = `(['chat', 'institution-channel', 'institution-profile', 'workspace', 'videos', 'records', 'attendance', 'classroom', 'daily-routine', 'reels'].includes(view) || activeChat !== null) ? null : activeInstForBroadcast ?`;

if (content.includes(navSearchStr)) {
  content = content.replace(navSearchStr, navReplaceStr);
  fs.writeFileSync('src/App.tsx', content, 'utf8');
  console.log("Successfully replaced bottom nav condition");
} else {
  console.log("Could not find bottom nav condition");
}
