import "./health.css";

const stats = {
  status: "Normal",
  temperature: "36.7°C",
  heartRate: "78 bpm",
  stressLevel: "Low",
  suggestion: "Relax at Lounge A (2 min away)",
};

export default function HealthModal({ t, showSubtitle }) {
  return (
    <div className="health-modal">
      <div className="health-rows">
        <div className="health-row">
          <span className="health-dot ok" />
          <span className="health-label">{t("STATUS_LABEL")}</span>
          <span className="health-value">{t("NORMAL_STATUS")}</span>
        </div>

        <div className="health-row">
          <span className="health-dot info" />
          <span className="health-label">{t("TEMPERATURE_LABEL")}</span>
          <span className="health-value">{stats.temperature}</span>
        </div>

        <div className="health-row">
          <span className="health-dot pulse" />
          <span className="health-label">{t("HEART_RATE_LABEL")}</span>
          <span className="health-value">{stats.heartRate}</span>
        </div>

        <div className="health-divider" />

        <div className="health-row">
          <span className="health-dot warn" />
          <span className="health-label">{t("STRESS_LEVEL_LABEL")}</span>
          <span className="health-value">{t("LOW_STRESS")}</span>
        </div>

        <div className="health-suggestion">
          <div className="health-suggestion-title">{t("SUGGESTION_LABEL")}</div>
          <div className="health-suggestion-text">"{stats.suggestion}"</div>
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
