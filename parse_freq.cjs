const fs = require("fs");
const glob = require("glob");

function extractArabic(files) {
  const counts = {};
  const arabicRegex =
    /([\u0600-\u06FF][\u0600-\u06FF\sA-Za-z0-9_().,-]*[\u0600-\u06FFA-Za-z0-9_().,-])/g;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    const matches = content.match(arabicRegex);
    if (matches) {
      matches.forEach((m) => {
        const clean = m.trim().replace(/^['"`<>\/]+|['"`<>\/]+$/g, "");
        if (clean.length > 2 && !clean.includes("import ") && !clean.includes("export ")) {
          counts[clean] = (counts[clean] || 0) + 1;
        }
      });
    }
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

const files = glob.sync("src/**/*.{ts,tsx}");
const extracted = extractArabic(files);
console.log(extracted.slice(0, 100).map((e) => e[0]));
