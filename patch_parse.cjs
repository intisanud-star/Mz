const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regexParsePostDate = /const parsePostDate = \(timestamp: any\) => \{[\s\S]*?\n\s*\};/;
const replacementParsePostDate = `const parsePostDate = (timestamp: any) => {
          if (!timestamp) return new Date();
          if (timestamp instanceof Date) return timestamp;
          if (typeof timestamp.toDate === 'function') return timestamp.toDate();
          if (timestamp.seconds && typeof timestamp.seconds === 'number') {
            return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
          }
          const parsed = new Date(timestamp);
          if (!isNaN(parsed.getTime())) return parsed;
          return new Date();
        };`;

if (content.match(regexParsePostDate)) {
  content = content.replace(regexParsePostDate, replacementParsePostDate);
  fs.writeFileSync('src/App.tsx', content, 'utf8');
  console.log("Replaced parsePostDate");
} else {
  console.log("Could not find parsePostDate");
}
