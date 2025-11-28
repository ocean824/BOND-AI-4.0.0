import React, { useEffect, useState } from "react";

type SuretyCase = {
  id: string;
  bondId: string;
  suretyTrustId: string;
  status: string;
  bondType: string;
  bondPenalSum: string;
};

type SuretyCasesResponse = {
  cases: SuretyCase[];
};

interface Props {
  suretyPin: string;
}

export const SuretyDashboard: React.FC<Props> = ({ suretyPin }) => {
  const [cases, setCases] = useState<SuretyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/admin/surety/cases", {
      credentials: "include",
      headers: { "X-Surety-Pin": suretyPin },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((json: SuretyCasesResponse) => setCases(json.cases))
      .catch((err) => setError(err.message ?? "Failed to load surety cases"))
      .finally(() => setLoading(false));
  }, [suretyPin]);

  if (loading) return <div>Loading Surety cases…</div>;
  if (error) return <div>Error loading Surety cases: {error}</div>;

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Surety – Judgment Bond Underwriting</h1>
      <p>
        Admin-only Surety module. All requests include the Surety PIN via the
        X-Surety-Pin header.
      </p>

      {cases.length === 0 ? (
        <p>No Surety cases yet.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            marginTop: "1rem",
          }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc" }}>Case ID</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Bond ID</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Trust</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Penal Sum</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td style={{ borderBottom: "1px solid #eee" }}>{c.id}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>{c.bondId}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  {c.suretyTrustId}
                </td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  ${Number(c.bondPenalSum).toLocaleString()}
                </td>
                <td style={{ borderBottom: "1px solid #eee" }}>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
