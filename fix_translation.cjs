const fs = require("fs");
const file = "src/shared/services/translationService.ts";
let content = fs.readFileSync(file, "utf-8");

// Remove the `if (this.isTranslating) return;` from translateNode and restoreNode.
content = content.replace(
  /translateNode\(node: Node\): void \{\s*if \(this\.isTranslating\) return;/g,
  "translateNode(node: Node): void {",
);
content = content.replace(
  /restoreNode\(node: Node\): void \{\s*if \(this\.isTranslating\) return;/g,
  "restoreNode(node: Node): void {",
);

// In MutationObserver, remove this.isTranslating entirely from the condition because we want to use observer.disconnect() instead.
content = content.replace(
  /this\.observer = new MutationObserver\(\(mutations: MutationRecord\[\]\) => \{[\s\S]*?\}\);/m,
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
console.log("Fixed translation logic");
