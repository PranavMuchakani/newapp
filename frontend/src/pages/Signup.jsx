import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client.js";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "", phone: "", password: "", display_name: "", date_of_birth: "", gender: "male",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/signup", form);
      navigate("/login", { state: { message: "Account created. Please log in and verify your age to continue." } });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Create your account</h1>
      <p className="subtitle">You must be 18 or older to use this platform.</p>
      <form onSubmit={handleSubmit}>
        <label>Full name<input required value={form.display_name}
          onChange={e => setForm({ ...form, display_name: e.target.value })} /></label>

        <label>Email<input type="email" required value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} /></label>

        <label>Phone (10-digit Indian mobile)<input required pattern="[6-9]\d{9}" value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })} /></label>

        <label>Date of birth<input type="date" required value={form.date_of_birth}
          onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></label>

        <label>Gender
          <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="nonbinary">Non-binary</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label>Password<input type="password" required minLength={8} value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })} /></label>

        {error && <p className="error">{error}</p>}

        <button disabled={loading} type="submit">{loading ? "Creating..." : "Sign up"}</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
      <p className="legal-note">
        By signing up you agree to our Terms of Service and confirm the information
        provided, including your date of birth, is accurate. Providing false age
        information may result in immediate account termination and reporting to authorities.
      </p>
    </div>
  );
}
