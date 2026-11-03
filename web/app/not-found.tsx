import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <div className="empty" style={{ marginTop: 40 }}>
        <h2>Nothing here</h2>
        <p>
          This page does not exist. A shared link may have expired or been
          discarded.
        </p>
        <div className="mt">
          <Link href="/">
            <button>Go to the routines</button>
          </Link>
        </div>
      </div>
    </main>
  );
}
