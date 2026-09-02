import type { AnalysisResult } from "@/lib/analysis-schema";

import { ProblemCard } from "./problem-card";

type AnalysisResultsProps = {
  result: AnalysisResult;
};

export function AnalysisResults({ result }: AnalysisResultsProps) {
  const problemCountLabel = `${result.problems.length} ${
    result.problems.length === 1 ? "priority problem" : "priority problems"
  }`;

  return (
    <section
      aria-label="REMI analysis results"
      className="remi-break-anywhere min-w-0 space-y-8 sm:space-y-10"
    >
      <header className="overflow-hidden rounded-3xl border border-stone-300 bg-white shadow-[0_20px_60px_rgba(28,27,23,0.1)]">
        <div className="grid md:grid-cols-[minmax(0,1fr)_auto] md:items-stretch">
          <div className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-stone-600">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full bg-lime-500 shadow-[0_0_0_4px_rgba(132,204,22,0.18)]"
                />
                Analysis complete
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                {problemCountLabel}
              </span>
            </div>

            <h2 className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
              Overall verdict
            </h2>
            <p className="mt-3 max-w-4xl text-2xl font-semibold leading-tight tracking-[-0.035em] text-stone-950 sm:text-3xl lg:text-4xl">
              {result.verdict}
            </p>
          </div>

          <div className="flex min-h-24 items-end justify-between gap-4 border-t border-stone-200 bg-stone-950 px-5 py-5 text-stone-50 md:w-44 md:flex-col md:items-start md:border-l md:border-t-0 md:px-6 md:py-7">
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-stone-400">
              REMI / 01
            </span>
            <p className="max-w-32 text-sm font-medium leading-5 text-stone-200">
              Creative diagnosis, grounded in the clip.
            </p>
          </div>
        </div>
      </header>

      <section aria-labelledby="priority-problems-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
              Highest impact first
            </p>
            <h2
              id="priority-problems-heading"
              className="mt-1.5 text-2xl font-semibold tracking-[-0.03em] text-stone-950 sm:text-3xl"
            >
              What to fix
            </h2>
          </div>
          <p className="text-sm text-stone-600">
            Timestamps are approximate.
          </p>
        </div>

        {result.problems.length > 0 ? (
          <ol className="space-y-5 sm:space-y-6">
            {result.problems.map((problem, index) => (
              <li key={`${problem.startSeconds}-${problem.endSeconds}-${problem.title}`}>
                <ProblemCard index={index} problem={problem} />
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-2xl border border-lime-300 bg-lime-50 px-5 py-6 sm:px-7">
            <p className="font-semibold text-lime-950">
              No high-impact problems were found.
            </p>
            <p className="mt-1.5 text-sm leading-6 text-lime-950/75">
              REMI did not manufacture extra criticism to fill the list.
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-stone-300 bg-[#fffdf7] px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full bg-lime-200 text-sm font-black text-lime-950"
            >
              +
            </span>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-stone-950">
              Keep this
            </h2>
          </div>

          {result.keep.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {result.keep.map((strength) => (
                <li
                  key={strength}
                  className="grid grid-cols-[auto_1fr] gap-3 text-sm leading-6 text-stone-800 sm:text-base"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 rounded-full bg-lime-600"
                  />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm leading-6 text-stone-600">
              No specific strengths were identified in this analysis.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-stone-300 bg-white px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full bg-stone-200 text-sm font-black text-stone-700"
            >
              i
            </span>
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-stone-950">
              Limitations
            </h2>
          </div>

          {result.limitations.length > 0 ? (
            <ul className="mt-5 space-y-4">
              {result.limitations.map((limitation) => (
                <li
                  key={limitation}
                  className="grid grid-cols-[auto_1fr] gap-3 text-sm leading-6 text-stone-700 sm:text-base"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 rounded-full bg-stone-400"
                  />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm leading-6 text-stone-600">
              No additional limitations were reported.
            </p>
          )}
        </section>
      </div>

      <p className="border-l-2 border-stone-300 pl-4 text-xs leading-5 text-stone-500 sm:text-sm">
        REMI gives creative feedback, not medical advice or guarantees about
        platform performance.
      </p>
    </section>
  );
}
