"use client";

import { useEffect, useRef, useState } from "react";
import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { decodeJson, encodeJson, TOPIC } from "@/lib/live/protocol";

type Caption = { identity: string; name: string; text: string; at: number };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function captionsSupported() {
  return typeof window !== "undefined" && getRecognition() !== null;
}

/**
 * Live captions. When the host enables captions, every participant whose
 * browser supports speech recognition transcribes their own microphone while
 * it's on, and shares the text with the room. Captions display for 6 seconds.
 */
export function useLiveCaptions(enabled: boolean) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [captions, setCaptions] = useState<Caption[]>([]);
  const { send } = useDataChannel(TOPIC.caption, (msg) => {
    const data = decodeJson<{ text: string }>(msg.payload);
    if (!data || !msg.from) return;
    upsert({ identity: msg.from.identity, name: msg.from.name || msg.from.identity, text: data.text, at: Date.now() });
  });
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  function upsert(c: Caption) {
    setCaptions((list) => [...list.filter((x) => x.identity !== c.identity), c].slice(-3));
  }

  // Expire old captions.
  useEffect(() => {
    if (!enabled) return;
    const handle = window.setInterval(() => setCaptions((list) => list.filter((c) => Date.now() - c.at < 6000)), 1000);
    return () => window.clearInterval(handle);
  }, [enabled]);

  // Transcribe my own mic while it is on.
  useEffect(() => {
    if (!enabled || !isMicrophoneEnabled) return;
    const recognition = getRecognition();
    if (!recognition) return;
    let stopped = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-IN";
    recognition.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      text = text.trim();
      if (!text) return;
      upsert({ identity: localParticipant.identity, name: "You", text, at: Date.now() });
      void sendRef.current(encodeJson({ text }), { reliable: false }).catch(() => undefined);
    };
    recognition.onend = () => {
      if (!stopped) {
        try {
          recognition.start();
        } catch {
          /* already started */
        }
      }
    };
    try {
      recognition.start();
    } catch {
      /* ignore */
    }
    return () => {
      stopped = true;
      recognition.stop();
    };
  }, [enabled, isMicrophoneEnabled, localParticipant.identity]);

  return enabled ? captions : [];
}
