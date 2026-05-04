'use client';

import { useActionState, useEffect, useRef, useState } from "react";

import {
  recordRepairAction,
  verifyRepairAction,
} from "@/app/actions";
import { idleActionState } from "@/lib/action-state";
import type { IssueClusterSummary } from "@/lib/data";
import { formatCurrencyInr } from "@/lib/utils";

import { SubmitButton } from "@/components/submit-button";

type RepairUpdateFormProps = {
  roadId: string;
  cluster: Pick<IssueClusterSummary, "clusterKey" | "issueLabel" | "estimatedCostInr">;
};

type RepairVerificationFormProps = {
  repairId: string;
};

export function RepairUpdateForm({ roadId, cluster }: RepairUpdateFormProps) {
  const [state, action] = useActionState(recordRepairAction, idleActionState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [status, setStatus] = useState<"SCHEDULED" | "IN_PROGRESS" | "REPAIRED">(
    "REPAIRED",
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      const frame = requestAnimationFrame(() => {
        setStatus("REPAIRED");
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }
  }, [state.status]);

  const submitLabel =
    status === "SCHEDULED"
      ? "Save scheduled update"
      : status === "IN_PROGRESS"
        ? "Save progress update"
        : "Mark repaired";

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)]"
    >
      <input type="hidden" name="roadId" value={roadId} />
      <input type="hidden" name="clusterKey" value={cluster.clusterKey} />
      <input type="hidden" name="costEstimateInr" value={cluster.estimatedCostInr} />

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

      <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        This update will be attached directly to <span className="font-semibold text-slate-900">{cluster.issueLabel}</span>.
        Estimated spend recorded for the MVP: {formatCurrencyInr(cluster.estimatedCostInr)}.
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Status</span>
        <select
          name="status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "SCHEDULED" | "IN_PROGRESS" | "REPAIRED")
          }
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
        >
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="REPAIRED">Repaired</option>
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Repair photo</span>
        <input
          type="file"
          name="proofImage"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        <p className="text-xs text-slate-500">
          {status === "REPAIRED"
            ? "Required when you mark this issue as repaired."
            : "Optional until the issue is fully repaired."}
        </p>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-slate-700">Repair note</span>
        <textarea
          name="note"
          rows={4}
          placeholder="Describe what was fixed or what work is underway."
          className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
        />
      </label>

      <SubmitButton
        label={submitLabel}
        pendingLabel="Recording..."
        className="w-full"
      />
    </form>
  );
}

export function RepairVerificationForm({ repairId }: RepairVerificationFormProps) {
  const [state, action] = useActionState(verifyRepairAction, idleActionState);
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
      className="space-y-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3"
    >
      <input type="hidden" name="repairId" value={repairId} />

      {state.status !== "idle" ? (
        <div
          className={`rounded-2xl px-3 py-2 text-xs ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Verify repair
        </span>
        <select
          name="verdict"
          defaultValue="FIX_HELD"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
        >
          <option value="FIX_HELD">Fix held</option>
          <option value="FAILED">Failed</option>
          <option value="STILL_BROKEN">Still broken</option>
        </select>
      </label>

      <textarea
        name="note"
        rows={3}
        placeholder="What does the road or footpath look like now?"
        className="w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500"
      />

      <SubmitButton
        label="Submit verification"
        pendingLabel="Saving..."
        className="w-full"
      />
    </form>
  );
}
