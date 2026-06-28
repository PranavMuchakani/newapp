import React from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../api/client.js";

const STATUS_MESSAGES = {
  underage: "Verification shows you do not meet the minimum age requirement. Your account has been suspended.",
  failed: "Verification was cancelled or failed. Please try again.",
  error: "Something went wrong during verification. Please try again or contact support.",
};

export default function VerifyAge() {
  const [params] = useSearchParams();
  const status = params.get("status");

  function startVerification() {
    const token = localStorage.getItem("token");
    // We can't set Authorization headers on a browser redirect, so the
    // backend's /auth/digilocker/start route accepts the token via query
    // param as a fallback specifically for this one redirect hop.
    window.location.href = `${API_URL}/auth/digilocker/start?token=${encodeURIComponent(token)}`;
  }

  return (
    <div className="auth-page">
      <h1>Verify your age</h1>
      <p>
        To keep this platform safe, we require government-ID based age
        verification before you can browse or message other users.
      </p>
      {status && status !== "verified" && (
        <p className="error">{STATUS_MESSAGES[status] || "Something went wrong. Please try again."}</p>
      )}
      <button onClick={startVerification}>Verify with DigiLocker</button>
      <p className="legal-note">
        You'll be redirected to DigiLocker, a Government of India platform, to
        securely confirm your date of birth. We only store whether you passed
        verification — never your Aadhaar number or other ID details.
      </p>
    </div>
  );
}
