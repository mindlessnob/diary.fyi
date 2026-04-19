"use client";

import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from "recharts";

export interface FilmStatsData {
  slug: string;
  title: string;
  year: number | null;
  runtime: number;
  decade: string | null;
  languages: string[];
  countries: string[];
  genres: string[];
  directors: string[];
  actors: string[];
  rating: number | null;
  watchedDate: string;
  isRewatch: boolean;
}

interface Props { movies: FilmStatsData[] }

const ACCENT = "#4da6ff";
const GOLD   = "#e5b94b";
const PINK   = "#e882a1";
const GREEN  = "#6ee7b7";

const ERAS = [
  { label: "All Years",     test: (_: number) => true },
  { label: "Pre-1930",      test: (y: number) => y < 1930 },
  { label: "1930–1959",     test: (y: number) => y >= 1930 && y < 1960 },
  { label: "1960–1979",     test: (y: number) => y >= 1960 && y < 1980 },
  { label: "1980–1999",     test: (y: number) => y >= 1980 && y < 2000 },
  { label: "2000–2009",     test: (y: number) => y >= 2000 && y < 2010 },
  { label: "2010–2019",     test: (y: number) => y >= 2010 && y < 2020 },
  { label: "2020–Present",  test: (y: number) => y >= 2020 },
];

const getTopN = (d: Record<string, number>, n: number): [string, number][] =>
  Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, n);

type DrillTarget = { 
  name: string; 
  type: "director" | "actor" | "genre" | "country" | "year" | "runtime" | "rating";
};

