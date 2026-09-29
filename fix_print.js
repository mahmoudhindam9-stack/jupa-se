const fs = require("fs");
let content = fs.readFileSync("src/components/mall/ParkTicketsPOS.tsx", "utf8");

// The messed up string probably has lots of spaces and newlines.
// We will replace it safely.
content = content.replace(
  /toast\.success\("جاري إرسال أمر الطباعة وفتح نافذة الطباعة 🖨️"\);[\s\S]*?printerService\.printHtmlWindow\(receiptData\);[\s\S]*?\}/g,
  `toast.success("جاري إرسال أمر الطباعة وفتح نافذة الطباعة 🖨️");
      printerService.printHtmlWindow(receiptData);
    }`,
);

fs.writeFileSync("src/components/mall/ParkTicketsPOS.tsx", content);
