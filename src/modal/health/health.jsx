import "./health.css";

function getHRStatus(bpm) {
  if (bpm == null) return { label: "–",        dot: "info" };
  if (bpm < 50)    return { label: "Low",       dot: "warn" };
  if (bpm < 100)   return { label: "Normal",    dot: "ok"   };
  if (bpm < 130)   return { label: "Elevated",  dot: "warn" };
  return                   { label: "High",     dot: "danger" };
}

function getStress(bpm) {
  if (bpm == null)   return "–";
  if (bpm >= 130)    return "High";
  if (bpm >= 100)    return "Moderate";
  return                    "Low";
}

function getSuggestion(bpm) {
  if (bpm == null) return "Connect a smartwatch in Settings to see live health data.";
  if (bpm < 50)    return "Your heart rate is low. Consider resting at the lounge.";
  if (bpm < 100)   return "You're doing great! Relax at Lounge A (2 min away).";
  if (bpm < 130)   return "Heart rate slightly elevated. Find a seat and hydrate.";
  return "High heart rate detected. Please rest and seek medical attention if needed.";
}

export default function HealthModal({ t, showSubtitle, bluetooth }) {
  const { status, device, heartRate, battery } = bluetooth ?? {};
  const isConnected = status === "connected";
  const hrStatus    = getHRStatus(isConnected ? heartRate : null);

  return (
    <div className="health-modal">

      {/* Connection banner */}
      {isConnected ? (
        <div className="health-bt-banner connected">
          <span>🔵</span>
          <span>
            <strong>{device?.name ?? "Smartwatch"}</strong> connected
            {battery != null ? ` · 🔋 ${battery}%` : ""}
          </span>
        </div>
      ) : (
        <div className="health-bt-banner">
          <span>⌚</span>
          <span>No smartwatch connected. Connect one in <strong>Settings</strong> to see live data.</span>
        </div>
      )}

      <div className="health-rows">

        {/* Overall status */}
        <div className="health-row">
          <span className={`health-dot ${hrStatus.dot}`} />
          <span className="health-label">{t("STATUS_LABEL")}</span>
          <span className="health-value">{hrStatus.label}</span>
        </div>

        {/* Temperature */}
        <div className="health-row">
          <span className="health-dot info" />
          <span className="health-label">{t("TEMPERATURE_LABEL")}</span>
          <span className="health-value">–</span>
        </div>

        {/* Heart rate */}
        <div className="health-row">
          <span className="health-dot pulse" />
          <span className="health-label">{t("HEART_RATE_LABEL")}</span>
          <span className="health-value">
            {isConnected
              ? heartRate != null
                ? <><span className="health-hr-live">{heartRate}</span> bpm</>
                : "Reading…"
              : "–"}
          </span>
        </div>

        <div className="health-divider" />

        {/* Stress */}
        <div className="health-row">
          <span className={`health-dot ${isConnected && heartRate >= 100 ? "warn" : "info"}`} />
          <span className="health-label">{t("STRESS_LEVEL_LABEL")}</span>
          <span className="health-value">
            {isConnected ? getStress(heartRate) : "–"}
          </span>
        </div>

        <div className="health-suggestion">
          <div className="health-suggestion-title">{t("SUGGESTION_LABEL")}</div>
          <div className="health-suggestion-text">
            "{getSuggestion(isConnected ? heartRate : null)}"
          </div>
        </div>
      </div>

      <div className="health-actions">
        <button
          type="button"
          className="health-action-btn"
          onClick={() => showSubtitle("Finding nearby clinics...")}
        >
          {t("FIND_CLINIC")}
        </button>
        <button
          type="button"
          className="health-action-btn danger"
          onClick={() => showSubtitle("Calling emergency services...")}
        >
          {t("EMERGENCY_CALL")}
        </button>
      </div>
    </div>
  );
}