export default function StatsDashboard({ movies }: Props) {
  const [filterEra,   setFilterEra]   = useState("All Years");
  const [filterGenre, setFilterGenre] = useState("All Genres");
  const [drill, setDrill]             = useState<DrillTarget | null>(null);

  const genreOptions = useMemo(() => {
    const s = new Set<string>();
    movies.forEach(m => m.genres.forEach(g => s.add(g)));
    return ["All Genres", ...Array.from(s).sort()];
  }, [movies]);

  const activeMovies = useMemo(() => {
    let r = movies;
    const era = ERAS.find(e => e.label === filterEra);
    if (era && filterEra !== "All Years") r = r.filter(m => m.year != null && era.test(m.year));
    if (filterGenre !== "All Genres")    r = r.filter(m => m.genres.includes(filterGenre));
    return r;
  }, [movies, filterEra, filterGenre]);

  const stats = useMemo(() => {
    let totalRuntime = 0, englishCount = 0, foreignCount = 0;
    const releaseYears: Record<string, number> = {};
    const countries:    Record<string, number> = {};
    const genres:       Record<string, number> = {};
    const directors:    Record<string, number> = {};
    const actors:       Record<string, number> = {};
    const runtimes = { "< 90m": 0, "90–120m": 0, "120–150m": 0, "> 150m": 0 };
    const ratings: Record<string, number> = {
      "0.5★":0,"1★":0,"1.5★":0,"2★":0,"2.5★":0,"3★":0,"3.5★":0,"4★":0,"4.5★":0,"5★":0
    };
    // avg rating per genre
    const genreRatingSum: Record<string, number> = {};
    const genreRatingCount: Record<string, number> = {};

    activeMovies.forEach(m => {
      totalRuntime += m.runtime || 0;
      if (m.runtime > 0) {
        if      (m.runtime < 90)   runtimes["< 90m"]++;
        else if (m.runtime <= 120) runtimes["90–120m"]++;
        else if (m.runtime <= 150) runtimes["120–150m"]++;
        else                       runtimes["> 150m"]++;
      }
      if (m.languages.length > 0) {
        if (m.languages.includes("English")) englishCount++; else foreignCount++;
      }
      if (m.year) releaseYears[String(m.year)] = (releaseYears[String(m.year)] || 0) + 1;
      m.countries.forEach(c => countries[c] = (countries[c] || 0) + 1);
      m.genres.forEach(g    => {
        genres[g] = (genres[g] || 0) + 1;
        if (m.rating) {
          genreRatingSum[g]   = (genreRatingSum[g]   || 0) + m.rating;
          genreRatingCount[g] = (genreRatingCount[g] || 0) + 1;
        }
      });
      m.directors.forEach(d => directors[d] = (directors[d] || 0) + 1);
      m.actors.forEach(a    => actors[a]    = (actors[a]    || 0) + 1);
      const kmap: Record<string, string> = {
        "0.5":"0.5★","1":"1★","1.5":"1.5★","2":"2★","2.5":"2.5★",
        "3":"3★","3.5":"3.5★","4":"4★","4.5":"4.5★","5":"5★"
      };
      if (m.rating) { const k = kmap[String(m.rating)]; if (k) ratings[k]++; }
    });

    // avg rating per genre — top 8 by count, min 5 rated films
    const avgRatingByGenre = Object.entries(genreRatingCount)
      .filter(([, cnt]) => cnt >= 5)
      .map(([g, cnt]) => ({ name: g, avg: Math.round((genreRatingSum[g] / cnt) * 100) / 100, cnt }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);

    return {
      totalFilms: activeMovies.length,
      totalHours: Math.round(totalRuntime / 60),
      totalDays:  (totalRuntime / 60 / 24).toFixed(1),
      releaseYearsData: Object.entries(releaseYears).sort((a,b)=>+a[0]-+b[0]).map(([name,count])=>({name,count})),
      runtimeData:      Object.entries(runtimes).map(([name,count])=>({name,count})),
      ratingsData:      Object.entries(ratings).map(([name,count])=>({name,count})),
      avgRatingByGenre,
      langData: [
        { name:"English", value:englishCount, fill:ACCENT },
        { name:"Foreign",  value:foreignCount,  fill:GOLD  },
      ],
      foreignPct: activeMovies.length > 0 ? Math.round((foreignCount / activeMovies.length)*100) : 0,
      topGenres:    getTopN(genres,    6),
      topDirs:      getTopN(directors, 8),
      topActors:    getTopN(actors,    8),
      topCountries: getTopN(countries, 6),
    };
  }, [activeMovies]);

  // Drill-down films
  const drillFilms = useMemo(() => {
    if (!drill) return [];
    let r: FilmStatsData[];
    if (drill.type === "director")  r = activeMovies.filter(m => m.directors.includes(drill.name));
    else if (drill.type === "actor") r = activeMovies.filter(m => m.actors.includes(drill.name));
    else if (drill.type === "genre") r = activeMovies.filter(m => m.genres.includes(drill.name));
    else if (drill.type === "country") r = activeMovies.filter(m => m.countries.includes(drill.name));
    else if (drill.type === "year")  r = activeMovies.filter(m => String(m.year) === drill.name);
    else if (drill.type === "runtime") {
      r = activeMovies.filter(m => {
        if (drill.name === "< 90m")   return m.runtime > 0 && m.runtime < 90;
        if (drill.name === "90–90–120m") return m.runtime >= 90 && m.runtime <= 120;
        if (drill.name === "120–150m") return m.runtime > 120 && m.runtime <= 150;
        return m.runtime > 150;
      });
    } else {
      // rating — e.g. "3.5★"
      const rv = parseFloat(drill.name);
      r = activeMovies.filter(m => m.rating === rv);
    }
    return r.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  }, [drill, activeMovies]);

  const toggleDrill = (name: string, type: DrillTarget["type"]) =>
    setDrill(prev => (prev?.name === name && prev.type === type) ? null : { name, type });

  const SAMPLE_SIZE = 24;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <style>{`
        .stats-ctrl { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
        .stats-ctrl-filters { display:flex; gap:8px; flex-wrap:wrap; }
        .stats-row1 { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
        .stats-row2 { display:grid; grid-template-columns:180px repeat(4,1fr); gap:10px; }
        @media(max-width:900px) {
          .stats-row1 { grid-template-columns:repeat(2,1fr); }
          .stats-row2 { grid-template-columns:repeat(2,1fr); }
        }
        @media(max-width:540px) {
          .stats-row1 { grid-template-columns:1fr; }
          .stats-row2 { grid-template-columns:1fr; }
          .stats-ctrl { flex-direction:column; align-items:flex-start; }
        }
      `}</style>

      {/* ── Control bar ──────────────────────────────────────────── */}
      <div className="stats-ctrl" style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:8, padding:"14px 20px"
      }}>
        <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
          <Hero label="Films Watched" value={`${stats.totalFilms.toLocaleString()}`} />
          <Hero label="Watch Time" value={`${stats.totalHours.toLocaleString()} hrs`} />
          {drill && <Hero label="Filtered Subset" value={`${drillFilms.length} films — ${drill.name}`} />}
        </div>
        <div className="stats-ctrl-filters">
          <Sel value={filterEra}   options={ERAS.map(e=>e.label)} onChange={v=>{setFilterEra(v);  setDrill(null);}} />
          <Sel value={filterGenre} options={genreOptions}          onChange={v=>{setFilterGenre(v);setDrill(null);}} />
        </div>
      </div>

      {/* ── ROW 1: 4 charts ──────────────────────────────────────── */}
      <div className="stats-row1">

        {/* Release Years bar */}
        <ChartCard title="Release Years">
          <BarChart data={stats.releaseYearsData} margin={{ top:4, right:4, left:-20, bottom:20 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fontSize:9, fill:"var(--text-3)" }} minTickGap={28} angle={-40} textAnchor="end" dy={4} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize:9, fill:"var(--text-3)" }} width={28} />
            <Tooltip {...tip()} />
            <Bar dataKey="count" radius={[2,2,0,0]} fill={ACCENT} />
          </BarChart>
        </ChartCard>

        {/* Runtime buckets */}
        <ChartCard title="Runtime Buckets">
          <BarChart data={stats.runtimeData} margin={{ top:4, right:4, left:-20, bottom:20 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fontSize:9, fill:"var(--text-3)" }} dy={6} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize:9, fill:"var(--text-3)" }} width={32} />
            <Tooltip {...tip()} itemStyle={{ color:PINK }} />
            <Bar dataKey="count" radius={[2,2,0,0]} fill={PINK} />
          </BarChart>
        </ChartCard>

        {/* Star distribution */}
        <ChartCard title="Star Distribution">
          <BarChart data={stats.ratingsData} margin={{ top:4, right:4, left:-20, bottom:20 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false}
              tick={{ fontSize:9, fill:"var(--text-3)" }} dy={6} interval={1} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize:9, fill:"var(--text-3)" }} width={28} />
            <Tooltip {...tip()} itemStyle={{ color:GOLD }} />
            <Bar dataKey="count" radius={[2,2,0,0]} fill={GOLD} />
          </BarChart>
        </ChartCard>

        {/* Avg Rating by Genre */}
        <ChartCard title="Avg ★ by Genre">
          <BarChart
            data={stats.avgRatingByGenre}
            layout="vertical"
            margin={{ top:4, right:32, left:4, bottom:4 }}
          >
            <XAxis type="number" domain={[0, 5]} axisLine={false} tickLine={false}
              tick={{ fontSize:10, fill:"var(--text-3)" }} tickCount={6} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false}
              tick={{ fontSize:10, fill:"var(--text-3)" }} width={72} />
            <Tooltip
              cursor={{ fill:"rgba(255,255,255,0.03)" }}
              contentStyle={{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, fontSize:12, color:"var(--text)" }}
              formatter={(v: unknown) => [`${Number(v).toFixed(2)}★ avg`, ""]}
            />
            <Bar dataKey="avg" radius={[0,2,2,0]}>
              {stats.avgRatingByGenre.map((d, i) => (
                <Cell key={i} fill={GREEN} fillOpacity={0.5 + (d.avg / 5) * 0.5} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

      </div>

      {/* ── ROW 2: Language donut + 4 lists ──────────────────────── */}
      <div className="stats-row2">

        {/* Language donut */}
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"12px 14px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          <p style={headingStyle}>Languages</p>
          <div style={{ position:"relative", width:"100%", height:110, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.langData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={28} outerRadius={44} stroke="none">
                  {stats.langData.map((d,i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, fontSize:11, color:"var(--text)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position:"absolute", display:"flex", flexDirection:"column", alignItems:"center", pointerEvents:"none" }}>
              <span style={{ fontSize:13, fontWeight:700, color:"var(--text)", lineHeight:1 }}>{stats.foreignPct}%</span>
              <span style={{ fontSize:8, color:"var(--text-3)", marginTop:1 }}>Foreign</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3, marginTop:6, width:"100%" }}>
            <Dot color={ACCENT} label={`English  ${stats.langData[0].value}`} />
            <Dot color={GOLD}   label={`Foreign   ${stats.langData[1].value}`} />
          </div>
        </div>

        {/* Genres */}
        <ListCard title="Top Genres">
          {stats.topGenres.map(([g,c],i) =>
            <ClickableBarRow key={g} rank={i+1} label={g} value={c} max={stats.topGenres[0][1]}
              color={ACCENT} active={drill?.name===g && drill.type==="genre"}
              onClick={() => toggleDrill(g, "genre")} />
          )}
        </ListCard>

        {/* Directors */}
        <ListCard title="Top Directors">
          {stats.topDirs.map(([d,c],i) =>
            <ClickRow key={d} rank={i+1} label={d} value={c} last={i===stats.topDirs.length-1}
              active={drill?.name===d && drill.type==="director"}
              onClick={() => toggleDrill(d, "director")} />
          )}
        </ListCard>

        {/* Cast */}
        <ListCard title="Top Cast">
          {stats.topActors.map(([a,c],i) =>
            <ClickRow key={a} rank={i+1} label={a} value={c} last={i===stats.topActors.length-1}
              active={drill?.name===a && drill.type==="actor"}
              onClick={() => toggleDrill(a, "actor")} />
          )}
        </ListCard>

        {/* Countries */}
        <ListCard title="World Map">
          {stats.topCountries.map(([c,n],i) =>
            <ClickRow key={c} rank={i+1} label={c} value={n} last={i===stats.topCountries.length-1}
              active={drill?.name===c && drill.type==="country"}
              onClick={() => toggleDrill(c, "country")} />
          )}
        </ListCard>

      </div>

      {/* ── Drill-down panel ─────────────────────────────────────── */}
      {drill && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"14px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <p style={{ fontSize:13, fontWeight:600, color:"var(--text)" }}>
              {drill.name}
              <span style={{ color:"var(--accent)", marginLeft:8 }}>{drillFilms.length} film{drillFilms.length!==1?"s":""}</span>
              {drillFilms.length > SAMPLE_SIZE &&
                <span style={{ fontSize:10, color:"var(--text-3)", marginLeft:8 }}>
                  — showing {SAMPLE_SIZE} of {drillFilms.length}
                </span>
              }
            </p>
            <button onClick={() => setDrill(null)}
              style={{ fontSize:11, color:"var(--text-3)", background:"none", border:"none", cursor:"pointer" }}>
              ✕ close
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", gap:6 }}>
            {drillFilms.slice(0, SAMPLE_SIZE).map(m => (
              <div key={m.slug} style={{ background:"var(--surface-2)", borderRadius:6, padding:"8px 10px", border:"1px solid var(--border)" }}>
                <p style={{ fontSize:11, fontWeight:600, color:"var(--text)", lineHeight:1.3, marginBottom:2 }}>{m.title}</p>
                <p style={{ fontSize:10, color:"var(--text-3)" }}>
                  {m.year ?? "—"}
                  {m.rating ? ` · ${m.rating}★` : ""}
                  {m.runtime ? ` · ${m.runtime}m` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

/* ── tiny helpers ───────────────────────────────────────────────────── */

const headingStyle: React.CSSProperties = {
  fontSize:10, fontWeight:600, color:"var(--text-2)",
  textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4
};

const tip = () => ({
  cursor:{ fill:"rgba(255,255,255,0.03)" },
  contentStyle:{ background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:8, fontSize:11, color:"var(--text)" },
  itemStyle:{ color:ACCENT },
});

function Hero({ label, value }: { label:string; value:string }) {
  return (
    <div>
      <p style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", color:"var(--text-3)", fontWeight:600 }}>{label}</p>
      <p style={{ fontSize:18, fontWeight:700, color:"var(--text)", letterSpacing:"-0.02em", marginTop:2 }}>{value}</p>
    </div>
  );
}

function Sel({ value, options, onChange }: { value:string; options:string[]; onChange:(v:string)=>void }) {
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      background:"var(--bg)", border:"1px solid var(--border)", color:"var(--text)",
      padding:"4px 10px", borderRadius:4, fontSize:12, outline:"none", cursor:"pointer"
    }}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function ChartCard({ title, hint, children }: { title:string; hint?:string; children:React.ReactElement }) {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"14px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <p style={{ fontSize:11, fontWeight:600, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{title}</p>
        {hint && <span style={{ fontSize:9, color:"var(--text-3)", fontStyle:"italic" }}>({hint})</span>}
      </div>
      {/* Taller charts for 24" desktop */}
      <div style={{ width:"100%", height:180 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function ListCard({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:8, padding:"14px 16px" }}>
      <p style={{ ...headingStyle, marginBottom:12 }}>{title}</p>
      <div style={{ display:"flex", flexDirection:"column" }}>{children}</div>
    </div>
  );
}

function ClickableBarRow({ rank, label, value, max, color, active, onClick }:
  { rank:number; label:string; value:number; max:number; color:string; active:boolean; onClick:()=>void }) {
  const pct = Math.max(3, Math.round((value/max)*100));
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:6,
      marginBottom:6, width:"100%", background:"none", border:"none", cursor:"pointer", textAlign:"left", padding:0
    }}>
      <span className="mono" style={{ color:"var(--text-3)", width:14, textAlign:"right", fontSize:11, flexShrink:0 }}>{rank}</span>
      <div style={{ flex:1, position:"relative", height:22, display:"flex", alignItems:"center" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${pct}%`, background:color, opacity:active?0.4:0.18, borderRadius:3, transition:"opacity 0.15s" }} />
        <span style={{ position:"relative", zIndex:1, paddingLeft:7, color:active?"var(--accent)":"var(--text)", fontWeight:500, textOverflow:"ellipsis", overflow:"hidden", whiteSpace:"nowrap", fontSize:12 }}>{label}</span>
      </div>
      <span className="mono" style={{ color:"var(--text-2)", width:28, textAlign:"right", fontSize:11, flexShrink:0 }}>{value}</span>
    </button>
  );
}

function ClickRow({ rank, label, value, last, active, onClick }:
  { rank:number; label:string; value:number; last:boolean; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      paddingTop:4, paddingBottom:4, paddingLeft:0, paddingRight:0,
      // only use longhand — mixing borderBottom shorthand + borderBottomColor causes React warnings
      borderTopWidth:0, borderLeftWidth:0, borderRightWidth:0,
      borderBottomWidth: last ? 0 : 1,
      borderBottomStyle:"solid",
      borderBottomColor:"var(--border)",
      background:"none", cursor:"pointer", width:"100%",
    }}>
      <span style={{ display:"flex", alignItems:"center", gap:8, overflow:"hidden" }}>
        <span className="mono" style={{ color:"var(--text-3)", fontSize:10, flexShrink:0 }}>{rank}.</span>
        <span style={{ fontSize:11, color:active?"var(--accent)":"var(--text)", textOverflow:"ellipsis", overflow:"hidden", whiteSpace:"nowrap", fontWeight:500 }}>{label}</span>
      </span>
      <span className="mono" style={{ fontSize:10, color:"var(--text-2)", flexShrink:0, paddingLeft:8 }}>{value}</span>
    </button>
  );
}

function Dot({ color, label }: { color:string; label:string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <div style={{ width:7, height:7, borderRadius:"50%", background:color, flexShrink:0 }} />
      <span style={{ fontSize:10, color:"var(--text-3)" }}>{label}</span>
    </div>
  );
}
