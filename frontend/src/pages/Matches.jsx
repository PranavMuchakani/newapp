import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function Matches() {
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    api.get("/match/matches").then(({ data }) => setMatches(data.matches));
  }, []);

  return (
    <div className="matches-page">
      <h1>Your matches</h1>
      {matches.length === 0 && <p>No matches yet. Keep browsing on Discover.</p>}
      <ul>
        {matches.map(m => (
          <li key={m.id}>
            <Link to={`/chat/${m.id}`}>{m.display_name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
