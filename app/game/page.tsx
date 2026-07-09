"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import GameScreen from "@/components/game/GameScreen";
import { useSessionStore } from "@/lib/game/store";

/**
 * /game — guards the session (a song must be uploaded and a layout
 * chosen on /solo first), then mounts the GameScreen. "Rejouer" remounts
 * the screen via a key bump, which rebuilds the whole audio/game runtime.
 */
export default function GamePage() {
  const router = useRouter();
  const { song, audioBuffer, beatmap, instrument, options, setResult } = useSessionStore();
  const [runKey, setRunKey] = useState(0);

  const sessionReady = song && audioBuffer && beatmap && instrument;

  useEffect(() => {
    if (!sessionReady) router.replace("/solo");
  }, [sessionReady, router]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-abyss">
        <p className="animate-pulse text-sm uppercase tracking-[0.3em] text-slate-500">
          Redirection vers le mode solo…
        </p>
      </div>
    );
  }

  return (
    <GameScreen
      key={runKey}
      song={song}
      audioBuffer={audioBuffer}
      beatmap={beatmap}
      instrumentId={instrument}
      options={options}
      onResult={setResult}
      onReplay={() => setRunKey((k) => k + 1)}
    />
  );
}
