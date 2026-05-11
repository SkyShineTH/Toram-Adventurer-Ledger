import Link from "next/link";
import { type ApiList, fetchApi } from "../api-client";

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

async function getQualityReport() {
  const [summary, findings] = await Promise.all([
    fetchApi<ValidationSummary>("/validation/summary"),
    fetchApi<ApiList<ValidationFinding>>("/validation/findings?limit=25"),
  ]);

  return {
    summary: summary.ok ? summary.data : null,
    findings: findings.ok ? findings.data : { total: 0, limit: 25, offset: 0, items: [] },
  };
}

export default async function QualityPage() {
  const { summary, findings } = await getQualityReport();
  const errorsByEntity = Object.entries(summary?.counts.errors_by_entity ?? {});
  const errorsByCode = Object.entries(summary?.counts.errors_by_code ?? {});

  return (
    <main className="shell">
      <nav className="topNav">
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
