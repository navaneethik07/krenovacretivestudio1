import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { categoryLabel } from "@/lib/categories";
import CategorySelect from "@/components/admin/CategorySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMPTY = { name: "", category: "reel", price: "", unit: "per reel", delivery: "", tools: "", description: "" };

export default function AdminServices() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const { data } = useQuery({ queryKey: ["services"], queryFn: () => base44.entities.Service.list("category", 200) });
  const rows = Array.isArray(data) ? data : data?.items ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["services"] });
  const save = useMutation({
    mutationFn: () => base44.entities.Service.create({ ...form, price: Number(form.price) }),
    onSuccess: () => { setForm(EMPTY); refresh(); },
  });
  const remove = useMutation({ mutationFn: (id) => base44.entities.Service.delete(id), onSuccess: refresh });
  const reprice = useMutation({ mutationFn: ({ id, price }) => base44.entities.Service.update(id, { price: Number(price) }), onSuccess: refresh });
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-5">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3 rounded-2xl border border-border bg-card p-5 lg:col-span-2">
        <h2 className="font-heading text-lg font-medium">Add a service rate</h2>
        <Input required placeholder="Service name" value={form.name} onChange={f("name")} />
        <CategorySelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Input required type="number" min="0" placeholder="Rate (₹)" value={form.price} onChange={f("price")} />
          <Input placeholder="Unit, e.g. per reel" value={form.unit} onChange={f("unit")} />
        </div>
        <Input placeholder="Delivery, e.g. 2 days" value={form.delivery} onChange={f("delivery")} />
        <Input placeholder="Tools used" value={form.tools} onChange={f("tools")} />
        <Input placeholder="Short description" value={form.description} onChange={f("description")} />
        <Button type="submit" disabled={save.isPending} className="w-full">{save.isPending ? "Saving..." : "Add rate"}</Button>
      </form>
      <div className="space-y-3 lg:col-span-3">
        <h2 className="font-heading text-lg font-medium">Current rates ({rows.length})</h2>
        {rows.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">{categoryLabel(s.category)} · {s.unit}</p>
            </div>
            <span className="text-amber-400">₹</span>
            <Input
              key={s.price}
              type="number"
              defaultValue={s.price}
              className="w-24"
              onBlur={(e) => Number(e.target.value) !== s.price && reprice.mutate({ id: s.id, price: e.target.value })}
            />
            <Button variant="ghost" size="icon" onClick={() => remove.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
