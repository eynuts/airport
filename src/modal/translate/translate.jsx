import { useState, useEffect, useRef, useCallback } from "react";
import { Mic } from "lucide-react";
import "./translate.css";
import { SUPPORTED_LANGUAGES } from "../settings/settings";

export default function TranslateModal({ targetLang, setTargetLang, t }) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLang, setSourceLang] = useState("English");
  const [autoDetect, setAutoDetect] = useState(true);
  const [detectedLang, setDetectedLang] = useState(null);

  const translateSocketRef = useRef(null);
  const translateStreamRef = useRef(null);
  const translateAudioContextRef = useRef(null);
  const translateProcessorRef = useRef(null);
  const translateTimerRef = useRef(null);

  // Cleanup all translate resources on unmount
  useEffect(() => {
    return () => {
      if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
      if (translateSocketRef.current) {
        if (translateSocketRef.current.readyState === WebSocket.OPEN) {
          translateSocketRef.current.send(
            JSON.stringify({ type: "Terminate" }),
          );
        }
        translateSocketRef.current.close();
      }
      if (translateProcessorRef.current) {
        translateProcessorRef.current.disconnect();
      }
      if (translateStreamRef.current) {
        translateStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (translateAudioContextRef.current) {
        translateAudioContextRef.current.close();
      }
    };
  }, []);

  const translateText = useCallback(async (text, target, source = null) => {
    if (!text.trim()) return { translation: "", detectedLang: null };
    try {
      let prompt;
      if (source) {
        prompt = `Translate "${text}" from ${source} to ${target}. Reply with only the ${target} translation, no explanations.`;
      } else {
        prompt = `Detect the source language of the following text, then translate it to ${target}.\nText: "${text}"\nReply ONLY in this exact format, nothing else:\nDETECTED: [detected language name]\nTRANSLATION: [translated text only]`;
      }

      const response = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Translation API error:", response.status, errorData);
        return {
          translation: `Translation failed (${response.status})`,
          detectedLang: null,
        };
      }

      const data = await response.json();
      const rawText = data.text?.trim() || "Translation failed";

      if (source) {
        let translation = rawText;
        if (translation.startsWith('"')) translation = translation.slice(1);
        if (translation.endsWith('"')) translation = translation.slice(0, -1);
        return { translation: translation.trim(), detectedLang: null };
      } else {
        const detectedMatch = rawText.match(/DETECTED:\s*(.+)/i);
        const translationMatch = rawText.match(/TRANSLATION:\s*([\s\S]+)/i);
        let translation = translationMatch
          ? translationMatch[1].trim()
          : rawText;
        if (translation.startsWith('"')) translation = translation.slice(1);
        if (translation.endsWith('"')) translation = translation.slice(0, -1);
        const detected = detectedMatch ? detectedMatch[1].trim() : null;
        return { translation: translation.trim(), detectedLang: detected };
      }
    } catch (error) {
      console.error("Translation error:", error);
      return {
        translation: "Translation error: " + error.message,
        detectedLang: null,
      };
    }
  }, []);

  const stopTranslating = () => {
    setIsTranslating(false);
    if (translateTimerRef.current) clearTimeout(translateTimerRef.current);

    if (translateSocketRef.current) {
      if (translateSocketRef.current.readyState === WebSocket.OPEN) {
        translateSocketRef.current.send(JSON.stringify({ type: "Terminate" }));
      }
      translateSocketRef.current.close();
      translateSocketRef.current = null;
    }
    if (translateProcessorRef.current) {
      translateProcessorRef.current.disconnect();
      translateProcessorRef.current = null;
    }
    if (translateStreamRef.current) {
      translateStreamRef.current.getTracks().forEach((track) => track.stop());
      translateStreamRef.current = null;
    }
    if (translateAudioContextRef.current) {
      translateAudioContextRef.current.close();
      translateAudioContextRef.current = null;
    }
  };

  const startTranslating = async () => {
    if (isTranslating) return;

    setIsTranslating(true);
    setSourceText("");
    setTranslatedText("");
    setDetectedLang(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      translateStreamRef.current = stream;

      const socket = new WebSocket("ws://localhost:5000/stream");
      translateSocketRef.current = socket;

      socket.onmessage = async (message) => {
        const text =
          message.data instanceof Blob
            ? await message.data.text()
            : message.data;
        const res = JSON.parse(text);

        if (res.type === "Turn" && res.turn_is_formatted) {
          const transcript = res.transcript || "";
          if (transcript) {
            setSourceText(transcript);
            if (translateTimerRef.current)
              clearTimeout(translateTimerRef.current);
            translateTimerRef.current = setTimeout(async () => {
              setTranslatedText(t("TRANSLATING"));
              const source = autoDetect ? null : sourceLang;
              const { translation, detectedLang: detected } =
                await translateText(transcript, targetLang, source);
              setTranslatedText(translation);
              if (detected) setDetectedLang(detected);
            }, 1000);
          }
        }
      };

      socket.onerror = () => stopTranslating();

      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )({ sampleRate: 16000 });
      translateAudioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      translateProcessorRef.current = processor;
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
    } catch (err) {
      console.error("Error starting translation:", err);
      stopTranslating();
    }
  };

  const playTranslation = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      const langConfig = SUPPORTED_LANGUAGES.find(
        (l) => l.name === targetLang,
      );
      utterance.lang = langConfig ? langConfig.code : "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  return (
    <div className="translate-modal">
      {/* Header with Speak Button */}
      <div className="translate-header">
        <button
          className={`translate-speak-btn ${isTranslating ? "active" : ""}`}
          onClick={isTranslating ? stopTranslating : startTranslating}
        >
          <Mic size={20} strokeWidth={2.5} />
          <span>
            {isTranslating ? t("STOP_RECORDING") : t("SPEAK_BUTTON")}
          </span>
        </button>
      </div>

      {/* Conversation Display */}
      <div className="translate-conversation">
        <div className="translate-message-group">
          <div className="translate-label">{t("YOU_LABEL")}</div>
          <div className="translate-text-box source">
            <p className="translate-text">
              {sourceText ? `"${sourceText}"` : t("CLICK_SPEAK_HINT")}
            </p>
          </div>
        </div>

        <div className="translate-arrow">→</div>

        <div className="translate-message-group">
          <div className="translate-label">{targetLang} Translation</div>
          <div className="translate-text-box translation">
            <p className="translate-text">
              {translatedText || t("TRANSLATION_HERE")}
            </p>
            {translatedText && (
              <button
                className="audio-playback-btn"
                title="Play audio"
                onClick={() => playTranslation(translatedText)}
              >
                <span className="audio-icon">🔊</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="translate-divider" />

      {/* Language Selection */}
      <div className="translate-language-section">
        <div className="language-display">
          {autoDetect ? (
            <div className="language-select source auto-mode">
              {detectedLang ? (
                <>
                  <span className="detected-indicator">✦</span> {detectedLang}
                </>
              ) : (
                <span className="auto-detect-placeholder">
                  {t("AUTO_DETECT")}
                </span>
              )}
            </div>
          ) : (
            <select
              className="language-select source"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={`source-${lang.name}`} value={lang.name}>
                  {lang.name}
                </option>
              ))}
            </select>
          )}

          <button
            className="language-arrow-btn"
            onClick={swapLanguages}
            title="Swap languages"
            disabled={autoDetect}
          >
            <span className="language-arrow">⇄</span>
          </button>

          <select
            className="language-select target"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={`target-${lang.name}`} value={lang.name}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <label className="auto-detect-toggle">
          <input
            type="checkbox"
            checked={autoDetect}
            onChange={(e) => {
              setAutoDetect(e.target.checked);
              if (!e.target.checked) setDetectedLang(null);
            }}
          />
          <span className="toggle-label">{t("AUTO_DETECT")}</span>
        </label>
      </div>

      {/* Features Section */}
      <div className="translate-features">
        <div className="features-title">{t("FEATURES_TITLE")}</div>
        <ul className="features-list">
          <li>{t("REAL_TIME_FEATURE")}</li>
          <li>{t("TEXT_VOICE_FEATURE")}</li>
        </ul>
        <div className="inspired-note">
          <span className="inspired-label">{t("INSPIRED_BY")}</span>
          <span className="inspired-value">Google Translate</span>
        </div>
      </div>
    </div>
  );
}
