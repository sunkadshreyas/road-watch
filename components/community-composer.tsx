'use client';

import { useActionState, useEffect, useRef } from "react";

import {
  createCommunityEntryAction,
} from "@/app/actions";
import { idleActionState } from "@/lib/action-state";

import { SubmitButton } from "@/components/submit-button";

type CommunityComposerProps = {
  roadId: string;
  category: "DISCUSSION" | "APPRECIATION" | "SOLUTION";
};

const placeholders = {
  DISCUSSION: {
    title: "Start a civic discussion",
    body: "Keep the discussion focused on the road record, mobility impact, or repair quality.",
  },
  APPRECIATION: {
    title: "Acknowledge what worked",
    body: "Call out a repair, cleanup, or improvement that is holding up well.",
  },
  SOLUTION: {
    title: "Propose a solution",
    body: "Describe the fix, operational change, or design adjustment the ward should consider.",
  },
};

export function CommunityComposer({
  roadId,
  category,
}: CommunityComposerProps) {
  const [state, action] = useActionState(createCommunityEntryAction, idleActionState);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]"
    >
      <input type="hidden" name="roadId" value={roadId} />
      <input type="hidden" name="category" value={category} />

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

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Title</span>
        <input
          name="title"
          placeholder={placeholders[category].title}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Public note</span>
        <textarea
          name="body"
          rows={4}
          placeholder={placeholders[category].body}
          className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
        />
      </label>

      <SubmitButton
        label="Publish note"
        pendingLabel="Publishing..."
      />
    </form>
  );
}
