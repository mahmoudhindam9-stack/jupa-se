const fs = require("fs");

function extractArabic(files) {
  const result = new Set();
  const arabicRegex =
    /([\u0600-\u06FF][\u0600-\u06FF\sA-Za-z0-9_().,-]*[\u0600-\u06FFA-Za-z0-9_().,-])/g;

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf-8");
    const matches = content.match(arabicRegex);
    if (matches) {
      matches.forEach((m) => {
        const clean = m.trim().replace(/^['"`<>\/]+|['"`<>\/]+$/g, "");
        if (clean.length > 2) {
          result.add(clean);
        }
      });
    }
  });
  return Array.from(result);
}

const files = [
  "src/routes/admin/index.tsx",
  "src/routes/admin/restaurant.tsx",
  "src/routes/admin/inventory.tsx",
];
console.log(JSON.stringify(extractArabic(files).slice(0, 50), null, 2));
