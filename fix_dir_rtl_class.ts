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
  if (content.includes("dir-rtl")) {
    content = content
      .replace(/dir-rtl /g, "")
      .replace(/ dir-rtl/g, "")
      .replace(/"dir-rtl"/g, '""');
    fs.writeFileSync(file, content);
    console.log("Updated class", file);
  }
}
