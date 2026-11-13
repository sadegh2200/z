"use client";

import { MousePointer2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  blockMinutes,
  catOf,
  faClock,
  WEEKDAY_FA,
  type Block,
} from "@/lib/core";

const SNAP = 5;
const snap5 = (m: number) => Math.round(m / SNAP) * SNAP;

/**
 * نوار روز لمسی — الگوی دقیق نسخه‌ی ۱٫۰:
 * کشیدن روی فضای خالی = ساخت بلوک · کشیدن بدنه‌ی بلوک = جابه‌جایی (گام ۵ دقیقه)
 */
export function DragDayEditor({
  day,
  blocks,
  onCreate,
  onMove,
}: {
  day: number;
  blocks: Block[];
  onCreate: (fromMin: number, toMin: number) => void;
  onMove: (id: number, fromMin: number, toMin: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    mode: "create" | "move";
    id?: number;
    anchor: number;
    grabOffset: number;
    len: number;
    moved: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<{
    id: number | "new";
    from: number;
    to: number;
  } | null>(null);

  const dayBlocks = blocks
    .filter((b) => b.active && b.day === day)
    .sort((a, b) => a.fromMin - b.fromMin);

  function minFromEvent(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = (rect.right - clientX) / rect.width; // راست = ۰۰:۰۰ (RTL)
    return Math.min(1440, Math.max(0, ratio * 1440));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    track.setPointerCapture(e.pointerId);
    const m = minFromEvent(e.clientX);
    const hit = (e.target as HTMLElement).closest<HTMLElement>("[data-bid]");
    if (hit) {
      const b = dayBlocks.find((x) => x.id === Number(hit.dataset.bid));
      if (!b) return;
      dragRef.current = {
        mode: "move",
        id: b.id,
        anchor: m,
        grabOffset: m - b.fromMin,
        len: blockMinutes(b),
        moved: false,
      };
    } else {
      dragRef.current = {
        mode: "create",
        anchor: snap5(m),
        grabOffset: 0,
        len: 0,
        moved: false,
      };
      setPreview({ id: "new", from: snap5(m), to: snap5(m) + 30 });
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    const m = minFromEvent(e.clientX);
    if (Math.abs(m - d.anchor) > SNAP / 2) d.moved = true;
    if (d.mode === "create") {
      const from = Math.min(d.anchor, snap5(m));
      const to = Math.max(d.anchor, snap5(m));
      setPreview({ id: "new", from, to: Math.max(to, from + SNAP) });
    } else if (d.id !== undefined) {
      const from = Math.min(1440 - d.len, Math.max(0, snap5(m - d.grabOffset)));
      setPreview({ id: d.id, from, to: from + d.len });
    }
  }

  function commit() {
    const d = dragRef.current;
    const p = preview;
    dragRef.current = null;
    setPreview(null);
    if (!d || !d.moved || !p) return;
    if (p.id === "new") {
      const len = p.to - p.from;
      if (len >= 10) onCreate(p.from, p.to);
    } else {
      onMove(p.id, p.from, p.to);
    }
  }

  const blockStyle = (b: Block) => {
    const p = preview && preview.id === b.id ? preview : null;
    const from = p ? p.from : b.fromMin;
    const to = p ? p.to : b.toMin;
    const startPct = (from / 1440) * 100;
    const widthPct = (Math.max(10, to - from) / 1440) * 100;
    return { insetInlineStart: `${startPct}%`, width: `${Math.max(1.4, widthPct)}%` };
  };

  return (
    <div className="mb-4 rounded-2xl border border-dashed border-white/12 bg-white/[0.015] p-3">
      <div className="mb-2.5 flex items-center gap-2 text-[10px] font-bold text-stone-500">
        <MousePointer2 className="size-3.5" />
        نوار لمسی {WEEKDAY_FA[day]}: بکش تا بسازی · بدنه‌ی بلوک را بکش تا جابه‌جا شود
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={commit}
        onPointerCancel={commit}
        className="relative h-20 touch-none select-none overflow-hidden rounded-xl border border-white/8 bg-black/30"
        style={{ cursor: "crosshair" }}
      >
        {/* نیمه‌رنگ روز/شب */}
        <div className="absolute inset-y-0 bg-white/[0.045]" style={{ insetInlineStart: "25%", width: "50%" }} />
        {/* خطوط ساعت */}
        {[6, 12, 18].map((h) => (
          <div
            key={h}
            className="absolute inset-y-0 border-e border-white/8"
            style={{ insetInlineStart: `${(h / 24) * 100}%` }}
          />
        ))}

        {/* بلوک‌ها */}
        {dayBlocks.map((b) => {
          const c = catOf(b.cat);
          const dragging = preview?.id === b.id;
          const from = (preview && preview.id === b.id ? preview.from : b.fromMin);
          const to = (preview && preview.id === b.id ? preview.to : b.toMin);
          const wide = to - from >= 150;
          return (
            <div
              key={b.id}
              data-bid={b.id}
              className="absolute inset-y-1.5 flex items-center justify-center rounded-lg transition-shadow"
              style={{
                ...blockStyle(b),
                background: `linear-gradient(160deg, ${c.fg}d9, ${c.ink})`,
                cursor: "grab",
                opacity: dragging ? 0.85 : 0.8,
                boxShadow: dragging ? `0 0 0 2px ${c.fg}, 0 8px 24px -8px ${c.fg}88` : undefined,
                zIndex: dragging ? 10 : 1,
              }}
            >
              {wide ? (
                <span className="pointer-events-none truncate px-1 text-[9px] font-extrabold text-ink-950">
                  {b.title || b.cat}
                </span>
              ) : null}
            </div>
          );
        })}

        {/* پیش‌نمای ساخت */}
        {preview?.id === "new" ? (
          <div
            className="absolute inset-y-1.5 rounded-lg border-2 border-dashed border-teal-300/70 bg-teal-300/15"
            style={{
              insetInlineStart: `${(preview.from / 1440) * 100}%`,
              width: `${(Math.max(10, preview.to - preview.from) / 1440) * 100}%`,
              zIndex: 5,
            }}
          />
        ) : null}

        {/* برچسب زمان پیش‌نما */}
        {preview ? (
          <div
            className="absolute -top-0 z-20 rounded-lg bg-ink-950/90 px-2 py-1 text-[10px] font-black tabular-nums text-teal-200 ring-1 ring-teal-300/40"
            style={{
              insetInlineStart: `${Math.min(80, (preview.from / 1440) * 100)}%`,
            }}
          >
            {faClock(preview.from)} ← {faClock(preview.to)}
          </div>
        ) : null}
      </div>

      <div className="mt-1.5 flex justify-between text-[9px] font-bold text-stone-600">
        <span>۰۰</span><span>۰۶</span><span>۱۲</span><span>۱۸</span><span>۲۴</span>
      </div>
    </div>
  );
}
