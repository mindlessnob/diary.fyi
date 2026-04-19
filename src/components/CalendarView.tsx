"use client";

import { Movie } from "@/lib/parseRss";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths,
  format, isWithinInterval, isBefore, isAfter,
} from "date-fns";
import { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { InstagramIcon } from "./InstagramIcon";
import DayCell from "./DayCell";
import StoryModal from "./StoryModal";
import MonthStoryCard from "./story/MonthStoryCard";

interface CalendarViewProps {
  movies: Movie[];
  username: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function moviesForDate(movies: Movie[], date: Date): Movie[] {
  const key = format(date, "yyyy-MM-dd");
  return movies.filter((m) => m.watchedDate === key);
}

function moviesForMonth(movies: Movie[], month: Date): Movie[] {
  const start = startOfMonth(month);
  const end   = endOfMonth(month);
  return movies.filter((m) => {
    const d = new Date(m.watchedDate + "T00:00:00");
    return isWithinInterval(d, { start, end });
  });
}

export default function CalendarView({ movies, username }: CalendarViewProps) {
  const latestDate = useMemo(() => {
    if (!movies.length) return new Date();
    return movies
      .map((m) => new Date(m.watchedDate + "T00:00:00"))
      .reduce((a, b) => (a > b ? a : b));
  }, [movies]);

  const [month, setMonth] = useState<Date>(
    new Date(latestDate.getFullYear(), latestDate.getMonth(), 1)
  );

  const calDays = useMemo(() => {
    const s = startOfMonth(month);
    const e = endOfMonth(month);
    return eachDayOfInterval({ start: startOfWeek(s), end: endOfWeek(e) });
  }, [month]);

  const monthMovies = useMemo(() => moviesForMonth(movies, month), [movies, month]);

  const prev = useCallback(() => setMonth((m) => subMonths(m, 1)), []);
  const next = useCallback(() => setMonth((m) => addMonths(m, 1)), []);

  const hasPrev = useMemo(() => {
    const start = startOfMonth(month);
    return movies.some((m) => new Date(m.watchedDate + "T00:00:00") < start);
  }, [movies, month]);

  const hasNext = useMemo(() => {
    const end = endOfMonth(month);
    return movies.some((m) => new Date(m.watchedDate + "T00:00:00") > end);
  }, [movies, month]);

  const [shareOpen, setShareOpen] = useState(false);

  // Day-by-day entry count for the month heatmap in the story card
  const dayEntries = useMemo(() => {
    const map = new Map<string, number>();
    monthMovies.forEach(m => map.set(m.watchedDate, (map.get(m.watchedDate) ?? 0) + 1));
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }, [monthMovies]);

  const activeDays = useMemo(() => dayEntries.filter(d => d.count > 0).length, [dayEntries]);

  return (
    <div className="animate-fade-up">

      {/* ── Meta row ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          <MetaStat label="This month" value={monthMovies.length} unit="entries" />
          <MetaStat label="Diary entries" value={movies.length} unit="total" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, letterSpacing: "0.01em" }}>
            {username}
          </span>
          <button
            onClick={() => setShareOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 500, cursor: "pointer" }}
          >
            <InstagramIcon size={11} /> Share
          </button>
        </div>
      </div>

      {/* ── Story share modal ─────────────────────────────────── */}
      <StoryModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        filename={`${format(month, "yyyy-MM")}-diary-story`}
      >
        <MonthStoryCard
          month={month}
          movies={monthMovies.map(m => ({ title: m.title, poster: m.poster ?? "", slug: m.slug, watchedDate: m.watchedDate, rating: m.rating }))}
          totalFilms={monthMovies.length}
          activeDays={activeDays}
          username={username}
        />
      </StoryModal>

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
      {/* ── Month nav ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <NavBtn onClick={prev} disabled={!hasPrev} label="Previous month">
          <ChevronLeft size={15} />
        </NavBtn>

        <div style={{ textAlign: "center", lineHeight: 1 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}
          >
            {format(month, "MMMM")}
          </span>
          <span style={{ fontSize: 14, color: "var(--text-3)", marginLeft: 6 }}>
            {format(month, "yyyy")}
          </span>
        </div>

        <NavBtn onClick={next} disabled={!hasNext} label="Next month">
          <ChevronRight size={15} />
        </NavBtn>
      </div>

      {/* ── Weekday headers ──────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {DAYS.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--text-3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "2px 0 6px",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ────────────────────────────────────── */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}
        role="grid"
        aria-label={`Calendar for ${format(month, "MMMM yyyy")}`}
      >
        {calDays.map((day) => (
          <DayCell
            key={day.toISOString()}
            date={day}
            movies={moviesForDate(movies, day)}
            isToday={isToday(day)}
            isCurrentMonth={isSameMonth(day, month)}
          />
        ))}
      </div>

      {/* ── Empty month ──────────────────────────────────────── */}
      {monthMovies.length === 0 && (
        <p
          style={{
            textAlign: "center",
            marginTop: 32,
            fontSize: 13,
            color: "var(--text-3)",
          }}
        >
          No films logged in {format(month, "MMMM yyyy")}.
        </p>
      )}
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────── */

function MetaStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 1, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>
        {value}
        <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-2)", marginLeft: 4 }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

function NavBtn({
  onClick, disabled, label, children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 30,
        height: 30,
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "1px solid var(--border)",
        color: disabled ? "var(--text-3)" : "var(--text-2)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "border-color 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.borderColor = "var(--border-2)";
          e.currentTarget.style.color = "var(--text)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = disabled ? "var(--text-3)" : "var(--text-2)";
      }}
    >
      {children}
    </button>
  );
}
