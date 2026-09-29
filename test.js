const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
const document = dom.window.document;
const NodeFilter = dom.window.NodeFilter;

const AR_TO_EN = { مرحبا: "Hello", تسجيل: "Register" };

function translateTextString(text) {
  let translated = text;
  for (const [ar, en] of Object.entries(AR_TO_EN)) {
    translated = translated.split(ar).join(en);
  }
  return translated;
}

function translateNode(node) {
  if (node.nodeType === 3) {
    node.nodeValue = translateTextString(node.nodeValue);
    return;
  }
  if (node.nodeType === 1) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let curr;
    while ((curr = walker.nextNode())) {
      curr.nodeValue = translateTextString(curr.nodeValue);
    }
  }
}

const div = document.createElement("div");
div.innerHTML = "<p>مرحبا بك في تطبيقنا. اضغط <span>تسجيل</span> هنا</p>";
translateNode(div);
console.log(div.innerHTML);
