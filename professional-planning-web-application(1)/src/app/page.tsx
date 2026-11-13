import Image from "next/image";
import AppShell from "@/components/app-shell";

export default function Page() {
  return (
    <>
      {/* ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950"
      >
        <Image
          src="/images/aurora.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="aurora-img object-cover opacity-55"
        />
        <div className="aurora-overlay absolute inset-0 bg-gradient-to-b from-ink-950/55 via-ink-950/80 to-ink-950/95" />
        <div className="absolute -top-32 right-1/4 size-[480px] animate-float-slow rounded-full bg-teal-300/8 blur-[130px]" />
        <div className="absolute bottom-0 left-0 size-[420px] rounded-full bg-violet-400/10 blur-[130px]" />
        <div className="bg-noise absolute inset-0 opacity-25 mix-blend-overlay" />
      </div>

      <AppShell />
    </>
  );
}
