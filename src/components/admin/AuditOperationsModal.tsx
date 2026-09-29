import { useMemo, useState } from "react";
import { Download, FileText, History, Printer, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuditLog = {
  id?: string;
  created_at?: string;
  user_email?: string;
  action?: string;
  action_type?: string;
  details?: string;
  description?: string;
  resource_type?: string;
  resource_id?: string;
  severity?: string;
  [key: string]: any;
};

function normalize(value: unknown) {
  return String(value ?? "")
    .toLocaleLowerCase("ar-EG")
    .normalize("NFKC")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .trim();
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ar-EG");
}

function printableText(log: AuditLog) {
  const details = log.details ?? log.description ?? "";
  return `${formatDate(log.created_at)} | ${log.user_email ?? "غير محدد"} | ${
    log.action ?? log.action_type ?? "عملية"
  } | ${details}`;
}

export function AuditOperationsModal({
  open,
  onOpenChange,
  logs = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs?: AuditLog[];
}) {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [printMode, setPrintMode] = useState<"filtered" | "all" | "summary">("filtered");

  const prepared = useMemo(
    () =>
      (logs || []).map((log) => ({
        ...log,
        _search: normalize(
          [
            log.id,
            log.user_email,
            log.action,
            log.action_type,
            log.details,
            log.description,
            log.resource_type,
            log.resource_id,
            log.severity,
            log.created_at,
          ]
            .filter(Boolean)
            .join(" "),
        ),
      })),
    [logs],
  );

  const filtered = useMemo(() => {
    const q = normalize(search);
    return prepared
      .filter((log) => severity === "all" || normalize(log.severity || "info") === severity)
      .filter((log) => !q || log._search.includes(q))
      .sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime(),
      );
  }, [prepared, search, severity]);

  const counts = useMemo(() => {
    const result = { all: prepared.length, critical: 0, warning: 0, info: 0 };
    prepared.forEach((log) => {
      const level = normalize(log.severity || "info");
      if (level === "critical" || level === "حرج") result.critical += 1;
      else if (level === "warning" || level === "تحذير") result.warning += 1;
      else result.info += 1;
    });
    return result;
  }, [prepared]);

  const printLogs = printMode === "all" ? prepared : filtered;

  const handlePrint = () => {
    const title =
      printMode === "summary"
        ? "ملخص سجل العمليات"
        : printMode === "all"
          ? "سجل العمليات الكامل"
          : "سجل العمليات - النتائج الحالية";

    const rows =
      printMode === "summary"
        ? `<div class="summary"><p>إجمالي العمليات: ${counts.all}</p><p>الحرجة: ${counts.critical}</p><p>التحذيرات: ${counts.warning}</p><p>المعلومات: ${counts.info}</p><p>نتائج البحث الحالية: ${filtered.length}</p></div>`
        : `<table><thead><tr><th>التاريخ</th><th>المستخدم</th><th>الإجراء</th><th>التفاصيل</th><th>المستوى</th></tr></thead><tbody>${printLogs
            .map(
              (log) =>
                `<tr><td>${formatDate(log.created_at)}</td><td>${log.user_email ?? "—"}</td><td>${log.action ?? log.action_type ?? "عملية"}</td><td>${log.details ?? log.description ?? "—"}</td><td>${log.severity ?? "info"}</td></tr>`,
            )
            .join("")}</tbody></table>`;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111827}h1{font-size:22px;margin-bottom:18px}.summary{display:grid;gap:8px;font-size:16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d1d5db;padding:8px;text-align:right;vertical-align:top}th{background:#f3f4f6} @media print{body{padding:10px}}</style></head><body><h1>${title}</h1>${rows}</body></html>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[96vw] h-[88vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <History className="text-primary" size={20} />
                سجل العمليات والرقابة
              </DialogTitle>
              <DialogDescription className="mt-1">
                بحث ذكي في جميع عمليات النظام مع فلاتر وطباعة مستقلة.
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="إغلاق"
            >
              <X size={18} />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 border-b space-y-4 bg-background">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border bg-muted/20 p-3">
              <div className="text-[11px] text-muted-foreground font-bold">الإجمالي</div>
              <div className="text-xl font-black">{counts.all}</div>
            </div>
            <div className="rounded-2xl border bg-rose-50 dark:bg-rose-950/20 p-3">
              <div className="text-[11px] text-muted-foreground font-bold">حرجة</div>
              <div className="text-xl font-black text-rose-600">{counts.critical}</div>
            </div>
            <div className="rounded-2xl border bg-amber-50 dark:bg-amber-950/20 p-3">
              <div className="text-[11px] text-muted-foreground font-bold">تحذيرات</div>
              <div className="text-xl font-black text-amber-600">{counts.warning}</div>
            </div>
            <div className="rounded-2xl border bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <div className="text-[11px] text-muted-foreground font-bold">النتائج</div>
              <div className="text-xl font-black text-emerald-600">{filtered.length}</div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 h-11"
                placeholder="بحث باسم المستخدم، رقم العملية، الإجراء، التفاصيل، التاريخ..."
              />
            </div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm font-bold"
            >
              <option value="all">كل المستويات</option>
              <option value="info">معلومات</option>
              <option value="warning">تحذير</option>
              <option value="critical">حرج</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value as any)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-xs font-bold"
            >
              <option value="filtered">طباعة النتائج الحالية</option>
              <option value="all">طباعة السجل الكامل</option>
              <option value="summary">طباعة ملخص</option>
            </select>
            <Button onClick={handlePrint} className="gap-2 rounded-xl font-bold">
              <Printer size={15} /> طباعة
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const blob = new Blob([filtered.map(printableText).join("\n")], {
                  type: "text/plain;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "audit-operations.txt";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="gap-2 rounded-xl font-bold"
            >
              <Download size={15} /> تصدير
            </Button>
            <Badge variant="outline" className="mr-auto px-3 py-1">
              <FileText size={13} className="ml-1" /> {filtered.length} نتيجة
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-2xl border overflow-hidden bg-background">
            <div className="grid grid-cols-[150px_1.1fr_1fr_2fr_90px] gap-0 bg-muted/40 text-xs font-black sticky top-0 z-10 border-b">
              <div className="p-3">التاريخ</div>
              <div className="p-3">المستخدم</div>
              <div className="p-3">الإجراء</div>
              <div className="p-3">التفاصيل</div>
              <div className="p-3">المستوى</div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground font-bold">
                لا توجد عمليات مطابقة للبحث.
              </div>
            ) : (
              filtered.map((log, index) => (
                <div
                  key={log.id || `${log.created_at}-${index}`}
                  className="grid grid-cols-[150px_1.1fr_1fr_2fr_90px] border-b last:border-b-0 hover:bg-muted/20 text-xs"
                >
                  <div className="p-3 text-muted-foreground">{formatDate(log.created_at)}</div>
                  <div className="p-3 font-bold break-words">{log.user_email || "غير محدد"}</div>
                  <div className="p-3 font-bold">{log.action || log.action_type || "عملية"}</div>
                  <div className="p-3 text-muted-foreground break-words">
                    {log.details || log.description || "—"}
                  </div>
                  <div className="p-3">
                    <Badge variant="outline">{log.severity || "info"}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
