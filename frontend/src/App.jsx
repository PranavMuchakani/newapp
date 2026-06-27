import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import Discover from "./pages/Discover.jsx";
import Matches from "./pages/Matches.jsx";
import Chat from "./pages/Chat.jsx";
import VerifyAge from "./pages/VerifyAge.jsx";

function isLoggedIn() {
  return !!localStorage.getItem("token");
}

function Protected({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/discover" />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-age" element={<Protected><VerifyAge /></Protected>} />
      <Route path="/discover" element={<Protected><Discover /></Protected>} />
      <Route path="/matches" element={<Protected><Matches /></Protected>} />
      <Route path="/chat/:matchId" element={<Protected><Chat /></Protected>} />
    </Routes>
  );
}
