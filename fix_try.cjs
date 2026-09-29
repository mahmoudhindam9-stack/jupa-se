const fs = require("fs");
let content = fs.readFileSync("src/components/mall/ParkTicketsPOS.tsx", "utf8");

content = content.replace(
  /      const res = erpStore\.processParkTicketSale/g,
  `    try {
      const res = erpStore.processParkTicketSale`,
);

content = content.replace(
  /      erpStore\.refundParkTicketTransaction/g,
  `    try {
      erpStore.refundParkTicketTransaction`,
);

content = content.replace(
  /      erpStore\.updateParkTicketTransactionDateTime/g,
  `    try {
      erpStore.updateParkTicketTransactionDateTime`,
);

fs.writeFileSync("src/components/mall/ParkTicketsPOS.tsx", content);
