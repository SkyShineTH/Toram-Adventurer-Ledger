import Link from "next/link";
import { type ApiList, fetchApi } from "../api-client";
import { ApiUnavailableNotice } from "../runtime-state";

type ValidationSummary = {
  generated_at: string;
  passed: boolean;
  error_count: number;
  counts: {
    records: Record<string, number>;
    errors_by_code: Record<string, number>;
    errors_by_entity: Record<string, number>;
  };
};

type ValidationFinding = {
  entity: string;
  source_file: string;
  source_record_index: number;
  record_id: number | string | null;
  error_code: string;
  message: string;
};

type DataCoverage = {
  loaded: Record<string, number>;
  relationships: Array<{ name: string; status: string; note: string }>;
  next_normalization_targets: string[];
};

async function getQualityReport() {
  const [summary, findings, coverage] = await Promise.all([
    fetchApi<ValidationSummary>("/validation/summary"),
    fetchApi<ApiList<ValidationFinding>>("/validation/findings?limit=25"),
    fetchApi<DataCoverage>("/data/coverage"),
  ]);

  return {
    summary: summary.ok ? summary.data : null,
    findings: findings.ok ? findings.data : { total: 0, limit: 25, offset: 0, items: [] },
    coverage: coverage.ok ? coverage.data : null,
    error: summary.ok ? (findings.ok ? (coverage.ok ? null : coverage.message) : findings.message) : summary.message,
  };
}

export default async function QualityPage() {
  const { summary, findings, coverage, error } = await getQualityReport();
  const errorsByEntity = Object.entries(summary?.counts.errors_by_entity ?? {});
  const errorsByCode = Object.entries(summary?.counts.errors_by_code ?? {});

  return (
    <main className="shell">
      <nav className="topNav" aria-label="Page navigation">
        <Link href="/">Dashboard</Link>
        <Link href="/explorer">Explorer</Link>
        <span>Data Quality</span>
      </nav>

      <section className="explorerHero">
        <p className="eyebrow">Validation report</p>
        <h1>Make bad records visible before they become recommendations.</h1>
        <p className="lede">
          The ETL pipeline isolates invalid records into a dead-letter report. This page exposes the current
          findings for contributors without committing generated validation output.
        </p>
      </section>

      {error ? <ApiUnavailableNotice message={error} /> : null}

      <section className="qualityGrid">
        <article className="ledgerBlock statusCard">
          <p className="eyebrow">Current status</p>
          <strong>{summary ? (summary.passed ? "Passed" : "Needs review") : "Report missing"}</strong>
          <span>{summary ? `${summary.error_count} validation findings` : "Run the validation pipeline first"}</span>
          {summary ? <small>Generated {new Date(summary.generated_at).toLocaleString("en-US")}</small> : null}
        </article>

        <BreakdownCard title="By entity" rows={errorsByEntity} />
        <BreakdownCard title="By code" rows={errorsByCode} />
      </section>

      <section className="ledgerBlock findingsBlock">
        <div className="sectionHead">
          <p className="eyebrow">{findings.total.toLocaleString()} dead-letter records</p>
          <h2>Open findings</h2>
        </div>
        <div className="findingList">
          {findings.items.length > 0 ? (
            findings.items.map((finding) => (
              <article className="finding" key={`${finding.entity}:${finding.record_id}:${finding.message}`}>
                <div>
                  <strong>{finding.entity}</strong>
                  <span>{finding.error_code}</span>
                </div>
                <p>{finding.message}</p>
                <small>
                  {finding.source_file} row {finding.source_record_index} record {finding.record_id ?? "unknown"}
                </small>
              </article>
            ))
          ) : (
            <p className="emptyState">No validation findings are available.</p>
          )}
        </div>
      </section>

      <section className="ledgerBlock findingsBlock">
        <div className="sectionHead">
          <p className="eyebrow">Normalization readiness</p>
          <h2>Drop and craft coverage</h2>
        </div>
        <div className="findingList">
          {(coverage?.relationships ?? []).map((relationship) => (
            <article className="finding" key={relationship.name}>
              <div>
                <strong>{relationship.name}</strong>
                <span>{relationship.status.replace("_", " ")}</span>
              </div>
              <p>{relationship.note}</p>
            </article>
          ))}
        </div>
        <div className="questStats">
          {(coverage?.next_normalization_targets ?? []).map((target) => (
            <span key={target}>{target}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <article className="ledgerBlock">
      <p className="eyebrow">{title}</p>
      <div className="compactList">
        {rows.length > 0 ? (
          rows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value.toLocaleString()}</strong>
            </div>
          ))
        ) : (
          <p className="emptyState">No findings.</p>
        )}
      </div>
    </article>
  );
}
