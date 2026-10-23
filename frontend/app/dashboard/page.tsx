"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSentrix, type Alert } from "../lib/sentrix-store";
import { useConfirm } from "../components/confirm-modal";

type AnomalyWindow = "24h" | "7d";

const WINDOW_MS: Record<AnomalyWindow, number> = {
  "24h": 24 * 3_600_000,
  "7d": 7 * 24 * 3_600_000,
};

/** Alerts in the current window vs. the window before it. Reads the clock: client only. */
function anomalyStats(alerts: Alert[], window: AnomalyWindow) {
  const now = Date.now();
  const span = WINDOW_MS[window];
  let current = 0;
  let previous = 0;
  for (const alert of alerts) {
    const age = now - new Date(alert.timestamp).getTime();
    if (age < span) current++;
    else if (age < 2 * span) previous++;
  }
  return { current, previous };
}

const pad = (n: number) => n.toString().padStart(2, "0");

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { createGroup } = useSentrix();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;
    createGroup(name);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="surface-card w-full max-w-sm rounded-2xl border border-[var(--border)] p-5 shadow-2xl sm:p-6"
      >
        <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">Add Group</h2>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
            Group Name
          </span>
          <input
            id="group-name"
            name="name"
            autoFocus
            required
            placeholder="e.g. Server Room AC"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-amber-500"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            id="create-group-submit"
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-[#20170a] hover:bg-amber-400 transition"
          >
            Add Group
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DashboardPage() {
  const { ready, groups, devices, alerts, deleteGroup } = useSentrix();
  const [anomalyWindow, setAnomalyWindow] = useState<AnomalyWindow>("24h");
  const [showCreate, setShowCreate] = useState(false);
  const confirm = useConfirm();

  if (!ready) {
    return (
      <p className="py-24 text-center font-mono text-xs text-[var(--text-muted)]">
        Loading workspace…
      </p>
    );
  }

  const offline = devices.filter((d) => d.status === "OFFLINE").length;
  const online = devices.length - offline;
  const unresolved = alerts.filter((a) => !a.isResolved);
  const { current, previous } = anomalyStats(alerts, anomalyWindow);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.045em] sm:text-2xl">Global Overview</h1>
        </div>
        <button
          id="create-group-button"
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-4 text-xs font-semibold text-[#20170a] shadow-sm shadow-amber-500/20 transition hover:bg-amber-400"
        >
          <span aria-hidden="true" className="text-base leading-none">+</span>
          Add Group
        </button>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3" aria-label="Global health overview">
        <article className="surface-card rounded-xl border border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 className="eyebrow">Total active nodes</h2>
          <p className="mt-2 font-mono text-2xl leading-none tracking-[-0.06em] sm:text-[1.75rem]">
            <span className="text-emerald-600 dark:text-emerald-400">{pad(online)}</span>
            <span className="ml-1.5 text-xs tracking-normal text-[var(--text-secondary)]">Online</span>
            <span className="mx-2 text-[var(--text-muted)]">/</span>
            <span className={offline ? "text-red-500" : ""}>{pad(offline)}</span>
            <span className="ml-1.5 text-xs tracking-normal text-[var(--text-secondary)]">Offline</span>
          </p>
          <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)]">
            {devices.length} sensors registered
          </p>
        </article>

        <article className="surface-card rounded-xl border border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 className="eyebrow">System status</h2>
          {unresolved.length === 0 ? (
            <span className="mt-2.5 inline-flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b98199]" />
              All Systems Normal
            </span>
          ) : (
            <span className="mt-2.5 inline-flex items-center gap-2 rounded-md border border-red-500/25 bg-red-500/10 px-2.5 py-1.5 text-sm font-semibold text-red-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Anomalies Detected
            </span>
          )}
          <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)]">
            {unresolved.length} unresolved alert{unresolved.length === 1 ? "" : "s"}
            {unresolved.length > 0 && (
              <Link href="/alerts" className="ml-2 text-amber-600 hover:text-amber-500 dark:text-amber-400">
                Review →
              </Link>
            )}
          </p>
        </article>

        <article className="surface-card rounded-xl border border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="eyebrow">Total anomalies</h2>
            <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--canvas)] p-0.5">
              {(["24h", "7d"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAnomalyWindow(option)}
                  aria-pressed={anomalyWindow === option}
                  className={`rounded px-2 py-0.5 font-mono text-[10px] transition ${
                    anomalyWindow === option
                      ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 flex items-baseline gap-2 font-mono text-[1.75rem] leading-none tracking-[-0.06em]">
            {pad(current)}
            {current !== previous && (
              <span
                className={`text-base ${current > previous ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}
                aria-label={current > previous ? "Trending up" : "Trending down"}
              >
                {current > previous ? "↑" : "↓"}
              </span>
            )}
          </p>
          <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)]">
            vs {previous} in the previous {anomalyWindow}
          </p>
        </article>
      </section>

      <section className="mt-8 md:mt-10" aria-label="Groups">
        <div className="mb-4 flex items-center gap-2.5">
          <h2 className="eyebrow">Groups</h2>
          <span className="rounded-md border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)]">
            {pad(groups.length)}
          </span>
        </div>
        {groups.length === 0 ? (
          <div className="surface-card rounded-xl border border-[var(--border)] px-5 py-12 text-center text-sm text-[var(--text-muted)]">
            No groups yet. Click &ldquo;+ Add Group&rdquo; to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {groups.map((group) => {
              const groupDevices = devices.filter((d) => d.groupId === group.id);
              const activeCount = groupDevices.filter((d) => d.status === "ACTIVE").length;
              const alertCount = unresolved.filter((a) => a.groupId === group.id).length;

              return (
                <div
                  key={group.id}
                  data-context-type="group"
                  data-context-id={group.id}
                  className={`surface-card group relative flex min-h-[150px] flex-col rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-lg ${
                    alertCount ? "border-red-500/30" : "border-[var(--border)]"
                  }`}
                >
                  <Link
                    href={`/dashboard/${group.slug}`}
                    aria-label={group.name}
                    className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-sm font-semibold tracking-[-0.02em] text-[var(--text-primary)] group-hover:text-amber-500 transition line-clamp-1"
                    >
                      {group.name}
                    </span>
                    <div className="relative flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        title={`Delete ${group.name}`}
                        aria-label={`Delete ${group.name}`}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const ok = await confirm({
                            title: "Delete Group",
                            message: `Are you sure you want to delete "${group.name}" and all its connected devices? This action cannot be undone.`,
                            confirmText: "Delete Group",
                            type: "danger",
                          });
                          if (ok) {
                            deleteGroup(group.id);
                          }
                        }}
                        className="rounded p-1 text-[var(--text-muted)] opacity-60 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto block pt-3">
                    <div className="flex items-end justify-between border-t border-[var(--border)] pt-3">
                      <div>
                        <p className="eyebrow">Active sensors</p>
                        <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                          {pad(activeCount)} / {pad(groupDevices.length)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="eyebrow">Active alerts</p>
                        <p
                          className={`mt-1 inline-flex items-center gap-1.5 font-mono text-xs ${
                            alertCount ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${alertCount ? "bg-red-500" : "bg-emerald-500"}`} />
                          {pad(alertCount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
