"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDataChannel, useRoomContext } from "@livekit/components-react";
import { Download, Eraser, Pen, Trash2, X } from "lucide-react";
import { decodeJson, encodeJson, TOPIC } from "@/lib/live/protocol";

type Stroke = { id: string; color: string; width: number; points: [number, number][] };
type WbMessage = { type: "stroke"; stroke: Stroke } | { type: "clear" } | { type: "sync"; strokes: Stroke[] };

const COLORS = ["#17212b", "#c0392b", "#1f6feb", "#0b7a50", "#d97706"];
const ERASER = "#ffffff";

/**
 * Shared whiteboard. Strokes are stored with 0–1 coordinates so every screen
 * size renders the same drawing. Late joiners ask for a sync; the host answers.
 * Strokes are kept while the board is closed, so reopening shows the drawing.
 */
export function useWhiteboardState(isHost: boolean) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>([]);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  const { send } = useDataChannel(TOPIC.whiteboard, (msg) => {
    const data = decodeJson<WbMessage>(msg.payload);
    if (!data) return;
    if (data.type === "stroke") setStrokes((s) => (s.some((x) => x.id === data.stroke.id) ? s : [...s, data.stroke]));
    else if (data.type === "clear") setStrokes([]);
    else if (data.type === "sync") setStrokes((s) => (s.length >= data.strokes.length ? s : data.strokes));
  });

  const { send: sendSyncRequest } = useDataChannel(TOPIC.whiteboardSyncRequest, async () => {
    if (!isHost || strokesRef.current.length === 0) return;
    // Send in chunks to stay under data-packet size limits.
    for (let i = 0; i < strokesRef.current.length; i += 25) {
      await send(encodeJson({ type: "sync", strokes: strokesRef.current.slice(0, i + 25) }), { reliable: true });
    }
  });

  useEffect(() => {
    if (!isHost) void sendSyncRequest(encodeJson({}), { reliable: true }).catch(() => undefined);
  }, [isHost, sendSyncRequest]);

  const addStroke = useCallback(
    (stroke: Stroke) => {
      setStrokes((s) => [...s, stroke]);
      void send(encodeJson({ type: "stroke", stroke }), { reliable: true }).catch(() => undefined);
    },
    [send],
  );
  const clear = useCallback(() => {
    setStrokes([]);
    void send(encodeJson({ type: "clear" }), { reliable: true }).catch(() => undefined);
  }, [send]);

  return { strokes, addStroke, clear };
}

export function Whiteboard({
  strokes,
  onStroke,
  onClear,
  onClose,
  canClear,
}: {
  strokes: Stroke[];
  onStroke: (s: Stroke) => void;
  onClear: () => void;
  onClose: () => void;
  canClear: boolean;
}) {
  const room = useRoomContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drawing = useRef<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [eraser, setEraser] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = box.getBoundingClientRect();
    if (canvas.width !== Math.round(width * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = drawing.current ? [...strokes, drawing.current] : strokes;
    for (const s of all) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * (width / 1000);
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * width, y * height) : ctx.lineTo(x * width, y * height)));
      ctx.stroke();
    }
  }, [strokes]);

  useEffect(() => {
    redraw();
    const observer = new ResizeObserver(redraw);
    if (boxRef.current) observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, [redraw]);

  function point(e: React.PointerEvent): [number, number] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
  }

  function download() {
    const a = document.createElement("a");
    a.href = canvasRef.current!.toDataURL("image/png");
    a.download = `whiteboard-${room.name}.png`;
    a.click();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-3 py-2">
        <span className="mr-1 text-sm font-semibold text-zinc-800">Whiteboard</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Pen colour ${c}`}
            onClick={() => {
              setColor(c);
              setEraser(false);
            }}
            className={`h-6 w-6 rounded-full border-2 ${color === c && !eraser ? "border-zinc-900" : "border-white ring-1 ring-zinc-300"}`}
            style={{ background: c }}
          />
        ))}
        <button type="button" onClick={() => setEraser(false)} className={`lc-wb-tool ${!eraser ? "is-active" : ""}`} aria-label="Pen">
          <Pen size={15} />
        </button>
        <button type="button" onClick={() => setEraser(true)} className={`lc-wb-tool ${eraser ? "is-active" : ""}`} aria-label="Eraser">
          <Eraser size={15} />
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={download} className="lc-wb-tool" aria-label="Download as image">
            <Download size={15} />
          </button>
          {canClear && (
            <button type="button" onClick={onClear} className="lc-wb-tool" aria-label="Clear board for everyone">
              <Trash2 size={15} />
            </button>
          )}
          <button type="button" onClick={onClose} className="lc-wb-tool" aria-label="Close whiteboard">
            <X size={15} />
          </button>
        </div>
      </div>
      <div ref={boxRef} className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor: eraser ? "cell" : "crosshair" }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drawing.current = {
              id: `${room.localParticipant.identity}-${Date.now()}`,
              color: eraser ? ERASER : color,
              width: eraser ? 28 : 4,
              points: [point(e)],
            };
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            drawing.current.points.push(point(e));
            redraw();
          }}
          onPointerUp={() => {
            if (drawing.current && drawing.current.points.length > 0) onStroke(drawing.current);
            drawing.current = null;
          }}
        />
      </div>
    </div>
  );
}
