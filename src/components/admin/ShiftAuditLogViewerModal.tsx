import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Search,
  RefreshCw,
  Database,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileCode,
  Download,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  shiftAuditService,
  ShiftAuditLogEntry,
  ShiftType,
  ShiftVisibilityAnalysis,
} from "@/features/shifts/services/shiftAuditService";
import { erpStore } from "@/shared/services/erpStore";
import { toast } from "sonner";

interface ShiftAuditLogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShiftId?: string;
  initialShiftType?: ShiftType;
}

export const ShiftAuditLogViewerModal: React.FC<ShiftAuditLogViewerModalProps> = ({
  isOpen,
  onClose,
  initialShiftId,
  initialShiftType,
}) => {
  const [activeTab, setActiveTab] = useState<"logs" | "inspector">("logs");
  const [logs, setLogs] = useState<ShiftAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"supabase" | "local" | "hybrid">("local");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<ShiftType | "ALL">(initialShiftType || "ALL");
  const [selectedAction, setSelectedAction] = useState<string>("ALL");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Inspector State
  const [selectedInspectorShiftId, setSelectedInspectorShiftId] = useState<string>(
    initialShiftId || "",
  );
  const [visibilityAnalysis, setVisibilityAnalysis] =
    useState<ShiftVisibilityAnalysis | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await shiftAuditService.getShiftAuditLogs({
        shiftType: selectedType !== "ALL" ? selectedType : undefined,
        action: selectedAction !== "ALL" ? selectedAction : undefined,
        searchQuery: searchQuery.trim() || undefined,
        limit: 200,
      });
      setLogs(res.logs);
      setSource(res.source);
    } catch (err: any) {
      toast.error("فشل جلب سجلات التدقيق: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, selectedType, selectedAction]);

  // All shifts currently in erpStore
  const allShifts = useMemo(() => {
    const parkShifts = erpStore.getParkShifts();
    const restShifts = erpStore.getRestaurantShifts();
    return [...parkShifts, ...restShifts];
  }, [isOpen, logs]);

  // Set default inspector shift if not selected
  useEffect(() => {
    if (!selectedInspectorShiftId && allShifts.length > 0) {
      setSelectedInspectorShiftId(allShifts[0].id);
    }
  }, [allShifts, selectedInspectorShiftId]);

  // Run visibility analysis whenever selected shift changes
  useEffect(() => {
    if (!selectedInspectorShiftId) {
      setVisibilityAnalysis(null);
      return;
    }
    const found = allShifts.find((s) => s.id === selectedInspectorShiftId);
    if (!found) {
      setVisibilityAnalysis(null);
      return;
    }

    const isPark =
      found.id.startsWith("shift-park-") || found.auto_shift_number?.startsWith("PSH");
    const active = isPark
      ? erpStore.getActiveParkShift()
      : erpStore.getActiveRestaurantShift();
    const txs = isPark
      ? erpStore.getParkTicketTransactions()
      : [];

    const analysis = shiftAuditService.analyzeShiftVisibility(
      found,
      allShifts,
      active,
      txs,
    );
    setVisibilityAnalysis(analysis);
  }, [selectedInspectorShiftId, allShifts]);

  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `shift-audit-logs-${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("تم تصدير سجل التدقيق بصيغة JSON بنجاح!");
  };

  const handleRecoverState = (targetStatus: "open" | "closed", makeActive?: boolean) => {
    if (!selectedInspectorShiftId) return;
    try {
      erpStore.recoverShiftState(selectedInspectorShiftId, targetStatus, makeActive);
      toast.success(
        `تم تحديث حالة الوردية بنجاح إلى "${targetStatus === "open" ? "مفتوحة" : "مغلقة"}" وتوثيق العملية في التدقيق!`,
      );
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "فشل إصلاح حالة الوردية");
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "OPEN":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">افتتاح OPEN</Badge>;
      case "CLOSE":
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold">إغلاق CLOSE</Badge>;
      case "RESUME":
        return <Badge className="bg-teal-600 hover:bg-teal-700 text-white font-bold">استئناف RESUME</Badge>;
      case "ACTIVATE":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">تفعيل ACTIVATE</Badge>;
      case "AUTO_CREATE":
        return <Badge className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold">إنشاء تلقائي AUTO</Badge>;
      case "UPDATE":
        return <Badge className="bg-amber-600 hover:bg-amber-700 text-white font-bold">تعديل UPDATE</Badge>;
      case "DELETE":
        return <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-bold">حذف DELETE</Badge>;
      case "FILTER_ANOMALY":
        return <Badge className="bg-purple-600 hover:bg-purple-700 text-white font-bold">تنظيف شذوذ ANOMALY</Badge>;
      case "RECOVER_STATE":
        return <Badge className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold">إصلاح حالة RECOVER</Badge>;
      default:
        return <Badge variant="outline" className="font-bold">{action}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border-border" dir="rtl">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-border bg-muted/20 flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-500/10 text-teal-600 rounded-xl">
                <Database size={20} />
              </div>
              <div>
                <DialogTitle className="text-lg font-black flex items-center gap-2">
                  سجل تدقيق الورديات في Supabase (Shift Audit Log)
                  <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600 border-teal-500/30">
                    {source === "supabase" ? "Supabase Cloud" : source === "hybrid" ? "Supabase + Local" : "مخزن محلي"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  تتبع جميع حركات فتح وإغلاق واستئناف الورديات، وتشخيص أسباب اختفاء أو ظهور الورديات بشكل خاطئ
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              className="gap-1.5 text-xs h-8 font-bold cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              تحديث
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="gap-1.5 text-xs h-8 font-bold cursor-pointer"
            >
              <Download size={13} />
              تصدير JSON
            </Button>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-muted/10 px-5 pt-2">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 font-black text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "logs"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History size={15} />
            سجل العمليات والتحولات ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("inspector")}
            className={`px-4 py-2.5 font-black text-xs border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "inspector"
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles size={15} />
            أداة فحص واكتشاف الورديات المخفية (Visibility Inspector)
          </button>
        </div>

        {/* TAB 1: LOGS EXPLORER */}
        {activeTab === "logs" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Filter Toolbar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-2xl border border-border/70">
              <div className="relative md:col-span-2">
                <Search size={14} className="absolute right-3 top-3 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  placeholder="بحث برقم الوردية، الكاشير، التفاصيل..."
                  className="pr-9 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full h-9 text-xs rounded-xl border border-input bg-background px-3 font-bold"
                >
                  <option value="ALL">جميع الأنواع (تذاكر + مطعم)</option>
                  <option value="park">تذاكر الحديقة (Park / Mall)</option>
                  <option value="restaurant">المطعم (Restaurant POS)</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full h-9 text-xs rounded-xl border border-input bg-background px-3 font-bold"
                >
                  <option value="ALL">جميع الإجراءات (All Actions)</option>
                  <option value="OPEN">افتتاح الوردية (OPEN)</option>
                  <option value="CLOSE">إغلاق الوردية (CLOSE)</option>
                  <option value="RESUME">استئناف (RESUME)</option>
                  <option value="ACTIVATE">تفعيل الجلسة (ACTIVATE)</option>
                  <option value="AUTO_CREATE">إنشاء تلقائي (AUTO_CREATE)</option>
                  <option value="UPDATE">تعديل بيانات (UPDATE)</option>
                  <option value="DELETE">حذف الوردية (DELETE)</option>
                  <option value="FILTER_ANOMALY">شذوذ تصفية (FILTER_ANOMALY)</option>
                  <option value="RECOVER_STATE">إصلاح حالة (RECOVER_STATE)</option>
                </select>
              </div>
            </div>

            {/* Logs List */}
            {logs.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-3xl p-8 bg-muted/10">
                <History size={36} className="mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="font-bold text-sm">لا توجد سجلات تدقيق تطابق معايير البحث</p>
                <p className="text-xs text-muted-foreground mt-1">
                  سيتم تسجيل كل حركة فتح أو إغلاق جديدة تلقائياً في Supabase وقاعدة البيانات المحلية
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const dateStr = log.client_timestamp || log.created_at || "";
                  const formattedDate = dateStr
                    ? new Date(dateStr).toLocaleString("ar-EG", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })
                    : "-";

                  return (
                    <div
                      key={log.id}
                      className="border border-border rounded-2xl bg-card p-4 transition shadow-xs hover:border-teal-500/50"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getActionBadge(log.action)}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-sm text-foreground">
                                {log.shift_number}
                              </h4>
                              {log.auto_shift_number && (
                                <Badge variant="outline" className="text-[10px] font-mono">
                                  {log.auto_shift_number}
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  log.shift_type === "park"
                                    ? "bg-teal-500/10 text-teal-600 border-teal-500/30"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                }`}
                              >
                                {log.shift_type === "park" ? "تذاكر الحديقة" : "المطعم"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {log.details || "لا توجد تفاصيل إضافية"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          {log.cashier_name && (
                            <div>
                              <span className="font-bold">الكاشير: </span>
                              <span className="text-foreground font-semibold">{log.cashier_name}</span>
                            </div>
                          )}

                          {(log.status_before || log.status_after) && (
                            <div className="flex items-center gap-1 font-mono text-[11px] bg-muted px-2 py-0.5 rounded-md">
                              <span>{log.status_before || "—"}</span>
                              <span>←</span>
                              <span className="font-bold text-teal-600">{log.status_after || "—"}</span>
                            </div>
                          )}

                          <div className="font-mono text-[11px]" dir="ltr">
                            {formattedDate}
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="h-7 text-[11px] font-bold text-teal-600 hover:text-teal-700"
                          >
                            {isExpanded ? "إخفاء التفاصيل" : "عرض البيانات (JSON)"}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded JSON Inspector */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border bg-muted/40 p-3 rounded-xl font-mono text-xs text-left" dir="ltr">
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50 text-muted-foreground text-[11px]">
                            <span>ID: {log.id}</span>
                            <span>Shift ID: {log.shift_id}</span>
                            <span>Synced: {log.synced_to_supabase ? "YES (Supabase)" : "LOCAL ONLY"}</span>
                          </div>
                          <pre className="overflow-x-auto text-[11px] max-h-48 text-emerald-800 dark:text-emerald-400">
                            {JSON.stringify(
                              {
                                id: log.id,
                                shift_id: log.shift_id,
                                shift_type: log.shift_type,
                                shift_number: log.shift_number,
                                auto_shift_number: log.auto_shift_number,
                                action: log.action,
                                status_before: log.status_before,
                                status_after: log.status_after,
                                cashier_name: log.cashier_name,
                                performed_by: log.performed_by,
                                details: log.details,
                                metadata: log.metadata,
                                client_timestamp: log.client_timestamp,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHIFT VISIBILITY & STATE INSPECTOR */}
        {activeTab === "inspector" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Shift Picker Bar */}
            <div className="bg-muted/20 p-4 rounded-2xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  اختر الوردية المراد فحص سبب ظهورها أو اختفائها:
                </label>
                <select
                  value={selectedInspectorShiftId}
                  onChange={(e) => setSelectedInspectorShiftId(e.target.value)}
                  className="w-full h-10 text-xs rounded-xl border border-input bg-background px-3 font-bold text-foreground"
                >
                  <option value="">-- اختر وردية من القائمة --</option>
                  {allShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shift_number} ({s.status === "open" ? "مفتوحة" : "مغلقة"}) - كاشير: {s.cashier_name}
                    </option>
                  ))}
                </select>
              </div>

              {visibilityAnalysis && (
                <div className="flex items-center gap-2 self-end md:self-center">
                  {visibilityAnalysis.status === "closed" ? (
                    <Button
                      size="sm"
                      onClick={() => handleRecoverState("open", true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      إصلاح: إعادة فتح الوردية وتفعيلها
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleRecoverState("closed")}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 rounded-xl gap-1.5 cursor-pointer"
                    >
                      <Check size={14} />
                      إصلاح: إغلاق الوردية رسمياً
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Analysis Card */}
            {visibilityAnalysis ? (
              <div className="space-y-4">
                {/* Stats Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-card border border-border p-3.5 rounded-2xl">
                    <span className="text-[11px] text-muted-foreground font-bold">الحالة المسجلة</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${visibilityAnalysis.status === "open" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      <span className="font-black text-sm">{visibilityAnalysis.status === "open" ? "مفتوحة (Open)" : "مغلقة (Closed)"}</span>
                    </div>
                  </div>

                  <div className="bg-card border border-border p-3.5 rounded-2xl">
                    <span className="text-[11px] text-muted-foreground font-bold">حالة الجلسة النشطة</span>
                    <div className="font-black text-sm mt-1 text-teal-600">
                      {visibilityAnalysis.isActiveSession ? "وردية نشطة حالياً ✓" : "غير نشطة في الجلسة"}
                    </div>
                  </div>

                  <div className="bg-card border border-border p-3.5 rounded-2xl">
                    <span className="text-[11px] text-muted-foreground font-bold">الظهور في الورديات المفتوحة</span>
                    <div className="font-black text-sm mt-1">
                      {visibilityAnalysis.isVisibleInOpenView ? (
                        <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={15} /> ظاهرة</span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1"><AlertCircle size={15} /> غير معروضة</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-card border border-border p-3.5 rounded-2xl">
                    <span className="text-[11px] text-muted-foreground font-bold">الظهور في الورديات المغلقة</span>
                    <div className="font-black text-sm mt-1">
                      {visibilityAnalysis.isVisibleInClosedView ? (
                        <span className="text-blue-600 flex items-center gap-1"><CheckCircle2 size={15} /> معروضة بالتقارير</span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1"><AlertCircle size={15} /> غير معروضة</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Diagnostics List */}
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <h4 className="font-black text-sm flex items-center gap-2">
                    <ShieldCheck size={16} className="text-teal-600" />
                    نتائج التشخيص الفني ومطابقة قواعد النظام:
                  </h4>
                  <div className="space-y-2">
                    {visibilityAnalysis.diagnostics.map((d, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                          d.level === "error"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
                            : d.level === "warning"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                            : d.level === "success"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                            : "bg-muted/40 border-border text-foreground"
                        }`}
                      >
                        <div className="mt-0.5 font-bold font-mono">[{d.code}]</div>
                        <div className="flex-1 font-medium">{d.message}</div>
                      </div>
                    ))}
                  </div>

                  {visibilityAnalysis.possibleHiddenReasons.length > 0 && (
                    <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                      <h5 className="font-bold text-xs text-rose-600 mb-1">
                        أسباب محتملة لاختفاء الوردية أو ظهورها بشكل غير متوقع:
                      </h5>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                        {visibilityAnalysis.possibleHiddenReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Transactions Summary */}
                <div className="bg-card border border-border rounded-2xl p-4">
                  <h4 className="font-black text-sm mb-2">إحصائيات المبيعات المرتبطة بهذه الوردية:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-muted/30 rounded-xl">
                      <span className="text-muted-foreground">عدد العمليات:</span>{" "}
                      <span className="font-bold font-mono">{visibilityAnalysis.transactionsCount} عملية</span>
                    </div>
                    {visibilityAnalysis.shiftType === "park" ? (
                      <>
                        <div className="p-3 bg-muted/30 rounded-xl">
                          <span className="text-muted-foreground">إجمالي USD:</span>{" "}
                          <span className="font-bold font-mono text-emerald-600">${visibilityAnalysis.grossSalesUsd}</span>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-xl">
                          <span className="text-muted-foreground">إجمالي SSP:</span>{" "}
                          <span className="font-bold font-mono text-teal-600">{visibilityAnalysis.grossSalesSsp?.toLocaleString()} SSP</span>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-muted/30 rounded-xl">
                        <span className="text-muted-foreground">إجمالي المبيعات:</span>{" "}
                        <span className="font-bold font-mono text-emerald-600">{visibilityAnalysis.totalSalesRest}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed rounded-3xl p-8 bg-muted/10">
                <HelpCircle size={36} className="mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="font-bold text-sm">يرجى اختيار وردية من القائمة للبدء في تشخيص حالتها</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
