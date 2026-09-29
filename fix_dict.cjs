const fs = require("fs");
const file = "src/shared/services/translationService.ts";
let content = fs.readFileSync(file, "utf-8");

const dict = {
  // from admin/restaurant.tsx
  "إدارة المطعم - النظام الشامل": "Restaurant Management - Full System",
  "نظام إدارة المطاعم المتقدم": "Advanced Restaurant Management System",
  "إدارة تشغيل المطعم بالكامل": "Complete Restaurant Operations Management",
  "منصة مركزية متكاملة للكاشير، نقاط البيع، المطبخ، المنيو والمخزن. اختر القسم الذي تريد فتحه مباشرة.":
    "Centralized platform for cashier, POS, kitchen, menu, and inventory. Choose the module to open directly.",
  "فتح نقطة البيع الآن": "Open Point of Sale Now",
  "أقسام نظام تشغيل المطعم": "Restaurant Operations Modules",
  "أقسام أساسية": "Core Modules",
  "نقطة البيع (POS)": "Point of Sale (POS)",
  "شاشة البيع السريعة لإدخال الطلبات، الدفع، وطباعة الفواتير":
    "Fast sales screen for order entry, payment, and receipt printing",
  الرئيسية: "Main",
  "مبيعات سريعة": "Quick Sales",
  "شاشة الكاشير والخزينة": "Cashier & Treasury Screen",
  "إدارة النقدية اليومية، فتح وإغلاق الشيفتات، وحركات الخزينة":
    "Daily cash management, shift opening/closing, and treasury transactions",
  مالي: "Financial",
  "الخزينة والشيفتات": "Treasury & Shifts",
  "شاشة المطبخ (الفرن)": "Kitchen Screen (Oven)",
  "متابعة الطلبات الواردة للمطبخ والفرن وأوقات التجهيز الفعلي":
    "Monitor incoming orders to kitchen and oven, and actual prep times",
  تشغيل: "Operations",
  "المطبخ والفرن": "Kitchen & Oven",
  "شاشة طلبات العملاء (Captain)": "Customer Orders Screen (Captain)",
  "تسجيل طلبات الطاولات والصالة بواسطة الكابتن والويتر":
    "Table and hall order entry by Captain and Waiter",
  الصالة: "Dine-in",
  "طلبات الكابتن": "Captain Orders",
  "إدارة الطلبات والفواتير": "Orders & Invoices Management",
  "سجل كامل للطلبات، متابعة الحالات، وتعديل أو إلغاء الطلبات":
    "Complete order log, status tracking, and order editing or cancellation",
  متابعة: "Tracking",
  "طلب مسجل": "Registered Order",
  "إدارة المنيو والأصناف": "Menu & Items Management",
  "إضافة وتعديل الأقسام، الأسعار، الشعارات، والمكونات":
    "Add and edit categories, prices, badges, and ingredients",
  القائمة: "Menu",
  "صنف في المنيو": "Item in Menu",
  "المخزن والمستودع": "Inventory & Warehouse",
  "متابعة أرصدة المواد الخام، الوارد والصادر، وجرد المستودع":
    "Monitor raw material balances, in/out, and warehouse inventory",
  مخزون: "Inventory",
  "صنف مخزني": "Inventory Item",
  "فتح الواجهة": "Open Interface",
};

let entries = [];
for (let key in dict) {
  entries.push(`  "${key}": "${dict[key]}",`);
}

const replaceString = "  // Dialogs & Messages";
const newText = content.replace(replaceString, entries.join("\n") + "\n" + replaceString);

fs.writeFileSync(file, newText);
console.log("Updated dictionary");
