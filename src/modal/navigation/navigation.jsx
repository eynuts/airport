import "./navigation.css";

export const popularAirports = [
  {
    code: "MNL",
    name: "Manila - Ninoy Aquino",
    city: "Manila",
    lat: 14.5086,
    lon: 121.0194,
  },
  {
    code: "CEB",
    name: "Cebu - Mactan",
    city: "Cebu",
    lat: 10.3075,
    lon: 123.9789,
  },
  {
    code: "CRK",
    name: "Clark International",
    city: "Pampanga",
    lat: 15.186,
    lon: 120.56,
  },
  {
    code: "DVO",
    name: "Davao International",
    city: "Davao",
    lat: 7.1255,
    lon: 125.6456,
  },
  {
    code: "ILO",
    name: "Iloilo International",
    city: "Iloilo",
    lat: 10.8331,
    lon: 122.4933,
  },
  {
    code: "KLO",
    name: "Kalibo International",
    city: "Kalibo",
    lat: 11.6794,
    lon: 122.3761,
  },
  {
    code: "PPS",
    name: "Puerto Princesa",
    city: "Palawan",
    lat: 9.7421,
    lon: 118.7592,
  },
  {
    code: "TAG",
    name: "Tagbilaran Airport",
    city: "Bohol",
    lat: 9.6641,
    lon: 123.8531,
  },
  {
    code: "BCD",
    name: "Bacolod-Silay",
    city: "Bacolod",
    lat: 10.7764,
    lon: 123.015,
  },
  {
    code: "GES",
    name: "General Santos",
    city: "General Santos",
    lat: 6.058,
    lon: 125.0961,
  },
  {
    code: "BXU",
    name: "Butuan Airport",
    city: "Butuan",
    lat: 8.9515,
    lon: 125.4789,
  },
  {
    code: "DGT",
    name: "Sibulan Airport",
    city: "Dumaguete",
    lat: 9.3337,
    lon: 123.3004,
  },
  {
    code: "MPH",
    name: "Godofredo P. Ramos Airport",
    city: "Malay (Boracay)",
    lat: 11.9244,
    lon: 121.9537,
  },
  {
    code: "TAC",
    name: "Daniel Z. Romualdez Airport",
    city: "Tacloban",
    lat: 11.2279,
    lon: 125.0278,
  },
  {
    code: "USU",
    name: "Francisco B. Reyes Airport",
    city: "Busuanga (Coron)",
    lat: 12.1215,
    lon: 120.1001,
  },
  {
    code: "ZAM",
    name: "Zamboanga International Airport",
    city: "Zamboanga",
    lat: 6.9224,
    lon: 122.0596,
  },
  {
    code: "CGY",
    name: "Laguindingan Airport",
    city: "Cagayan de Oro",
    lat: 8.6156,
    lon: 124.4569,
  },
  {
    code: "SFS",
    name: "Subic Bay International Airport",
    city: "Subic Bay",
    lat: 14.7944,
    lon: 120.2711,
  },
  {
    code: "OMC",
    name: "Ormoc Airport",
    city: "Ormoc",
    lat: 11.058,
    lon: 124.5649,
  },
  {
    code: "LAO",
    name: "Laoag International Airport",
    city: "Laoag",
    lat: 18.1781,
    lon: 120.5317,
  },
];

