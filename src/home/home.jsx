import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plane,
  CloudSun,
  Luggage,
  Settings,
  Camera,
  HeartPulse,
  Globe,
  MapPin,
  X,
  Mic,
  Circle,
} from "lucide-react";
import "./home.css";
import Sphere3D from "./Sphere3D";
import { UI_TRANSLATIONS } from "./translations";
import { API_BASE_URL, WS_BASE_URL } from "../config";
import FlightModal from "../modal/flight/flight";
import WeatherModal from "../modal/weather/weather";
import LuggageModal from "../modal/luggage/luggage";
import NavigationModal, {
  getFlightDistance,
  getAirportCoordinates,
} from "../modal/navigation/navigation";
import SettingsModal from "../modal/settings/settings";
import TranslateModal from "../modal/translate/translate";
import LocalTipsModal from "../modal/local-tips/local-tips";
import HealthModal from "../modal/health/health";

const GlassCard = ({ icon, children, isCenter = false, onClick }) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`glass-card ${isCenter ? "card-centered" : ""} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className="card-icon">{icon}</div>
      <div className="card-content">{children}</div>
    </Tag>
  );
};

export default function Home() {
  const [activeModal, setActiveModal] = useState(null);
  const [subtitle, setSubtitle] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const isListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const subtitleTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const listenTimeoutRef = useRef(null);
  const isStartingRef = useRef(false);
  const socketRef = useRef(null);
  const processorRef = useRef(null);
  const turnTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef("");

  // Translation state
  const [targetLang, setTargetLang] = useState("Japanese");
  const [preferredLanguage, setPreferredLanguage] = useState("English");

  const t = (key) => {
    const dict =
      UI_TRANSLATIONS[preferredLanguage] || UI_TRANSLATIONS["English"];
    return dict[key] ?? UI_TRANSLATIONS["English"][key] ?? key;
  };
  // Flight selection state
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Weather state
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Get Philippine Time (Asia/Manila timezone)
  const getPhilippineTime = () => {
    const now = new Date();

    // Get time in 12-hour format with AM/PM
    const phTime = now.toLocaleString("en-US", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    // Split time and AM/PM
    const timeParts = phTime.split(" ");
    const [hours, minutes, seconds] = timeParts[0].split(":");
    const period = timeParts[1]; // AM or PM

    // Get date in Philippine timezone
    const formattedDate = now
      .toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();

    return { hours, minutes, seconds, period, formattedDate };
  };

  const [currentTime, setCurrentTime] = useState(getPhilippineTime());
  const { hours, minutes, seconds, period, formattedDate } = currentTime;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getPhilippineTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const speakText = useCallback((text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = "en-US";

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        stopListening();
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      console.error("Speech Synthesis not supported");
    }
  }, []);

  const showSubtitle = useCallback(
    (text) => {
      if (subtitleTimeoutRef.current) {
        clearTimeout(subtitleTimeoutRef.current);
      }
      setSubtitle(text);
      speakText(text);

      subtitleTimeoutRef.current = setTimeout(() => {
        setSubtitle("");
      }, 10000);
    },
    [speakText],
  );

  const callGemini = useCallback(
    async (text) => {
      if (!text.trim()) return;
      try {
        // Build live context so the AI knows current flight, nav & weather
        const { hours, minutes, period, formattedDate } = getPhilippineTime();
        const flightInfo = getFlightDistance(selectedFlight);

        const fmt = (iso) =>
          iso
            ? new Date(iso).toLocaleTimeString("en-US", {
                timeZone: "Asia/Manila",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })
            : "N/A";

        let context = `Current time in the Philippines: ${hours}:${minutes} ${period}, ${formattedDate}.`;

        if (selectedFlight) {
          const dep = selectedFlight.departure;
          const arr = selectedFlight.arrival;
          context += `\nFlight: ${selectedFlight.flight?.iata || selectedFlight.flight?.number || "N/A"} (${selectedFlight.airline?.name || "N/A"})`;
          context += `\nDeparture: ${dep?.iata || "N/A"} — ${dep?.airport || "N/A"} at ${fmt(dep?.scheduled)}`;
          context += `\nArrival: ${arr?.iata || "N/A"} — ${arr?.airport || "N/A"} at ${fmt(arr?.scheduled)}`;
          context += `\nFlight status: ${selectedFlight.flight_status || "Scheduled"}`;
        } else {
          context += "\nNo flight selected yet.";
        }

        if (flightInfo) {
          context += `\nNavigation: ${flightInfo.departure} → ${flightInfo.arrival}, distance: ${flightInfo.distance} KM, estimated flight time: ${flightInfo.hours > 0 ? `${flightInfo.hours}h ` : ""}${flightInfo.minutes}min.`;
        }

        if (weatherData) {
          context += `\nWeather at ${weatherData.location || weatherData.airportCode}: ${Math.round(weatherData.temperature_2m)}°C.`;
        }

        const response = await fetch(`${API_BASE_URL}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `You are Alvi, a helpful AI airport assistant. Use the context below to answer the user. Keep responses concise (under 50 words).\n\nCONTEXT:\n${context}\n\nUser: ${text}`,
          }),
        });
        const data = await response.json();
        showSubtitle(data.text || "No response");
      } catch (error) {
        showSubtitle("Error: " + error.message);
      }
    },
    [showSubtitle, selectedFlight, weatherData],
  );

  // Called by SettingsModal when the user picks a flight
  const handleFlightSelect = (flight) => {
    setSelectedFlight(flight);
    setActiveModal(null);
    showSubtitle(
      `Flight ${flight.flight.iata || flight.flight.number} selected!`,
    );
    if (flight.departure?.iata) {
      fetchWeather(flight.departure.iata);
    }
  };

  // Called by SettingsModal when the user picks a language
  const handleLanguageSelect = (name) => {
    setPreferredLanguage(name);
    setTargetLang(name);
    showSubtitle(`Language set to ${name}`);
  };

  // Fetch weather data
  const fetchWeather = useCallback(
    async (airportCode) => {
      const airport = getAirportCoordinates(airportCode);

      if (!airport) {
        console.warn(`Coordinates not found for airport: ${airportCode}`);
        return;
      }

      setLoadingWeather(true);
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${airport.lat}&longitude=${airport.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia/Manila`,
        );

        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Weather data:", data);

        setWeatherData({
          ...data.current,
          location: airport.city,
          airportCode: airport.code,
        });
      } catch (error) {
        console.error("Error fetching weather:", error);
        showSubtitle(`Error loading weather: ${error.message}`);
      } finally {
        setLoadingWeather(false);
      }
    },
    [showSubtitle],
  );

  useEffect(() => {
    return () => {
      stopListening();
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, []);

  const startListening = async () => {
    if (isStartingRef.current || isListeningRef.current) return;

    isStartingRef.current = true;
    setIsListening(true);
    isListeningRef.current = true;
    setIsAwake(true);

    try {
      // Open mic AND WebSocket in parallel; wait until BOTH are fully ready
      // before wiring the audio pipeline so zero audio is dropped.
      const [stream, socket] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise((resolve, reject) => {
          const ws = new WebSocket(`${WS_BASE_URL}/stream`);
          ws.onopen = () => resolve(ws);
          ws.onerror = () =>
            reject(new Error("Could not connect to speech server."));
        }),
      ]);
      streamRef.current = stream;
      socketRef.current = socket;

      // Handlers set after open — socket is guaranteed OPEN here
      socket.onerror = () => stopListening();
      socket.onmessage = async (message) => {
        const text =
          message.data instanceof Blob
            ? await message.data.text()
            : message.data;
        const res = JSON.parse(text);

        if (res.type === "Turn") {
          const transcript = res.transcript || "";
          if (res.turn_is_formatted && transcript) {
            // Accumulate text across multiple turns
            accumulatedTranscriptRef.current = (
              accumulatedTranscriptRef.current +
              " " +
              transcript
            ).trim();

            // Debounce: wait 1.5s after the last formatted turn before stopping
            // This lets you finish multi-word sentences
            if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
            turnTimerRef.current = setTimeout(() => {
              const finalText = accumulatedTranscriptRef.current;
              if (finalText) {
                console.log("User said:", finalText);
                callGemini(finalText);
              }
              accumulatedTranscriptRef.current = "";
              stopListening();
            }, 1500);
          }
        } else if (res.type === "Begin") {
          console.log("AssemblyAI session started:", res.id);
        }
      };

      // Audio pipeline — lean, only sends PCM data
      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      // Analyser for visual feedback (read by RAF loop)
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      source.connect(analyser);

      // ScriptProcessor — ONLY for sending PCM audio, nothing else
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (socket.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
          }
          socket.send(pcmData.buffer);
        }
      };
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Separate 60fps visual + silence detection loop (smooth, non-blocking)
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let silenceStartTime = null;
      const startTime = Date.now();

      const visualLoop = () => {
        if (!isListeningRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMicVolume(avg);

        const elapsed = Date.now() - startTime;
        if (elapsed > 2000) {
          if (avg < 12) {
            if (!silenceStartTime) silenceStartTime = Date.now();
            if (Date.now() - silenceStartTime > 5000) {
              stopListening();
              return;
            }
          } else {
            silenceStartTime = null;
          }
        }
        requestAnimationFrame(visualLoop);
      };
      requestAnimationFrame(visualLoop);

      isStartingRef.current = false;

      // Hard timeout failsafe
      if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          stopListening();
          showSubtitle("Timed out. Please try again.");
        }
      }, 15000);
    } catch (err) {
      console.error("Error starting microphone:", err);
      showSubtitle("Could not access microphone.");
      stopListening();
    }
  };

  function stopListening() {
    if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current);
    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    accumulatedTranscriptRef.current = "";

    isListeningRef.current = false;
    isStartingRef.current = false;
    setIsListening(false);
    setIsAwake(false);
    setMicVolume(0);

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "Terminate" }));
      }
      socketRef.current.close();
      socketRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }

  const getModalTitle = () => {
    switch (activeModal) {
      case "HEALTH STATS":
        return t("MODAL_HEALTH");
      case "LUGGAGE":
        return t("MODAL_LUGGAGE");
      case "FLIGHT":
        return t("MODAL_FLIGHT");
      case "WEATHER":
        return t("MODAL_WEATHER");
      case "TRANSLATE":
        return t("MODAL_TRANSLATE");
      case "NAVIGATION":
        return t("MODAL_NAVIGATION");
      case "SETTINGS":
        return t("MODAL_SETTINGS");
      case "LOCAL TIPS":
        return t("MODAL_LOCAL_TIPS");
      default:
        return `${activeModal} DETAILS`;
    }
  };

  const getModalContent = () => {
    switch (activeModal) {
      case "FLIGHT":
        return <FlightModal selectedFlight={selectedFlight} t={t} />;
      case "WEATHER":
        return (
          <WeatherModal
            selectedFlight={selectedFlight}
            weatherData={weatherData}
            loadingWeather={loadingWeather}
            fetchWeather={fetchWeather}
            t={t}
          />
        );
      case "LUGGAGE":
        return (
          <LuggageModal
            t={t}
            onReportIssue={() => showSubtitle("Reporting luggage issue...")}
          />
        );
      case "TRANSLATE":
        return (
          <TranslateModal
            targetLang={targetLang}
            setTargetLang={setTargetLang}
            t={t}
          />
        );
      case "NAVIGATION": {
        return <NavigationModal selectedFlight={selectedFlight} t={t} />;
      }
      case "SETTINGS":
        return (
          <SettingsModal
            selectedFlight={selectedFlight}
            onFlightSelect={handleFlightSelect}
            preferredLanguage={preferredLanguage}
            onLanguageSelect={handleLanguageSelect}
            t={t}
            showSubtitle={showSubtitle}
          />
        );
      case "LOCAL TIPS":
        return <LocalTipsModal t={t} />;
      case "HEALTH STATS":
        return <HealthModal t={t} showSubtitle={showSubtitle} />;
      default:
        return <p>Loading details...</p>;
    }
  };

  return (
    <div className="home-container">
      <div className="center-sphere">
        <Sphere3D
          isSpeaking={isSpeaking}
          micVolume={micVolume}
          onSphereClick={() =>
            showSubtitle("Hi, I'm Alvi, how can I assist you?")
          }
        />
      </div>

      <div className="header-display">
        <div className="time">
          {hours}:{minutes}:{seconds}{" "}
          <span className="time-period">{period}</span>
        </div>
        <div className="date">{formattedDate}</div>
        <div className="location">PHILIPPINES (GMT+8)</div>
      </div>

      <div className="dashboard-overlay">
        <div className="side-column left">
          <GlassCard
            icon={<Plane size={36} strokeWidth={1.5} />}
            onClick={() => setActiveModal("FLIGHT")}
          >
            <div className="card-title">{t("FLIGHT")}</div>
            {selectedFlight ? (
              <>
                <div className="card-sub">
                  {selectedFlight.flight?.iata ||
                    selectedFlight.flight?.number ||
                    "N/A"}
                </div>
                <div className="card-sub">
                  {selectedFlight.departure?.iata || "N/A"} →{" "}
                  {selectedFlight.arrival?.iata || "N/A"}
                </div>
              </>
            ) : (
              <>
                <div className="card-sub">{t("NO_FLIGHT")}</div>
                <div className="card-sub">{t("SELECT_IN_SETTINGS")}</div>
              </>
            )}
          </GlassCard>

          <GlassCard
            icon={<CloudSun size={36} strokeWidth={1.5} />}
            onClick={() => setActiveModal("WEATHER")}
          >
            <div className="card-title">{t("WEATHER")}</div>
            {weatherData ? (
              <>
                <div className="card-value">
                  {Math.round(weatherData.temperature_2m)}°C
                </div>
                <div className="card-sub">{weatherData.location}</div>
              </>
            ) : (
              <>
                <div className="card-value">--°C</div>
                <div className="card-sub">{t("NO_DATA")}</div>
              </>
            )}
          </GlassCard>

          <GlassCard
            icon={<Luggage size={36} strokeWidth={1.5} />}
            onClick={() => setActiveModal("LUGGAGE")}
          >
            <div className="card-title">{t("LUGGAGE")}</div>
            <div className="card-sub">{t("WEIGHT")}</div>
            <div className="card-value">18KG</div>
          </GlassCard>
        </div>

        <div className="center-bottom">
          <GlassCard
            icon={<Globe size={36} strokeWidth={1.5} />}
            onClick={() => setActiveModal("TRANSLATE")}
          >
            <div className="card-value" style={{ marginBottom: "5px" }}>
              A ↔ B
            </div>
            <div className="card-sub">ESP → ENG</div>
          </GlassCard>

          <GlassCard
            icon={<MapPin size={36} strokeWidth={1.5} />}
            onClick={() => setActiveModal("NAVIGATION")}
          >
            <div className="card-title">{t("NAVIGATION")}</div>
            {(() => {
              const flightInfo = getFlightDistance(selectedFlight);
              if (flightInfo) {
                return (
                  <>
                    <div className="card-sub" style={{ marginTop: "5px" }}>
                      {flightInfo.arrival}
                    </div>
                    <div className="card-value" style={{ fontSize: "20px" }}>
                      {flightInfo.distance}KM
                    </div>
                  </>
                );
              }
              return (
                <>
                  <div className="card-sub" style={{ marginTop: "5px" }}>
                    {t("NO_FLIGHT")}
                  </div>
                  <div className="card-value" style={{ fontSize: "20px" }}>
                    --KM
                  </div>
                </>
              );
            })()}
          </GlassCard>
        </div>

        <div className="side-column right">
          <GlassCard
            icon={<Settings size={36} strokeWidth={1.5} />}
            isCenter={true}
            onClick={() => setActiveModal("SETTINGS")}
          >
            <div className="card-title" style={{ marginTop: "10px" }}>
              {t("SETTINGS")}
            </div>
          </GlassCard>

          <GlassCard
            icon={<Camera size={36} strokeWidth={1.5} />}
            onClick={() => setActiveModal("LOCAL TIPS")}
          >
            <div className="card-title">{t("LOCAL_TIPS")}</div>
            <div className="card-sub" style={{ marginTop: "5px" }}>
              ART DISTRICT
            </div>
            <div className="card-sub">VIEW CITY</div>
          </GlassCard>

          <GlassCard
            icon={<HeartPulse size={36} strokeWidth={1.5} />}
            onClick={() => setActiveModal("HEALTH STATS")}
          >
            <div className="card-title">{t("HEALTH_STATS")}</div>
            <div
              className="card-value"
              style={{
                fontSize: "22px",
                marginTop: "5px",
                marginBottom: "5px",
              }}
            >
              HR 72
            </div>
            <div className="card-sub">{t("HEALTH_OK")}</div>
          </GlassCard>
        </div>
      </div>

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div
            className={`modal-content glass-card ${
              activeModal === "HEALTH STATS"
                ? "health-modal-content"
                : activeModal === "LUGGAGE"
                  ? "luggage-modal-content"
                  : activeModal === "FLIGHT"
                    ? "flight-modal-content"
                    : activeModal === "TRANSLATE"
                      ? "translate-modal-content"
                      : activeModal === "WEATHER"
                        ? "weather-modal-content"
                        : activeModal === "NAVIGATION"
                          ? "navigation-modal-content"
                          : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setActiveModal(null)}
            >
              <X size={24} />
            </button>
            <h2
              className={`modal-title ${
                activeModal === "HEALTH STATS"
                  ? "health-modal-title"
                  : activeModal === "LUGGAGE"
                    ? "luggage-modal-title"
                    : ""
              }`}
            >
              {activeModal === "HEALTH STATS" ? (
                <span className="health-title-icon">
                  <HeartPulse size={18} strokeWidth={1.8} />
                </span>
              ) : activeModal === "LUGGAGE" ? (
                <span className="luggage-title-icon">
                  <Luggage size={18} strokeWidth={1.8} />
                </span>
              ) : null}
              {getModalTitle()}
            </h2>
            <div className="modal-body">{getModalContent()}</div>
          </div>
        </div>
      )}

      {subtitle && <div className="subtitle-display">{subtitle}</div>}

      <div className="voice-control-container">
        <button
          className={`voice-btn ${isListening ? "listening" : ""} ${isAwake ? "awake" : ""}`}
          onClick={isListening ? stopListening : startListening}
          title={isListening ? "Stop listening" : "Start voice control"}
        >
          {isListening ? (
            <Circle
              size={24}
              fill="currentColor"
              stroke="none"
              aria-hidden="true"
            />
          ) : (
            <Mic size={24} strokeWidth={2.2} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
