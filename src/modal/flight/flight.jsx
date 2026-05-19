import { Plane, Sparkles, Clock, MapPinned } from "lucide-react";
import "./flight.css";

// Derive a stable number from a string so gate/time are consistent per flight
function hashNum(str, min, max) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return (Math.abs(h) % (max - min + 1)) + min;
}

export default function FlightModal({ selectedFlight, t }) {
  let flightData;

  if (selectedFlight) {
    const flight = selectedFlight;
    const flightId = flight.flight?.iata || flight.flight?.number || "DEMO";
    const departureTime = flight.departure?.scheduled
      ? new Date(flight.departure.scheduled)
      : null;

    const timeToGate = hashNum(flightId, 5, 24);
    const suggestedDeparture =
      timeToGate < 15 ? "NOW" : `${timeToGate - 10} min`;

    flightData = {
      flightNumber: flightId,
      route: {
        from: flight.departure?.iata || "N/A",
        to: flight.arrival?.iata || "N/A",
      },
      boarding: departureTime
        ? departureTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })
        : "TBA",
      gate:
        flight.departure?.gate ||
        flight.arrival?.gate ||
        `${hashNum(flightId + "g", 1, 40)}A`,
      status: flight.flight_status?.toUpperCase() || "SCHEDULED",
      timeToGate: `${timeToGate} min`,
      suggestedDeparture,
      aiSuggestion:
        timeToGate < 15
          ? "Security is crowded. Leave now."
          : "You have time. Relax at the lounge.",
      airline: flight.airline?.name || "Unknown Airline",
      departureAirport: flight.departure?.airport || "Unknown",
      arrivalAirport: flight.arrival?.airport || "Unknown",
    };
  } else {
    flightData = {
      flightNumber: "Select a flight",
      route: { from: "---", to: "---" },
      boarding: "--:-- --",
      gate: "--",
      status: "NOT SELECTED",
      timeToGate: "-- min",
      suggestedDeparture: "--",
      aiSuggestion:
        "Please select a flight in Settings to see your flight details.",
      airline: "No flight selected",
      departureAirport: "Please go to Settings",
      arrivalAirport: "and choose your flight",
    };
  }

  return (
    <div className="fm-v2-container">
      {/* Ticket Header */}
      <div className="fm-v2-header">
        <div className="fm-v2-airline">
          <Plane size={22} strokeWidth={2.5} />
          <span>{flightData.airline}</span>
        </div>
        <div
          className={`fm-v2-status ${flightData.status
            .toLowerCase()
            .replace(" ", "-")}`}
        >
          <div className="status-dot"></div>
          {flightData.status}
        </div>
      </div>

      {/* Boarding Pass Middle / Route */}
      <div className="fm-v2-route-card">
        <div className="route-endpoint left">
          <div className="route-time">{flightData.boarding}</div>
          <div className="route-code">{flightData.route.from}</div>
          <div className="route-city">{flightData.departureAirport}</div>
        </div>

        <div className="route-path">
          <div className="path-line"></div>
          <Plane size={24} className="path-plane" />
          <div className="path-flight-num">{flightData.flightNumber}</div>
        </div>

        <div className="route-endpoint right">
          <div className="route-time">--:--</div>
          <div className="route-code">{flightData.route.to}</div>
          <div className="route-city">{flightData.arrivalAirport}</div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="fm-v2-stats-strip">
        <div className="stat-item">
          <span className="stat-label">{t("GATE")}</span>
          <span className="stat-value">{flightData.gate}</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-label">{t("SEAT")}</span>
          <span className="stat-value">TBA</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-label">{t("CLASS")}</span>
          <span className="stat-value">ECONOMY</span>
        </div>
      </div>

      {/* AI & Timing Panel */}
      <div className="fm-v2-ai-panel">
        <div className="ai-panel-header">
          <Sparkles size={16} />
          <span>{t("ALVI_INTEL")}</span>
        </div>
        <div className="ai-panel-content">
          <div className="timing-column">
            <div className="timing-block">
              <Clock size={18} className="text-cyan" />
              <div className="timing-text">
                <span className="timing-title">{t("WALK_TO_GATE")}</span>
                <span className="timing-val">{flightData.timeToGate}</span>
              </div>
            </div>
            <div className="timing-block urgent">
              <MapPinned size={18} className="text-orange" />
              <div className="timing-text">
                <span className="timing-title">{t("LEAVE_BY")}</span>
                <span className="timing-val">
                  {flightData.suggestedDeparture}
                </span>
              </div>
            </div>
          </div>
          <div className="ai-message-column">{flightData.aiSuggestion}</div>
        </div>
      </div>
    </div>
  );
}
