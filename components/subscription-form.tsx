'use client';

import { useActionState, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";

import {
  createSubscriptionAction,
} from "@/app/actions";
import { idleActionState } from "@/lib/action-state";
import { issueTypeMeta, issueTypeOptions, rssEventTypeOptions } from "@/lib/constants";

import { SubmitButton } from "@/components/submit-button";

type SubscriptionFormProps = {
  roadId: string;
};

const eventTypeLabels: Record<(typeof rssEventTypeOptions)[number], string> = {
  observation: "New violations",
  vote: "Likes and disputes",
  repair: "Repair updates",
  verification: "Fix checks",
};

export function SubscriptionForm({ roadId }: SubscriptionFormProps) {
  const [state, action] = useActionState(createSubscriptionAction, idleActionState);
  const [minSeverity, setMinSeverity] = useState(60);

  return (
    <form
      action={action}
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]"
    >
      <input type="hidden" name="roadId" value={roadId} />

      {state.status !== "idle" ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          <div className="flex flex-col gap-3">
            <span>{state.message}</span>
            {state.status === "success" ? (
              <Link
                href="/account"
                className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                <Radio className="h-4 w-4" aria-hidden="true" />
                Open RSS feed link
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-semibold text-slate-700">Violation types</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {issueTypeOptions.map((issueType) => (
            <label
              key={issueType}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="issueTypes"
                value={issueType}
                defaultChecked
                className="h-4 w-4 accent-teal-700"
              />
              {issueTypeMeta[issueType].label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700">Road updates</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {rssEventTypeOptions.map((eventType) => (
            <label
              key={eventType}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                name="eventTypes"
                value={eventType}
                defaultChecked
                className="h-4 w-4 accent-teal-700"
              />
              {eventTypeLabels[eventType]}
            </label>
          ))}
        </div>
      </div>

      <label className="block space-y-2">
        <span className="flex items-center justify-between text-sm font-semibold text-slate-700">
          Minimum severity
          <span className="font-[family:var(--font-display)] text-xl text-slate-950">
            {minSeverity}
          </span>
        </span>
        <input
          type="range"
          name="minSeverity"
          min="1"
          max="100"
          value={minSeverity}
          onChange={(event) => setMinSeverity(Number(event.target.value))}
          className="w-full accent-teal-700"
        />
      </label>

      <SubmitButton
        label="Subscribe to RSS feed"
        pendingLabel="Saving updates..."
      />
    </form>
  );
}
