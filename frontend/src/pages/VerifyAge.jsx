import React from "react";

// This page is the integration point for a real government-ID verification
// provider (e.g. DigiLocker, Signzy, HyperVerge - all offer India-specific KYC/age
// verification APIs). Wire the provider's SDK/redirect flow in here; on success,
// call a backend endpoint that sets users.age_verified = TRUE.
export default function VerifyAge() {
  return (
    <div className="auth-page">
      <h1>Verify your age</h1>
      <p>
        To keep this platform safe, we require government-ID based age
        verification before you can browse or message other users.
      </p>
      <p className="info">
        Integration point: plug in a KYC/age-verification provider here
        (e.g. DigiLocker, Signzy, HyperVerge). This starter project does not
        include a live integration — connect a real provider before launch.
      </p>
    </div>
  );
}
