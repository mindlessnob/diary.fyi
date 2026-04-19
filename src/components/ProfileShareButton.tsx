"use client";

import { useState } from "react";
import { InstagramIcon } from "./InstagramIcon";
import StoryModal from "./StoryModal";
import ProfileStoryCard from "./story/ProfileStoryCard";
import RecentWatchesStoryCard from "./story/RecentWatchesStoryCard";

interface Favorite { title: string; poster: string; slug: string; year: string }
interface RecentWatch { title: string; year: string; rating: number | null; poster: string; watchedDate: string }

interface Props {
  displayName:      string;
  username:         string;
  avatar:           string;
  filmsWatched:     number;
  totalHours:       number;
  avgRating:        string;
  diaryEntries:     number;
  uniqueCountries:  number;
  uniqueDirectors:  number;
  rewatchPct:       number;
  favorites:        Favorite[];
  recentWatches:    RecentWatch[];
}

const btnStyle: React.CSSProperties = {
  display:    "inline-flex",
  alignItems: "center",
  gap:        6,
  padding:    "5px 12px",
  borderRadius: 7,
  background: "rgba(255,255,255,0.05)",
  border:     "1px solid rgba(255,255,255,0.1)",
  color:      "rgba(255,255,255,0.55)",
  fontSize:   12,
  fontWeight: 500,
  cursor:     "pointer",
  transition: "all 0.12s",
};

export default function ProfileShareButton(props: Props) {
  const [profileOpen,  setProfileOpen]  = useState(false);
  const [recentOpen,   setRecentOpen]   = useState(false);

  const proxiedAvatar = props.avatar
    ? `/api/proxy-image?url=${encodeURIComponent(props.avatar)}`
    : "";

  const proxiedFavs = props.favorites.map(f => ({
    ...f,
    poster: f.poster ? `/api/proxy-image?url=${encodeURIComponent(f.poster)}` : "",
  }));

  const proxiedRecent = props.recentWatches.map(r => ({
    ...r,
    poster: r.poster ? `/api/proxy-image?url=${encodeURIComponent(r.poster)}` : "",
  }));

  const hover = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.09)";
      e.currentTarget.style.color = "rgba(255,255,255,0.8)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
      e.currentTarget.style.color = "rgba(255,255,255,0.55)";
    },
  };

  return (
    <>
      {/* ── Profile stats card */}
      <button onClick={() => setProfileOpen(true)} style={btnStyle} {...hover}>
        <InstagramIcon size={13} /> Share Profile
      </button>

      {/* ── Last watched card */}
      <button onClick={() => setRecentOpen(true)} style={btnStyle} {...hover}>
        <InstagramIcon size={13} /> Last Watched
      </button>

      <StoryModal open={profileOpen} onClose={() => setProfileOpen(false)} filename={`${props.username}-profile-story`}>
        <ProfileStoryCard
          displayName={props.displayName}
          username={props.username}
          avatar={proxiedAvatar}
          filmsWatched={props.filmsWatched}
          totalHours={props.totalHours}
          avgRating={props.avgRating}
          diaryEntries={props.diaryEntries}
          uniqueCountries={props.uniqueCountries}
          uniqueDirectors={props.uniqueDirectors}
          rewatchPct={props.rewatchPct}
          favorites={proxiedFavs}
        />
      </StoryModal>

      <StoryModal open={recentOpen} onClose={() => setRecentOpen(false)} filename={`${props.username}-recent-watches`}>
        <RecentWatchesStoryCard
          displayName={props.displayName}
          username={props.username}
          recentWatches={proxiedRecent}
        />
      </StoryModal>
    </>
  );
}
