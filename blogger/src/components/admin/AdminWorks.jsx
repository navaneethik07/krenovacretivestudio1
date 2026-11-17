import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { categoryLabel } from "@/lib/categories";
import { getEmbedUrl } from "@/lib/videoEmbed";
import CategorySelect from "@/components/admin/CategorySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const EMPTY = { title: "", client: "", category: "reel", description: "", thumbnail_url: "", featured: false };
const MAX_VIDEO_MB = 100;
const MAX_IMAGE_MB = 50;

export default function AdminWorks() {
  const qc = useQueryClient();
  const formRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [videoFile, setVideoFile] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const { data } = useQuery({ queryKey: ["works"], queryFn: () => base44.entities.Work.list("-created_date", 200) });
  const works = Array.isArray(data) ? data : data?.items ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["works"] });

  const reset = () => {
    setForm(EMPTY);
    setVideoFile("");
    setVideoLink("");
    setEditingId(null);
    setError("");
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        video_url: form.category === "poster" ? "" : videoLink.trim() || videoFile,
      };
      return editingId ? base44.entities.Work.update(editingId, payload) : base44.entities.Work.create(payload);
    },
    onSuccess: () => { reset(); refresh(); },
    onError: (e) => setError(e?.message || "Could not save this work. Please try again."),
  });
  const remove = useMutation({ mutationFn: (id) => base44.entities.Work.delete(id), onSuccess: refresh });
  const toggle = useMutation({ mutationFn: (w) => base44.entities.Work.update(w.id, { featured: !w.featured }), onSuccess: refresh });

  const upload = async (kind, file) => {
    if (!file) return;
    setError("");
    const maxMB = kind === "thumbnail_url" ? MAX_IMAGE_MB : MAX_VIDEO_MB;
    if (file.size > maxMB * 1024 * 1024) {
      const size = (file.size / (1024 * 1024)).toFixed(1);
      setError(`That file is ${size} MB, and uploads are limited to ${maxMB} MB. Please compress it, or paste a YouTube / Instagram link instead.`);
      return;
    }
    setBusy(kind);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      if (kind === "thumbnail_url") setForm((f) => ({ ...f, thumbnail_url: file_url }));
      else setVideoFile(file_url);
    } catch (e) {
      setError(e?.message ? `Upload failed: ${e.message}` : "Upload failed. Please check your connection and try again.");
    } finally {
      setBusy("");
    }
  };

  const startEdit = (w) => {
    const isLink = !!getEmbedUrl(w.video_url);
    setEditingId(w.id);
    setForm({
      title: w.title ?? "",
      client: w.client ?? "",
      category: w.category ?? "reel",
      description: w.description ?? "",
      thumbnail_url: w.thumbnail_url ?? "",
      featured: !!w.featured,
    });
    setVideoLink(isLink ? w.video_url : "");
    setVideoFile(isLink ? "" : w.video_url ?? "");
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const embedPreview = getEmbedUrl(videoLink);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-5">
      <form
        ref={formRef}
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        className="space-y-3 self-start rounded-2xl border border-border bg-card p-5 lg:col-span-2"
      >
        <h2 className="font-heading text-lg font-medium">{editingId ? "Edit work" : "Add a sample work"}</h2>
        <Input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input placeholder="Client / brand" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        <CategorySelect value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <Textarea placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Upload className="h-4 w-4" /> {busy === "thumbnail_url" ? "Uploading..." : form.thumbnail_url ? "Cover uploaded ✓" : "Upload cover image"}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; upload("thumbnail_url", f); }}
          />
        </label>
        {form.category !== "poster" && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Video</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <label className="flex cursor-pointer items-center gap-2">
                <Upload className="h-4 w-4" /> {busy === "video_file" ? "Uploading..." : videoFile ? "Video file ready ✓" : "Upload video file"}
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; upload("video_file", f); }}
                />
              </label>
              {videoFile && (
                <button type="button" onClick={() => setVideoFile("")} className="text-xs text-destructive hover:underline">remove</button>
              )}
            </div>
            {busy === "video_file" && <p className="text-xs text-muted-foreground">Keep this tab open while it uploads, up to 100 MB.</p>}
            <Input
              placeholder="or paste a YouTube / Instagram link"
              value={videoLink}
              onChange={(e) => setVideoLink(e.target.value.trim())}
            />
            {embedPreview && <p className="text-xs text-accent">Link will play inside the site ✓</p>}
            {videoLink && !embedPreview && /instagram|youtu/i.test(videoLink) && (
              <p className="text-xs text-amber-400">That link could not be read as a YouTube or Instagram video.</p>
            )}
            {videoFile && videoLink && <p className="text-xs text-muted-foreground">Both are added, so the link is used.</p>}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Show on home page
        </label>
        {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending || !!busy || !form.thumbnail_url || !form.title} className="flex-1">
            {save.isPending ? "Saving..." : editingId ? "Save changes" : "Publish work"}
          </Button>
          {editingId && (
            <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
          )}
        </div>
        {!form.thumbnail_url && <p className="text-xs text-muted-foreground">A cover image is needed.</p>}
      </form>
      <div className="space-y-3 lg:col-span-3">
        <h2 className="font-heading text-lg font-medium">Published works ({works.length})</h2>
        {works.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet. The site shows demo samples until you add your first work.</p>}
        {works.map((w) => (
          <div key={w.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            {w.thumbnail_url && <img src={w.thumbnail_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{w.title}</p>
              <p className="text-xs text-muted-foreground">{categoryLabel(w.category)}{w.client ? ` · ${w.client}` : ""}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label="Edit work" onClick={() => startEdit(w)}><Pencil className="h-4 w-4" /></Button>
            <Button variant={w.featured ? "default" : "outline"} size="sm" onClick={() => toggle.mutate(w)}>{w.featured ? "Featured" : "Feature"}</Button>
            <Button variant="ghost" size="icon" aria-label="Delete work" onClick={() => remove.mutate(w.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
