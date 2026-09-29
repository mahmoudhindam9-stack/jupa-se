const fs = require("fs");
const file = "src/shared/services/translationService.ts";
let content = fs.readFileSync(file, "utf-8");

const dict = {
  "الشركة المصرية لادارة المشروعات السياحية والترفيهية (بهجت جروب)":
    "Egyptian Company for Tourism and Entertainment Projects (Bahgat Group)",
  "الشركة المصرية لادارة المشروعات السياحية والترفيهية (بهجت جروب) (مجمع)":
    "Egyptian Company for Tourism and Entertainment Projects (Bahgat Group) (Consolidated)",
  "الشركة المصرية لادارة المشروعات السياحية والترفيهية (بهجت جروب) تضمن تشفير وتوثيق":
    "Egyptian Company for Tourism and Entertainment Projects (Bahgat Group) ensures encryption and authentication",
  "نظام الحسابات والـ ERP الشامل": "Comprehensive Accounting & ERP System",
  "إشراف مركزي متكامل على فروع المؤسسة، الخزائن النقدية، الحسابات البنكية، السندات والرقابة العامة":
    "Integrated central supervision over company branches, cash treasuries, bank accounts, vouchers, and general control",
};

let entries = [];
for (let key in dict) {
  entries.push(`  "${key}": "${dict[key]}",`);
}

const replaceString = "  // Dialogs & Messages";
const newText = content.replace(replaceString, entries.join("\n") + "\n" + replaceString);

fs.writeFileSync(file, newText);
console.log("Updated dictionary");
