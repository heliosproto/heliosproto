import { cn } from "@/lib/utils";

type PasskeyCardProps = {
  className?: string;
  tilt?: { x: number; y: number };
};

/**
 * Bespoke mock passkey card for the hero. Credit-card-shape with watermelon
 * -to-punch gradient and a mint EMV-style chip. Tilt is driven from the hero
 * via mouse position so this stays a pure presentational component.
 */
export function PasskeyCard({ className, tilt }: PasskeyCardProps) {
  const transform = tilt
    ? `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(0)`
    : "rotateY(-8deg) rotateX(6deg)";

  return (
    <div
      className={cn("[perspective:1200px]", className)}
      style={{ perspective: "1200px" }}
      aria-hidden
    >
      <div
        className="relative aspect-[1.586/1] w-full max-w-sm rounded-3xl p-6 shadow-2xl transition-transform duration-200 ease-out helios-float"
        style={{
          transform,
          transformStyle: "preserve-3d",
          background:
            "linear-gradient(135deg, var(--watermelon) 0%, var(--punch) 55%, #c4356a 100%)",
          boxShadow:
            "0 30px 60px -20px color-mix(in oklch, var(--punch) 55%, transparent), 0 10px 30px -10px color-mix(in oklch, var(--watermelon) 40%, transparent)",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl opacity-50 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 55%)",
          }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.4))",
                }}
              />
              <span className="font-display text-xs font-semibold tracking-[0.2em] text-white">
                HELIOS
              </span>
            </div>
            <span className="font-mono text-[10px] font-medium tracking-widest text-white/70">
              SOROBAN &middot; TESTNET
            </span>
          </div>

          <div className="relative flex items-center">
            <div
              className="relative h-9 w-12 overflow-hidden rounded-md shadow-inner"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklch, var(--mint) 90%, white 10%), color-mix(in oklch, var(--mint) 70%, black 15%))",
              }}
            >
              <div className="absolute inset-x-1 top-1.5 h-[1.5px] bg-black/30" />
              <div className="absolute inset-x-1 top-3.5 h-[1.5px] bg-black/30" />
              <div className="absolute inset-x-1 top-5.5 h-[1.5px] bg-black/30" />
              <div className="absolute inset-y-1 left-5 w-[1.5px] bg-black/30" />
              <div
                className="absolute inset-y-0 w-6 bg-gradient-to-r from-transparent via-white/50 to-transparent helios-chip-shine"
                aria-hidden
              />
            </div>
            <span className="ml-3 font-display text-sm font-semibold text-white/90">
              Smart account
            </span>
          </div>

          <div>
            <div className="font-mono text-[11px] tracking-wider text-white/60">C-ADDRESS</div>
            <div className="mt-1 font-mono text-sm font-medium text-white sm:text-[15px]">
              CBXYZK...MR7Q4T
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
