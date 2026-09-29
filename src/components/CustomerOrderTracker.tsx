// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Clock3, CheckCircle2, ChefHat, ReceiptText, XCircle, RefreshCw } from "lucide-react";

const STATUS = {
  pending_captain: { label: "بانتظار الكابتن", icon: Clock3 },
  STATUS_PENDING_CAPTAIN: { label: "بانتظار الكابتن", icon: Clock3 },
  sent_to_cashier: { label: "تم اعتماد الطلب — بانتظار الكاشير", icon: ReceiptText },
  preparing: { label: "جاري تجهيز الطلب", icon: ChefHat },
  ready: { label: "الطلب جاهز", icon: CheckCircle2 },
  completed: { label: "تم إنهاء الطلب", icon: CheckCircle2 },
  cancelled: { label: "تم إلغاء الطلب", icon: XCircle },
};

export function CustomerOrderTracker({ token, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const load = async () => {
      const { data, error: dbError } = await supabase
        .from("orders")
        .select(
          "id,order_number,status,total,pricing_currency,payment_currency,payment_exchange_rate,payment_amount",
        )
        .eq("customer_tracking_token", token)
        .maybeSingle();
      if (!alive) return;
      setLoading(false);
      if (dbError) setError(dbError.message);
      else setOrder(data || null);
    };
    load();
    const channel = supabase
      .channel(`customer-order-tracker-${token}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `customer_tracking_token=eq.${token}`,
        },
        (payload) => alive && setOrder(payload.new),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [token]);

  if (loading)
    return (
      <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-7 font-bold">جاري متابعة الطلب...</div>
      </div>
    );
  if (error || !order)
    return (
      <div className="fixed inset-0 z-[90] bg-slate-950/60 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-7 max-w-sm w-full text-center">
          <div className="font-black text-lg">تعذر العثور على الطلب</div>
          <div className="text-sm text-slate-500 mt-2">تحقق من رابط المتابعة أو أعد المحاولة.</div>
          <Button className="w-full mt-5" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    );

  const meta = STATUS[order.status] || { label: "جاري معالجة الطلب", icon: RefreshCw };
  const Icon = meta.icon;
  const paymentCurrency = order.payment_currency || order.pricing_currency || "EGP";
  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Icon size={24} />
          </div>
          <div>
            <div className="font-black text-xl">متابعة طلبي</div>
            <div className="text-xs text-slate-500">
              رقم الطلب: #{order.order_number || order.id}
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center">
          <div className="text-xs font-bold text-slate-500">الحالة الحالية</div>
          <div className="mt-1 text-xl font-black text-slate-900">{meta.label}</div>
          <div className="mt-4 text-lg font-black text-indigo-600">
            {Number(order.payment_amount ?? order.total ?? 0).toLocaleString()} {paymentCurrency}
          </div>
          {order.payment_exchange_rate ? (
            <div className="mt-1 text-[11px] text-slate-500">
              معامل التحويل: {order.payment_exchange_rate}
            </div>
          ) : null}
        </div>
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs font-bold text-emerald-800 space-y-1">
          <div>✓ الطلب محفوظ برقم واحد داخل النظام</div>
          <div>✓ الحالة تتحدث تلقائيًا عند انتقال الطلب بين الكابتن والكاشير والمطبخ</div>
        </div>
        <Button className="w-full mt-5" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </div>
  );
}
