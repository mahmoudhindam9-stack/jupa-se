const fs = require("fs");
let content = fs.readFileSync("src/routes/admin/mall.tsx", "utf8");

const oldCode = `                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute(
                            "download",
                            \`تقرير_تذاكر_الحديقة_الشامل_\${new Date().toISOString().split("T")[0]}.csv\`,
                          );
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);`;

const newCode = `                          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.setAttribute("href", url);
                          link.setAttribute(
                            "download",
                            \`تقرير_تذاكر_الحديقة_الشامل_\${new Date().toISOString().split("T")[0]}.csv\`,
                          );
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync("src/routes/admin/mall.tsx", content);
  console.log("Success");
} else {
  console.log("Not found!");
}
