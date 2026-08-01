const fs = require('fs');

const appContent = fs.readFileSync('src/App.tsx', 'utf8');

const startMarker = "      case 'hub': {";
const endMarker = "      case 'nexclass': {";

const startIndex = appContent.indexOf(startMarker);
const endIndex = appContent.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find start or end markers');
  process.exit(1);
}

const newHubCode = require('./replace_hub.ts').hubCode;

const newAppContent = appContent.substring(0, startIndex) + newHubCode + '\n' + appContent.substring(endIndex);

fs.writeFileSync('src/App.tsx', newAppContent);
console.log('Replacement successful');
