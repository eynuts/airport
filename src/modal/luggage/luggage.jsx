import { Check, Hourglass } from "lucide-react";
import "./luggage.css";

const BAGS = [
  {
    id: 1,
    label: "Loaded",
    variant: "loaded",
    icon: <Check size={14} strokeWidth={2.6} aria-hidden="true" />,
  },
  {
    id: 2,
    label: "In Transit",
    variant: "intransit",
    icon: <Hourglass size={14} strokeWidth={2.2} aria-hidden="true" />,
  },
];

const CURRENT_LOCATION = "Sorting Area B";
const ETA_TO_AIRCRAFT = "6 min";

export default function LuggageModal({ t, onReportIssue }) {
  return (
    <div className="luggage-modal">
      <div className="luggage-rows">
        {BAGS.map((bag) => (
          <div key={bag.id} className="luggage-row">
            <span className="luggage-bag-label">Bag #{bag.id}:</span>
            <span className={`luggage-status ${bag.variant}`}>
              <span className="luggage-status-symbol">{bag.icon}</span>
              <span className="luggage-status-text">{bag.label}</span>
            </span>
          </div>
        ))}

        <div className="luggage-divider" />

        <div className="luggage-section">
          <div className="luggage-section-title">{t("CURRENT_LOCATION")}</div>
          <div className="luggage-section-value">{CURRENT_LOCATION}</div>
        </div>

        <div className="luggage-eta">
          <span className="luggage-eta-label">{t("ETA_TO_AIRCRAFT")}</span>
          <span className="luggage-eta-value">{ETA_TO_AIRCRAFT}</span>
        </div>
      </div>

      <div className="luggage-actions">
        <button
          type="button"
          className="luggage-action-btn"
          onClick={onReportIssue}
        >
          {t("REPORT_ISSUE")}
        </button>
      </div>
    </div>
  );
}
