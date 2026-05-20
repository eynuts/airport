import { useState, useCallback } from "react";
import { Plane, Globe, X } from "lucide-react";
import "./settings.css";
import { popularAirports } from "../navigation/navigation";
import { API_BASE_URL } from "../../config";

export const SUPPORTED_LANGUAGES = [
  { name: "English", code: "en-US", flag: "🇬🇧" },
  { name: "Spanish", code: "es-ES", flag: "🇪🇸" },
  { name: "French", code: "fr-FR", flag: "🇫🇷" },
  { name: "German", code: "de-DE", flag: "🇩🇪" },
  { name: "Italian", code: "it-IT", flag: "🇮🇹" },
  { name: "Japanese", code: "ja-JP", flag: "🇯🇵" },
  { name: "Korean", code: "ko-KR", flag: "🇰🇷" },
  { name: "Chinese", code: "zh-CN", flag: "🇨🇳" },
  { name: "Filipino", code: "fil-PH", flag: "🇵🇭" },
  { name: "Russian", code: "ru-RU", flag: "🇷🇺" },
  { name: "Portuguese", code: "pt-BR", flag: "🇵🇹" },
];

export default function SettingsModal({
  selectedFlight,
  onFlightSelect,
  preferredLanguage,
  onLanguageSelect,
  t,
  showSubtitle,
}) {
  const [showFlightSelection, setShowFlightSelection] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [flights, setFlights] = useState([]);
  const [loadingFlights, setLoadingFlights] = useState(false);
  const [airportCode, setAirportCode] = useState("");

  const philippineAirportCodes = popularAirports.map((a) => a.code);

  const searchFlights = useCallback(
    async (code) => {
      if (!code || code.length < 3) return;

      setLoadingFlights(true);
      setFlights([]);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/flights/search?airport_iata=${code}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
          const localFlights = data.data.filter((flight) => {
            const depCode = flight.departure?.iata;
            const arrCode = flight.arrival?.iata;
            return (
              depCode &&
              arrCode &&
              philippineAirportCodes.includes(depCode) &&
              philippineAirportCodes.includes(arrCode)
            );
          });

          setFlights(localFlights);

          if (localFlights.length === 0) {
            showSubtitle(`No domestic flights found for ${code}`);
          }
        } else if (data.error) {
          showSubtitle(`API Error: ${data.error.message || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error searching flights:", error);
        showSubtitle(`Error loading flights: ${error.message}`);
      } finally {
        setLoadingFlights(false);
      }
    },
    [showSubtitle, philippineAirportCodes],
  );

  const handleAirportSearch = () => {
    if (airportCode.trim().length >= 3) {
      searchFlights(airportCode.trim().toUpperCase());
    }
  };

  const selectAirport = (airport) => {
    setAirportCode(airport.code);
    searchFlights(airport.code);
  };

  const handleFlightPick = (flight) => {
    setShowFlightSelection(false);
    onFlightSelect(flight);
  };

  const prefLang = SUPPORTED_LANGUAGES.find(
    (l) => l.name === preferredLanguage,
  );

  return (
    <>
      {/* Settings Modal Content */}
      <div className="settings-modal">
        {/* Flight Settings Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t("FLIGHT_SETTINGS")}</h3>
          <button
            className="choose-flight-btn"
            onClick={() => setShowFlightSelection(true)}
          >
            <Plane size={18} strokeWidth={2} />
            <span>{t("CHOOSE_FLIGHT")}</span>
          </button>

          {selectedFlight && (
            <div className="selected-flight-info">
              <div className="selected-label">{t("CURRENT_FLIGHT")}</div>
              <div className="selected-value">
                {selectedFlight.flight.iata || selectedFlight.flight.number}
              </div>
              <div className="selected-route">
                {selectedFlight.departure.iata} → {selectedFlight.arrival.iata}
              </div>
            </div>
          )}
        </div>

        {/* Language Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t("LANGUAGE_SECTION")}</h3>
          <p className="settings-desc">{t("LANG_DESC")}</p>
          <button
            className="choose-lang-btn"
            onClick={() => setShowLanguagePicker(true)}
          >
            <Globe size={18} strokeWidth={2} />
            <span>{t("CHOOSE_LANGUAGE")}</span>
          </button>
          {preferredLanguage && (
            <div className="selected-lang-info">
              <span className="selected-lang-flag">{prefLang?.flag}</span>
              <div className="selected-lang-text">
                <div className="selected-label">{t("PREFERRED_LANG")}</div>
                <div className="selected-value">{preferredLanguage}</div>
              </div>
            </div>
          )}
        </div>

        {/* System Preferences Section */}
        <div className="settings-section">
          <h3 className="settings-section-title">{t("SYSTEM_PREFS")}</h3>
          <p className="settings-desc">{t("VOICE_DISPLAY")}</p>
        </div>
      </div>

      {/* Flight Selection Overlay */}
      {showFlightSelection && (
        <div
          className="flight-selection-overlay"
          onClick={() => setShowFlightSelection(false)}
        >
          <div
            className="flight-selection-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flight-selection-header">
              <h2 className="flight-selection-title">Select Your Flight</h2>
              <button
                className="flight-selection-close"
                onClick={() => setShowFlightSelection(false)}
              >
                <X size={24} />
              </button>
            </div>

            {flights.length === 0 && !loadingFlights ? (
              <div className="airport-selection">
                <h3 className="selection-step-title">Step 1: Choose Airport</h3>

                <div className="airport-search-box">
                  <input
                    type="text"
                    className="airport-search-input"
                    placeholder="Enter airport code (e.g., MNL, JFK, LAX)..."
                    value={airportCode}
                    onChange={(e) =>
                      setAirportCode(e.target.value.toUpperCase())
                    }
                    onKeyPress={(e) =>
                      e.key === "Enter" && handleAirportSearch()
                    }
                    maxLength={3}
                  />
                  <button
                    className="search-flight-btn"
                    onClick={handleAirportSearch}
                  >
                    Search Flights
                  </button>
                </div>

                <div className="popular-airports-section">
                  <h4 className="popular-title">
                    Local Airports (Philippines)
                  </h4>
                  <div className="airport-list">
                    {popularAirports.map((airport) => (
                      <div
                        key={airport.code}
                        className="airport-item"
                        onClick={() => selectAirport(airport)}
                      >
                        <div className="airport-code">{airport.code}</div>
                        <div className="airport-info">
                          <div className="airport-name">{airport.name}</div>
                          <div className="airport-location">{airport.city}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flight-selection">
                <div className="selection-header">
                  <h3 className="selection-step-title">
                    Step 2: Flights arriving at {airportCode}
                  </h3>
                  <button
                    className="back-btn"
                    onClick={() => {
                      setFlights([]);
                      setAirportCode("");
                    }}
                  >
                    ← Change Airport
                  </button>
                </div>

                {loadingFlights && (
                  <div className="loading-text">Loading flights...</div>
                )}

                {!loadingFlights && flights.length === 0 && (
                  <div className="empty-state">
                    <p>No domestic flights found for {airportCode}</p>
                    <p className="empty-hint">
                      Only showing flights within the Philippines
                    </p>
                  </div>
                )}

                <div className="flight-list">
                  {flights.map((flight, index) => (
                    <div
                      key={index}
                      className="flight-item"
                      onClick={() => handleFlightPick(flight)}
                    >
                      <div className="flight-main-info">
                        <div className="flight-number">
                          {flight.flight.iata || flight.flight.number}
                        </div>
                        <div className="flight-airline">
                          {flight.airline.name}
                        </div>
                      </div>
                      <div className="flight-route-info">
                        <div className="flight-location">
                          <div className="location-code">
                            {flight.departure.iata}
                          </div>
                          <div className="location-name">
                            {flight.departure.airport}
                          </div>
                        </div>
                        <div className="flight-arrow">→</div>
                        <div className="flight-location">
                          <div className="location-code">
                            {flight.arrival.iata}
                          </div>
                          <div className="location-name">
                            {flight.arrival.airport}
                          </div>
                        </div>
                      </div>
                      <div className="flight-status">
                        Status: {flight.flight_status || "Scheduled"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Language Picker Overlay */}
      {showLanguagePicker && (
        <div
          className="lang-picker-overlay"
          onClick={() => setShowLanguagePicker(false)}
        >
          <div
            className="lang-picker-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lang-picker-header">
              <h2 className="lang-picker-title">
                <Globe size={22} strokeWidth={2} />
                {t("LANG_PICKER_TITLE")}
              </h2>
              <button
                className="lang-picker-close"
                onClick={() => setShowLanguagePicker(false)}
              >
                <X size={22} />
              </button>
            </div>
            <p className="lang-picker-subtitle">{t("LANG_PICKER_SUBTITLE")}</p>
            <div className="lang-picker-grid">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.name}
                  className={`lang-card ${preferredLanguage === lang.name ? "selected" : ""}`}
                  onClick={() => {
                    onLanguageSelect(lang.name);
                    setShowLanguagePicker(false);
                  }}
                >
                  <span className="lang-card-flag">{lang.flag}</span>
                  <span className="lang-card-name">{lang.name}</span>
                  {preferredLanguage === lang.name && (
                    <span className="lang-card-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
