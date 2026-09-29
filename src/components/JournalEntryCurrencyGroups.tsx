import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JournalEntry } from "@/shared/services/erpStore";

type JournalLine = {
  account_code: string;
  debit?: number;
  credit?: number;
  currency?: string;
  rate?: number;
  description?: string;
};

type Account = { code: string; name_ar?: string };

type Props = {
  entry: JournalEntry;
  accounts: Account[];
  formatCurrency: (value: number, currency?: string) => string;
  getLineBaseValue: (amount: number | string, rate: number | string, currency?: string) => number;
  totalBaseDebit: number;
  totalBaseCredit: number;
  isBalanced: boolean;
};

const currencyName = (currency: string) => {
  const names: Record<string, string> = {
    USD: "الدولار الأمريكي",
    SSP: "الجنيه الجنوب سوداني",
    EGP: "الجنيه المصري",
  };
  return names[currency] || currency;
};

const currencyIcon = (currency: string) => {
  if (currency === "USD") return "💵";
  if (currency === "SSP") return "🇸🇸";
  if (currency === "EGP") return "🇪🇬";
  return "💱";
};

export function JournalEntryCurrencyGroups({
  entry,
  accounts,
  formatCurrency,
  getLineBaseValue,
  totalBaseDebit,
  totalBaseCredit,
  isBalanced,
}: Props) {
  const lines: JournalLine[] = entry.lines || [];
  const currencies = Array.from(
    new Set(lines.map((line) => line.currency || entry.currency || "USD")),
  ) as string[];

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2">
        <span className="font-bold text-sm">تفاصيل القيد حسب العملة</span>
        <Badge variant="outline" className="font-mono">
          {currencies.length} {currencies.length === 1 ? "عملة" : "عملات"}
        </Badge>
        {currencies.map((currency) => (
          <Badge key={currency} variant="secondary" className="font-mono font-bold">
            {currencyIcon(currency)} {currency} — {currencyName(currency)}
          </Badge>
        ))}
      </div>

      {currencies.map((currency) => {
        const currencyLines = lines.filter(
          (line) => (line.currency || entry.currency || "USD") === currency,
        );
        const debit = currencyLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
        const credit = currencyLines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
        const baseDebit = currencyLines.reduce(
          (sum, line) => sum + getLineBaseValue(line.debit || 0, line.rate || 1, currency),
          0,
        );
        const baseCredit = currencyLines.reduce(
          (sum, line) => sum + getLineBaseValue(line.credit || 0, line.rate || 1, currency),
          0,
        );
        const currencyBalanced = Math.abs(debit - credit) < 0.000001;

        return (
          <Card key={currency} className="rounded-2xl border-2 overflow-hidden">
            <CardHeader className="bg-muted/30 py-3 px-4 border-b">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                  <span className="text-lg">{currencyIcon(currency)}</span>
                  <span>{currency}</span>
                  <span className="text-muted-foreground font-medium">
                    — {currencyName(currency)}
                  </span>
                </CardTitle>
                <Badge
                  className={
                    currencyBalanced
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-rose-100 text-rose-800 border-rose-300"
                  }
                >
                  {currencyBalanced ? "متوازن بالعملة ✓" : "غير متوازن ⚠️"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse">
                  <thead className="bg-muted/20 text-muted-foreground text-xs font-bold border-b">
                    <tr>
                      <th className="p-3 pr-4">الحساب</th>
                      <th className="p-3">رقم الحساب</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3 text-center text-emerald-700">مدين ({currency})</th>
                      <th className="p-3 text-center text-rose-700">دائن ({currency})</th>
                      <th className="p-3 text-center">Rate (المعامل)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currencyLines.map((line, index) => {
                      const account = accounts.find((a) => a.code === line.account_code);
                      const rate = Number(line.rate) || 1;
                      return (
                        <tr key={`${line.account_code}-${index}`} className="hover:bg-muted/20">
                          <td className="p-3 pr-4 font-semibold">
                            {account?.name_ar || line.description || "حساب محاسبي"}
                          </td>
                          <td className="p-3 font-mono text-xs">{line.account_code}</td>
                          <td className="p-3 text-xs max-w-xs">
                            {line.description || entry.description || "-"}
                          </td>
                          <td className="p-3 font-mono font-bold text-center text-emerald-700 bg-emerald-500/5">
                            {Number(line.debit) > 0
                              ? formatCurrency(Number(line.debit), currency)
                              : "-"}
                          </td>
                          <td className="p-3 font-mono font-bold text-center text-rose-700 bg-rose-500/5">
                            {Number(line.credit) > 0
                              ? formatCurrency(Number(line.credit), currency)
                              : "-"}
                          </td>
                          <td className="p-3 text-center font-mono text-xs">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {rate === 1
                                ? "1.000000"
                                : rate.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t-2">
                    <tr className="font-bold">
                      <td colSpan={3} className="p-3 pr-4">
                        إجمالي {currency} — {currencyName(currency)}
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-700 bg-emerald-500/5">
                        {formatCurrency(debit, currency)}
                        {currency !== "USD" && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            المعادل: {formatCurrency(baseDebit, "USD")}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-rose-700 bg-rose-500/5">
                        {formatCurrency(credit, currency)}
                        {currency !== "USD" && (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            المعادل: {formatCurrency(baseCredit, "USD")}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center text-xs">
                        {currencyBalanced
                          ? "✓ متوازن"
                          : formatCurrency(Math.abs(debit - credit), currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="rounded-2xl border-primary/30 bg-primary/5 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-foreground">إجمالي القيد:</span>
              <Badge
                variant="outline"
                className="font-mono font-black text-xs bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 px-2.5 py-0.5"
              >
                قيد رقم: {entry.reference || entry.id}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {currencies.join(" • ")}
              </Badge>
              <Badge variant="secondary">عملة التطبيق: USD</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-background border p-3">
                <div className="text-xs text-muted-foreground">
                  إجمالي المدين — المعادل بالدولار
                </div>
                <div className="font-mono font-black text-lg text-emerald-700">
                  {formatCurrency(totalBaseDebit, "USD")}
                </div>
              </div>
              <div className="rounded-xl bg-background border p-3">
                <div className="text-xs text-muted-foreground">
                  إجمالي الدائن — المعادل بالدولار
                </div>
                <div className="font-mono font-black text-lg text-rose-700">
                  {formatCurrency(totalBaseCredit, "USD")}
                </div>
              </div>
            </div>
            <div className="text-xs font-semibold">
              {isBalanced
                ? "✓ القيد متزن بعد تحويل العملات إلى عملة التطبيق (USD)."
                : "⚠️ يوجد فرق في المعادل العام بالدولار ويحتاج إلى مراجعة/تسوية."}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
