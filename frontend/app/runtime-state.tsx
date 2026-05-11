import Link from "next/link";

type RuntimeNoticeProps = {
  title: string;
  message: string;
  command?: string;
  href?: string;
  hrefLabel?: string;
};

export function RuntimeNotice({ title, message, command, href, hrefLabel }: RuntimeNoticeProps) {
  return (
    <aside className="runtimeNotice" role="status">
      <div>
        <p className="eyebrow">Runtime status</p>
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      {command ? <code>{command}</code> : null}
      {href ? <Link href={href}>{hrefLabel ?? "Open related page"}</Link> : null}
    </aside>
  );
}

export function ApiUnavailableNotice({ message }: { message?: string }) {
  return (
    <RuntimeNotice
      title="API unavailable"
      message={message ?? "Start the backend and confirm the configured API base URL is reachable."}
      command="docker compose up -d postgres backend frontend"
    />
  );
}

export function LoaderRequiredNotice() {
  return (
    <RuntimeNotice
      title="Data not loaded"
      message="The backend is reachable, but the database or processed data appears empty."
      command="docker compose run --rm loader --allow-findings"
      href="/quality"
      hrefLabel="Review data quality"
    />
  );
}
