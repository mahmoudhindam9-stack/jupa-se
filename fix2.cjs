const fs = require("fs");
const file = "src/shared/services/translationService.ts";
let content = fs.readFileSync(file, "utf-8");

// Fix the corrupted block
content = content.replace(
  /this\.observer = new MutationObserver\(\(mutations: MutationRecord\[\]\) => \{[\s\S]*?\}\);\s*\} else if \(mutation\.type === "characterData"\) \{[\s\S]*?\}\);/m,
  `this.observer = new MutationObserver((mutations: MutationRecord[]) => {
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
    });`,
);
fs.writeFileSync(file, content);
