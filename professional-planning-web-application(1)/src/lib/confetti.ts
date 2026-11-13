"use client";

/** جشن سبک بدون کتابخانه: بارش ذره‌ای از مرکز، خودکار پاک می‌شود. */
export function fireConfetti() {
  if (typeof document === "undefined") return;
  const canvas = document.createElement("canvas");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:90";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const colors = ["#5EEAD4", "#C4B5FD", "#F0ABFC", "#FBBF24", "#7DD3FC"];
  const W = window.innerWidth;
  const H = window.innerHeight;
  const parts = Array.from({ length: 110 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const speed = 7 + Math.random() * 8;
    return {
      x: W / 2 + (Math.random() - 0.5) * 120,
      y: H * 0.62,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      ttl: 70 + Math.random() * 40,
    };
  });

  const t0 = performance.now();
  function frame(t: number) {
    const elapsed = t - t0;
    ctx!.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.life += 1;
      if (p.life > p.ttl) continue;
      alive = true;
      p.vy += 0.22;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const fade = 1 - p.life / p.ttl;
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rot);
      ctx!.globalAlpha = Math.max(0, fade);
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx!.restore();
    }
    if (alive && elapsed < 2200) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
