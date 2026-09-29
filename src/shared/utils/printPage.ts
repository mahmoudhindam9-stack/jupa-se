import { printRawHtml } from "./printAccountingDocument";

export function printCurrentPage() {
  if (typeof window === "undefined") return;

  // Many iframe sandbox environments block window.print() completely.
  // We can copy the current document to a new window which has fewer restrictions.

  const headHtml = document.head.innerHTML;
  const bodyHtml = document.body.innerHTML;
  const dir = document.documentElement.dir || "rtl";
  const lang = document.documentElement.lang || "ar";
  const bodyClasses = document.body.className;

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="${dir}" lang="${lang}">
    <head>
      ${headHtml}
      <style>
        @media print {
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body class="${bodyClasses}">
      ${bodyHtml}
      <script>
        // Strip out scripts to prevent re-execution of app logic in the print window
        const scripts = document.querySelectorAll('script');
        scripts.forEach(s => s.remove());
        
        setTimeout(() => {
          window.focus();
          window.print();
        }, 1000);
      </script>
    </body>
    </html>
  `;

  printRawHtml(htmlContent);
}
