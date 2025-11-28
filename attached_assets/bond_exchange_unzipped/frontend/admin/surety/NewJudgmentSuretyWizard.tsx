import React, { useState } from "react";

interface Props {
  suretyPin: string;
}

/**
 * Very simple UI to create a Surety case and kick off underwriting.
 * In your real app, you would pull bonds and trusts from your own data tables
 * and let the Admin pick them from dropdowns.
 */
export const NewJudgmentSuretyWizard: React.FC<Props> = ({ suretyPin }) => {
  const [bondId, setBondId] = useState("");
  const [suretyTrustId, setSuretyTrustId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createCase = async () => {
    try {
      const res = await fetch("/admin/surety/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Surety-Pin": suretyPin,
        },
        credentials: "include",
        body: JSON.stringify({ bondId, suretyTrustId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create case");
        setResult(null);
        return;
      }
      const caseId = json.case.id as string;

      // Immediately run underwriting
      const uwRes = await fetch(`/admin/surety/cases/${caseId}/underwrite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Surety-Pin": suretyPin,
        },
        credentials: "include",
      });
      const uwJson = await uwRes.json();
      if (!uwRes.ok) {
        setError(uwJson.error ?? "Underwriting failed");
        setResult(null);
        return;
      }
      setResult(
        `Case ${caseId} underwriting decision: ${uwJson.status}. Collateral required: $${uwJson.result.collateralRequired.toLocaleString()}.`
      );
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Network error");
      setResult(null);
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <h2>New Judgment Surety Case</h2>
      <p>
        Enter a Judgment Bond ID and a Surety Trust ID. This demo assumes both
        already exist in your database.
      </p>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Bond ID:{" "}
          <input
            type="text"
            value={bondId}
            onChange={(e) => setBondId(e.target.value)}
            style={{ width: "20rem" }}
          />
        </label>
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Surety Trust ID:{" "}
          <input
            type="text"
            value={suretyTrustId}
            onChange={(e) => setSuretyTrustId(e.target.value)}
            style={{ width: "20rem" }}
          />
        </label>
      </div>
      <button onClick={createCase} style={{ padding: "0.25rem 0.75rem" }}>
        Create & Underwrite
      </button>

      {result && (
        <p style={{ marginTop: "1rem", color: "green" }}>
          <strong>{result}</strong>
        </p>
      )}
      {error && (
        <p style={{ marginTop: "1rem", color: "red" }}>
          <strong>{error}</strong>
        </p>
      )}
    </div>
  );
};
