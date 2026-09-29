const fs = require("fs");
const file = "src/shared/services/translationService.ts";
let content = fs.readFileSync(file, "utf-8");

const dict = {
  // Common terms from frequency list
  "غير محدد": "Not specified",
  البيان: "Description",
  "طريقة الدفع": "Payment Method",
  "اسم الحساب": "Account Name",
  "كود الحساب": "Account Code",
  "رقم الحساب": "Account Number",
  "سنتر بوب": "Center Pop",
  كيلو: "Kilo",
  دائن: "Credit",
  مدين: "Debit",
  الخزينة: "Treasury",
  الكاشير: "Cashier",
  الوحدة: "Unit",
  المول: "The Mall",
  الكمية: "Quantity",
  "رقم القيد": "Journal Number",
  "الرصيد الافتتاحي": "Opening Balance",
  المرجع: "Reference",
  "نوع الحركة": "Transaction Type",
  المسؤول: "Person in Charge",
  "رقم الهاتف": "Phone Number",
  البند: "Item",
  "رقم المحل": "Shop Number",
  "رقم الطلب": "Order Number",
  خزينة: "Treasury",
  القيمة: "Value",
  العميل: "Customer",
  "التاريخ والوقت": "Date & Time",
  "التاريخ والتوقيت": "Date & Time",
  كاش: "Cash",
  "تحويل بنكي": "Bank Transfer",
  توصيل: "Delivery",
  محفظة: "Wallet",
  "محفظة إلكترونية": "E-Wallet",
  "خامات ومواد أولية": "Raw Materials",
  "أمين الصندوق": "Treasurer",
  المورد: "Supplier",
  "اسم المستأجر": "Tenant Name",
  المستأجر: "Tenant",
  "اسم الكاشير": "Cashier Name",
  كاشير: "Cashier",
  "نوع الحساب": "Account Type",
  تنبيه: "Alert",
  الفرع: "Branch",
  الوصف: "Description",
  بقيمة: "with value",
  "قيد رقم": "Journal No",
  "الرصيد التراكمي": "Cumulative Balance",
  "خزينة الكاشير": "Cashier Treasury",
  صالة: "Dine-in",
  "نوع الطلب": "Order Type",
  "متنوعة واكراميات": "Miscellaneous & Tips",
  "حفظ التعديلات": "Save Changes",
  الإدارة: "Management",
  المستوى: "Level",
  الفترة: "Period",
  "مبلغ التأمين": "Insurance Amount",
  "مغلقة ومرحلة": "Closed & Posted",
  النوع: "Type",
  مثال: "Example",
};

let entries = [];
for (let key in dict) {
  entries.push(`  "${key}": "${dict[key]}",`);
}

const replaceString = "  // Dialogs & Messages";
const newText = content.replace(replaceString, entries.join("\n") + "\n" + replaceString);

fs.writeFileSync(file, newText);
console.log("Updated dictionary more");
