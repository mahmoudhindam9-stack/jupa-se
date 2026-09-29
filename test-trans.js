const fs = require("fs");
const tsConfig = require("./tsconfig.json");
require("ts-node").register(tsConfig);
const { translator } = require("./src/shared/services/translationService.ts");
translator.setLanguage("en");
console.log(translator.t("إدارة تشغيل المطعم بالكامل"));
console.log(translator.t("نظام إدارة المطاعم المتقدم"));
