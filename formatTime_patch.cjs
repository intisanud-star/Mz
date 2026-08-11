const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const formatTime = \(timestamp: any\) => \{[\s\S]*?\n\};/;
const replacement = `const formatTime = (timestamp: any) => {
  if (!timestamp) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  try {
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : (timestamp instanceof Date ? timestamp : new Date(timestamp));
    if (isNaN(date.getTime())) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const now = new Date();
    
    // Check if it's today
    if (date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if it's yesterday
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
      return 'Yesterday';
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
  } catch (e) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', content, 'utf8');
  console.log("Successfully replaced formatTime");
} else {
  console.log("Could not find formatTime");
}
