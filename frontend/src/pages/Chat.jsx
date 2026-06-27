import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { API_URL } from "../api/client.js";

export default function Chat() {
  const { matchId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: localStorage.getItem("token") } });
    socketRef.current = socket;

    socket.emit("join_match", matchId);
    socket.on("new_message", (msg) => setMessages(prev => [...prev, msg]));
    socket.on("error", (e) => console.error("socket error:", e));

    return () => socket.disconnect();
  }, [matchId]);

  function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    socketRef.current.emit("send_message", { matchId, content: text });
    setText("");
  }

  const myId = JSON.parse(localStorage.getItem("user") || "{}").id;

  return (
    <div className="chat-page">
      <div className="messages">
        {messages.map(m => (
          <div key={m.id} className={m.senderId === myId ? "msg mine" : "msg theirs"}>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={send} className="message-input">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
