import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { COLORS } from '../quoridor';
import { playChat } from '../sfx';

export default function Chat({ playerIndex, code }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const handler = (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.playerIndex !== playerIndex) playChat();
      if (!open) setUnread((n) => n + 1);
    };
    socket.on('chatMessage', handler);
    return () => socket.off('chatMessage', handler);
  }, [open]);

  const toggle = () => {
    if (!open) setUnread(0);
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    socket.emit('chatMessage', { code, text });
    setDraft('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') send();
  };

  return (
    <div className={`chat-wrap ${open ? 'open' : ''}`}>
      <button className="chat-toggle" onClick={toggle}>
        {open ? '✕' : '💬'}
        {unread > 0 && <span className="chat-badge">{unread}</span>}
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-list" ref={listRef}>
            {messages.length === 0 && (
              <div className="chat-empty">No messages yet</div>
            )}
              {messages.map((m, i) => (
              <div key={i} className={`chat-row${m.playerIndex === playerIndex ? ' mine' : ' others'}`}>
                <div className={`chat-bubble${m.playerIndex === playerIndex ? ' mine' : ' others'}`}>
                  {m.playerIndex !== playerIndex && (
                    <div className="chat-name" style={{ color: COLORS[m.playerIndex % COLORS.length] }}>
                      {m.name}
                    </div>
                  )}
                  <div className="chat-text">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              value={draft}
              maxLength={200}
              placeholder="Type a message…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
            />
            <button className="chat-send" onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