export const getAirportCoordinates = (iataCode) => {
  return popularAirports.find((airport) => airport.code === iataCode);
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

export const getFlightDistance = (selectedFlight) => {
  if (!selectedFlight) return null;

  const departure = getAirportCoordinates(selectedFlight.departure?.iata);
  const arrival = getAirportCoordinates(selectedFlight.arrival?.iata);

  if (!departure || !arrival) return null;

  const distance = calculateDistance(
    departure.lat,
    departure.lon,
    arrival.lat,
    arrival.lon,
  );

  const hours = Math.floor(distance / 700);
  const minutes = Math.round(((distance % 700) / 700) * 60);

  return {
    distance,
    hours,
    minutes,
    departure: departure.city,
    arrival: arrival.city,
  };
};

export default function NavigationModal({ selectedFlight, t }) {
  const flightInfo = getFlightDistance(selectedFlight);

  if (!selectedFlight) {
    return (
      <div className="navigation-modal">
        <div className="navigation-no-flight">
          <p>{t("NO_FLIGHT_NAV")}</p>
          <p className="navigation-hint">{t("SELECT_FLIGHT_NAV")}</p>
        </div>
      </div>
    );
  }

  if (!flightInfo) {
    return (
      <div className="navigation-modal">
        <div className="navigation-no-data">
          <p>{t("NO_NAV_DATA")}</p>
          <p className="navigation-hint">{t("NO_AIRPORT_COORDS")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="navigation-modal">
      {/* Route Header */}
      <div className="navigation-header">
        <div className="navigation-route">
          <div className="navigation-city">{flightInfo.departure}</div>
          <div className="navigation-arrow">→</div>
          <div className="navigation-city">{flightInfo.arrival}</div>
        </div>
        <div className="navigation-codes">
          {selectedFlight.departure.iata} {t("NAV_TO")}{" "}
          {selectedFlight.arrival.iata}
        </div>
      </div>

      {/* Distance Info */}
      <div className="navigation-section">
        <div className="navigation-card">
          <div className="navigation-icon">📏</div>
          <div className="navigation-info">
            <div className="navigation-label">{t("NAV_DISTANCE")}</div>
            <div className="navigation-value">{flightInfo.distance} KM</div>
          </div>
        </div>

        <div className="navigation-card">
          <div className="navigation-icon">⏱️</div>
          <div className="navigation-info">
            <div className="navigation-label">{t("NAV_EST_FLIGHT_TIME")}</div>
            <div className="navigation-value">
              {flightInfo.hours > 0 && `${flightInfo.hours}H `}
              {flightInfo.minutes}M
            </div>
          </div>
        </div>
      </div>

      {/* Flight Details */}
      <div className="navigation-section">
        <div className="navigation-card full-width">
          <div className="navigation-icon">✈️</div>
          <div className="navigation-info">
            <div className="navigation-label">{t("NAV_FLIGHT_NUMBER")}</div>
            <div className="navigation-value">
              {selectedFlight.flight.iata || selectedFlight.flight.number}
            </div>
          </div>
        </div>

        <div className="navigation-card full-width">
          <div className="navigation-icon">🛫</div>
          <div className="navigation-info">
            <div className="navigation-label">{t("NAV_DEPARTURE")}</div>
            <div className="navigation-value">
              {selectedFlight.departure.iata} - {flightInfo.departure}
            </div>
            {selectedFlight.departure.scheduled && (
              <div className="navigation-time">
                {new Date(
                  selectedFlight.departure.scheduled,
                ).toLocaleTimeString("en-US", {
                  timeZone: "Asia/Manila",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
            )}
          </div>
        </div>

        <div className="navigation-card full-width">
          <div className="navigation-icon">🛬</div>
          <div className="navigation-info">
            <div className="navigation-label">{t("NAV_ARRIVAL")}</div>
            <div className="navigation-value">
              {selectedFlight.arrival.iata} - {flightInfo.arrival}
            </div>
            {selectedFlight.arrival.scheduled && (
              <div className="navigation-time">
                {new Date(selectedFlight.arrival.scheduled).toLocaleTimeString(
                  "en-US",
                  {
                    timeZone: "Asia/Manila",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  },
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      {selectedFlight.flight_status && (
        <div className="navigation-status">
          <div className="navigation-status-label">
            {t("NAV_FLIGHT_STATUS")}
          </div>
          <div
            className={`navigation-status-badge ${selectedFlight.flight_status.toLowerCase()}`}
          >
            {selectedFlight.flight_status}
          </div>
        </div>
      )}
    </div>
  );
}
