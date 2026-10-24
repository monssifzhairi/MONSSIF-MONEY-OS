/**
 * MONSSIF MONEY OS — original brand system.
 *
 * The mark is a geometric “rising ledger”: three ascending bars over a
 * baseline inside a softly rounded tile — a financial motif, not an emoji
 * and not borrowed from any other company’s identity.
 */

export function Mark({ size = 34, tone = 'ink' }: { size?: number; tone?: 'ink' | 'light' }) {
  const stroke = tone === 'ink' ? '#0C1712' : '#F2EEE4';
  const bar = tone === 'ink' ? '#1B9E5B' : '#4FCC84';
  return (
    <svg
      className="mark"
      width={size}
      height={size}
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden="true"
      style={{ width: size, height: size }}
    >
      <rect x="0.5" y="0.5" width="33" height="33" rx="9.5" stroke={stroke} strokeOpacity={tone === 'ink' ? 0.22 : 0.3} />
      <rect x="8" y="18.5" width="3.6" height="7" rx="1.4" fill={stroke} fillOpacity="0.55" />
      <rect x="15.2" y="13.5" width="3.6" height="12" rx="1.4" fill={stroke} fillOpacity="0.75" />
      <rect x="22.4" y="8" width="3.6" height="17.5" rx="1.4" fill={bar} />
      <path d="M7 27.5H27" stroke={stroke} strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ tone = 'ink' }: { tone?: 'ink' | 'light' }) {
  return (
    <span className={`wordmark${tone === 'light' ? ' on-ink' : ''}`}>
      <Mark tone={tone === 'light' ? 'light' : 'ink'} />
      <span className="wordmark-words">
        <span className="wordmark-name">MONSSIF</span>
        <span className="wordmark-sub">Money OS</span>
      </span>
    </span>
  );
}

/** Decorative ledger-motif artwork for editorial auth panels (original). */
export function LedgerArtwork() {
  return (
    <svg className="auth-artwork" viewBox="0 0 560 380" fill="none" aria-hidden="true">
      <g opacity="0.5">
        {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((y) => (
          <line key={y} x1="0" y1={y + 30} x2="560" y2={y + 30} stroke="#F2EEE4" strokeOpacity="0.07" strokeWidth="1" />
        ))}
      </g>
      <g>
        <rect x="40" y="230" width="34" height="110" rx="10" fill="#F2EEE4" fillOpacity="0.1" />
        <rect x="100" y="180" width="34" height="160" rx="10" fill="#F2EEE4" fillOpacity="0.13" />
        <rect x="160" y="205" width="34" height="135" rx="10" fill="#F2EEE4" fillOpacity="0.11" />
        <rect x="220" y="120" width="34" height="220" rx="10" fill="#4FCC84" fillOpacity="0.22" />
        <rect x="280" y="150" width="34" height="190" rx="10" fill="#F2EEE4" fillOpacity="0.13" />
        <rect x="340" y="78" width="34" height="262" rx="10" fill="#4FCC84" fillOpacity="0.32" />
        <rect x="400" y="110" width="34" height="230" rx="10" fill="#F2EEE4" fillOpacity="0.12" />
        <rect x="460" y="48" width="34" height="292" rx="10" fill="#4FCC84" fillOpacity="0.42" />
      </g>
      <path
        d="M57 222 C 120 200, 150 195, 177 196 S 250 108, 297 138 S 370 66, 417 98 S 480 40, 490 38"
        stroke="#4FCC84"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="490" cy="38" r="7" fill="#4FCC84" fillOpacity="0.8" />
      <line x1="20" y1="342" x2="520" y2="342" stroke="#F2EEE4" strokeOpacity="0.16" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
