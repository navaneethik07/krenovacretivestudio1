import { CATEGORIES } from "@/lib/categories";

export default function CategorySelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
    >
      {CATEGORIES.map((c) => <option key={c.value} value={c.value} className="bg-card">{c.label}</option>)}
    </select>
  );
}
