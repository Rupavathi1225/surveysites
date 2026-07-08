import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQualification } from "@/hooks/useQualification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Lock, CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QualificationSurvey() {
  const { user } = useAuth();
  const { questions, markCompleted, refresh } = useQualification();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const total = questions.length;
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const allAnswered = total > 0 && answeredCount === total;

  const handleSubmit = async () => {
    if (!user) return;
    if (!allAnswered) {
      toast({ title: "Incomplete", description: "Please answer all questions.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = questions.map((q) => ({
      question_id: q.id,
      question: q.question_text,
      answer: answers[q.id],
    }));
    const { error } = await supabase
      .from("qualification_responses")
      .upsert({ user_id: user.id, answers: payload }, { onConflict: "user_id" });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Qualified!", description: "Survey inventory and offers are now unlocked." });
    markCompleted();
    refresh();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-primary/30 shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl md:text-2xl">Qualification Survey</CardTitle>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Please complete the Qualification Survey to unlock survey inventory and offers.
          </p>
          {total > 0 && (
            <div className="pt-1">
              <div className="h-2 w-full bg-accent/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(answeredCount / total) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {answeredCount} of {total} answered
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {total === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              No qualification questions are available right now.
            </p>
          )}
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-semibold">
                <span className="text-primary mr-1">{idx + 1}.</span>
                {q.question_text}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                      className={cn(
                        "flex items-center gap-2 text-left text-sm px-3 py-2 rounded-md border transition-colors",
                        selected
                          ? "border-primary bg-primary/15 text-primary font-medium"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                          selected ? "border-primary" : "border-muted-foreground/40"
                        )}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {total > 0 && (
            <Button className="w-full" onClick={handleSubmit} disabled={submitting || !allAnswered}>
              {submitting ? (
                "Submitting..."
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1" /> Submit & Unlock Access
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function QualificationLockedBanner() {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 rounded-xl border border-dashed border-border bg-card/40 py-14 px-6">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">Locked</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Please complete the Qualification Survey to unlock survey inventory and offers.
      </p>
    </div>
  );
}

export { CheckCircle2 };
