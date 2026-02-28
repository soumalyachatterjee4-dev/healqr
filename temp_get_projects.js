const cp = require('child_process');
const fs = require('fs');
try {
  const result = cp.execSync('npx firebase projects:list --json');
  fs.writeFileSync('firebase_projects_out.json', result);
} catch (e) {
  fs.writeFileSync('firebase_projects_out.json', JSON.stringify({error: e.toString()}));
}
