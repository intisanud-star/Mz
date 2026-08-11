const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /className="shrink-0 bg-white border-t border-gray-200 p-3 flex flex-col gap-1 shadow-inner relative w-full z-40"/g;
if (content.match(regex)) {
  content = content.replace(regex, 'className="shrink-0 bg-white border-t border-gray-200 p-3 pb-24 flex flex-col gap-1 shadow-inner relative w-full z-40"');
  fs.writeFileSync('src/App.tsx', content, 'utf8');
  console.log("Replaced chat input bar padding");
} else {
  console.log("Could not find chat input bar");
}
