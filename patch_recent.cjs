const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const recentChats = useMemo\(\(\) => \{([\s\S]*?)\}, \[allMessages, user\?\.uid, chatGroups\]\);/g;

const match = regex.exec(content);
if (match) {
  let funcBody = match[1];
  funcBody = funcBody.replace(/const msgTime = \(msg\.timestamp\?\.seconds \|\| Date\.now\(\) \/ 1000\);/g, 
  `const getSecs = (m) => {
        if (!m || !m.timestamp) return Date.now() / 1000;
        if (m.timestamp.seconds) return m.timestamp.seconds;
        if (typeof m.timestamp.toMillis === 'function') return m.timestamp.toMillis() / 1000;
        if (m.timestamp instanceof Date) return m.timestamp.getTime() / 1000;
        const parsed = new Date(m.timestamp);
        return !isNaN(parsed.getTime()) ? parsed.getTime() / 1000 : Date.now() / 1000;
      };
      const msgTime = getSecs(msg);`);
      
  funcBody = funcBody.replace(/msgTime > \(existing\.lastMessage\.timestamp\?\.seconds \|\| 0\)/g, `msgTime > getSecs(existing.lastMessage)`);
  funcBody = funcBody.replace(/return Object\.values\(chatsMap\)\.sort\(\(a, b\) =>\s*\(\(b\.lastMessage\.timestamp\?\.seconds \|\| Date\.now\(\) \/ 1000\) - \(a\.lastMessage\.timestamp\?\.seconds \|\| Date\.now\(\) \/ 1000\)\)\s*\);/g,
  `return Object.values(chatsMap).sort((a, b) => getSecs(b.lastMessage) - getSecs(a.lastMessage));`);

  content = content.replace(match[0], `const recentChats = useMemo(() => {${funcBody}}, [allMessages, user?.uid, chatGroups]);`);
  fs.writeFileSync('src/App.tsx', content, 'utf8');
  console.log("Successfully replaced recentChats");
} else {
  console.log("Could not match recentChats useMemo block");
}
