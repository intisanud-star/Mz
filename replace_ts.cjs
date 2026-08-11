const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// replace timestamp: serverTimestamp() with timestamp: new Date()
content = content.replace(/timestamp:\s*serverTimestamp\(\)/g, 'timestamp: new Date()');

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log("Replaced serverTimestamp for timestamp fields");
