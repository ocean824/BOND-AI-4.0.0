import React, { useEffect, useState } from "react";

type OverviewTotals = {
  totals: {
    next7Days: number;
    next30Days: number;
    later: number;
  };
};

export const InvestorOverview: React.FC = () => {
  const [data, setData] = useState<OverviewTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/investor/overview", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(await res.text());
        }
        return res.json();
      })
      .then((json) => setData(json))
      .catch((err) => setError(err.message ?? "Failed to load overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading overview…</div>;
  if (error) return <div>Error loading overview: {error}</div>;
  if (!data) return <div>No overview data.</div>;

  const { totals } = data;

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Bond Exchange Overview</h1>
      <p>
        This screen shows only aggregate totals of bonds expected to be
        perfected. No underlying bond details are exposed to investors.
      </p>

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
          <h2>Within 7 days</h2>
          <p>${totals.next7Days.toLocaleString()}</p>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
          <h2>Within 30 days</h2>
          <p>${totals.next30Days.toLocaleString()}</p>
        </div>
        <div style={{ border: "1px solid #ccc", padding: "1rem" }}>
          <h2>Later</h2>
          <p>${totals.later.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};
