import React, { useState, useRef, useEffect } from "react";
import { LEVELS } from "./data/levels.js";
import { TRACKS } from "./data/tracks.js";
import { useAudio } from "./engine/audio.js";
import { usePlayers } from "./state/usePlayers.js";
import { useClock } from "./hooks/useClock.js";
import { ClubScreen } from "./screens/ClubScreen.jsx";
import { DJScreen } from "./screens/DJScreen.jsx";
import { LevelScreen } from "./screens/LevelScreen.jsx";
import { MapScreen } from "./screens/MapScreen.jsx";
import { PlayersScreen } from "./screens/PlayersScreen.jsx";
import { ReportScreen } from "./screens/ReportScreen.jsx";
import { TeacherPanel } from "./screens/TeacherPanel.jsx";
import { device, profiles } from "./state/profiles.js";
import { mergeProgress } from "./state/progressCode.js";
import { C, TYPE } from "./theme.js";
import { CelebrateOverlay } from "./ui/CelebrateOverlay.jsx";
import { BigButton, Chip } from "./ui/controls.jsx";

export default function LoopLab() {
  const [screen, setScreen] = useState("map");
  const [teacher, setTeacher] = useState(false);
  const holdRef = useRef(null);
  /* Three seconds on the title. Long enough that no child finds it by
     accident, and it leaves nothing on screen to find. */
  const holdStart = () => {
    clearTimeout(holdRef.current);
    holdRef.current = setTimeout(() => setTeacher(true), 3000);
  };
  const holdEnd = () => clearTimeout(holdRef.current);
  const [levelIdx, setLevelIdx] = useState(0);
  const [phase, setPhase] = useState(0);  /* Screen state stays here — which panel is open, which track is picked, and
     whether we are mid-celebration are about this component, not about who is
     playing. */
  const [showAudio, setShowAudio] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const {
    stars, setStars, records, setRecords, loaded, persist,
    players, playerId, player, name,
    draft, saveDraft, clearDraft, setDraft,
    volume, setVolume, muted, setMuted, askHeadphones, setAskHeadphones,
    pin, setPin,
    openPlayer: openPlayerState, addPlayer: addPlayerState, removePlayer: removePlayerState, renamePlayer,
  } = usePlayers({ onNoPlayers: () => setScreen("players") });

  /* The hook owns the data; moving between screens stays here. */
  const openPlayer = async (id) => { await openPlayerState(id); setScreen("map"); };
  const addPlayer = async (n) => { await addPlayerState(n); setScreen("map"); };
  const removePlayer = async (id) => { if (await removePlayerState(id)) setScreen("players"); };

  const { playInfo, playTag, playLines, playMulti, stopAll, ensureAudio, trigger, unlockMedia, synthsRef } = useAudio({ volume, muted });

  useEffect(() => () => stopAll(), []);

  const elapsed = useClock(playInfo);
  const level = LEVELS[levelIdx];

  function completePhase(p) {
    setStars((st) => {
      const n = [...st];
      n[levelIdx] = Math.max(n[levelIdx], p + 1);
      return n;
    });
    if (p < 2) setPhase(p + 1);
    else setCelebrate(true);
  }

  function openLevel(i) {
    stopAll();
    setLevelIdx(i);
    setPhase(Math.min(stars[i], 2));
    setCelebrate(false);
    setScreen("level");
  }

  /* muted and the player's name reach the booth too: "Silence the room" is the
     same mute the shell owns, so it survives leaving the track. */
  const shared = { playInfo, playTag, elapsed, playLines, playMulti, stopAll, ensureAudio, trigger, unlockMedia, synthsRef, draft, saveDraft, clearDraft, muted, setMuted, playerName: name };

  return (
    <div className="min-h-screen w-full" style={{ background: C.bg, color: C.ink, fontFamily: TYPE.ui }}>
      <style>{`
        @keyframes cb-pop { 0%{transform:scale(0) rotate(0)} 70%{transform:scale(1.25) rotate(10deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes cb-fall { 0%{transform:translateY(-40px); opacity:1} 100%{transform:translateY(340px) rotate(200deg); opacity:0} }
        @keyframes cb-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @media (prefers-reduced-motion: reduce){ *{animation:none !important; transition:none !important} }
      `}</style>
      {/* Mobile-first: a phone gets the same single column it always had.
         Wider screens just get more room for the same layout, so a laptop
         or a classroom projector is not showing a phone-shaped sliver. */}
      {/* Sound control, in the shell rather than a screen, so mute survives
          moving between the map, a level and the booth. */}
      <div className="fixed right-2 top-2 z-40 flex flex-col items-end gap-1">
        <button
          onClick={() => setShowAudio((v) => !v)}
          aria-label={muted ? "Sound is muted — open sound settings" : "Open sound settings"}
          className="rounded-xl px-3 py-2 font-extrabold"
          style={{ background: C.panel2, border: `1px solid ${muted ? C.orange : C.line}`, color: muted ? C.orange : C.ink }}
        >
          {muted ? "🔇" : volume > 0.5 ? "🔊" : volume > 0 ? "🔉" : "🔈"}
        </button>
        {showAudio && (
          <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}`, width: 220 }}>
            <div className="text-[11px] font-extrabold uppercase" style={{ color: C.dim }}>
              Volume
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label="Master volume"
              className="mt-1 w-full"
              style={{ accentColor: C.aqua }}
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] font-bold" style={{ color: C.dim }}>
                {Math.round(volume * 100)}%
              </span>
              <Chip small onClick={() => setMuted((m) => !m)}>
                {muted ? "🔈 Unmute" : "🔇 Mute"}
              </Chip>
            </div>
            {muted && (
              <div className="mt-2 text-[11px] font-bold" style={{ color: C.orange }}>
                Muted — the notes still fly, so you can show the screen without the sound.
              </div>
            )}
          </div>
        )}
      </div>

      {askHeadphones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(10,8,25,0.9)" }}>
          <div className="w-full max-w-sm rounded-3xl p-5 text-center" style={{ background: C.panel, border: `2px solid ${C.aqua}` }}>
            <div className="text-4xl">🎧</div>
            <div className="mt-1 text-xl font-extrabold">Headphones on?</div>
            <div className="mt-1 text-sm font-semibold" style={{ color: C.dim }}>
              This one makes noise. Plug your headphones in so you can hear your track — and so everyone else can hear theirs.
            </div>
            <div className="mt-4">
              <BigButton
                color={C.aqua}
                onClick={async () => {
                  setAskHeadphones(false);
                  try {
                    const d = await device.read();
                    await device.write({ ...d, heardHeadphones: true });
                  } catch (e) {}
                }}
              >
                Ready 🎧
              </BigButton>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-md px-3 pb-10 pt-4 md:max-w-2xl lg:max-w-6xl">
        {screen === "map" && (
          <MapScreen
            stars={stars}
            records={records}
            loaded={loaded}
            persist={persist}
            playerName={name}
            onHoldStart={holdStart}
            onHoldEnd={holdEnd}
            onOpen={openLevel}
            onReport={() => setScreen("report")}
            onSwitch={() => setScreen("players")}
            onClub={() => {
              stopAll();
              setScreen("club");
            }}
          />
        )}
        {screen === "level" && (
          <LevelScreen
            level={level}
            levelIdx={levelIdx}
            phase={phase}
            setPhase={setPhase}
            stars={stars[levelIdx]}
            completePhase={completePhase}
            back={() => {
              stopAll();
              setScreen("map");
            }}
            {...shared}
          />
        )}
        {teacher && (
          <TeacherPanel
            pin={pin}
            playerName={name}
            onPin={async (np) => {
              setPin(np);
              await device.write({ pin: np });
            }}
            onUnlockAll={() => {
              setStars(LEVELS.map(() => 3));
              setTeacher(false);
            }}
            onResetPlayer={() => {
              setStars(LEVELS.map(() => 0));
              setRecords({});
              setDraft({});
              setTeacher(false);
            }}
            onPlayers={() => {
              setTeacher(false);
              setScreen("players");
            }}
            onClose={() => setTeacher(false)}
          />
        )}

        {screen === "players" && (
          <PlayersScreen
            players={players}
            currentId={playerId}
            onOpen={openPlayer}
            onAdd={addPlayer}
            onRemove={removePlayer}
            onBack={playerId ? () => setScreen("map") : null}
          />
        )}

        {screen === "report" && (
          <ReportScreen
            stars={stars}
            records={records}
            name={name}
            /* One name, on the player. The report used to keep its own, which
               meant two places to change it and a report that could disagree
               with the map header. */
            onName={renamePlayer}
            onRestore={(incoming) => {
              /* Merge upward only — a code can add stars, never remove them. */
              const merged = mergeProgress({ stars, records }, incoming);
              const changed = JSON.stringify(merged) !== JSON.stringify({ stars, records });
              if (changed) {
                setStars(merged.stars);
                setRecords(merged.records);
              }
              return changed;
            }}
            onBack={() => setScreen("map")}
          />
        )}

        {screen === "club" && (
          <ClubScreen
            records={records}
            stars={stars}
            onPick={(i) => {
              stopAll();
              setTrackIdx(i);
              setScreen("dj");
            }}
            back={() => setScreen("map")}
          />
        )}
        {screen === "dj" && (
          <DJScreen
            track={TRACKS[trackIdx]}
            record={records[TRACKS[trackIdx].id]}
            onRecord={(r) =>
              setRecords((prev) => {
                const rank = { bronze: 1, silver: 2, gold: 3 };
                const cur = prev[TRACKS[trackIdx].id];
                if (!r || (cur && rank[cur] >= rank[r])) return prev;
                return { ...prev, [TRACKS[trackIdx].id]: r };
              })
            }
            back={() => {
              stopAll();
              setScreen("club");
            }}
            {...shared}
          />
        )}
        {celebrate && (
          <CelebrateOverlay
            level={level}
            hasNext={levelIdx < LEVELS.length - 1}
            onMap={() => {
              setCelebrate(false);
              setScreen("map");
            }}
            onNext={() => {
              setCelebrate(false);
              openLevel(levelIdx + 1);
            }}
            onStay={() => setCelebrate(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- map ---------- */
