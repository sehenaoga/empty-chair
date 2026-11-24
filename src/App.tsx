import { useEffect, useRef, useState } from "react";

const TYPING_MS = 2000;

// Everything lives in React state only. Nothing is written to
// localStorage, cookies, or any server. Reload = it's gone.

type Reply = { id: number; text: string };

export default function App() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [started, setStarted] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [draft, setDraft] = useState("");
  const [burning, setBurning] = useState(false);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<number | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const displaceRefs = useRef<Record<number, SVGFEDisplacementMapElement | null>>({});

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies, started, typing]);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  // Show the typing dots, then reveal the message and focus the composer.
  const playTyping = () => {
    window.clearTimeout(typingTimer.current);
    setTyping(true);
    typingTimer.current = window.setTimeout(() => {
      setTyping(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }, TYPING_MS);
  };

  const begin = () => {
    setStarted(true);
    playTyping();
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setReplies((r) => [...r, { id: r.length, text }]);
    setDraft("");
  };

  // Burn only the replies; the incoming message stays so you can try again.
  const burn = () => {
    if (burning || replies.length === 0) return;
    setBurning(true);
    // Each reply gets its own 0.5s slot, newest first, so total time
    // scales with how much you wrote.
    const per = 500;
    const n = replies.length;
    const total = n * per;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      replies.forEach((r, i) => {
        const slot = n - 1 - i;
        const t = Math.min(Math.max((elapsed - slot * per) / per, 0), 1);
        displaceRefs.current[r.id]?.setAttribute("scale", String(t * t * 140));
      });
      if (elapsed < total) {
        requestAnimationFrame(tick);
      } else {
        setReplies([]);
        setDraft("");
        setBurning(false);
        playTyping();
      }
    };
    requestAnimationFrame(tick);
  };

  const reset = () => {
    window.clearTimeout(typingTimer.current);
    setTyping(false);
    setStarted(false);
    setMessage("");
    setName("");
    setReplies([]);
    setDraft("");
  };

  return (
    <div className="phone">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        {replies.map((r) => (
          <filter key={r.id} id={`ash-${r.id}`} x="-40%" y="-60%" width="180%" height="220%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feDisplacementMap
              ref={(el) => {
                displaceRefs.current[r.id] = el;
              }}
              in="SourceGraphic"
              in2="noise"
              scale="0"
            />
          </filter>
        ))}
      </svg>
      {!started ? (
        <div className="setup">
          <h1>Texting to an Empty Chair</h1>
          <p className="hint">
            Add the message you want to reply to. Send as many responses as you want. If you change your mind, burn the replies and try again. 
          </p>
          <p className="hint">
            Nothing is saved. Everything is private. Closing or refresing this page erases everything. 
          </p>
          <label>
            Who is it from?
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              // placeholder="Name"
            />
          </label>
          <label>
            The message
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              // placeholder="I should have said this a long time ago…"
            />
          </label>
          <button
            className="primary"
            disabled={!message.trim()}
            onClick={begin}
          >
            Receive message
          </button>
        </div>
      ) : (
        <>
          <header>
            <button className="back" onClick={reset} aria-label="End conversation">
              ‹ End
            </button>
            <div className="contact">
              <div className="avatar">{(name.trim()[0] || "?").toUpperCase()}</div>
              <span>{name.trim() || "Unknown"}</span>
            </div>
            <div className="burn-slot">
              {replies.length > 0 && (
                <button className="burn" onClick={burn} disabled={burning}>
                  🔥 Burn
                </button>
              )}
            </div>
          </header>
          <main>
            {typing ? (
              <div className="bubble in tail typing" aria-label="Typing">
                <span /><span /><span />
              </div>
            ) : (
              <div className="bubble in tail">{message.trim()}</div>
            )}
            {replies.map((r, i) => (
              <div
                key={r.id}
                className={
                  "bubble out" +
                  (i === replies.length - 1 ? " tail" : "") +
                  (burning ? " burning" : "")
                }
                style={
                  burning
                    ? {
                        filter: `url(#ash-${r.id})`,
                        animationDelay: `${(replies.length - 1 - i) * 0.5}s`,
                      }
                    : undefined
                }
              >
                {r.text}
              </div>
            ))}
            <div ref={endRef} />
          </main>
          <footer>
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="iMessage"
              ref={inputRef}
              disabled={typing}
            />
            <button className="send" onClick={send} disabled={typing || !draft.trim()} aria-label="Send">
              ↑
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
