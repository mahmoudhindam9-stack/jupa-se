const fs = require("fs");
let content = fs.readFileSync("src/shared/services/erpStore.ts", "utf8");

content = content.replace(
  /notify\(\) \{\n    this.listeners.forEach\(\(l\) => l\(this.getState\(\)\)\);\n  \}/g,
  "notify() {\n    this.state = { ...this.state };\n    this.listeners.forEach((l) => l(this.getState()));\n  }",
);

fs.writeFileSync("src/shared/services/erpStore.ts", content);
console.log("Success notify fixed");
