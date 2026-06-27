import React, { useEffect, useState } from "react";
import { api } from "../api/client.js";

export default function Discover() {
  const [candidates, setCandidates] = useState([]);
  const [index, setIndex] = useState(0);
  const [matchMsg, setMatchMsg] = useState("");

  useEffect(() => { loadCandidates(); }, []);

  async function loadCandidates() {
    const { data } = await api.get("/match/discover");
    setCandidates(data.candidates);
    setIndex(0);
  }

  async function swipe(action) {
    const current = candidates[index];
    if (!current) return;
    const { data } = await api.post("/match/swipe", { swiped_id: current.id, action });
    if (data.matched) {
      setMatchMsg(`You matched with ${current.display_name}!`);
      setTimeout(() => setMatchMsg(""), 3000);
    }
    setIndex(i => i + 1);
  }

  function report() {
    const current = candidates[index];
    if (!current) return;
    const reason = prompt("Reason: harassment, fake_profile, underage, explicit_content, scam, other");
    if (!reason) return;
    api.post("/safety/report", { reported_id: current.id, reason });
    setIndex(i => i + 1);
  }

  const current = candidates[index];

  return (
    <div className="discover-page">
      <h1>Discover</h1>
      {matchMsg && <div className="match-banner">{matchMsg}</div>}
      {current ? (
        <div className="profile-card">
          <h2>{current.display_name}, {current.age}</h2>
          <p>{current.bio}</p>
          <p className="distance">{Math.round(current.distance_km)} km away</p>
          <div className="actions">
            <button onClick={() => swipe("pass")}>Pass</button>
            <button onClick={() => swipe("like")}>Like</button>
            <button className="report-btn" onClick={report}>Report</button>
          </div>
        </div>
      ) : (
        <div>
          <p>No more profiles nearby right now.</p>
          <button onClick={loadCandidates}>Refresh</button>
        </div>
      )}
    </div>
  );
}
