import { useEffect, useRef, useState, useCallback } from "react";
import "./navigation.css";
import floor1Img from "../../assets/floor plan/1stFloor.png";
import floor2Img from "../../assets/floor plan/2ndFloor.png";
import floor3Img from "../../assets/floor plan/3rdFloor.png";

// ── Storage keys ──────────────────────────────────────────────────────────────
const LS_POS    = (i) => `nav_pos_floor_${i}`;
const LS_BOUNDS = "nav_gps_bounds";

// ── Default floor plan GPS bounds ─────────────────────────────────────────────
// These map the floor plan IMAGE corners to real GPS coords.
// Replace with your actual building coords after calibration.
const DEFAULT_BOUNDS = {
  topLeft:  { lat: 14.5110, lon: 121.0170 },
  botRight: { lat: 14.5060, lon: 121.0220 },
};

function getSavedBounds() {
  try {
    const raw = localStorage.getItem(LS_BOUNDS);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_BOUNDS;
}

// ── Default dot positions per floor ──────────────────────────────────────────
const DEFAULTS = [
  { fx: 0.45, fy: 0.58 },
  { fx: 0.45, fy: 0.58 },
  { fx: 0.50, fy: 0.35 },
];

function getSavedPos(i) {
  try {
    const raw = localStorage.getItem(LS_POS(i));
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULTS[i];
}

function gpsToFraction(lat, lon, bounds) {
  const fx = (lon - bounds.topLeft.lon) / (bounds.botRight.lon - bounds.topLeft.lon);
  const fy = (bounds.topLeft.lat - lat) / (bounds.topLeft.lat - bounds.botRight.lat);
  return {
    fx: Math.max(0, Math.min(1, fx)),
    fy: Math.max(0, Math.min(1, fy)),
  };
}

const FLOORS = [
  { id: 1, label: "Ground Floor", short: "G", image: floor1Img },
  { id: 2, label: "2nd Floor",    short: "2", image: floor2Img },
  { id: 3, label: "3rd Floor",    short: "3", image: floor3Img },
];

export { popularAirports, getAirportCoordinates } from "../../data/airports";
export const getFlightDistance = () => null;

// ── Hook: rendered image rect inside object-fit:contain ───────────────────────
function useImageRect(containerRef, imgRef) {
  const [rect, setRect] = useState(null);
  const compute = useCallback(() => {
    const c = containerRef.current, img = imgRef.current;
    if (!c || !img || !img.naturalWidth) return;
    const scale = Math.min(c.clientWidth / img.naturalWidth, c.clientHeight / img.naturalHeight);
    const rw = img.naturalWidth * scale, rh = img.naturalHeight * scale;
    setRect({ left: (c.clientWidth - rw) / 2, top: (c.clientHeight - rh) / 2, width: rw, height: rh });
  }, [containerRef, imgRef]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth) compute();
    else img.addEventListener("load", compute);
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => { img.removeEventListener("load", compute); ro.disconnect(); };
  }, [compute, containerRef, imgRef]);

  return rect;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NavigationModal() {
  const [floorIdx,    setFloorIdx]    = useState(0);
  const [positions,   setPositions]   = useState(() => FLOORS.map((_, i) => getSavedPos(i)));
  const [bounds,      setBounds]      = useState(getSavedBounds);
  const [gpsStatus,   setGpsStatus]   = useState("idle");
  const [accuracy,    setAccuracy]    = useState(null);
  const [rawGps,      setRawGps]      = useState(null);   // {lat, lon} live
  const [calibrating, setCalibrating] = useState(false);  // dot placement mode
  const [showGpsInfo, setShowGpsInfo] = useState(false);  // show raw coords panel

  const watchIdRef = useRef(null);
  const mapRef     = useRef(null);
  const imgRef     = useRef(null);
  const imgRectRef = useRef(null);
  const boundsRef  = useRef(bounds);

  const imgRect = useImageRect(mapRef, imgRef);
  useEffect(() => { imgRectRef.current = imgRect; }, [imgRect]);
  useEffect(() => { boundsRef.current  = bounds;  }, [bounds]);

  // ── GPS watch ─────────────────────────────────────────────────────────────
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus("unsupported"); return; }
    setGpsStatus("watching");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
        setAccuracy(Math.round(acc));
        setRawGps({ lat, lon });

        // Only move the dot from GPS when accuracy is good (≤30m)
        // and the coords are plausibly inside the building bounds
        if (acc <= 30) {
          const frac = gpsToFraction(lat, lon, boundsRef.current);
          // Only update if the fraction is within the image (not clamped to edge)
          if (frac.fx > 0.05 && frac.fx < 0.95 && frac.fy > 0.05 && frac.fy < 0.95) {
            setPositions((prev) => {
              const next = [...prev];
              next[0] = frac;
              return next;
            });
          }
        }
        // If accuracy is poor, dot stays at saved entrance — don't touch it
      },
      (err) => setGpsStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
  }, []);

  useEffect(() => {
    startGPS();
    return () => { if (watchIdRef.current != null) navigator.geolocation?.clearWatch(watchIdRef.current); };
  }, [startGPS]);

  // ── Tap-to-place dot ──────────────────────────────────────────────────────
  const handleMapClick = useCallback((e) => {
    if (!calibrating) return;
    const rect = imgRectRef.current;
    if (!rect) return;
    const box = mapRef.current.getBoundingClientRect();
    const pos = {
      fx: Math.max(0.01, Math.min(0.99, (e.clientX - box.left - rect.left) / rect.width)),
      fy: Math.max(0.01, Math.min(0.99, (e.clientY - box.top  - rect.top)  / rect.height)),
    };
    localStorage.setItem(LS_POS(floorIdx), JSON.stringify(pos));
    setPositions((prev) => { const n = [...prev]; n[floorIdx] = pos; return n; });
    setCalibrating(false);
  }, [calibrating, floorIdx]);

  const handleFloorChange = (i) => { setCalibrating(false); setFloorIdx(i); };

  // ── Indicator pixel position ──────────────────────────────────────────────
  const pos = positions[floorIdx];
  const indicatorStyle = imgRect
    ? { left: imgRect.left + pos.fx * imgRect.width, top: imgRect.top + pos.fy * imgRect.height }
    : { left: -999, top: -999 };

  const floor = FLOORS[floorIdx];

  return (
    <div className="nav-modal">

      {/* Floor tabs */}
      <div className="nav-floor-tabs">
        {FLOORS.map((f, i) => (
          <button key={f.id}
            className={`nav-floor-tab ${i === floorIdx ? "active" : ""}`}
            onClick={() => handleFloorChange(i)}
          >
            <span className="nav-floor-badge">{f.short}</span>
            <span className="nav-floor-label">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Map */}
      <div className={`nav-map-wrap ${calibrating ? "nav-calibrating" : ""}`}
        ref={mapRef} onClick={handleMapClick}>

        <img ref={imgRef} src={floor.image}
          alt={`${floor.label} floor plan`}
          className="nav-map-img" draggable={false} />

        {/* GPS accuracy pill — top-left */}
        <div className={`nav-gps-overlay ${gpsStatus}`}>
          <span className="nav-gps-dot" />
          {gpsStatus === "watching"    && `GPS ${accuracy != null ? `±${accuracy}m` : "…"}`}
          {gpsStatus === "idle"        && "Locating…"}
          {gpsStatus === "denied"      && "Location denied"}
          {gpsStatus === "unsupported" && "GPS unavailable"}
          {gpsStatus === "error"       && "GPS error"}
        </div>

        {/* North arrow — top-right */}
        <div className="nav-north">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <polygon points="12,2 16,14 12,11 8,14" fill="#00ffff" opacity="0.9"/>
            <polygon points="12,22 16,10 12,13 8,10" fill="#ffffff" opacity="0.35"/>
          </svg>
          <span>N</span>
        </div>

        {/* Raw GPS info panel — tap GPS pill to toggle */}
        {showGpsInfo && rawGps && (
          <div className="nav-gps-panel">
            <div className="nav-gps-panel-row">
              <span className="nav-gps-panel-label">Lat</span>
              <span className="nav-gps-panel-val">{rawGps.lat.toFixed(6)}</span>
            </div>
            <div className="nav-gps-panel-row">
              <span className="nav-gps-panel-label">Lon</span>
              <span className="nav-gps-panel-val">{rawGps.lon.toFixed(6)}</span>
            </div>
            <div className="nav-gps-panel-row">
              <span className="nav-gps-panel-label">Accuracy</span>
              <span className="nav-gps-panel-val">±{accuracy}m</span>
            </div>
            <div className="nav-gps-panel-hint">
              Use these coords to set building bounds
            </div>
          </div>
        )}

        {/* Calibration hint */}
        {calibrating && (
          <div className="nav-calibrate-hint">
            Tap anywhere on the map to place your dot
          </div>
        )}

        {/* Location dot */}
        <div className="nav-indicator" style={indicatorStyle}>
          <svg
            className="nav-pin"
            viewBox="0 0 24 32"
            width="28"
            height="36"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Drop shadow */}
            <ellipse cx="12" cy="31" rx="5" ry="2" fill="rgba(0,0,0,0.35)" />
            {/* Pin body */}
            <path
              d="M12 1 C6.477 1 2 5.477 2 11 C2 17.5 12 30 12 30 C12 30 22 17.5 22 11 C22 5.477 17.523 1 12 1 Z"
              fill="rgba(0,200,255,0.85)"
              stroke="#00ffff"
              strokeWidth="1.2"
              filter="url(#pin-glow)"
            />
            {/* Inner circle */}
            <circle cx="12" cy="11" r="4" fill="#fff" opacity="0.95" />
            <circle cx="12" cy="11" r="2.2" fill="#00ccff" />
            {/* Glow filter */}
            <defs>
              <filter id="pin-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>
        </div>

        {/* Bottom bar */}
        <div className="nav-bottom-bar">
          <div className="nav-you-overlay-inline"
            style={{ cursor: rawGps ? "pointer" : "default" }}
            onClick={(e) => { e.stopPropagation(); if (rawGps) setShowGpsInfo(v => !v); }}
          >
            {floorIdx === 0
              ? accuracy != null && accuracy <= 30
                ? "📍 Live tracking"
                : "📍 Entrance"
              : `📍 ${floor.label}`}
          </div>

          <button
            className={`nav-set-entrance-btn ${calibrating ? "active" : ""}`}
            onClick={(e) => { e.stopPropagation(); setCalibrating(v => !v); }}
          >
            {calibrating ? "✕ Cancel" : "📍 Set Position"}
          </button>
        </div>
      </div>
    </div>
  );
}
