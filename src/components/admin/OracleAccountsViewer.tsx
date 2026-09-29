import React, { useState, useMemo } from "react";
import { ORACLE_MIGRATION_ACCOUNTS } from "@/shared/data/oracleAccounts";
import {
  Search,
  ChevronLeft,
  Folder,
  FileText,
  BarChart3,
  Database,
  CreditCard,
  Building2,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Account = (typeof ORACLE_MIGRATION_ACCOUNTS)[0];

export function OracleAccountsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel1, setSelectedLevel1] = useState<string | null>("1"); // Default to Assets
  const [selectedLevel2, setSelectedLevel2] = useState<string | null>(null);
  const [selectedLevel3, setSelectedLevel3] = useState<string | null>(null);
  const [selectedLevel4, setSelectedLevel4] = useState<string | null>(null);

  // Group accounts by level and parent
  const accountsByLevel = useMemo(() => {
    const l1: Account[] = [];
    const l2: Record<string, Account[]> = {};
    const l3: Record<string, Account[]> = {};
    const l4: Record<string, Account[]> = {};

    ORACLE_MIGRATION_ACCOUNTS.forEach((acc) => {
      if (acc.level === 1) l1.push(acc);
      else if (acc.level === 2 && acc.parent_code) {
        if (!l2[acc.parent_code]) l2[acc.parent_code] = [];
        l2[acc.parent_code].push(acc);
      } else if (acc.level === 3 && acc.parent_code) {
        if (!l3[acc.parent_code]) l3[acc.parent_code] = [];
        l3[acc.parent_code].push(acc);
      } else if (acc.level === 4 && acc.parent_code) {
        if (!l4[acc.parent_code]) l4[acc.parent_code] = [];
        l4[acc.parent_code].push(acc);
      }
    });

    // Sort everything by code
    l1.sort((a, b) => a.code.localeCompare(b.code));
    Object.values(l2).forEach((arr) => arr.sort((a, b) => a.code.localeCompare(b.code)));
    Object.values(l3).forEach((arr) => arr.sort((a, b) => a.code.localeCompare(b.code)));
    Object.values(l4).forEach((arr) => arr.sort((a, b) => a.code.localeCompare(b.code)));

    return { l1, l2, l3, l4 };
  }, []);

  // Filter accounts if there's a search term
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    return ORACLE_MIGRATION_ACCOUNTS.filter(
      (a) =>
        a.name_ar.toLowerCase().includes(lower) ||
        a.code.toLowerCase().includes(lower) ||
        (a.name_en && a.name_en.toLowerCase().includes(lower)),
    ).sort((a, b) => a.code.localeCompare(b.code));
  }, [searchTerm]);

  const activeL2 = selectedLevel1 ? accountsByLevel.l2[selectedLevel1] || [] : [];
  const activeL3 = selectedLevel2 ? accountsByLevel.l3[selectedLevel2] || [] : [];
  const activeL4 = selectedLevel3 ? accountsByLevel.l4[selectedLevel3] || [] : [];

  const handleSelect = (level: number, code: string) => {
    if (level === 1) {
      setSelectedLevel1(code);
      setSelectedLevel2(null);
      setSelectedLevel3(null);
      setSelectedLevel4(null);
    } else if (level === 2) {
      setSelectedLevel2(code);
      setSelectedLevel3(null);
      setSelectedLevel4(null);
    } else if (level === 3) {
      setSelectedLevel3(code);
      setSelectedLevel4(null);
    } else if (level === 4) {
      setSelectedLevel4(code);
    }
  };

  const getSelectedAccountDetails = () => {
    const code = selectedLevel4 || selectedLevel3 || selectedLevel2 || selectedLevel1;
    if (!code) return null;
    return ORACLE_MIGRATION_ACCOUNTS.find((a) => a.code === code);
  };

  const selectedAccount = getSelectedAccountDetails();

  const getTypeColor = (type: string) => {
    switch (type) {
      case "asset":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "liability":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
      case "equity":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "revenue":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "expense":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case "asset":
        return "أصول";
      case "liability":
        return "التزامات / خصوم";
      case "equity":
        return "حقوق ملكية";
      case "revenue":
        return "إيرادات";
      case "expense":
        return "مصروفات";
      default:
        return type;
    }
  };

  const getIconForLevel = (level: number) => {
    switch (level) {
      case 1:
        return <Database size={16} className="text-primary" />;
      case 2:
        return <Layers size={16} className="text-primary/80" />;
      case 3:
        return <Folder size={16} className="text-primary/60" />;
      case 4:
        return <FileText size={16} className="text-primary/40" />;
      default:
        return <Folder size={16} />;
    }
  };

  const renderColumn = (
    title: string,
    items: Account[],
    selectedCode: string | null,
    level: number,
  ) => (
    <div className="flex flex-col h-full border rounded-xl overflow-hidden bg-card/50 shadow-sm">
      <div className="bg-muted/50 p-3 border-b flex items-center justify-between">
        <h4 className="font-bold text-sm">{title}</h4>
        <Badge variant="outline" className="text-xs bg-background/50 font-mono">
          {items.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 h-full min-h-[300px]">
        {items.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground italic mt-10">
            لا توجد حسابات فرعية
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {items.map((acc) => {
              const isSelected = selectedCode === acc.code;
              return (
                <button
                  key={acc.code}
                  onClick={() => handleSelect(level, acc.code)}
                  className={`w-full text-right p-2.5 rounded-lg flex items-center justify-between group transition-all duration-200 border border-transparent ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-md font-bold border-primary/20"
                      : "hover:bg-primary/5 hover:border-primary/20 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <span
                      className={`shrink-0 ${isSelected ? "text-primary-foreground/90" : "text-muted-foreground group-hover:text-primary/70"}`}
                    >
                      {getIconForLevel(level)}
                    </span>
                    <span className="truncate text-xs leading-tight sm:text-sm">{acc.name_ar}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span
                      className={`text-[10px] sm:text-xs font-mono ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                    >
                      {acc.code}
                    </span>
                    {level < 4 && (
                      <ChevronLeft
                        size={14}
                        className={
                          isSelected
                            ? "text-primary-foreground"
                            : "text-muted-foreground/30 group-hover:text-primary/50"
                        }
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {/* Search Header */}
      <Card className="border-border shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div>
              <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                الدليل المحاسبي الشامل
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">
                تصفح وإدارة شجرة الحسابات، الأصول، الخصوم والمصروفات بأسلوب عصري.
              </p>
            </div>
            <div className="w-full md:w-80 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث برقم أو اسم الحساب..."
                className="pl-3 pr-9 h-10 w-full rounded-xl border-border focus:border-primary transition-all bg-background/50 focus:bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {searchTerm ? (
        /* Search Results View */
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-base font-bold flex justify-between items-center">
              <span>نتائج البحث ({searchResults.length})</span>
              <Badge variant="secondary" className="font-mono bg-background shadow-sm">
                {searchTerm}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Search className="h-8 w-8 mb-3 opacity-20" />
                  <p className="font-semibold">لم يتم العثور على حسابات مطابقة</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {searchResults.map((acc) => (
                    <div
                      key={acc.code}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getIconForLevel(acc.level)}
                          <span className="font-bold text-foreground text-sm">{acc.name_ar}</span>
                          {acc.name_en && (
                            <span className="text-xs text-muted-foreground font-medium">
                              ({acc.name_en})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] shadow-sm border border-border/50 text-foreground">
                            كود: {acc.code}
                          </span>
                          <span>•</span>
                          <span>مستوى {acc.level}</span>
                          {acc.parent_code && (
                            <>
                              <span>•</span>
                              <span>
                                يتبع لـ: <span className="font-mono">{acc.parent_code}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge className={getTypeColor(acc.type)} variant="outline">
                        {getTypeName(acc.type)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        /* Miller Columns View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[450px]">
            {renderColumn("المستوى الأول", accountsByLevel.l1, selectedLevel1, 1)}
            {renderColumn("المستوى الثاني", activeL2, selectedLevel2, 2)}
            {renderColumn("المستوى الثالث", activeL3, selectedLevel3, 3)}
            {renderColumn("المستوى الرابع", activeL4, selectedLevel4, 4)}
          </div>

          {/* Details Pane */}
          {selectedAccount && (
            <Card className="border-border shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-primary/20">
                <div className="h-full bg-primary transition-all w-1/4"></div>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
                      {getIconForLevel(selectedAccount.level)}
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-foreground flex items-center gap-2">
                        {selectedAccount.name_ar}
                      </h3>
                      {selectedAccount.name_en && (
                        <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                          {selectedAccount.name_en}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs bg-muted shadow-sm border"
                        >
                          كود: {selectedAccount.code}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-background border-primary/30 text-primary text-xs"
                        >
                          المستوى {selectedAccount.level}
                        </Badge>
                        {selectedAccount.parent_code && (
                          <Badge
                            variant="outline"
                            className="bg-background text-muted-foreground text-xs"
                          >
                            تفرع من:{" "}
                            <span className="font-mono ml-1">{selectedAccount.parent_code}</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0 bg-muted/30 p-3 rounded-xl border border-border/50">
                    <Badge
                      className={`px-3 py-1 text-xs font-bold border ${getTypeColor(selectedAccount.type)}`}
                    >
                      {getTypeName(selectedAccount.type)}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1.5">
                      <div
                        className={`h-2 w-2 rounded-full ${["asset", "expense"].includes(selectedAccount.type) ? "bg-blue-500" : "bg-green-500"}`}
                      ></div>
                      طبيعة الحساب:{" "}
                      {["asset", "expense"].includes(selectedAccount.type)
                        ? "مدين (Debit)"
                        : "دائن (Credit)"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
