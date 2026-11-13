"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  WEEKDAY_FA,
  catOf,
  todayKey,
  weekDayIndex,
  type Block,
  type Check,
  type NightWindow,
} from "@/lib/core";

/* هندسه: ۰۰:۰۰ بالای چرخ، ساعت‌گرد */
function polar(cx: number, cy: number, r: number, min: number): [number, number] {
  const a = (min / 1440) * Math.PI * 2 - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** قطاع حلقه‌ای بین دو دقیقه از روز */
function segPath(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  from: number,
  to: number,
): string {
  let span = to - from;
  if (span <= 0) span += 1440; // عبور از نیمه‌شب
  const large = span > 720 ? 1 : 0;
  const [x1, y1] = polar(cx, cy, rOut, from + 0.6);
  const [x2, y2] = polar(cx, cy, rOut, from + span - 0.6);
  const [x3, y3] = polar(cx, cy, rIn, from + span - 0.6);
  const [x4, y4] = polar(cx, cy, rIn, from + 0.6);
  return `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4} Z`;
}

export function Wheel({
  size = 520,
  mode,
  blocks,
  checks,
  night,
  selectedWd,
  onSelectWd,
  showMarks = true,
  theme = "nafs",
  wakeMin,
  homeBand,
  live = true,
  children,
}: {
  size?: number;
  /** week:۷ حلقه برای هفت روز · day: یک حلقه‌ی ۲۴ ساعته‌ی امروز */
  mode: "day" | "week";
  blocks: Block[];
  checks: Check[];
  night: NightWindow;
  selectedWd?: number;
  onSelectWd?: (wd: number) => void;
  /** خط‌کش ساعت (dialMarks) */
  showMarks?: boolean;
  /** nafs: زنده · calm: آرام‌تر */
  theme?: "nafs" | "calm";
  /** نشانگر ساعت بیداری روی چرخ روز */
  wakeMin?: number;
  /** نوار خانه‌ی نیمه‌رنگ (homeBand) */
  homeBand?: { from: number; to: number; days: number[] };
  live?: boolean;
  children?: ReactNode;
}) {
  const calm = theme === "calm";
  const homeFg = catOf("خانه").fg;
  const opBase = calm ? 0.68 : 1;
  const [hoveredWd, setHoveredWd] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const pad = size * 0.05;
  const centerR = size * 0.16;
  // عقربه‌ی «الان» — اگر live باشد هر ۴۵ ثانیه تازه می‌شود
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 45000);
    return () => clearInterval(t);
  }, [live]);
  const todayWd = weekDayIndex(todayKey());

  /* --------------------------------- day mode -------------------------------- */
  if (mode === "day") {
    const rOut = size / 2 - pad - size * 0.05;
    const rIn = centerR + size * 0.05;
    const dayBlocks = blocks.filter((b) => b.active && b.day === todayWd);
    return (
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
          {/* بستر روز/شب */}
          <path d={segPath(cx, cy, rOut, rIn, 360, 1080)} fill="rgba(255,255,255,0.035)" />
          <path d={segPath(cx, cy, rOut, rIn, 1080, 360)} fill="rgba(0,0,0,0.16)" />
          {/* پنجره‌ی شب */}
          <path d={segPath(cx, cy, rOut, rIn, night.from, night.to)} fill="rgba(239,212,160,0.09)" />
          {/* نوار خانه‌ی نیمه‌رنگ — فقط روزهای انتخابی */}
          {homeBand && homeBand.days.includes(todayWd) ? (
            <path d={segPath(cx, cy, rOut, rIn, homeBand.from, homeBand.to)} fill={homeFg} opacity={0.12} />
          ) : null}

          {/* خط‌کش ساعت (قابل خاموش از تنظیمات) */}
          {showMarks
            ? Array.from({ length: 24 }, (_, h) => {
                const big = h % 6 === 0;
                const [tx1, ty1] = polar(cx, cy, rOut + 3, h * 60);
                const [tx2, ty2] = polar(cx, cy, rOut + (big ? 12 : 7), h * 60);
                return (
                  <line
                    key={h}
                    x1={tx1}
                    y1={ty1}
                    x2={tx2}
                    y2={ty2}
                    stroke={big ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.14)"}
                    strokeWidth={big ? 1.4 : 1}
                  />
                );
              })
            : null}
          {showMarks
            ? [0, 6, 12, 18].map((h) => {
                const [lx, ly] = polar(cx, cy, rOut + 24, h * 60);
                return (
                  <text
                    key={h}
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={size * 0.026}
                    fontWeight={700}
                    fill="rgba(255,255,255,0.45)"
                  >
                    {h === 0 ? "۲۴" : h.toLocaleString("fa-IR")}
                  </text>
                );
              })
            : null}

          {/* نشانگر بیداری */}
          {wakeMin !== undefined && wakeMin !== null ? (
            <g>
              <line
                x1={polar(cx, cy, rOut + 2, wakeMin)[0]}
                y1={polar(cx, cy, rOut + 2, wakeMin)[1]}
                x2={polar(cx, cy, rOut + 14, wakeMin)[0]}
                y2={polar(cx, cy, rOut + 14, wakeMin)[1]}
                stroke="#FBBF24"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text
                x={polar(cx, cy, rOut + 26, wakeMin)[0]}
                y={polar(cx, cy, rOut + 26, wakeMin)[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.024}
                fontWeight={800}
                fill="#FBBF24"
              >
                بیدار
              </text>
            </g>
          ) : null}

          {/* بلوک‌ها */}
          {dayBlocks.map((b) => {
            const c = catOf(b.cat);
            // تعهدات خودکار: انجام‌شده پیش‌فرض است؛ فقط جا ریخت‌ها کم‌نور می‌شوند
            const missed = checks.some((x) => x.blockId === b.id && x.day === todayKey() && x.done === false);
            const isHome = b.cat === "خانه";
            return (
              <path
                key={b.id}
                d={segPath(cx, cy, rOut, rIn, b.fromMin, b.toMin)}
                fill={missed ? "#FB7185" : c.fg}
                opacity={(missed ? 0.3 : isHome ? 0.32 : 0.62) * opBase}
                stroke={missed ? "#FB7185" : "transparent"}
                strokeWidth={missed ? 1.5 : 0}
                style={missed ? undefined : { filter: `drop-shadow(0 0 5px ${c.fg}55)` }}
              />
            );
          })}

          {/* عقربه‌ی الان */}
          <NowHand cx={cx} cy={cy} from={centerR * 0.4} to={rOut + 8} min={nowMin} size={size} />

          {/* صفحه‌ی مرکزی */}
          <circle cx={cx} cy={cy} r={centerR} fill="rgba(10,10,18,0.72)" stroke="rgba(255,255,255,0.08)" />
        </svg>
        <div
          className="pointer-events-none absolute inset-0 grid place-items-center text-center"
          style={{ padding: size * 0.3 }}
        >
          <div className="pointer-events-auto">{children}</div>
        </div>
      </div>
    );
  }

  /* -------------------------------- week mode -------------------------------- */
  const gap = size * 0.006;
  const thick = (size / 2 - pad - centerR - 6 * gap - centerR * 0) / 7 - gap;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        {[0, 1, 2, 3, 4, 5, 6].map((wd) => {
          const rIn = centerR + size * 0.012 + wd * (thick + gap);
          const rOut = rIn + thick;
          const rings = blocks.filter((b) => b.active && b.day === wd);
          const isToday = wd === todayWd;
          const isFuture = wd > todayWd; // پرده‌ی «پیشِ رو»
          const isSelected = selectedWd === wd;
          const isHovered = hoveredWd === wd && !isSelected;
          return (
            <g key={wd} opacity={isFuture ? 0.28 : 1}>
              {/* بستر حلقه — زیر انگشت ضخیم‌تر می‌شود */}
              <circle
                cx={cx}
                cy={cy}
                r={(rIn + rOut) / 2}
                fill="none"
                stroke={
                  isSelected
                    ? "rgba(94,234,212,0.4)"
                    : isHovered
                      ? "rgba(94,234,212,0.22)"
                      : isToday
                        ? "rgba(94,234,212,0.18)"
                        : "rgba(255,255,255,0.045)"
                }
                strokeWidth={isHovered ? thick * 1.35 : thick}
                style={{ transition: "stroke-width 0.18s ease, stroke 0.18s ease" }}
              />
              {/* بستر روز/شب روی حلقه */}
              <path d={segPath(cx, cy, rOut, rIn, 360, 1080)} fill="rgba(255,255,255,0.028)" />
              {/* نوار خانه‌ی نیمه‌رنگ روی حلقه‌های انتخابی */}
              {homeBand && homeBand.days.includes(wd) ? (
                <path
                  d={segPath(cx, cy, rOut, rIn, homeBand.from, homeBand.to)}
                  fill={homeFg}
                  opacity={0.12}
                />
              ) : null}
              {/* بلوک‌ها */}
              {rings.map((b) => {
                const c = catOf(b.cat);
                const isHome = b.cat === "خانه";
                return (
                  <path
                    key={b.id}
                    d={segPath(cx, cy, rOut, rIn, b.fromMin, b.toMin)}
                    fill={c.fg}
                    opacity={(isHome ? 0.32 : 0.62) * (calm ? 0.8 : 1)}
                  />
                );
              })}
              {/* شناسه‌ی روز روی حلقه */}
              <text
                x={polar(cx, cy, (rIn + rOut) / 2, 720)[0] - thick / 2 - 7}
                y={polar(cx, cy, (rIn + rOut) / 2, 720)[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.021}
                fontWeight={isToday ? 900 : 600}
                fill={isToday ? "#5EEAD4" : "rgba(255,255,255,0.4)"}
              >
                {WEEKDAY_FA[wd].slice(0, 1)}
              </text>
              {/* ناحیه‌ی کلیک + هاور */}
              {onSelectWd ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={(rIn + rOut) / 2}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={thick + gap}
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onClick={() => onSelectWd(wd)}
                  onPointerEnter={() => setHoveredWd(wd)}
                  onPointerLeave={() => setHoveredWd(null)}
                >
                  <title>{WEEKDAY_FA[wd]}</title>
                </circle>
              ) : null}
            </g>
          );
        })}

        {/* عقربه‌ی الان تا حلقه‌ی امروز */}
        <NowHand
          cx={cx}
          cy={cy}
          from={centerR * 0.4}
          to={centerR + size * 0.012 + todayWd * (thick + gap) + thick + 4}
          min={nowMin}
          size={size}
        />

        <circle cx={cx} cy={cy} r={centerR} fill="rgba(10,10,18,0.72)" stroke="rgba(255,255,255,0.08)" />
      </svg>
      <div
        className="pointer-events-none absolute inset-0 grid place-items-center text-center"
        style={{ padding: size * 0.31 }}
      >
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
}

function NowHand({
  cx,
  cy,
  from,
  to,
  min,
  size,
}: {
  cx: number;
  cy: number;
  from: number;
  to: number;
  min: number;
  size: number;
}) {
  const [x1, y1] = polar(cx, cy, from, min);
  const [x2, y2] = polar(cx, cy, to, min);
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5EEAD4" strokeWidth={1.6} strokeLinecap="round" opacity={0.9} />
      <circle cx={x2} cy={y2} r={size * 0.008 + 2} fill="#5EEAD4" stroke="#07070d" strokeWidth={2} />
      <text
        x={polar(cx, cy, to + size * 0.035, min)[0]}
        y={polar(cx, cy, to + size * 0.035, min)[1]}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.022}
        fontWeight={800}
        fill="#5EEAD4"
      >
        الان
      </text>
    </g>
  );
}
