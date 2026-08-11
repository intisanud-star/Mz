const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /className="shrink-0 bg-white border-t border-gray-200 p-3 flex items-center gap-2 shadow-inner"/g;
if (content.match(regex)) {
  content = content.replace(regex, 'className="shrink-0 bg-white border-t border-gray-200 p-3 pb-24 flex items-center gap-2 shadow-inner"');
  fs.writeFileSync('src/App.tsx', content, 'utf8');
  console.log("Replaced channel input bar padding");
} else {
  console.log("Could not find channel input bar");
}
