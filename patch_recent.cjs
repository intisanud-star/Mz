const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const getSecsFunc = `      const getSecs = (m) => {
        if (!m || !m.timestamp) return Date.now() / 1000;
        if (m.timestamp.seconds) return m.timestamp.seconds;
        if (typeof m.timestamp.toMillis === 'function') return m.timestamp.toMillis() / 1000;
        if (m.timestamp instanceof Date) return m.timestamp.getTime() / 1000;
        const parsed = new Date(m.timestamp);
        return !isNaN(parsed.getTime()) ? parsed.getTime() / 1000 : Date.now() / 1000;
      };`;

content = content.replace(/      const getSecs = \(m\) => \{[\s\S]*?\};\n/, '');

content = content.replace(/    allMessages\.forEach\(msg => \{/, getSecsFunc + '\n    allMessages.forEach(msg => {');

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log("Moved getSecs outside forEach");
