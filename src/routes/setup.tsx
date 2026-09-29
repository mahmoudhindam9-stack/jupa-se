import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "إعداد أول مدير" }] }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adminCount, setAdminCount] = useState<number | null>(null);

  useEffect(() => {
    async function checkAdminCount() {
      try {
        const { data, error } = await (supabase.rpc as any)("admin_count");
        if (error) {
          setError(error.message);
          return;
        }
        setAdminCount(Number(data ?? 0));
      } catch (err: any) {
        setError(err.message || String(err));
      }
    }
    checkAdminCount();
  }, []);

  useEffect(() => {
    if (adminCount !== null && adminCount > 0) {
      navigate({ to: "/login" });
    }
  }, [adminCount, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailToUse = username.includes("@") ? username : `${username}@restocash.local`;

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: emailToUse,
      password,
      options: {
        data: { full_name: fullName, phone, role: "admin" },
      },
    });
    setLoading(false);
    if (signUpErr) {
      setError(signUpErr.message);
      return;
    }
    if (!signUpData.user) {
      setError("لم يتم إنشاء المستخدم");
      return;
    }
    navigate({ to: "/admin" });
  };

  if (adminCount === null) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل…</div>;
  }

  if (adminCount > 0) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 bg-card border border-border p-6 rounded-2xl">
        <h1 className="text-2xl font-black text-center">إعداد أول حساب مدير</h1>
        <p className="text-sm text-muted-foreground text-center">
          استخدم هذه الصفحة مرة واحدة لإنشاء حساب المدير الأول.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>الاسم الكامل</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label>اسم المستخدم</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin"
            />
          </div>
          <div>
            <Label>الهاتف</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>كلمة المرور</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري الإنشاء…" : "إنشاء الحساب"}
          </Button>
        </form>
      </div>
    </div>
  );
}
