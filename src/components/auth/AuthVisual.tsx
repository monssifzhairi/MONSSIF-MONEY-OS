/**
 * Editorial ink panel for auth screens — oversized display headline,
 * financial ledger artwork, and a small demo-data note. Original artwork;
 * no borrowed branding.
 */

import { LedgerArtwork, Wordmark } from '../ui/Brand';

export function AuthVisual() {
  return (
    <aside className="auth-art-side">
      <Wordmark tone="light" />

      <div className="auth-display">
        <div className="auth-kicker">Moroccan dirham · private by default</div>
        <h2 className="auth-headline">
          Every dirham,
          <br />
          <em>accounted for.</em>
        </h2>
        <p className="auth-lede">
          A quiet, precise money operating system: one balance you can trust, a living ledger,
          and goals that stay honest — built around the MAD.
        </p>
        <div className="auth-points">
          <div className="auth-point">
            <span className="tick" aria-hidden="true">
              ✓
            </span>
            Balance = 300 MAD opening + income − expenses. Opening is initialized only once.
          </div>
          <div className="auth-point">
            <span className="tick" aria-hidden="true">
              ✓
            </span>
            Your records are private: row-level security scopes every row to your account.
          </div>
          <div className="auth-point">
            <span className="tick" aria-hidden="true">
              ✓
            </span>
            Authenticated by Supabase — the interface never fakes a session.
          </div>
        </div>
      </div>

      <div className="auth-footline">
        <span>MONSSIF MONEY OS</span>
        <span aria-hidden="true">—</span>
        <span>Ledger Ivory edition</span>
      </div>

      <LedgerArtwork />
    </aside>
  );
}
