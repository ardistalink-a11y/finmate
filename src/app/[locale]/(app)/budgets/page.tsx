import { createClient } from "@/lib/supabase/server";
import { Card, Button, Input, Label } from "@/components/ui";
import { createBudget } from "@/server/actions/planning";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: budgets } = await supabase.from("budgets").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
  return <div className="mx-auto max-w-6xl space-y-6"><div><h1 className="text-2xl font-semibold">Budget</h1><p className="text-sm text-muted">Tetapkan batas pengeluaran dan pantau rencanamu.</p></div><div className="grid gap-6 lg:grid-cols-[1fr_320px]"><Card>{(budgets ?? []).length === 0 ? <p className="py-8 text-center text-sm text-muted">Belum ada budget.</p> : <div className="space-y-3">{budgets!.map((b) => <div key={b.id} className="flex items-center justify-between rounded-md border p-3"><div><div className="font-medium">{b.name}</div><div className="text-xs text-muted">{b.period} · mulai {b.start_date}</div></div><div className="num font-semibold">{Number(b.amount).toLocaleString("id-ID")} {b.currency}</div></div>)}</div>}</Card><Card><h2 className="mb-4 text-sm font-semibold">Tambah Budget</h2><form action={createBudget} className="space-y-4"><div><Label htmlFor="name">Nama</Label><Input id="name" name="name" required /></div><div><Label htmlFor="amount">Batas</Label><Input id="amount" name="amount" type="number" min="0" step="0.01" required /></div><div><Label htmlFor="period">Periode</Label><select id="period" name="period" className="input"><option value="monthly">Bulanan</option><option value="weekly">Mingguan</option><option value="yearly">Tahunan</option></select></div><Button type="submit" className="w-full">Simpan</Button></form></Card></div></div>;
}
