import fs from fs;
import path from path;

const root = path.resolve(src/figma);
const files = [];
function walk(dir){
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (p.endsWith(.ts) || p.endsWith(.tsx)) files.push(p);
  }
}
walk(root);

for (const file of files){
  const s = fs.readFileSync(file, utf8);
  const out = s.replace(/from "([^"]+)@\d[^\"]*"/g, from
