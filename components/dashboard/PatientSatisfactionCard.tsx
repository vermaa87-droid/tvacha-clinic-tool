"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";
import type { PatientFeedback } from "@/lib/types";

interface Props {
  doctorId: string;
}

type FeedbackRow = Pick<
  PatientFeedback,
  | "id"
  | "rating"
  | "comment"
  | "improvement_suggestion"
  | "google_review_clicked"
  | "submitted_at"
> & {
  patients?: { full_name: string | null } | null;
};

export function PatientSatisfactionCard({ doctorId }: Props) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("patient_feedback")
      .select(
        "id, rating, comment, improvement_suggestion, google_review_clicked, submitted_at, patients(full_name)"
      )
      .eq("doctor_id", doctorId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });
    setRows((data as unknown as FeedbackRow[]) ?? []);
    setLoading(false);
  }, [doctorId]);

  useEffect(() => {
    load();
  }, [load]);

  const { avg, total, googleClicks, distribution, latest } = useMemo(() => {
    const submitted = rows.filter((r) => r.rating !== null);
    const total = submitted.length;
    const avg =
      total === 0
        ? 0
        : submitted.reduce((s, r) => s + (r.rating ?? 0), 0) / total;
    const googleClicks = submitted.filter((r) => r.google_review_clicked).length;
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    submitted.forEach((r) => {
      if (r.rating && r.rating >= 1 && r.rating <= 5) dist[r.rating]++;
    });
    const latest = submitted.slice(0, 5);
    return { avg, total, googleClicks, distribution: dist, latest };
  }, [rows]);

  const maxBar = Math.max(1, ...Object.values(distribution));

  return (
    <section
      className="rounded-xl p-4 sm:p-5 bg-card"
      style={{ border: "1px solid var(--color-primary-200)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: "#b8936a" }} />
          <h3
            className="text-lg sm:text-xl font-serif font-semibold"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {t("analytics_satisfaction_title")}
          </h3>
        </div>
      </div>

      {loading ? (
        <div className="h-32 rounded-lg animate-pulse" style={{ background: "var(--color-primary-200)" }} />
      ) : total === 0 ? (
        <div className="py-8 text-center">
          <div
            className="w-10 h-10 rounded-full mb-3 mx-auto flex items-center justify-center"
            style={{ background: "var(--color-primary-200)" }}
          >
            <Star className="w-5 h-5" style={{ color: "#b8936a" }} />
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("analytics_satisfaction_empty")}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatTile
              label={t("analytics_satisfaction_avg")}
              value={
                <span className="inline-flex items-center gap-1">
                  {avg.toFixed(1)}
                  <Star className="w-4 h-4" style={{ color: "#b8936a", fill: "#b8936a" }} strokeWidth={1.5} />
                </span>
              }
            />
            <StatTile
              label={t("analytics_satisfaction_total")}
              value={<>{total}</>}
            />
            <StatTile
              label={t("analytics_satisfaction_google")}
              value={<>{googleClicks}</>}
            />
          </div>

          <div className="mb-5">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#b8936a", letterSpacing: "0.1em" }}
            >
              {t("analytics_satisfaction_distribution")}
            </p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = distribution[n] ?? 0;
                const pct = (count / maxBar) * 100;
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 w-8" style={{ color: "var(--color-text-secondary)" }}>
                      {n}
                      <Star className="w-3 h-3" style={{ color: "#b8936a", fill: "#b8936a" }} strokeWidth={1.5} />
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(184,147,106,0.12)" }}
                    >
                      <div
                        className="h-full rounded-full transition-[width]"
                        style={{
                          width: `${pct}%`,
                          background: n >= 4 ? "#b8936a" : n === 3 ? "#c4a882" : "#d4b89a",
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: "#b8936a", letterSpacing: "0.1em" }}
            >
              {t("analytics_satisfaction_latest")}
            </p>
            <div className="space-y-2">
              {latest.map((r) => {
                const comment = r.comment || r.improvement_suggestion;
                const name = r.patients?.full_name || t("analytics_satisfaction_anon");
                const date = r.submitted_at
                  ? (() => {
                      try {
                        return format(parseISO(r.submitted_at), "d MMM");
                      } catch {
                        return "";
                      }
                    })()
                  : "";
                return (
                  <div
                    key={r.id}
                    className="rounded-lg p-3"
                    style={{
                      border: "1px solid var(--color-separator)",
                      backgroundColor: "var(--color-primary-50, #faf8f4)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className="w-3.5 h-3.5"
                            style={{
                              color: "#b8936a",
                              fill: (r.rating ?? 0) >= n ? "#b8936a" : "transparent",
                            }}
                            strokeWidth={1.5}
                          />
                        ))}
                        <span
                          className="ml-2 text-xs font-medium"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {name}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {date}
                      </span>
                    </div>
                    {comment && (
                      <p className="text-sm mt-1" style={{ color: "var(--color-text-primary)" }}>
                        {comment}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="rounded-lg px-3 py-3"
      style={{
        border: "1px solid rgba(184,147,106,0.18)",
        borderLeft: "3px solid #b8936a",
        backgroundColor: "var(--color-card)",
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: "var(--color-text-muted)", letterSpacing: "0.08em" }}
      >
        {label}
      </p>
      <p
        className="text-xl sm:text-2xl font-bold leading-none font-serif"
        style={{ color: "var(--color-text-primary)", fontFamily: "'Cormorant Garamond', serif" }}
      >
        {value}
      </p>
    </div>
  );
}
