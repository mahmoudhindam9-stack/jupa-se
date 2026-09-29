// @ts-nocheck
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Coins, Send } from "lucide-react";

export function CaptainSelfOrderPanel() {
  const queryClient = useQueryClient();
  const [currency, setCurrency] = useState({});
  const [rate, setRate] = useState({});
  const ordersQuery = useQuery({
    queryKey: ["captain-self-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,order_number,table_id,total,status,items,created_at,pricing_currency,payment_currency,payment_exchange_rate,customer_tracking_token",
        )
        .in("status", ["pending_captain", "STATUS_PENDING_CAPTAIN"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("captain-self-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        queryClient.invalidateQueries({ queryKey: ["captain-self-orders"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  const orders = ordersQuery.data || [];
  if (!orders.length) return null;

  const sendToCashier = async (order) => {
    const paymentCurrency = currency[order.id] || order.payment_currency || "EGP";
    const exchangeRate = Number(rate[order.id] || order.payment_exchange_rate || 1);
    const pricingCurrency = order.pricing_currency || "EGP";
    const total = Number(order.total || 0);
    const paymentAmount =
      pricingCurrency === paymentCurrency ? total : total / Math.max(exchangeRate, 0.000001);
    const { error } = await supabase
      .from("orders")
      .update({
        payment_currency: paymentCurrency,
        payment_exchange_rate: exchangeRate,
        payment_amount: Number(paymentAmount.toFixed(2)),
        status: "sent_to_cashier",
      })
      .eq("id", order.id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["captain-self-orders"] });
  };

  return (
    <section className="max-w-7xl mx-auto w-full px-4 mt-4">
      <div className="rounded-3xl border border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-indigo-700" />
              <h2 className="font-black text-lg text-indigo-950">طلبات العملاء عبر QR</h2>
            </div>
            <p className="text-xs text-indigo-700 mt-1">
              حدد عملة الدفع ومعامل التحويل للطلب نفسه ثم أرسله للكاشير.
            </p>
          </div>
          <Badge className="bg-indigo-600">{orders.length} طلب</Badge>
        </div>
        <div className="space-y-3">
          {orders.map((order) => {
            const selected = currency[order.id] || order.payment_currency || "EGP";
            return (
              <div key={order.id} className="bg-white border border-indigo-100 rounded-2xl p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="font-black">طلب #{order.order_number || order.id}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      طاولة {String(order.table_id || "").replace(/^tbl-/, "") || "عام"} · السعر
                      الأساسي {Number(order.total || 0).toLocaleString()}{" "}
                      {order.pricing_currency || "EGP"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selected}
                      onChange={(e) => setCurrency((s) => ({ ...s, [order.id]: e.target.value }))}
                      className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold"
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="SSP">SSP</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-500">1 {selected} =</span>
                      <Input
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={rate[order.id] ?? order.payment_exchange_rate ?? 1}
                        onChange={(e) => setRate((s) => ({ ...s, [order.id]: e.target.value }))}
                        className="w-24 h-9 text-center text-xs font-bold"
                      />
                      <span className="text-[10px] font-bold text-slate-500">EGP</span>
                    </div>
                    <Button onClick={() => sendToCashier(order)} className="h-9 font-bold gap-1">
                      <Send size={14} /> للكاشير
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
