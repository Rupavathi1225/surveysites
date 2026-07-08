import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface QualificationQuestion {
  id: string;
  question_text: string;
  options: string[];
  sort_order: number;
  is_enabled: boolean;
}

interface QualificationContextValue {
  loading: boolean;
  completed: boolean;
  questions: QualificationQuestion[];
  refresh: () => Promise<void>;
  markCompleted: () => void;
}

const QualificationContext = createContext<QualificationContextValue>({
  loading: true,
  completed: false,
  questions: [],
  refresh: async () => {},
  markCompleted: () => {},
});

export function QualificationProvider({ children }: { children: ReactNode }) {
  const { user, isAdminOrSubAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [questions, setQuestions] = useState<QualificationQuestion[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: qData } = await supabase
      .from("qualification_questions")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order", { ascending: true });

    const parsed: QualificationQuestion[] = (qData || []).map((q: any) => ({
      ...q,
      options: Array.isArray(q.options) ? q.options : [],
    }));
    setQuestions(parsed);

    const { data: response } = await supabase
      .from("qualification_responses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Admins bypass the gate. Users with no enabled questions are auto-unlocked.
    setCompleted(!!response || isAdminOrSubAdmin || parsed.length === 0);
    setLoading(false);
  }, [user, isAdminOrSubAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markCompleted = useCallback(() => setCompleted(true), []);

  return (
    <QualificationContext.Provider value={{ loading, completed, questions, refresh, markCompleted }}>
      {children}
    </QualificationContext.Provider>
  );
}

export function useQualification() {
  return useContext(QualificationContext);
}
