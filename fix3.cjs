const fs = require("fs");
const file = "src/shared/services/translationService.ts";
let content = fs.readFileSync(file, "utf-8");

const startIdx = content.indexOf("start(): void {");
if (startIdx !== -1) {
  content = content.substring(0, startIdx);
  content += `start(): void {
    if (typeof window === "undefined" || this.isObserving) return;

    const stored = localStorage.getItem("app_lang") as AppLanguage;
    this.currentLang = stored === "en" ? "en" : "ar";
    document.documentElement.lang = this.currentLang;
    document.documentElement.dir = this.currentLang === "ar" ? "rtl" : "ltr";

    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      if (this.currentLang !== "en" || this.isTranslating) return;
      this.isTranslating = true;
      try {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              this.translateNode(node);
            });
          } else if (mutation.type === "characterData") {
            this.translateNode(mutation.target);
          }
        });
      } finally {
        this.isTranslating = false;
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    if (this.currentLang === "en") {
      this.applyFullTranslation();
    }
    this.isObserving = true;
  }
}

export const translator = new TranslationService();
`;
  fs.writeFileSync(file, content);
  console.log("Fixed start method");
}
