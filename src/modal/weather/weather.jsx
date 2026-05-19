import "./weather.css";

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function getWeatherDescription(code) {
  return WEATHER_CODES[code] || "Unknown";
}

function getWeatherIcon(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "☁️";
}

export default function WeatherModal({
  selectedFlight,
  weatherData,
  loadingWeather,
  fetchWeather,
  t,
}) {
  if (!selectedFlight) {
    return (
      <div className="weather-modal">
        <div className="weather-no-flight">
          <p>{t("NO_FLIGHT_SELECTED")}</p>
          <p className="weather-hint">{t("SELECT_FLIGHT_WEATHER")}</p>
        </div>
      </div>
    );
  }

  if (loadingWeather) {
    return (
      <div className="weather-modal">
        <div className="loading-text">{t("LOADING_WEATHER")}</div>
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="weather-modal">
        <div className="weather-no-data">
          <p>{t("NO_WEATHER_DATA")}</p>
          <button
            className="weather-refresh-btn"
            onClick={() =>
              selectedFlight?.departure?.iata &&
              fetchWeather(selectedFlight.departure.iata)
            }
          >
            {t("REFRESH_WEATHER")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="weather-modal">
      {/* Location Header */}
      <div className="weather-header">
        <div className="weather-location">
          <span className="weather-icon-large">
            {getWeatherIcon(weatherData.weather_code)}
          </span>
          <div className="weather-location-info">
            <div className="weather-city">{weatherData.location}</div>
            <div className="weather-airport">
              {t("AIRPORT_LABEL")} {weatherData.airportCode}
            </div>
          </div>
        </div>
      </div>

      {/* Main Temperature */}
      <div className="weather-main">
        <div className="weather-temp-big">
          {Math.round(weatherData.temperature_2m)}°C
        </div>
        <div className="weather-condition">
          {getWeatherDescription(weatherData.weather_code)}
        </div>
        <div className="weather-feels-like">
          {t("FEELS_LIKE")} {Math.round(weatherData.apparent_temperature)}°C
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="weather-details-grid">
        <div className="weather-detail-card">
          <div className="weather-detail-icon">💧</div>
          <div className="weather-detail-label">{t("HUMIDITY")}</div>
          <div className="weather-detail-value">
            {weatherData.relative_humidity_2m}%
          </div>
        </div>

        <div className="weather-detail-card">
          <div className="weather-detail-icon">💨</div>
          <div className="weather-detail-label">{t("WIND_SPEED")}</div>
          <div className="weather-detail-value">
            {Math.round(weatherData.wind_speed_10m)} km/h
          </div>
        </div>

        <div className="weather-detail-card">
          <div className="weather-detail-icon">☔</div>
          <div className="weather-detail-label">{t("PRECIPITATION")}</div>
          <div className="weather-detail-value">
            {weatherData.precipitation || 0} mm
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="weather-footer">
        <button
          className="weather-refresh-btn"
          onClick={() => fetchWeather(weatherData.airportCode)}
        >
          🔄 {t("REFRESH_WEATHER")}
        </button>
        <div className="weather-source">Data from Open-Meteo API</div>
      </div>
    </div>
  );
}
