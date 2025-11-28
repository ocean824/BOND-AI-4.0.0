import React, { useEffect, useState } from "react";

type Auction = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  reservePrice: string;
};

type AuctionsResponse = {
  auctions: Auction[];
};

export const InvestorExchange: React.FC = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(
    null
  );
  const [bidAmount, setBidAmount] = useState<string>("");

  useEffect(() => {
    fetch("/investor/auctions", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((json: AuctionsResponse) => setAuctions(json.auctions))
      .catch((err) => setError(err.message ?? "Failed to load auctions"))
      .finally(() => setLoading(false));
  }, []);

  const placeBid = async () => {
    if (!selectedAuctionId) return;
    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) {
      alert("Enter a positive bid amount.");
      return;
    }

    try {
      const res = await fetch(
        `/investor/auctions/${selectedAuctionId}/bids`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ amount }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Failed to place bid");
      } else {
        alert(json.message ?? "Bid placed");
      }
    } catch (err: any) {
      alert(err.message ?? "Network error placing bid");
    }
  };

  const now = new Date();

  const timeRemaining = (endsAt: string) => {
    const end = new Date(endsAt).getTime();
    const diff = end - now.getTime();
    if (diff <= 0) return "Ended";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    return `${days}d ${hours}h remaining`;
  };

  if (loading) return <div>Loading exchange…</div>;
  if (error) return <div>Error loading auctions: {error}</div>;

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Bond Exchange</h1>
      <p>Active auctions for perfected bonds.</p>

      {auctions.length === 0 ? (
        <p>No active auctions at the moment.</p>
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
              <th style={{ borderBottom: "1px solid #ccc" }}>Auction ID</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Status</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Ends</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Time left</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Reserve</th>
              <th style={{ borderBottom: "1px solid #ccc" }}>Bid</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((a) => (
              <tr key={a.id}>
                <td style={{ borderBottom: "1px solid #eee" }}>{a.id}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>{a.status}</td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  {new Date(a.endsAt).toLocaleString()}
                </td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  {timeRemaining(a.endsAt)}
                </td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  ${Number(a.reservePrice).toLocaleString()}
                </td>
                <td style={{ borderBottom: "1px solid #eee" }}>
                  <button
                    onClick={() => setSelectedAuctionId(a.id)}
                    style={{ padding: "0.25rem 0.5rem" }}
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedAuctionId && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2>Place Bid</h2>
          <p>Auction ID: {selectedAuctionId}</p>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => setBidAmount(e.target.value)}
            placeholder="Bid amount"
            style={{ padding: "0.25rem", marginRight: "0.5rem" }}
          />
          <button onClick={placeBid} style={{ padding: "0.25rem 0.75rem" }}>
            Submit Bid
          </button>
        </div>
      )}
    </div>
  );
};
