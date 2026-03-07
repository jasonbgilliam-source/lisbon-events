"use client";

import * as React from "react";
import {
  addFavorite,
  isFavorited,
  removeFavorite,
  subscribeFavorites,
} from "@/lib/favorites";

type Props = {
  slug?: string | null;
  className?: string;
  showLabel?: boolean;
};

export default function FavoriteButton({
  slug,
  className = "",
  showLabel = true,
}: Props) {
  const safeSlug = String(slug || "").trim();
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!safeSlug) {
      setSaved(false);
      return;
    }

    setSaved(isFavorited(safeSlug));
    return subscribeFavorites(() => {
      setSaved(isFavorited(safeSlug));
    });
  }, [safeSlug]);

  function onToggle(ev: React.MouseEvent<HTMLButtonElement>) {
    ev.preventDefault();
    ev.stopPropagation();

    if (!safeSlug) return;

    if (saved) {
      removeFavorite(safeSlug);
    } else {
      addFavorite(safeSlug);
    }
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!safeSlug}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      title={saved ? "Remove from favorites" : "Save to favorites"}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
        saved
          ? "border-orange-300 bg-orange-50 text-[#c94917]"
          : "border-gray-200 bg-white text-gray-700 hover:bg-orange-50 hover:text-[#c94917]",
        !safeSlug ? "cursor-not-allowed opacity-50" : "",
        className,
      ].join(" ")}
    >
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>
      {showLabel ? <span>{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}