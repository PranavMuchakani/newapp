import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate(data.user.age_verified ? "/discover" : "/verify-age");
    } catch {
      setError("Invalid email or password.");
    }
  }

  return (
    <div className="auth-page">
      <h1>Log in</h1>
      {location.state?.message && <p className="info">{location.state.message}</p>}
      <form onSubmit={handleSubmit}>
        <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button type="submit">Log in</button>
      </form>
      <p>New here? <Link to="/signup">Sign up</Link></p>
    </div>
  );
}
