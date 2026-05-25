import { useState, useRef } from "react";
import "./luggage.css";

const MAX_WEIGHT = 25;

// Simulated CarryBot registry — in a real system this would be an API call
const MOCK_BOTS = {
  "CB0042": { weight: 18, status: "safe",     battery: 82, location: "Terminal B - Gate 7" },
  "CB0017": { weight: 23, status: "safe",     battery: 61, location: "Baggage Claim Area" },
  "CB0099": { weight: 27, status: "overload", battery: 45, location: "Sorting Area C" },
  "CB0055": { weight: 0,  status: "safe",     battery: 95, location: "Charging Station 3" },
};

const ISSUE_TYPES = [
  { id: "missing",  label: "Luggage Missing",    icon: "🔍" },
  { id: "damaged",  label: "Luggage Damaged",    icon: "💥" },
  { id: "wrong",    label: "Wrong Bag",          icon: "🔄" },
  { id: "stuck",    label: "Bot Not Moving",     icon: "🤖" },
  { id: "overload", label: "Overload Warning",   icon: "⚠️" },
  { id: "other",    label: "Other Issue",        icon: "📝" },
];

// ── 6-digit serial input component ───────────────────────────────────────────
function SerialInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleKey = (i, e) => {
    const v = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-1);
    const next = digits.map((d, idx) => idx === i ? v : d).join("").replace(/ /g, "");
    onChange(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
    if (!v && e.nativeEvent.inputType === "deleteContentBackward" && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="serial-input-row">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          className={`serial-digit ${digits[i] && digits[i] !== " " ? "filled" : ""}`}
          type="text"
          maxLength={1}
          value={digits[i] === " " ? "" : digits[i]}
          onChange={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="text"
          autoComplete="off"
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LuggageModal({ t }) {
  const [view,        setView]        = useState("main");   // main | connect | connected | report | success
  const [serial,      setSerial]      = useState("");
  const [connecting,  setConnecting]  = useState(false);
  const [connError,   setConnError]   = useState("");
  const [bot,         setBot]         = useState(null);     // connected bot data
  const [botId,       setBotId]       = useState("");
  const [followMode,  setFollowMode]  = useState(false);
  const [issueType,   setIssueType]   = useState(null);
  const [description, setDescription] = useState("");
  const [refNumber,   setRefNumber]   = useState("");

  // ── Connect flow ────────────────────────────────────────────────────────
  const handleConnect = () => {
    if (serial.length < 6) return;
    setConnecting(true);
    setConnError("");

    // Simulate network delay
    setTimeout(() => {
      const key = serial.toUpperCase();
      const found = MOCK_BOTS[key];
      if (found) {
        setBot(found);
        setBotId(key);
        setView("connected");
      } else {
        setConnError("No CarryBot found with that serial number. Check the label on the bot and try again.");
      }
      setConnecting(false);
    }, 1800);
  };

  const handleDisconnect = () => {
    setBot(null);
    setBotId("");
    setSerial("");
    setFollowMode(false);
    setView("main");
  };

  // ── Report flow ─────────────────────────────────────────────────────────
  const handleSubmitReport = () => {
    if (!issueType) return;
    const ref = "CB-" + Date.now().toString().slice(-6);
    setRefNumber(ref);
    setView("success");
  };

  const handleCloseReport = () => {
    setIssueType(null);
    setDescription("");
    setView(bot ? "connected" : "main");
  };

  const isOverload = bot?.status === "overload";
  const pct = bot ? Math.min((bot.weight / MAX_WEIGHT) * 100, 100) : 0;

  // ── VIEWS ────────────────────────────────────────────────────────────────

  // Success screen
  if (view === "success") {
    return (
      <div className="carrybot-modal">
        <div className="report-success">
          <div className="report-success-icon">✅</div>
          <div className="report-success-title">Report Submitted</div>
          <div className="report-success-ref">Reference: <strong>{refNumber}</strong></div>
          <p className="report-success-msg">
            Our ground staff has been notified. Please proceed to the
            <strong> Baggage Services Counter</strong> or wait for assistance.
          </p>
          <div className="report-success-eta">
            <span className="report-eta-dot" />
            Estimated response: <strong>5–10 minutes</strong>
          </div>
          <button className="report-close-btn" onClick={handleCloseReport}>
            Back to CarryBot
          </button>
        </div>
      </div>
    );
  }

  // Report form
  if (view === "report") {
    return (
      <div className="carrybot-modal">
        <div className="report-header">
          <button className="report-back-btn" onClick={handleCloseReport}>← Back</button>
          <span className="report-header-title">Report an Issue</span>
        </div>

        <div className="report-section-label">SELECT ISSUE TYPE</div>
        <div className="report-type-grid">
          {ISSUE_TYPES.map((issue) => (
            <button
              key={issue.id}
              className={`report-type-btn ${issueType === issue.id ? "selected" : ""}`}
              onClick={() => setIssueType(issue.id)}
            >
              <span className="report-type-icon">{issue.icon}</span>
              <span className="report-type-label">{issue.label}</span>
            </button>
          ))}
        </div>

        <div className="report-section-label">
          DESCRIPTION <span className="report-optional">(optional)</span>
        </div>
        <textarea
          className="report-textarea"
          placeholder="Describe the issue in more detail…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={300}
        />
        <div className="report-char-count">{description.length}/300</div>

        <div className="report-autofill">
          <span className="report-autofill-label">🤖 CarryBot:</span>
          <span className="report-autofill-value">{botId || "—"}</span>
          {bot && <><span className="report-autofill-label">⚖️ Weight:</span>
          <span className="report-autofill-value">{bot.weight}KG</span></>}
        </div>

        <button
          className={`report-submit-btn ${!issueType ? "disabled" : ""}`}
          onClick={handleSubmitReport}
          disabled={!issueType}
        >
          Submit Report
        </button>
      </div>
    );
  }

  // Connect screen
  if (view === "connect") {
    return (
      <div className="carrybot-modal">
        <div className="report-header">
          <button className="report-back-btn" onClick={() => { setView("main"); setConnError(""); setSerial(""); }}>← Back</button>
          <span className="report-header-title">Connect to CarryBot</span>
        </div>

        <div className="cb-connect-illustration">🤖</div>

        <div className="cb-connect-desc">
          Enter the <strong>6-digit serial code</strong> printed on the label of your CarryBot unit.
        </div>

        <SerialInput value={serial} onChange={setSerial} />

        {connError && (
          <div className="cb-connect-error">⚠ {connError}</div>
        )}

        <button
          className={`report-submit-btn ${serial.length < 6 || connecting ? "disabled" : ""}`}
          onClick={handleConnect}
          disabled={serial.length < 6 || connecting}
        >
          {connecting ? (
            <span className="cb-connecting-text">
              <span className="cb-spinner" /> Connecting…
            </span>
          ) : "Connect"}
        </button>

        <div className="cb-connect-hint">
          The serial code is on a sticker on the side of the bot, e.g. <code>CB0042</code>
        </div>
      </div>
    );
  }

  // Connected — main dashboard
  if (view === "connected" && bot) {
    return (
      <div className="carrybot-modal">
        <div className="carrybot-header">
          <span className="carrybot-icon">🤖</span>
          <div>
            <h2 className="carrybot-title">CARRYBOT</h2>
            <div className="cb-connected-id">
              <span className="cb-connected-dot" /> {botId} · 🔋 {bot.battery}%
            </div>
          </div>
          <button className="cb-disconnect-btn" onClick={handleDisconnect} title="Disconnect">✕</button>
        </div>

        <div className="carrybot-section">
          <div className="carrybot-section-label">LOAD &amp; CAPACITY</div>

          <div className="carrybot-weight-row">
            <span className="carrybot-weight-item">
              <span className="carrybot-weight-dot" /> WEIGHT:
            </span>
            <span className="carrybot-weight-value">
              {bot.weight}KG
              <span className="carrybot-weight-max"> / {MAX_WEIGHT}KG MAX</span>
            </span>
          </div>

          <div className="carrybot-bar-track">
            <div
              className={`carrybot-bar-fill ${isOverload ? "overload" : ""}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="carrybot-weight-row">
            <span className="carrybot-weight-item">
              <span className="carrybot-weight-dot" /> STATUS:
            </span>
            <span className={`carrybot-status-badge ${isOverload ? "overload" : "safe"}`}>
              {isOverload ? "OVERLOAD" : "SAFE"}
            </span>
          </div>

          <div className="cb-location-row">
            <span className="cb-location-label">📍 Location:</span>
            <span className="cb-location-value">{bot.location}</span>
          </div>
        </div>

        <div className="carrybot-mode-wrap">
          <button
            className={`carrybot-mode-btn ${followMode ? "active" : ""}`}
            onClick={() => setFollowMode((v) => !v)}
          >
            MODE
          </button>
          <div className="carrybot-mode-hint">
            {followMode
              ? "✅ Follow Me mode is ON — CarryBot is following you"
              : "Tap MODE to activate Follow Me"}
          </div>
        </div>

        <div className="carrybot-actions">
          <button className="carrybot-action-btn danger" onClick={() => setView("report")}>
            ⚠ {t("REPORT_ISSUE")}
          </button>
        </div>
      </div>
    );
  }

  // Main — not connected
  return (
    <div className="carrybot-modal">
      <div className="carrybot-header">
        <span className="carrybot-icon">🤖</span>
        <h2 className="carrybot-title">CARRYBOT</h2>
      </div>

      {/* Not connected state */}
      <div className="cb-no-connection">
        <div className="cb-no-conn-icon">📡</div>
        <div className="cb-no-conn-title">No CarryBot Connected</div>
        <div className="cb-no-conn-desc">
          Connect to a CarryBot unit to track your luggage weight, location, and activate Follow Me mode.
        </div>
      </div>

      <button className="cb-connect-main-btn" onClick={() => setView("connect")}>
        🤖 Connect to CarryBot
      </button>

      <div className="carrybot-actions">
        <button className="carrybot-action-btn danger" onClick={() => setView("report")}>
          ⚠ {t("REPORT_ISSUE")}
        </button>
      </div>
    </div>
  );
}
