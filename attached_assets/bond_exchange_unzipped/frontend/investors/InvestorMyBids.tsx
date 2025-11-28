import React, { useEffect, useState } from "react";

type MyBid = {
  id: string;
  auctionId: string;
  amount: string;
  placedAt: string;
};

type MyBidsResponse = {
  bids: MyBid[];
};

export const InvestorMyBids: React.FC = () => {
  const [bids, setBids] = useState<MyBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/investor/my-bids", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((json: MyBidsResponse) => setBids(json.bids))
      .catch((err) => setError(err.message ?? "Failed to load bids"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading your bids…</div>;
  if (error) return <div>Error loading bids: {error}</div>;

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>My Bids</h1>
      {bids.length === 0 ? (
        <p>You have not placed any bids yet.</p>
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
              <th style={{ borderBottom: "1px solid #ccc" }}>Auction</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Amount</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Placed At</th>
            </tr>
          </thead>
          <tbody>
            {bids.map((b) => (
              <tr key={b.id}>
                <td style={{ borderBottom: "1px solid #eee" }}>{b.auctionId}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  ${Number(b.amount).toLocaleString()}
                </td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  {new Date(b.placedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
