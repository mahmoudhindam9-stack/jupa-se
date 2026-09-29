// @ts-nocheck
import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Printer,
  FileSpreadsheet,
  BookOpen,
  Table as TableIcon,
  FileText,
  CalendarDays,
  Clock,
  Search,
  Filter,
  X,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  CreditCard,
  Smartphone,
  User as UserIcon,
  Building,
  DollarSign,
  Download,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  printTreasuryMovementDocument,
  printAccountingDocument,
  type TreasuryMovementReportData,
} from "@/shared/utils/printAccountingDocument";
import type { Account, TreasuryTransaction } from "@/shared/services/erpStore";

interface TreasuryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTreasuryId?: string;
  initialReportType?: "document" | "journal" | "table" | "excel";
  treasuries: Account[];
  transactions: TreasuryTransaction[];
  currentBranch: { id: string; name_ar: string };
}

export function TreasuryReportModal({
  isOpen,
  onClose,
  initialTreasuryId = "all",
  initialReportType = "document",
  treasuries = [],
  transactions = [],
  currentBranch,
}: TreasuryReportModalProps) {
  const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>(initialTreasuryId || "all");
  const [reportType, setReportType] = useState<"document" | "journal" | "table" | "excel">(
    initialReportType || "document",
  );
  const [datePreset, setDatePreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [filterTxType, setFilterTxType] = useState<string>("all");
  const [filterCurrency, setFilterCurrency] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync initial props when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialTreasuryId) {
        setSelectedTreasuryId(initialTreasuryId);
      }
      if (initialReportType) {
        setReportType(initialReportType);
      }
    }
  }, [isOpen, initialTreasuryId, initialReportType]);

  // Quick Date Presets Handler
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const format = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (preset === "today") {
      const todayStr = format(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setStartTime("00:00");
      setEndTime("23:59");
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yesterdayStr = format(y);
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
      setStartTime("00:00");
      setEndTime("23:59");
    } else if (preset === "shift") {
      const todayStr = format(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      setStartTime("08:00");
      setEndTime("23:59");
    } else if (preset === "last7") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setStartDate(format(d));
      setEndDate(format(now));
      setStartTime("00:00");
      setEndTime("23:59");
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(format(firstDay));
      setEndDate(format(now));
      setStartTime("00:00");
      setEndTime("23:59");
    } else if (preset === "lastMonth") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(format(firstDayLastMonth));
      setEndDate(format(lastDayLastMonth));
      setStartTime("00:00");
      setEndTime("23:59");
    } else {
      setStartDate("");
      setEndDate("");
      setStartTime("");
      setEndTime("");
    }
  };

  // Selected Treasury object (or null for "all")
  const selectedTreasury = useMemo(() => {
    if (selectedTreasuryId === "all") return null;
    return treasuries.find((t) => t.id === selectedTreasuryId) || null;
  }, [selectedTreasuryId, treasuries]);

  // Filtered Transactions with precise Date, Time, Treasury, Type, Currency and Search Query
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Treasury Filter
      if (selectedTreasuryId !== "all" && tx.treasury_id !== selectedTreasuryId) {
        return false;
      }

      // 2. Date & Time Range Filtering
      const rawDateStr = tx.date || tx.created_at || "";
      if (!rawDateStr) return false;

      const txDate = new Date(rawDateStr);
      const txTimeMs = txDate.getTime();

      if (startDate) {
        const startStr = `${startDate}T${startTime || "00:00"}:00`;
        const startLimitMs = new Date(startStr).getTime();
        if (!isNaN(startLimitMs) && txTimeMs < startLimitMs) {
          return false;
        }
      }

      if (endDate) {
        const endStr = `${endDate}T${endTime || "23:59"}:59`;
        const endLimitMs = new Date(endStr).getTime();
        if (!isNaN(endLimitMs) && txTimeMs > endLimitMs) {
          return false;
        }
      }

      // 3. Movement Type Filter
      if (filterTxType !== "all" && tx.type !== filterTxType) {
        return false;
      }

      // 4. Currency / Payment Method Filter
      if (filterCurrency !== "all") {
        const pm = tx.payment_method || "cash";
        const curr = tx.currency || "EGP";
        const compKey = `${pm}_${curr}`;
        if (compKey !== filterCurrency) {
          return false;
        }
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const trObj = treasuries.find((t) => t.id === tx.treasury_id);
        const trName = (trObj?.name_ar || "").toLowerCase();
        const note = (tx.note || "").toLowerCase();
        const ref = (tx.related_entity_id || "").toLowerCase();
        const id = (tx.id || "").toLowerCase();
        const user = (tx.created_by || "").toLowerCase();
        const amountStr = String(tx.amount || 0);

        const match =
          trName.includes(q) ||
          note.includes(q) ||
          ref.includes(q) ||
          id.includes(q) ||
          user.includes(q) ||
          amountStr.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [
    transactions,
    selectedTreasuryId,
    startDate,
    endDate,
    startTime,
    endTime,
    filterTxType,
    filterCurrency,
    searchQuery,
    treasuries,
  ]);

  // Helper: Mapping transaction types to Arabic labels and styles
  const getTypeMeta = (type: string) => {
    switch (type) {
      case "sales":
        return {
          label: "مبيعات POS",
          isIncoming: true,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        };
      case "deposit":
        return {
          label: "إيداع نقدي",
          isIncoming: true,
          color: "text-blue-700 bg-blue-50 border-blue-200",
        };
      case "transfer_in":
        return {
          label: "تحويل وارد",
          isIncoming: true,
          color: "text-indigo-700 bg-indigo-50 border-indigo-200",
        };
      case "withdrawal":
        return {
          label: "سحب / مصروفات",
          isIncoming: false,
          color: "text-rose-700 bg-rose-50 border-rose-200",
        };
      case "transfer_out":
        return {
          label: "تحويل صادر",
          isIncoming: false,
          color: "text-amber-700 bg-amber-50 border-amber-200",
        };
      case "expense":
        return {
          label: "مصروفات عامة",
          isIncoming: false,
          color: "text-red-700 bg-red-50 border-red-200",
        };
      case "purchase":
        return {
          label: "مشتريات",
          isIncoming: false,
          color: "text-orange-700 bg-orange-50 border-orange-200",
        };
      case "reconciliation":
        return {
          label: "تسوية جرد",
          isIncoming: false,
          color: "text-purple-700 bg-purple-50 border-purple-200",
        };
      default:
        return {
          label: type || "حركة مالية",
          isIncoming: true,
          color: "text-slate-700 bg-slate-50 border-slate-200",
        };
    }
  };

  // Helper: Get analytical account
  const getAnalyticalAccount = (tx: TreasuryTransaction) => {
    const isInc = tx.type === "deposit" || tx.type === "sales" || tx.type === "transfer_in";
    if (isInc) {
      if (tx.type === "sales") return "410101 - إيراد مبيعات صالة ومطعم";
      if (tx.type === "transfer_in") return "110199 - وسيط تحويلات الخزائن";
      return "420101 - إيرادات وإيداعات متنوعة";
    } else {
      if (tx.type === "transfer_out") return "110199 - وسيط تحويلات الخزائن";
      if (tx.type === "reconciliation") return "520101 - تسويات فروق صناديق الجرد";
      if (tx.type === "purchase") return "120101 - مشتريات ومخزون أغذية";
      return "510101 - مصروفات عمومية وإدارية / عهد";
    }
  };

  // Compute Financial Aggregates
  const { openingBalance, totalInflow, totalOutflow, netMovement, closingBalance, sortedTxRows } =
    useMemo(() => {
      const opBal = selectedTreasury ? (selectedTreasury.opening_balance ?? 0) : 0;

      // Sort transactions ascending by timestamp for accurate running balance
      const sorted = [...filteredTransactions].sort(
        (a, b) =>
          new Date(a.date || a.created_at || 0).getTime() -
          new Date(b.date || b.created_at || 0).getTime(),
      );

      let running = opBal;
      let inflowSum = 0;
      let outflowSum = 0;

      const rows = sorted.map((tx, idx) => {
        const meta = getTypeMeta(tx.type);
        const isInc = meta.isIncoming;
        const amt = Number(tx.amount || 0);

        if (isInc) {
          inflowSum += amt;
          running += amt;
        } else {
          outflowSum += amt;
          running -= amt;
        }

        const trObj = treasuries.find((t) => t.id === tx.treasury_id);
        const trName = trObj ? trObj.name_ar : "الخزينة";

        const pmLabels: Record<string, string> = {
          cash: "نقداً (كاش)",
          card: "فيزا / بطاقة",
          wallet: "محفظة إلكترونية",
        };

        const dt = new Date(tx.date || tx.created_at || Date.now());
        const formattedDate = dt.toLocaleString("ar-EG", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

        return {
          id: tx.id || `TX-${idx + 1}`,
          index: idx + 1,
          rawDate: dt,
          date: formattedDate,
          type: tx.type,
          typeLabel: meta.label,
          typeColor: meta.color,
          isIncoming: isInc,
          treasuryName: trName,
          analyticalAccount: getAnalyticalAccount(tx),
          paymentMethod: tx.payment_method || "cash",
          paymentMethodLabel: pmLabels[tx.payment_method || "cash"] || "كاش",
          currency: tx.currency || (trObj ? trObj.currency : "EGP") || "EGP",
          inflow: isInc ? amt : 0,
          outflow: !isInc ? amt : 0,
          amount: amt,
          runningBalance: running,
          note: tx.note || "بدون ملاحظات",
          reference: tx.related_entity_id || "-",
          user: tx.created_by || trObj?.responsible_employee || "الكاشير",
        };
      });

      return {
        openingBalance: opBal,
        totalInflow: inflowSum,
        totalOutflow: outflowSum,
        netMovement: inflowSum - outflowSum,
        closingBalance: running,
        sortedTxRows: rows,
      };
    }, [filteredTransactions, selectedTreasury, treasuries]);

  // Compute Currency Breakdown for the selected scope
  const currencyBreakdown = useMemo(() => {
    let cashEGP = 0;
    let cashUSD = 0;
    let cashSSP = 0;
    let cardUSD = 0;
    let walletSSP = 0;

    if (selectedTreasury) {
      const opBal = selectedTreasury.opening_balance ?? 0;
      if (selectedTreasury.currency === "MULTI" || selectedTreasury.currency === "EGP") {
        cashEGP += opBal;
      } else if (selectedTreasury.currency === "USD") {
        cashUSD += opBal;
      } else if (selectedTreasury.currency === "SSP") {
        cashSSP += opBal;
      }
    }

    filteredTransactions.forEach((tx) => {
      const meta = getTypeMeta(tx.type);
      const amt = meta.isIncoming ? Number(tx.amount || 0) : -Number(tx.amount || 0);
      const pm = tx.payment_method || "cash";
      const curr = tx.currency || "EGP";

      if (pm === "card") {
        cardUSD += amt;
      } else if (pm === "wallet") {
        walletSSP += amt;
      } else {
        if (curr === "USD") cashUSD += amt;
        else if (curr === "SSP") cashSSP += amt;
        else cashEGP += amt;
      }
    });

    return { cashEGP, cashUSD, cashSSP, cardUSD, walletSSP };
  }, [filteredTransactions, selectedTreasury]);

  // Journal Entry Generator for Double-Entry View
  const journalEntries = useMemo(() => {
    return sortedTxRows.map((row) => {
      const trObj = treasuries.find((t) => t.name_ar === row.treasuryName) || selectedTreasury;
      const trCode = trObj?.account_code || "13010130";
      const trName = trObj?.name_ar || "الخزينة";

      let debitCode = "";
      let debitName = "";
      let creditCode = "";
      let creditName = "";

      if (row.isIncoming) {
        debitCode = trCode;
        debitName = `${trCode} - ${trName}`;

        if (row.type === "sales") {
          creditCode = "410101";
          creditName = "410101 - إيراد مبيعات صالة ومطعم (POS)";
        } else if (row.type === "transfer_in") {
          creditCode = "110199";
          creditName = "110199 - حساب وسيط تحويلات نقدية";
        } else {
          creditCode = "420101";
          creditName = "420101 - إيرادات وإيداعات نقدية متنوعة";
        }
      } else {
        creditCode = trCode;
        creditName = `${trCode} - ${trName}`;

        if (row.type === "transfer_out") {
          debitCode = "110199";
          debitName = "110199 - حساب وسيط تحويلات نقدية";
        } else if (row.type === "reconciliation") {
          debitCode = "520101";
          debitName = "520101 - تسويات فروق صناديق الجرد";
        } else if (row.type === "purchase") {
          debitCode = "120101";
          debitName = "120101 - مشتريات ومخزون الأغذية والمشروبات";
        } else {
          debitCode = "510101";
          debitName = "510101 - مصروفات عمومية وإدارية / عهد";
        }
      }

      let voucherNum = row.reference;
      if (!voucherNum || voucherNum === "-" || voucherNum.startsWith("JV-")) {
        const d = row.rawDate;
        const month = d.getMonth() + 1;
        const rawNum = row.id ? row.id.replace(/\D/g, "") : "";
        const seq = parseInt(rawNum.slice(-3)) || row.index;
        voucherNum = `JV-${month}/${seq}`;
      }

      return {
        id: row.id,
        voucherNum,
        date: row.date,
        description: row.note,
        reference: row.reference,
        currency: row.currency,
        createdBy: row.user,
        type: row.typeLabel,
        amount: row.amount,
        lines: [
          {
            type: "debit",
            accountCode: debitCode,
            accountName: debitName,
            debit: row.amount,
            credit: 0,
          },
          {
            type: "credit",
            accountCode: creditCode,
            accountName: creditName,
            debit: 0,
            credit: row.amount,
          },
        ],
      };
    });
  }, [sortedTxRows, treasuries, selectedTreasury]);

  // Action: Print Official Movement Accounting Document
  const handlePrintMovementDocument = () => {
    const periodStr =
      datePreset === "all"
        ? "كامل السجل التاريخي"
        : datePreset === "today"
          ? "حركات اليوم"
          : datePreset === "yesterday"
            ? "حركات الأمس"
            : datePreset === "shift"
              ? "حركات الوردية الحالية"
              : datePreset === "thisMonth"
                ? "حركات هذا الشهر"
                : `من ${startDate || "البداية"} إلى ${endDate || "الآن"}`;

    const reportData: TreasuryMovementReportData = {
      documentNo: `TR-DOC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
      treasuryName: selectedTreasury ? selectedTreasury.name_ar : "جميع الخزائن والحسابات المجمعة",
      treasuryCode: selectedTreasury?.account_code || "13010100",
      treasuryType:
        selectedTreasury?.type === "cash" ? "خزينة نقدية (Cash Desk)" : "حساب بنكي (Bank Account)",
      treasuryCurrency: selectedTreasury?.currency || "MULTI",
      responsibleEmployee: selectedTreasury?.responsible_employee || "إدارة الحسابات",
      branchName: currentBranch?.name_ar || "الفرع الرئيسي",
      periodLabel: periodStr,
      startDate: startDate,
      endDate: endDate,
      startTime: startTime,
      endTime: endTime,
      openingBalance: openingBalance,
      totalInflow: totalInflow,
      totalOutflow: totalOutflow,
      netMovement: netMovement,
      closingBalance: closingBalance,
      currencyBreakdown: currencyBreakdown,
      transactions: sortedTxRows,
    };

    printTreasuryMovementDocument(reportData);
  };

  // Action: Print Journal Entries Document
  const handlePrintJournalEntries = () => {
    const periodStr =
      datePreset === "all"
        ? "سجل القيود الكامل"
        : `من ${startDate || "البداية"} إلى ${endDate || "الآن"}`;

    const rows = journalEntries.flatMap((entry) => {
      return entry.lines.map((l) => ({
        voucher: entry.voucherNum,
        date: entry.date,
        account: `${l.accountCode} - ${l.accountName}`,
        desc: entry.description,
        debit: l.debit > 0 ? `${l.debit.toLocaleString()} ${entry.currency}` : "-",
        credit: l.credit > 0 ? `${l.credit.toLocaleString()} ${entry.currency}` : "-",
        currency: entry.currency,
        ref: entry.reference,
        user: entry.createdBy,
      }));
    });

    const totalDebit = journalEntries.reduce((s, e) => s + e.amount, 0);

    printAccountingDocument({
      title: `كشف القيود المحاسبية المزدوجه لحركات الخزينة (${journalEntries.length} قيد)`,
      subtitle: `الخزينة: ${selectedTreasury ? selectedTreasury.name_ar : "كافة الخزائن"} | الفترة: ${periodStr}`,
      documentNo: `JV-REP-${Date.now().toString().slice(-6)}`,
      columns: [
        { key: "voucher", label: "رقم القيد", align: "center" },
        { key: "date", label: "التاريخ والتوقيت", align: "center" },
        { key: "account", label: "كود واسم الحساب المحاسبي", align: "right" },
        { key: "desc", label: "البيان / الشرح", align: "right" },
        { key: "debit", label: "مدين (+)", align: "left" },
        { key: "credit", label: "دائن (-)", align: "left" },
        { key: "currency", label: "العملة", align: "center" },
        { key: "user", label: "المسؤول", align: "center" },
      ],
      rows,
      totals: [
        { label: "إجمالي الجانب المدين:", value: `${totalDebit.toLocaleString()} (مجمّع)` },
        { label: "إجمالي الجانب الدائن:", value: `${totalDebit.toLocaleString()} (مجمّع)` },
        { label: "حالة اتزان اليومية:", value: "متزنة دفترياً بنسبة 100% ✓" },
      ],
    });
  };

  // Action: Export Comprehensive Multi-Sheet Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Movements Table
    const moveRows = sortedTxRows.map((r) => ({
      م: r.index,
      "رقم الحركة": r.id,
      الخزينة: r.treasuryName,
      "التاريخ والوقت": r.date,
      "نوع الحركة": r.typeLabel,
      "الحساب التحليلي": r.analyticalAccount,
      "طريقة الدفع": r.paymentMethodLabel,
      العملة: r.currency,
      "الوارد (+)": r.inflow,
      "الصادر (-)": r.outflow,
      "الرصيد التراكمي": r.runningBalance,
      "البيان / الملاحظات": r.note,
      "المرجع / الفاتورة": r.reference,
      "المسؤول / الكاشير": r.user,
    }));
    const ws1 = XLSX.utils.json_to_sheet(moveRows);
    XLSX.utils.book_append_sheet(wb, ws1, "كشف حركات الخزينة");

    // Sheet 2: Journal Entries
    const jRows: any[] = [];
    journalEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        jRows.push({
          "رقم القيد": entry.voucherNum,
          "التاريخ والوقت": entry.date,
          "البيان العام": entry.description,
          "نوع الطرف": line.type === "debit" ? "مدين" : "دائن",
          "كود الحساب": line.accountCode,
          "اسم الحساب": line.accountName,
          "مدين (+)": line.debit,
          "دائن (-)": line.credit,
          العملة: entry.currency,
          المرجع: entry.reference,
          المسؤول: entry.createdBy,
        });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(jRows);
    XLSX.utils.book_append_sheet(wb, ws2, "القيود المحاسبية");

    // Sheet 3: Financial Summary
    const summaryRows = [
      {
        البند: "اسم الخزينة",
        القيمة: selectedTreasury ? selectedTreasury.name_ar : "جميع الخزائن",
      },
      { البند: "الفرع", القيمة: currentBranch?.name_ar || "الرئيسي" },
      { البند: "الفترة", القيمة: `${startDate || "من البداية"} إلى ${endDate || "الآن"}` },
      { البند: "الرصيد الافتتاحي", القيمة: openingBalance },
      { البند: "إجمالي الوارد (+)", القيمة: totalInflow },
      { البند: "إجمالي الصادر (-)", القيمة: totalOutflow },
      { البند: "صافي التدفق", القيمة: netMovement },
      { البند: "الرصيد الختامي", القيمة: closingBalance },
      { البند: "نقدي EGP", القيمة: currencyBreakdown.cashEGP },
      { البند: "نقدي USD", القيمة: currencyBreakdown.cashUSD },
      { البند: "نقدي SSP", القيمة: currencyBreakdown.cashSSP },
      { البند: "فيزا USD", القيمة: currencyBreakdown.cardUSD },
      { البند: "محفظة SSP", القيمة: currencyBreakdown.walletSSP },
    ];
    const ws3 = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws3, "ملخص الأرصدة والعملات");

    const fileName = `تقرير_سند_الخزينة_${selectedTreasury ? selectedTreasury.name_ar.replace(/\s+/g, "_") : "الكل"}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-7xl h-[94vh] rounded-3xl border border-border/80 shadow-2xl flex flex-col overflow-hidden text-right">
        {/* MODAL HEADER */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Printer size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight">
                  مركز تقارير وسندات حركة الخزائن والمحاسبة
                </h3>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px] font-bold">
                  {sortedTxRows.length} حركة مطابقة
                </Badge>
              </div>
              <p className="text-xs text-slate-300 font-semibold mt-0.5">
                توليد سندات حركة رسمية، قيود يومية، كشوفات تفريغ تفاعلية، وتصدير إكسل الشامل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrintMovementDocument}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Printer size={15} />
              <span>طباعة سند الحركة (A4)</span>
            </Button>

            <Button
              size="sm"
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <FileSpreadsheet size={15} />
              <span>تصدير Excel</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-9 w-9 p-0"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-muted/10">
          {/* 1. TOP FILTER CONTROLS BAR */}
          <div className="bg-card border border-border/80 p-4 rounded-2xl shadow-sm space-y-3">
            {/* ROW 1: TREASURY SELECTOR & REPORT TYPE SWITCHER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
              {/* Treasury Selector (4 cols) */}
              <div className="lg:col-span-5 space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building size={13} className="text-indigo-600" />
                  <span>تحديد الخزينة أو الحساب المستهدف:</span>
                </label>
                <select
                  value={selectedTreasuryId}
                  onChange={(e) => setSelectedTreasuryId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-bold text-right"
                >
                  <option value="all">⚡ جميع الخزائن والحسابات النشطة (كشف مجمع)</option>
                  {treasuries
                    .filter((t) => !t.deleted)
                    .map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.name_ar} ({tr.account_code || "13010130"}) — {tr.currency} —{" "}
                        {tr.type === "cash" ? "كاش" : "بنك"}
                      </option>
                    ))}
                </select>
              </div>

              {/* Report Type Selector Tabs (7 cols) */}
              <div className="lg:col-span-7 space-y-1">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-600" />
                  <span>نوع التقرير والمخرجات (Report Type):</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-muted/50 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setReportType("document")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-black transition ${
                      reportType === "document"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText size={13} />
                    <span className="truncate">سند الحركة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType("journal")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-black transition ${
                      reportType === "journal"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BookOpen size={13} />
                    <span className="truncate">القيود المحاسبية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType("table")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-black transition ${
                      reportType === "table"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <TableIcon size={13} />
                    <span className="truncate">كشف الحركات</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportType("excel")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-black transition ${
                      reportType === "excel"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileSpreadsheet size={13} />
                    <span className="truncate">تصدير Excel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ROW 2: QUICK DATE PRESETS & TIME INTERVALS */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-border/50">
              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-muted-foreground flex items-center gap-1 ml-1">
                  <CalendarDays size={13} className="text-indigo-600" />
                  الفترة:
                </span>
                {[
                  { id: "all", label: "الكل" },
                  { id: "today", label: "اليوم" },
                  { id: "yesterday", label: "الأمس" },
                  { id: "shift", label: "الوردية الحالية" },
                  { id: "last7", label: "آخر 7 أيام" },
                  { id: "thisMonth", label: "هذا الشهر" },
                  { id: "lastMonth", label: "الشهر الماضي" },
                ].map((p) => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={datePreset === p.id ? "default" : "outline"}
                    onClick={() => applyDatePreset(p.id)}
                    className="h-7 text-[11px] font-bold px-2.5 rounded-lg"
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              {/* Exact Date & Time Picker */}
              <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/70">
                  <span className="text-muted-foreground text-[10px]">من:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset("custom");
                    }}
                    className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-mono"
                  />
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setDatePreset("custom");
                    }}
                    placeholder="00:00"
                    className="h-7 w-20 rounded-lg border border-input bg-background px-1 text-xs font-mono text-center"
                  />
                </div>

                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/70">
                  <span className="text-muted-foreground text-[10px]">إلى:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset("custom");
                    }}
                    className="h-7 rounded-lg border border-input bg-background px-2 text-xs font-mono"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setDatePreset("custom");
                    }}
                    placeholder="23:59"
                    className="h-7 w-20 rounded-lg border border-input bg-background px-1 text-xs font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* ROW 3: SEARCH & EXTRA SELECTORS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2 border-t border-border/50">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute right-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="بحث سريع برقم الحركة، البيان، رقم الفاتورة والمرجع، أو اسم الكاشير..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8 h-8 text-xs text-right rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={filterTxType}
                  onChange={(e) => setFilterTxType(e.target.value)}
                  className="h-8 rounded-xl border border-input bg-background px-2.5 text-xs font-bold text-right"
                >
                  <option value="all">جميع أنواع الحركات</option>
                  <option value="sales">مبيعات POS</option>
                  <option value="deposit">إيداعات نقدية</option>
                  <option value="withdrawal">سحب ومصروفات</option>
                  <option value="transfer_in">تحويلات واردة</option>
                  <option value="transfer_out">تحويلات صادرة</option>
                  <option value="reconciliation">تسويات جرد</option>
                </select>

                <select
                  value={filterCurrency}
                  onChange={(e) => setFilterCurrency(e.target.value)}
                  className="h-8 rounded-xl border border-input bg-background px-2.5 text-xs font-bold text-right"
                >
                  <option value="all">جميع العملات والدفع</option>
                  <option value="cash_EGP">كاش جنيه (EGP)</option>
                  <option value="cash_USD">كاش دولار (USD)</option>
                  <option value="cash_SSP">كاش جنوب سوداني (SSP)</option>
                  <option value="card_USD">فيزا / بطاقة (USD)</option>
                  <option value="wallet_SSP">محفظة إلكترونية (SSP)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. FINANCIAL SNAPSHOT KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
            <div className="bg-card border border-border p-3 rounded-2xl shadow-sm text-right">
              <span className="text-[10px] text-muted-foreground font-sans font-bold block">
                الرصيد الافتتاحي (البداية)
              </span>
              <span className="text-base font-black text-slate-800 dark:text-slate-200 mt-1 block">
                {openingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-card border border-emerald-500/30 p-3 rounded-2xl shadow-sm text-right">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-bold block">
                إجمالي الوارد / المقبوضات (+)
              </span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                +{totalInflow.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-card border border-rose-500/30 p-3 rounded-2xl shadow-sm text-right">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-sans font-bold block">
                إجمالي الصادر / المدفوعات (-)
              </span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 block">
                -{totalOutflow.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-card border border-indigo-500/30 p-3 rounded-2xl shadow-sm text-right">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-sans font-bold block">
                صافي التغير المالي
              </span>
              <span
                className={`text-base font-black mt-1 block ${netMovement >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600"}`}
              >
                {netMovement >= 0 ? "+" : ""}
                {netMovement.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/40 p-3 rounded-2xl shadow-sm text-right">
              <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-sans font-black block">
                الرصيد الختامي الدفتري
              </span>
              <span className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
                {closingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="bg-card border border-border p-3 rounded-2xl shadow-sm text-right">
              <span className="text-[10px] text-muted-foreground font-sans font-bold block">
                عدد الحركات المسجلة
              </span>
              <span className="text-base font-black text-slate-700 dark:text-slate-300 mt-1 block">
                {sortedTxRows.length} عملية
              </span>
            </div>
          </div>

          {/* 3. MULTI-CURRENCY BREAKDOWN STRIP */}
          <div className="bg-card border border-border/80 px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono flex-wrap">
            <span className="font-sans font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Coins size={14} className="text-amber-500" />
              تفصيل أرصدة العملات المباشرة:
            </span>
            <div className="flex items-center gap-4 flex-wrap text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                نقدي (EGP): {currencyBreakdown.cashEGP.toLocaleString()} EGP
              </span>
              <span>•</span>
              <span className="text-green-600 dark:text-green-400 font-bold">
                نقدي (USD): {currencyBreakdown.cashUSD.toLocaleString()} USD
              </span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                نقدي (SSP): {currencyBreakdown.cashSSP.toLocaleString()} SSP
              </span>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                فيزا (USD): {currencyBreakdown.cardUSD.toLocaleString()} USD
              </span>
              <span>•</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold">
                محفظة (SSP): {currencyBreakdown.walletSSP.toLocaleString()} SSP
              </span>
            </div>
          </div>

          {/* 4. ACTIVE REPORT PREVIEW AREA */}
          {/* TAB OPTION 1: ACCOUNTING MOVEMENT DOCUMENT PREVIEW */}
          {reportType === "document" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border text-xs font-bold">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600" />
                  <span>معاينة سند حركة الخزينة الرسمي قبل الطباعة (Document Preview)</span>
                </div>
                <Button
                  size="sm"
                  onClick={handlePrintMovementDocument}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={14} />
                  <span>طباعة هذا المستند الآن (A4 Landscape)</span>
                </Button>
              </div>

              {/* DOCUMENT PAPER MOCKUP */}
              <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 shadow-md max-w-5xl mx-auto space-y-4 font-sans text-xs">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-3">
                  <div>
                    <h2 className="text-base font-black text-indigo-700">Restocash ERP System</h2>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      إدارة الخزائن والمقبوضات — فرع: {currentBranch?.name_ar || "الرئيسي"}
                    </span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-black text-slate-900">
                      سند كشف حركة ومقبوضات الخزينة
                    </h3>
                    <span className="text-xs text-indigo-600 font-bold">
                      {selectedTreasury ? selectedTreasury.name_ar : "كافة الخزائن المجمعة"}
                    </span>
                  </div>
                  <div className="text-left text-[11px] text-slate-600 space-y-0.5">
                    <div>
                      <strong>تاريخ الإصدار:</strong> {new Date().toLocaleDateString("ar-EG")}
                    </div>
                    <div>
                      <strong>رقم المستند:</strong> DOC-{Date.now().toString().slice(-6)}
                    </div>
                  </div>
                </div>

                {/* Meta Grid */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-500">الخزينة:</span>{" "}
                    <strong>{selectedTreasury?.name_ar || "الكل"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">المسؤول:</span>{" "}
                    <strong>{selectedTreasury?.responsible_employee || "إدارة الحسابات"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">الفترة:</span>{" "}
                    <strong>
                      {datePreset === "all"
                        ? "كامل السجل"
                        : `${startDate || "البداية"} إلى ${endDate || "الآن"}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">إجمالي الحركات:</span>{" "}
                    <strong>{sortedTxRows.length} حركة</strong>
                  </div>
                </div>

                {/* Mini KPI */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono font-bold">
                  <div className="p-2 border rounded bg-slate-50">
                    <div className="text-[10px] text-slate-500 font-sans">افتتاحي</div>
                    <div>{openingBalance.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border rounded bg-emerald-50 text-emerald-700">
                    <div className="text-[10px] text-emerald-600 font-sans">وارد (+)</div>
                    <div>+{totalInflow.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border rounded bg-rose-50 text-rose-700">
                    <div className="text-[10px] text-rose-600 font-sans">صادر (-)</div>
                    <div>-{totalOutflow.toLocaleString()}</div>
                  </div>
                  <div className="p-2 border rounded bg-indigo-50 text-indigo-700">
                    <div className="text-[10px] text-indigo-600 font-sans">صافي التدفق</div>
                    <div>
                      {netMovement >= 0 ? "+" : ""}
                      {netMovement.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 border rounded bg-emerald-100 text-emerald-800">
                    <div className="text-[10px] text-emerald-800 font-sans">رصيد ختامي</div>
                    <div>{closingBalance.toLocaleString()}</div>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[350px] overflow-y-auto">
                  <table className="w-full text-[11px] text-right">
                    <thead className="bg-slate-900 text-white font-bold sticky top-0">
                      <tr>
                        <th className="p-2 text-center w-8">#</th>
                        <th className="p-2">التاريخ والتوقيت</th>
                        <th className="p-2 text-center">نوع الحركة</th>
                        <th className="p-2">الحساب التحليلي</th>
                        <th className="p-2 text-center">الدفع / العملة</th>
                        <th className="p-2 text-left">الوارد (+)</th>
                        <th className="p-2 text-left">الصادر (-)</th>
                        <th className="p-2 text-left">الرصيد</th>
                        <th className="p-2">البيان والملاحظات</th>
                        <th className="p-2 text-center">المسؤول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedTxRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="text-center py-8 text-slate-400 font-bold">
                            لا توجد حركات مسجلة مطابقة للفلاتر المحددة
                          </td>
                        </tr>
                      ) : (
                        sortedTxRows.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-bold text-slate-500">{r.index}</td>
                            <td className="p-2 whitespace-nowrap">{r.date}</td>
                            <td className="p-2 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-300">
                                {r.typeLabel}
                              </span>
                            </td>
                            <td className="p-2 text-slate-700">{r.analyticalAccount}</td>
                            <td className="p-2 text-center text-slate-600">
                              {r.paymentMethodLabel} ({r.currency})
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-emerald-700">
                              {r.inflow > 0 ? `+${r.inflow.toLocaleString()}` : "-"}
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-rose-700">
                              {r.outflow > 0 ? `-${r.outflow.toLocaleString()}` : "-"}
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-slate-900">
                              {r.runningBalance.toLocaleString()}
                            </td>
                            <td className="p-2 text-slate-700 truncate max-w-[180px]">{r.note}</td>
                            <td className="p-2 text-center text-slate-600">{r.user}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures Section */}
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-600">
                  <div>
                    <span className="font-bold">أمين الصندوق / الكاشير</span>
                    <div className="mt-6 border-t border-dashed border-slate-400 pt-1 text-[10px]">
                      التوقيع والاعتماد
                    </div>
                  </div>
                  <div>
                    <span className="font-bold">إعداد المحاسب المسؤول</span>
                    <div className="mt-6 border-t border-dashed border-slate-400 pt-1 text-[10px]">
                      التوقيع والاعتماد
                    </div>
                  </div>
                  <div>
                    <span className="font-bold">المراجعة والتدقيق</span>
                    <div className="mt-6 border-t border-dashed border-slate-400 pt-1 text-[10px]">
                      التوقيع والاعتماد
                    </div>
                  </div>
                  <div>
                    <span className="font-bold">اعتماد المدير المالي</span>
                    <div className="mt-6 border-t border-dashed border-slate-400 pt-1 text-[10px]">
                      التوقيع والاعتماد
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB OPTION 2: DOUBLE-ENTRY JOURNAL ENTRIES */}
          {reportType === "journal" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border text-xs font-bold">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-indigo-600" />
                  <span>
                    دفتر القيود المحاسبية المزدوجه ({journalEntries.length} قيد متوازن دفترياً)
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handlePrintJournalEntries}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={14} />
                  <span>طباعة كشف القيود المحاسبية</span>
                </Button>
              </div>

              {journalEntries.length === 0 ? (
                <div className="bg-card border border-border p-12 text-center rounded-2xl text-muted-foreground font-semibold">
                  لا توجد قيود محاسبية مسجلة مطابقة للشروط المحددة
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {journalEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:border-indigo-500/40 transition"
                    >
                      <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black bg-indigo-600 text-white px-2.5 py-0.5 rounded-lg">
                            {entry.voucherNum}
                          </span>
                          <span className="font-mono text-muted-foreground">{entry.date}</span>
                          <span className="font-bold text-foreground">{entry.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                            ● متوازن دفترياً
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            مرجع: {entry.reference}
                          </span>
                        </div>
                      </div>

                      <table className="w-full text-xs">
                        <thead className="bg-muted/20 text-muted-foreground border-b border-border/50">
                          <tr>
                            <th className="p-2 text-right font-bold w-16">الطرف</th>
                            <th className="p-2 text-right font-bold w-24">كود الحساب</th>
                            <th className="p-2 text-right font-bold">اسم الحساب المحاسبي</th>
                            <th className="p-2 text-right font-bold w-28">مدين (+)</th>
                            <th className="p-2 text-right font-bold w-28">دائن (-)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 font-mono">
                          {entry.lines.map((line, lIdx) => (
                            <tr key={lIdx} className="hover:bg-muted/10">
                              <td className="p-2 font-bold">
                                {line.type === "debit" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    مدين
                                  </span>
                                ) : (
                                  <span className="text-rose-600 dark:text-rose-400">دائن</span>
                                )}
                              </td>
                              <td className="p-2 font-semibold text-muted-foreground">
                                {line.accountCode}
                              </td>
                              <td className="p-2 font-sans font-bold text-foreground">
                                {line.accountName}
                              </td>
                              <td className="p-2 font-black text-emerald-600 dark:text-emerald-400">
                                {line.debit > 0
                                  ? `${line.debit.toLocaleString()} ${entry.currency}`
                                  : "0.00"}
                              </td>
                              <td className="p-2 font-black text-rose-600 dark:text-rose-400">
                                {line.credit > 0
                                  ? `${line.credit.toLocaleString()} ${entry.currency}`
                                  : "0.00"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB OPTION 3: MOVEMENTS & TRANSACTIONS TABLE */}
          {reportType === "table" && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border text-xs font-bold">
                <div className="flex items-center gap-2">
                  <TableIcon size={16} className="text-emerald-600" />
                  <span>جدول التفريغ المحاسبي والرصيد التراكمي للحركات</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleExportExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet size={14} />
                  <span>تصدير هذه الحركات إلى Excel</span>
                </Button>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="max-h-[450px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0 z-10 text-muted-foreground border-b border-border">
                      <tr>
                        <th className="p-3 text-right font-bold w-10">#</th>
                        <th className="p-3 text-right font-bold">الخزينة</th>
                        <th className="p-3 text-right font-bold">التاريخ والتوقيت</th>
                        <th className="p-3 text-right font-bold">نوع الحركة</th>
                        <th className="p-3 text-right font-bold">طريقة الدفع والعملة</th>
                        <th className="p-3 text-right font-bold">الحساب التحليلي</th>
                        <th className="p-3 text-right font-bold">الوارد (+)</th>
                        <th className="p-3 text-right font-bold">الصادر (-)</th>
                        <th className="p-3 text-right font-bold">الرصيد التراكمي</th>
                        <th className="p-3 text-right font-bold">البيان / الملاحظات</th>
                        <th className="p-3 text-right font-bold">المرجع</th>
                        <th className="p-3 text-right font-bold">المسؤول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-sans">
                      {sortedTxRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={12}
                            className="text-center py-12 text-muted-foreground font-semibold"
                          >
                            لا توجد حركات مسجلة مطابقة للبحث أو الفترة المحددة
                          </td>
                        </tr>
                      ) : (
                        sortedTxRows.map((r) => (
                          <tr key={r.id} className="hover:bg-muted/30 transition">
                            <td className="p-3 font-mono font-bold text-muted-foreground">
                              {r.index}
                            </td>
                            <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                              {r.treasuryName}
                            </td>
                            <td className="p-3 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                              {r.date}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${r.typeColor}`}
                              >
                                {r.typeLabel}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                              {r.paymentMethodLabel} ({r.currency})
                            </td>
                            <td className="p-3 text-muted-foreground font-medium text-[11px]">
                              {r.analyticalAccount}
                            </td>
                            <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                              {r.inflow > 0 ? `+${r.inflow.toLocaleString()} ${r.currency}` : "-"}
                            </td>
                            <td className="p-3 font-mono font-black text-rose-600 dark:text-rose-400">
                              {r.outflow > 0 ? `-${r.outflow.toLocaleString()} ${r.currency}` : "-"}
                            </td>
                            <td className="p-3 font-mono font-black text-foreground">
                              {r.runningBalance.toLocaleString()} {r.currency}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold max-w-[180px] truncate">
                              {r.note}
                            </td>
                            <td className="p-3 font-mono text-muted-foreground text-[11px]">
                              {r.reference}
                            </td>
                            <td className="p-3 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                              {r.user}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB OPTION 4: EXCEL EXPORT WORKBOOK */}
          {reportType === "excel" && (
            <div className="space-y-4 bg-card border border-emerald-500/30 p-8 rounded-2xl text-center max-w-2xl mx-auto shadow-sm animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto">
                <FileSpreadsheet size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  تصدير مصنف إكسل المحاسبي الشامل (Multi-Sheet Workbook)
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  تنزيل ملف إكسل رسمي منسق يحتوي على أوراق العمل: كشف حركات الخزينة، القيود
                  المحاسبية المزدوجه، والملخص المالي ومطابقة العملات.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-xl text-xs font-bold border border-border">
                <div>
                  <span className="text-muted-foreground text-[10px] block">الحركات المضمنة</span>
                  <span className="text-sm font-black text-emerald-600">
                    {sortedTxRows.length} حركة
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">القيود المحاسبية</span>
                  <span className="text-sm font-black text-indigo-600">
                    {journalEntries.length} قيد
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">الرصيد الختامي</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {closingBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm h-11 px-8 rounded-2xl gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 mx-auto"
              >
                <Download size={18} />
                <span>تنزيل ملف الإكسل الآن (.xlsx)</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
