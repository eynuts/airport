// ── Web Bluetooth smartwatch hook ────────────────────────────────────────────
// Connects to a BLE device that exposes the standard Heart Rate Service (0x180D).
// Most fitness bands and smartwatches support this profile.
//
// Returns:
//   { status, device, heartRate, connect, disconnect }
//   status: 'idle' | 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'unsupported' | 'error'

import { useState, useRef, useCallback } from "react";

// Standard BLE UUIDs
const HR_SERVICE        = 0x180D;
const HR_MEASUREMENT    = 0x2A37;
const BATTERY_SERVICE   = 0x180F;
const BATTERY_LEVEL     = 0x2A19;
const DEVICE_INFO       = 0x180A;

export function useBluetooth() {
  const [status,    setStatus]    = useState("idle");
  const [device,    setDevice]    = useState(null);   // { name, id }
  const [heartRate, setHeartRate] = useState(null);   // bpm number
  const [battery,   setBattery]   = useState(null);   // 0-100
  const [error,     setError]     = useState(null);

  const gattRef      = useRef(null);
  const hrCharRef    = useRef(null);

  // Parse Heart Rate Measurement characteristic value
  // Spec: https://www.bluetooth.com/specifications/specs/heart-rate-service-1-0/
  const parseHR = (value) => {
    const flags = value.getUint8(0);
    const is16bit = flags & 0x01;
    return is16bit ? value.getUint16(1, true) : value.getUint8(1);
  };

  const disconnect = useCallback(() => {
    if (hrCharRef.current) {
      try { hrCharRef.current.stopNotifications(); } catch (_) {}
      hrCharRef.current = null;
    }
    if (gattRef.current?.connected) {
      gattRef.current.disconnect();
    }
    gattRef.current = null;
    setStatus("disconnected");
    setHeartRate(null);
    setBattery(null);
  }, []);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setStatus("unsupported");
      setError("Web Bluetooth is not supported in this browser. Use Chrome or Edge.");
      return;
    }

    setStatus("scanning");
    setError(null);

    try {
      // Request any device that has the Heart Rate service
      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HR_SERVICE] }],
        optionalServices: [BATTERY_SERVICE, DEVICE_INFO],
      });

      setStatus("connecting");
      setDevice({ name: btDevice.name || "Unknown Device", id: btDevice.id });

      btDevice.addEventListener("gattserverdisconnected", () => {
        setStatus("disconnected");
        setHeartRate(null);
        setBattery(null);
      });

      const gatt = await btDevice.gatt.connect();
      gattRef.current = gatt;

      // ── Heart Rate ──────────────────────────────────────────────────────
      const hrService = await gatt.getPrimaryService(HR_SERVICE);
      const hrChar    = await hrService.getCharacteristic(HR_MEASUREMENT);
      hrCharRef.current = hrChar;

      hrChar.addEventListener("characteristicvaluechanged", (e) => {
        setHeartRate(parseHR(e.target.value));
      });
      await hrChar.startNotifications();

      // ── Battery (optional) ──────────────────────────────────────────────
      try {
        const batService = await gatt.getPrimaryService(BATTERY_SERVICE);
        const batChar    = await batService.getCharacteristic(BATTERY_LEVEL);
        const batVal     = await batChar.readValue();
        setBattery(batVal.getUint8(0));

        batChar.addEventListener("characteristicvaluechanged", (e) => {
          setBattery(e.target.value.getUint8(0));
        });
        await batChar.startNotifications();
      } catch (_) {
        // Battery service not available on this device — that's fine
      }

      setStatus("connected");
    } catch (err) {
      if (err.name === "NotFoundError") {
        // User cancelled the picker
        setStatus("idle");
      } else {
        setStatus("error");
        setError(err.message);
      }
    }
  }, []);

  return { status, device, heartRate, battery, error, connect, disconnect };
}
