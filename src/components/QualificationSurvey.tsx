import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQualification } from "@/hooks/useQualification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Lock,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Send,
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SOCIAL_LINKS } from "@/config/social";

export default function QualificationSurvey() {
  const { user } = useAuth();
  const { questions, markCompleted, refresh } = useQualification();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = questions.length;
  const current = questions[step];
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const isLast = step === total - 1;
  const currentAnswered = current ? !!answers[current.id] : false;

  const sendTelegram = async () => {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, country")
        .eq("user_id", user!.id)
        .maybeSingle();
      const uname = prof?.username || user?.email?.split("@")[0] || "A user";
      const country = prof?.country || "Unknown";
      const time = new Date().toLocaleString();
      const message = `✅ <b>${uname}</b> completed the Qualification Survey.\n🌍 Country: ${country}\n🕒 ${time}`;
      await supabase.functions.invoke("telegram-notify", { body: { message } });
    } catch (e) {
      console.error("Telegram completion notify failed:", e);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (answeredCount !== total) {
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
    if (error) {
      setSubmitting(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await sendTelegram();
    setSubmitting(false);
    setSuccess(true);
    markCompleted();
  };

  const handleContinue = () => {
    refresh();
  };

  // Success screen with Telegram promotion
  if (success) {
    return (
      <div className="max-w-md mx-auto px-3">
        <Card className="border-primary/30 shadow-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 text-center space-y-5">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center animate-in zoom-in duration-300">
              <PartyPopper className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> You're Qualified!
              </h2>
              <p className="text-sm text-muted-foreground">
                Survey inventory and offers are now unlocked. Start earning today!
              </p>
            </div>

            <div className="rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/10 p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-[#229ED9]">
                <Send className="h-5 w-5" />
                <span className="font-semibold text-sm">Join Our Telegram Channel</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Get instant survey updates, exclusive rewards, and platform announcements.
              </p>
              <a href={SOCIAL_LINKS.telegram} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full gap-2 bg-[#229ED9] hover:bg-[#1b8ec2] text-white">
                  <Send className="h-4 w-4" /> Join Our Telegram Channel
                </Button>
              </a>
            </div>

            <Button variant="outline" className="w-full" onClick={handleContinue}>
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-3">
      <Card className="border-primary/30 shadow-xl overflow-hidden">
        <div className="bg-primary/10 px-5 py-4 flex items-center gap-3 border-b border-border/50">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold leading-tight">Qualification Survey</h2>
            <p className="text-[11px] text-muted-foreground">Answer a few quick questions to unlock the platform.</p>
          </div>
        </div>

        <CardContent className="p-5 space-y-5">
          {total === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No qualification questions are available right now.
            </p>
          ) : (
            <>
              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Question {step + 1} of {total}</span>
                  <span>{Math.round(((step + 1) / total) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-accent/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${((step + 1) / total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question (one at a time) */}
              <div key={current.id} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                <p className="text-base font-semibold leading-snug">{current.question_text}</p>
                <div className="grid grid-cols-1 gap-2">
                  {current.options.map((opt) => {
                    const selected = answers[current.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswers((p) => ({ ...p, [current.id]: opt }))}
                        className={cn(
                          "flex items-center gap-3 text-left text-sm px-4 py-3 rounded-lg border transition-all",
                          selected
                            ? "border-primary bg-primary/15 text-primary font-medium shadow-sm"
                            : "border-border hover:bg-accent/50 hover:border-primary/40"
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

              {/* Navigation */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                {isLast ? (
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={submitting || answeredCount !== total}
                  >
                    {submitting ? (
                      "Submitting..."
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4 mr-1" /> Submit
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
                    disabled={!currentAnswered}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </>
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
