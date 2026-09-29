import fs from "fs";
import glob from "glob";
import path from "path";

function getFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === "node_modules" || item === "dist" || item === ".git") continue;
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      files.push(...getFiles(fullPath));
    } else if (fullPath.endsWith(".tsx") || fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles("src");
for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  if (content.includes('dir="rtl"')) {
    // Only remove hardcoded dir="rtl" if we have translator handling it
    // Actually, translator handles document element, but if individual divs have dir="rtl",
    // we should replace it with dynamically getting the direction.
    // However, a simpler way is to replace `dir="rtl"` with `dir={translator.getLanguage() === 'ar' ? 'rtl' : 'ltr'}`
    // Or just remove it and rely on the global html[dir] property.
    content = content.replace(/ dir="rtl"/g, "");
    fs.writeFileSync(file, content);
    console.log("Updated", file);
  }
}
