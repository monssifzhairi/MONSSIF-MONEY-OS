/**
 * Immersive left pane for auth screens: editorial typography plus a
 * distinctive financial visualization (pure CSS/SVG — a rising balance curve
 * with milestone nodes and floating stat chips). Animations respect
 * `prefers-reduced-motion` via CSS.
 */

export function AuthVisual({
  mode = 'auth',
}: {
  mode?: 'auth' | 'welcome';
}) {
  return (
    <aside className={mode === 'welcome' ? 'welcome-visual' : 'auth-visual'}>
      <div className="auth-brand">
        <div className="brand-mark">M</div>
        <div>
          <div className="brand-word">MONSSIF MONEY OS</div>
          <div className="brand-sub">Private finance · MAD</div>
        </div>
      </div>

      <div className="auth-hero">
        {mode === 'welcome' ? (
          <>
            <h1 className="auth-hero-title">
              Your capital,
              <br />
              <em>preserved.</em>
              <br />
              Your income, built.
            </h1>
            <p className="auth-hero-sub">
              A private financial operating system for Morocco — track every dirham, protect
              your savings, and move toward 1,000 MAD with real numbers only. Planned income
              is never counted as earned.
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-hero-title">
              Every dirham,
              <br />
              <em>accounted for.</em>
            </h1>
            <p className="auth-hero-sub">
              Sign in to your private financial OS. Your records are encrypted in transit,
              scoped to your account, and never shared.
            </p>
          </>
        )}

        <div className="auth-hero-points">
          <div className="auth-hero-point">
            <span className="tick" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            Opening balance stored once — 300 MAD, never duplicated
          </div>
          <div className="auth-hero-point">
            <span className="tick" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            Row Level Security: only you can read your records
          </div>
          <div className="auth-hero-point">
            <span className="tick" aria-hidden="true">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            Goal progress from real balance — zero speculation
          </div>
        </div>
      </div>

      {/* Floating stat chips */}
      <div className="auth-float-chip auth-chip-1" aria-hidden="true">
        <span className="k">Target</span>
        <span className="v">
          1,000 <em>MAD</em>
        </span>
      </div>
      <div className="auth-float-chip auth-chip-2" aria-hidden="true">
        <span className="k">Started at</span>
        <span className="v">300 MAD</span>
      </div>
      <div className="auth-float-chip auth-chip-3" aria-hidden="true">
        <span className="k">Discipline</span>
        <span className="v">
          <em>Real data</em> only
        </span>
      </div>

      {/* Animated financial curve */}
      <div className="auth-art" aria-hidden="true">
        <svg viewBox="0 0 800 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="curveStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0fa97c" stopOpacity="0.25" />
              <stop offset="55%" stopColor="#2dd4a0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#2dd4a0" />
            </linearGradient>
            <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4a0" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#2dd4a0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* baseline grid */}
          <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
            <line x1="0" y1="80" x2="800" y2="80" />
            <line x1="0" y1="160" x2="800" y2="160" />
            <line x1="0" y1="240" x2="800" y2="240" />
          </g>

          {/* compounding balance curve */}
          <path
            d="M0 292 C 90 288, 150 276, 210 252 C 280 224, 330 208, 400 186 C 480 160, 530 118, 610 88 C 680 62, 740 48, 800 40 L 800 320 L 0 320 Z"
            fill="url(#curveFill)"
          />
          <path
            className="curve"
            d="M0 292 C 90 288, 150 276, 210 252 C 280 224, 330 208, 400 186 C 480 160, 530 118, 610 88 C 680 62, 740 48, 800 40"
            fill="none"
            stroke="url(#curveStroke)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* milestone nodes: 300 start → 1,000 target */}
          <g>
            <circle className="node" style={{ animationDelay: '1.1s' }} cx="210" cy="252" r="5.5" fill="#0a0c0e" stroke="#2dd4a0" strokeWidth="2" />
            <circle className="node" style={{ animationDelay: '1.35s' }} cx="400" cy="186" r="5.5" fill="#0a0c0e" stroke="#2dd4a0" strokeWidth="2" />
            <circle className="node" style={{ animationDelay: '1.6s' }} cx="610" cy="88" r="7" fill="#2dd4a0" />
            <circle cx="610" cy="88" r="13" fill="none" stroke="rgba(45,212,160,0.35)" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    </aside>
  );
}
