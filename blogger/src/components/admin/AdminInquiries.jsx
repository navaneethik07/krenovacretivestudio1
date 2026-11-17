import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function AdminInquiries() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["inquiries"], queryFn: () => base44.entities.Inquiry.list("-created_date", 100) });
  const rows = Array.isArray(data) ? data : data?.items ?? [];
  const remove = useMutation({
    mutationFn: (id) => base44.entities.Inquiry.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });

  return (
    <div className="mt-6 space-y-3">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
      {rows.map((i) => (
        <div key={i.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex-1">
            <p className="font-medium">{i.name} <span className="text-sm font-normal text-muted-foreground">· {i.contact}</span></p>
            {i.interest && <p className="text-xs text-accent">{i.interest}</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{i.message}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}
