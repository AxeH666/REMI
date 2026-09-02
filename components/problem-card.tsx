import type { AnalysisProblem } from "@/lib/analysis-schema";
import {
  formatTimestamp,
  getConfidenceLabel,
} from "@/lib/analysis-display";

const fixTypeLabels: Record<AnalysisProblem["fixType"], string> = {
  edit: "Edit",
  reshoot: "Reshoot",
  either: "Edit or reshoot",
  none: "Keep as is",
};

const confidenceStyles = {
  low: "border-amber-300 bg-amber-50 text-amber-900",
  medium: "border-sky-300 bg-sky-50 text-sky-900",
  high: "border-lime-300 bg-lime-50 text-lime-950",
} as const;

type ProblemCardProps = {
  index: number;
  problem: AnalysisProblem;
};

export function ProblemCard({ index, problem }: ProblemCardProps) {
  const confidenceLabel = getConfidenceLabel(problem.confidence);
  const confidencePercent = Math.round(problem.confidence * 100);

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-stone-300 bg-[#fffdf7] shadow-[0_14px_36px_rgba(28,27,23,0.08)]">
      <div className="border-b border-stone-200 px-5 py-5 sm:px-7">
        <div className="mb-3 flex flex-wrap items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
          <span>Problem {index + 1}</span>
          <span aria-hidden="true" className="text-stone-300">
            /
          </span>
          <span>{fixTypeLabels[problem.fixType]}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="max-w-3xl text-xl font-semibold leading-snug tracking-[-0.02em] text-stone-950 sm:text-2xl">
              {problem.title}
            </h3>
            <p className="mt-2 font-mono text-sm font-semibold tabular-nums text-stone-700">
              <span className="sr-only">Approximate timestamp: </span>
              {formatTimestamp(problem.startSeconds)}
              <span aria-hidden="true"> – </span>
              <span className="sr-only">to </span>
              {formatTimestamp(problem.endSeconds)}
            </p>
          </div>

          <span
            aria-label={`Confidence: ${confidenceLabel}, ${confidencePercent} percent`}
            className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] ${confidenceStyles[confidenceLabel]}`}
          >
            {confidenceLabel} · {confidencePercent}%
          </span>
        </div>
      </div>

      <div className="grid gap-px bg-stone-200 lg:grid-cols-2">
        <section className="bg-white px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
            What REMI noticed
          </p>
          <p className="mt-3 text-[0.98rem] leading-7 text-stone-800">
            {problem.observation}
          </p>
        </section>

        <section className="bg-white px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
            Why it matters
          </p>
          <p className="mt-3 text-[0.98rem] leading-7 text-stone-800">
            {problem.interpretation}
          </p>
        </section>
      </div>

      <section className="border-t border-stone-200 bg-lime-100 px-5 py-5 sm:px-7 sm:py-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-950/70">
          Exact {fixTypeLabels[problem.fixType].toLowerCase()} instruction
        </p>
        <p className="mt-2 text-base font-semibold leading-7 text-stone-950 sm:text-lg">
          {problem.instruction}
        </p>
      </section>
    </article>
  );
}
