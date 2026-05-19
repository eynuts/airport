import "./local-tips.css";

const TIPS = [
  {
    icon: "🎨",
    title: "Art District",
    desc: "Explore vibrant murals and galleries in the local art quarter.",
  },
  {
    icon: "🏙️",
    title: "City Views",
    desc: "Best viewpoints for panoramic skyline shots day and night.",
  },
  {
    icon: "🍜",
    title: "Local Cuisine",
    desc: "Must-try street food stalls and hidden restaurant gems nearby.",
  },
  {
    icon: "🛕",
    title: "Cultural Sites",
    desc: "Historic landmarks and heritage sites within walking distance.",
  },
];

export default function LocalTipsModal({ t }) {
  return (
    <div className="local-tips-modal">
      <p className="local-tips-intro">
        Discover the best of the city — art, views, food, and culture, all
        curated for travellers passing through.
      </p>

      <div className="local-tips-grid">
        {TIPS.map((tip) => (
          <div key={tip.title} className="local-tip-card">
            <div className="local-tip-icon">{tip.icon}</div>
            <div className="local-tip-title">{tip.title}</div>
            <p className="local-tip-desc">{tip.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
