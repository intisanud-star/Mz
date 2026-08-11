const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const navHiddenSearchStr = `(['institution-channel', 'institution-profile', 'school-feed', 'workspace', 'videos', 'records', 'attendance', 'classroom', 'daily-routine', 'hub', 'reels'].includes(view) || activeChat !== null) ? null`;
const navHiddenReplaceStr = `(['workspace', 'videos', 'records', 'attendance', 'classroom', 'daily-routine', 'reels'].includes(view)) ? null`;

if (content.includes(navHiddenSearchStr)) {
  content = content.replace(navHiddenSearchStr, navHiddenReplaceStr);
  console.log("Successfully replaced nav hidden string again");
} else {
  console.log("Could not find nav hidden string");
}

fs.writeFileSync('src/App.tsx', content, 'utf8');
