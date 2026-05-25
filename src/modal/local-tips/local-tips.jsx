import { useEffect, useState, useRef } from "react";
import { API_BASE_URL } from "../../config";
import "./local-tips.css";

// Emoji map for common tip categories the AI might return
const CATEGORY_ICONS = {
  food: "🍜",
  cuisine: "🍜",
  restaurant: "🍽️",
  culture: "🛕",
  history: "🏛️",
  art: "🎨",
  museum: "🖼️",
  nature: "🌿",
  park: "🌳",
  beach: "🏖️",
  shopping: "🛍️",
  market: "🏪",
  nightlife: "🌃",
  transport: "🚇",
  safety: "🛡️",
  weather: "🌤️",
  language: "💬",
  currency: "💱",
  view: "🏙️",
  landmark: "📍",
  tip: "💡",
};

function getIcon(title = "", desc = "") {
  const text = (title + " " + desc).toLowerCase();
  for (const [keyword, icon] of Object.entries(CATEGORY_ICONS)) {
    if (text.includes(keyword)) return icon;
  }
  return "✨";
}

/**
 * Parse the AI response into an array of { icon, title, desc } objects.
 * The AI is prompted to return a numbered list like:
 *   1. **Title** — Description
 * but we handle plain lines too.
 */
function parseTips(raw) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tips = [];

  for (const line of lines) {
    // Strip leading number/bullet: "1.", "-", "*", "•"
    const stripped = line.replace(/^[\d]+\.\s*|^[-*•]\s*/, "").trim();
    if (!stripped) continue;

    // Try "**Title** — Desc" or "**Title**: Desc" or "Title — Desc" or "Title: Desc"
    const boldMatch = stripped.match(/^\*{1,2}(.+?)\*{1,2}[\s:—–-]+(.+)$/);
    const colonMatch = stripped.match(/^([^:—–-]{3,40})[:—–-]+\s*(.+)$/);

    if (boldMatch) {
      const title = boldMatch[1].trim();
      const desc = boldMatch[2].trim();
      tips.push({ icon: getIcon(title, desc), title, desc });
    } else if (colonMatch) {
      const title = colonMatch[1].trim();
      const desc = colonMatch[2].trim();
      tips.push({ icon: getIcon(title, desc), title, desc });
    } else if (stripped.length > 10) {
      // Fallback: treat the whole line as a description
      tips.push({ icon: "✨", title: "Tip", desc: stripped });
    }

    if (tips.length >= 6) break; // cap at 6 cards
  }

  return tips;
}

export default function LocalTipsModal({ selectedFlight, t }) {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [destination, setDestination] = useState(null);
  const fetchedFor = useRef(null); // avoid duplicate fetches

  useEffect(() => {
    const arrivalIata = selectedFlight?.arrival?.iata;
    const arrivalAirport = selectedFlight?.arrival?.airport;

    if (!arrivalIata && !arrivalAirport) {
      setTips([]);
      setDestination(null);
      return;
    }

    const destKey = arrivalIata || arrivalAirport;
    if (fetchedFor.current === destKey) return; // already fetched for this destination
    fetchedFor.current = destKey;

    const destLabel = arrivalAirport
      ? `${arrivalAirport}${arrivalIata ? ` (${arrivalIata})` : ""}`
      : arrivalIata;

    setDestination(destLabel);
    setLoading(true);
    setError(null);
    setTips([]);

    const prompt = `You are a knowledgeable travel guide. A traveller is flying to ${destLabel}.
Give them exactly 4 to 6 local tips about this destination. Cover a mix of: food, culture, landmarks, practical advice, and hidden gems.
Format each tip on its own line as:
**Tip Title** — One or two sentence description.
Do not add any intro or outro text, just the numbered list.`;

    fetch(`${API_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const parsed = parseTips(data.text || "");
        if (parsed.length === 0) throw new Error("Could not parse tips.");
        setTips(parsed);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedFlight]);

  // No flight selected
  if (!selectedFlight?.arrival?.iata && !selectedFlight?.arrival?.airport) {
    return (
      <div className="local-tips-modal">
        <p className="local-tips-intro">
          Select a flight in Settings and local tips for your destination will
          appear here, powered by AI.
        </p>
        <div className="local-tips-empty">
          <span className="local-tips-empty-icon">✈️</span>
          <span>No destination selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="local-tips-modal">
      <p className="local-tips-intro">
        {loading
          ? `Generating tips for ${destination}…`
          : error
            ? "Could not load tips. Please try again."
            : `AI-curated tips for your destination: ${destination}`}
      </p>

      {loading && (
        <div className="local-tips-loading">
          <div className="local-tips-spinner" />
          <span>Asking AI for local insights…</span>
        </div>
      )}

      {error && !loading && (
        <div className="local-tips-error">⚠️ {error}</div>
      )}

      {!loading && tips.length > 0 && (
        <div className="local-tips-grid">
          {tips.map((tip, i) => (
            <div key={i} className="local-tip-card">
              <div className="local-tip-icon">{tip.icon}</div>
              <div className="local-tip-title">{tip.title}</div>
              <p className="local-tip-desc">{tip.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
