'use client';

import { useActionState, useState } from "react";

import {
  createSubscriptionAction,
} from "@/app/actions";
import { idleActionState } from "@/lib/action-state";
import { issueTypeMeta, issueTypeOptions, rssEventTypeOptions } from "@/lib/constants";

import { SubmitButton } from "@/components/submit-button";

type SubscriptionFormProps = {
  roadId: string;
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
          {state.message}
        </div>
      ) : null}

      <div>
        <p className="text-sm font-semibold text-slate-700">Issue types</p>
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
        <p className="text-sm font-semibold text-slate-700">Feed events</p>
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
              {eventType}
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
        label="Save RSS settings"
        pendingLabel="Saving feed..."
      />
    </form>
  );
}
