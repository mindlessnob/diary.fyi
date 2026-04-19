import * as React from "react";

interface YearStats {
  year:        number;
  totalFilms:  number;
  totalHours:  number;
  avgRating:   string;
  rewatches:   number;
  topDirectors: [string, number][];
  topGenres:    [string, number][];
  topCountry:   string;
  monthCounts:  number[];
  firstFilm:   { title: string; poster: string; date: string } | null;
  lastFilm:    { title: string; poster: string; date: string } | null;
}

interface Props {
  stats:      YearStats;
  username?:  string;
  siteUrl?:   string;
  yearLabel?: string;
}

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CARD_W = 540;
const CARD_H = 960;

function fmt(n: number) { return n.toLocaleString(); }

export default function YearStoryCard({ stats, username, siteUrl = "moonboxd.vercel.app", yearLabel }: Props) {
  const displayLabel = yearLabel ?? String(stats.year);
  const isAllTime    = displayLabel === "All Time";

  const peakIdx   = stats.monthCounts.indexOf(Math.max(...stats.monthCounts));
  const peakCount = stats.monthCounts[peakIdx];
  const barMax    = peakCount || 1;

  const topDir    = stats.topDirectors[0];
  const topGenre  = stats.topGenres[0];

  return (
    <div style={{
      width:         CARD_W,
      height:        CARD_H,
      background:    "#0e0e0e",
      fontFamily:    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      display:       "flex",
      flexDirection: "column",
      position:      "relative",
      overflow:      "hidden",
    }}>
      {/* Background glows */}
      <div style={{ position:"absolute", top:-150, left:"50%", transform:"translateX(-50%)", width:600, height:500, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(46,170,220,0.08) 0%, transparent 65%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:-60, right:-60, width:360, height:360, borderRadius:"50%", background:"radial-gradient(ellipse, rgba(232,130,161,0.06) 0%, transparent 65%)", pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:1, padding:"52px 40px 36px", display:"flex", flexDirection:"column", height:"100%" }}>

        {/* ── Section label + year ── */}
        <div style={{ marginBottom:6 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.2em", color:"rgba(255,255,255,0.28)", marginBottom:8 }}>
            Year in Film
          </div>
          <div style={{ fontSize: isAllTime ? 46 : 68, fontWeight:800, letterSpacing:"-0.05em", lineHeight:1, color:"#ffffff" }}>
            {displayLabel}
          </div>
          {username && (
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.3)", fontWeight:500, marginTop:6 }}>
              @{username}
            </div>
          )}
        </div>

        {/* ── Narrative opening ── */}
        <p style={{ margin:"24px 0 0", fontSize:28, fontWeight:800, lineHeight:1.22, letterSpacing:"-0.025em", color:"#ffffff" }}>
          {isAllTime ? (
            <>
              Logged{" "}
              <span style={{ color:"var(--accent)" }}>{fmt(stats.totalFilms)} films</span>
              {" "}—{" "}
              <span style={{ color:"rgba(255,255,255,0.6)", fontWeight:600, fontSize:24 }}>
                {fmt(stats.totalHours)} hours averaging{" "}
                <span style={{ color:"#6ee7b7" }}>★ {stats.avgRating}.</span>
              </span>
            </>
          ) : (
            <>
              <span style={{ color:"var(--accent)" }}>{fmt(stats.totalFilms)} films</span>
              {" "}logged in{" "}
              <span style={{ color:"var(--accent)" }}>{displayLabel}</span>
              {" "}—{" "}
              <span style={{ color:"rgba(255,255,255,0.6)", fontWeight:600, fontSize:24 }}>
                {fmt(stats.totalHours)} hrs, averaging{" "}
                <span style={{ color:"#6ee7b7" }}>★ {stats.avgRating}.</span>
              </span>
            </>
          )}
        </p>

        {/* ── Monthly bar chart ── */}
        <div style={{ marginTop:28 }}>
          <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:"rgba(255,255,255,0.22)", marginBottom:10 }}>
            Monthly Activity · Peak: <span style={{ color:"#2eaadc" }}>{MONTHS_FULL[peakIdx]}</span> ({peakCount})
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:56 }}>
            {stats.monthCounts.map((c, i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{
                  width:"100%",
                  height: c > 0 ? `${Math.max(6, Math.round((c / barMax) * 44))}px` : "3px",
                  borderRadius:3,
                  background: i === peakIdx ? "#2eaadc" : c > 0 ? "rgba(46,170,220,0.50)" : "rgba(255,255,255,0.07)",
                }} />
                <div style={{ fontSize:7, color:"rgba(255,255,255,0.2)" }}>{MONTHS_SHORT[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Directors + Genres leaderboards ── */}
        <div style={{ marginTop:22, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[
            { label:"Top Directors", data: stats.topDirectors.slice(0,4) },
            { label:"Top Genres",    data: stats.topGenres.slice(0,4)    },
          ].map(({ label, data }) => (
            <div key={label}>
              <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", color:"rgba(255,255,255,0.22)", marginBottom:10 }}>
                {label}
              </div>
              {data.map(([name, cnt], i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom: i < data.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{
                    fontSize: i === 0 ? 13 : 12,
                    fontWeight: i === 0 ? 700 : 500,
                    color: i === 0 ? "#ffffff" : "rgba(255,255,255,0.4)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"78%",
                  }}>
                    {i === 0 && <span style={{ color:"#2eaadc", marginRight:4 }}>①</span>}
                    {name}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color: i === 0 ? "#2eaadc" : "rgba(255,255,255,0.22)", flexShrink:0 }}>{fmt(cnt)}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Closing narrative line ── */}
        <p style={{ margin:"20px 0 0", fontSize:17, fontWeight:600, lineHeight:1.4, letterSpacing:"-0.01em", color:"rgba(255,255,255,0.32)" }}>
          {topGenre?.[0]} dominated the screen
          {topDir ? <>, led by <span style={{ color:"rgba(255,255,255,0.55)", fontWeight:700 }}>{topDir[0]}</span></> : ""}.
          {stats.rewatches > 0 && (
            <span> {Math.round((stats.rewatches / stats.totalFilms) * 100)}% were rewatches.</span>
          )}
        </p>

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* ── First / Last film ── */}
        {(stats.firstFilm || stats.lastFilm) && (
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.07)", paddingTop:18, display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { label: isAllTime ? "First film ever"   : "Started with",       film: stats.firstFilm },
              { label: isAllTime ? "Most recent film"  : "Last film of year",   film: stats.lastFilm  },
            ].map(({ label, film }, fi) => (
              <div key={fi} style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:34, flexShrink:0, aspectRatio:"2/3", borderRadius:5, overflow:"hidden", background:"#1a1a1a", border:"1px solid rgba(255,255,255,0.08)" }}>
                  {film?.poster && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={film.poster} alt={film.title} crossOrigin="anonymous" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  )}
                </div>
                <div style={{ overflow:"hidden" }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,0.22)", marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#ffffff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:170 }}>
                    {film?.title ?? "—"}
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:2 }}>{film?.date ?? ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:16, fontSize:10, color:"rgba(255,255,255,0.14)", letterSpacing:"0.04em" }}>
          {siteUrl}
        </div>

      </div>
    </div>
  );
}
