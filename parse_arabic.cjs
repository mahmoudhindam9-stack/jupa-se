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
        if (clean.length > 2 && !clean.includes("import ") && !clean.includes("export ")) {
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
  "src/routes/admin/menu.tsx",
  "src/routes/admin/hr.tsx",
  "src/routes/admin/orders.tsx",
  "src/routes/admin/reports.tsx",
];
const extracted = extractArabic(files);
console.log(`Found ${extracted.length} arabic strings. Sample:`, extracted.slice(0, 10));
