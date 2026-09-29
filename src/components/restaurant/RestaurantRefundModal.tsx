import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  AlertTriangle,
  UserCheck,
  DollarSign,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import { erpStore, RestaurantShift } from "@/shared/services/erpStore";
import { toast } from "sonner";

interface RestaurantRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: any[];
  onRefundCompleted?: () => void;
}

export function RestaurantRefundModal({
  isOpen,
  onClose,
  orders = [],
  onRefundCompleted,
}: RestaurantRefundModalProps) {
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("إرجاع طلب بناء على رغبة العميل");
  const [customReason, setCustomReason] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "wallet">("cash");

  const commonReasons = [
    "صنف غير مطابق للمواصفات",
    "تأخر تجهيز أو توصيل الطلب",
    "صنف تالف أو بارد",
    "خطأ في إدخال الطلب من الكاشير",
    "إلغاء الطلب من قبل العميل",
    "أخرى (كتابة سبب مخصص)",
  ];

  // Look up order
  const handleLookupOrder = (orderNumStr: string) => {
    setOrderNumberInput(orderNumStr);
    const num = parseInt(orderNumStr.replace(/\D/g, ""), 10);
    if (!num) {
      setSelectedOrder(null);
      return;
    }

    const localOrders =
      orders && orders.length > 0
        ? orders
        : typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("pos_local_orders") || "[]")
          : [];

    const found = localOrders.find((o: any) => o.order_number === num || o.id === String(num));
    if (found) {
      setSelectedOrder(found);
      setRefundAmount(String(found.total || ""));
      if (found.payment_method) {
        setPaymentMethod(found.payment_method);
      }
    } else {
      setSelectedOrder(null);
    }
  };

  const handleExecuteRefund = () => {
    const orderNum = parseInt(orderNumberInput.replace(/\D/g, ""), 10);
    if (!orderNum) {
      toast.error("يرجى إدخال رقم الطلب المراد إرجاعه");
      return;
    }

    const amt = Number(refundAmount);
    if (!amt || amt <= 0) {
      toast.error("يرجى إدخال مبلغ مرتجع صحيح أكبر من الصفر");
      return;
    }

    if (selectedOrder && amt > Number(selectedOrder.total)) {
      toast.error("لا يمكن أن يتجاوز مبلغ المرتجع إجمالي قيمة الطلب الأصلي");
      return;
    }

    const finalReason =
      refundReason === "أخرى (كتابة سبب مخصص)"
        ? customReason.trim() || "إرجاع بطلب العميل"
        : refundReason;

    try {
      const activeShift =
        erpStore.getActiveRestaurantShift() || erpStore.getOrCreateActiveRestaurantShift();
      const refundRecord = erpStore.refundRestaurantOrder({
        order_number: orderNum,
        refund_amount: amt,
        refund_reason: finalReason,
        payment_method: paymentMethod,
        currency: "EGP",
        cashier_name: activeShift?.cashier_name || "كاشير المطعم",
        items_summary: selectedOrder?.items
          ? selectedOrder.items.map((i: any) => `${i.name_ar} (x${i.quantity || 1})`).join(", ")
          : undefined,
      });

      toast.success(
        `تم تسجيل حركة المرتجع بنجاح للطلب #${orderNum} وتوليد القيد المحاسبي (${refundRecord.journal_ref})`,
      );

      // Reset and close
      setOrderNumberInput("");
      setSelectedOrder(null);
      setRefundAmount("");
      onClose();
      if (onRefundCompleted) onRefundCompleted();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تسجيل حركة المرتجع");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] rounded-3xl p-0 overflow-hidden">
        <div className="bg-gradient-to-l from-rose-950 via-slate-900 to-rose-950 p-5 text-white">
          <DialogHeader className="text-right space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold w-fit">
              <RotateCcw size={13} />
              <span>إدارة مردودات المبيعات</span>
            </div>
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <AlertTriangle className="text-rose-400" size={20} />
              تسجيل حركة مرتجع طلب (Refund)
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs">
              إرجاع قيمة طلب كامل أو جزئي، مع خصم المبلغ من الخزينة وتوليد قيد مردودات المبيعات
              آلياً.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Order Number Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground flex items-center gap-1">
              <Receipt size={13} className="text-rose-600" />
              رقم الطلب المراد إرجاعه:
            </Label>
            <div className="flex gap-2">
              <Input
                value={orderNumberInput}
                onChange={(e) => handleLookupOrder(e.target.value)}
                placeholder="أدخل رقم الطلب (مثال: 1045)"
                className="rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Found Order Info */}
          {selectedOrder && (
            <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">طلب #{selectedOrder.order_number}</span>
                <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                  القيمة: {Number(selectedOrder.total || 0).toLocaleString()} EGP
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">
                التاريخ: {new Date(selectedOrder.created_at).toLocaleString("ar-EG")} | طريقة الدفع:{" "}
                {selectedOrder.payment_method === "card"
                  ? "بطاقة"
                  : selectedOrder.payment_method === "wallet"
                    ? "محفظة"
                    : "نقدي"}
              </div>
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="text-[10px] text-foreground/80 bg-background p-2 rounded-xl border border-border/50">
                  الأصناف:{" "}
                  {selectedOrder.items
                    .map((i: any) => `${i.name_ar || i.name} (x${i.quantity || 1})`)
                    .join(", ")}
                </div>
              )}
            </div>
          )}

          {/* Refund Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground flex items-center gap-1">
              <DollarSign size={13} className="text-rose-600" />
              المبلغ المسترد (EGP):
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0.00"
              className="rounded-xl text-xs font-mono font-black text-rose-600 border-rose-200"
            />
          </div>

          {/* Refund Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">سبب المرتجع:</Label>
            <select
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-background border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {commonReasons.map((r, idx) => (
                <option key={idx} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {refundReason === "أخرى (كتابة سبب مخصص)" && (
            <div className="space-y-1.5 animate-in fade-in-50">
              <Label className="text-xs font-bold">اكتب تفاصيل السبب المخصص:</Label>
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="اكتب سبب الإرجاع هنا..."
                className="rounded-xl text-xs"
              />
            </div>
          )}

          {/* Payment Method to Refund Through */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-foreground">
              طريقة رد المبلغ (الخزينة المستهدفة):
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  paymentMethod === "cash"
                    ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 shadow-xs"
                    : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                💵 نقدي (Cash)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  paymentMethod === "card"
                    ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 shadow-xs"
                    : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                💳 بطاقة (Card)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("wallet")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  paymentMethod === "wallet"
                    ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 shadow-xs"
                    : "bg-muted/30 border-border text-muted-foreground"
                }`}
              >
                📱 محفظة (Wallet)
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t border-border flex justify-between sm:justify-between items-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="rounded-xl text-xs font-bold"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={handleExecuteRefund}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black gap-1.5 shadow-md cursor-pointer"
          >
            <RotateCcw size={14} />
            تأكيد تسجيل المرتجع وترحيل القيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
