import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, ClipboardList, GripVertical } from "lucide-react";

interface QQuestion {
  id: string;
  question_text: string;
  options: string[];
  sort_order: number;
  is_enabled: boolean;
}

export default function AdminQualification() {
  const [questions, setQuestions] = useState<QQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QQuestion | null>(null);
  const [text, setText] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("qualification_questions")
      .select("*")
      .order("sort_order", { ascending: true });
    setQuestions(
      (data || []).map((q: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setText("");
    setOptionsText("");
    setEnabled(true);
    setDialogOpen(true);
  };

  const openEdit = (q: QQuestion) => {
    setEditing(q);
    setText(q.question_text);
    setOptionsText(q.options.join("\n"));
    setEnabled(q.is_enabled);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const opts = optionsText.split("\n").map((o) => o.trim()).filter(Boolean);
    if (!text.trim()) {
      toast({ title: "Question required", variant: "destructive" });
      return;
    }
    if (opts.length < 2) {
      toast({ title: "Add at least 2 options", description: "One option per line.", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("qualification_questions")
        .update({ question_text: text.trim(), options: opts, is_enabled: enabled })
        .eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Question updated" });
    } else {
      const nextOrder = questions.length ? Math.max(...questions.map((q) => q.sort_order)) + 1 : 1;
      const { error } = await supabase
        .from("qualification_questions")
        .insert({ question_text: text.trim(), options: opts, is_enabled: enabled, sort_order: nextOrder });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Question added" });
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("qualification_questions").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Question deleted" });
      load();
    }
  };

  const toggleEnabled = async (q: QQuestion) => {
    await supabase.from("qualification_questions").update({ is_enabled: !q.is_enabled }).eq("id", q.id);
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index];
    const b = questions[target];
    await Promise.all([
      supabase.from("qualification_questions").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("qualification_questions").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Qualification Surveys</h1>
            <p className="text-xs text-muted-foreground">Manage the questions users answer before unlocking the platform.</p>
          </div>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Question
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No questions yet. Add your first qualification question.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id} className={q.is_enabled ? "" : "opacity-60"}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <button onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">
                    <span className="text-primary mr-1">{i + 1}.</span>
                    {q.question_text}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map((o) => (
                      <span key={o} className="text-[11px] px-2 py-0.5 rounded-full bg-accent/60 text-muted-foreground">
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{q.is_enabled ? "Enabled" : "Disabled"}</span>
                    <Switch checked={q.is_enabled} onCheckedChange={() => toggleEnabled(q)} />
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(q)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDelete(q.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Question" : "Add Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Question</label>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. What is your age range?" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Options (one per line)</label>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={5}
                placeholder={"18-24\n25-34\n35-44"}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <span className="text-sm">Enabled</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
