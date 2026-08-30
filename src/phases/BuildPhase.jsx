import React, { useState, useEffect, useMemo } from "react";
import { CHIP_GROUPS } from "../data/chipGroups.js";
import { parseCode } from "../engine/parser.js";
import { indents, trackToSonicPi } from "../engine/sonicpi.js";
import { C, PHASE } from "../theme.js";
import { CodeEditor } from "../ui/CodeEditor.jsx";
import { CodeLine } from "../ui/CodeLine.jsx";
import { CopyCodeModal } from "../ui/CopyCodeModal.jsx";
import { NoteHighway } from "../ui/NoteHighway.jsx";
import { BigButton, Chip, Mentor } from "../ui/controls.jsx";

export function BuildPhase({ level, playInfo, playTag, elapsed, playMulti, stopAll, completePhase, draft, saveDraft, clearDraft }) {
  const b = level.build;
  /* Restore whatever this player had open here last time. Read once on mount,
     so a save landing mid-lesson never yanks the editor out from under them. */
  const saved = (draft && draft.level && draft.level[level.id]) || null;
  const [resumed] = useState(() => !!saved);
  const [code, setCode] = useState(() =>
    saved && Array.isArray(saved.code) && saved.code.length === b.loops.length ? saved.code : b.loops.map(() => [])
  );
  const [stageIdx, setStageIdx] = useState(() => (saved && Number.isInteger(saved.stageIdx) ? Math.min(saved.stageIdx, b.stages.length) : 0));
  const [plays, setPlays] = useState(() => (saved && Number.isInteger(saved.plays) ? saved.plays : 0));
  const [showHint, setShowHint] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [justDone, setJustDone] = useState(false);

  const [loopOverride, setLoopOverride] = useState(null);
  const stage = b.stages[stageIdx];
  const finished = stageIdx >= b.stages.length;
  const activeLoop = loopOverride !== null ? loopOverride : stage ? stage.loop : 0;
  useEffect(() => setLoopOverride(null), [stageIdx]);

  const ctx = useMemo(
    () => ({
      count: (li, t) => code[li].filter((l) => l.t === t).length,
      beats: (li) =>
        code[li].reduce((s, l) => s + (l.t === "sleep" ? l.v : l.t === "sleepRand" ? (l.v[0] + l.v[1]) / 2 : 0), 0),
      lines: (li) => code[li].length,
    }),
    [code]
  );

  /* Chips and loop tabs unlock stage by stage. With the whole palette live
     from stage 1, a player who explored the chips could satisfy three or four
     stage checks before the 1.1s advance timer caught up, clearing them in a
     chain of banner flashes without ever reading a brief. */
  const unlocked = useMemo(() => {
    const groups = new Set();
    const loops = new Set();
    const upTo = finished ? b.stages.length : stageIdx + 1;
    for (let i = 0; i < upTo; i++) {
      (b.stages[i].allow || []).forEach((g) => groups.add(g));
      loops.add(b.stages[i].loop);
    }
    return { groups, loops };
  }, [b, stageIdx, finished]);

  const structureOk = stage ? stage.check(ctx) : true;
  const playsOk = !stage || !stage.requirePlay || plays >= stage.requirePlay;
  const stageOk = structureOk && playsOk;

  useEffect(() => {
    if (!finished && stageOk) {
      setJustDone(true);
      const t = setTimeout(() => {
        setJustDone(false);
        setStageIdx((s) => s + 1);
        setPlays(0); // "play it twice" means twice in THIS stage
        setShowHint(false);
      }, 1100);
      return () => clearTimeout(t);
    }
  }, [stageOk, finished]);

  /* In a typing mode the text is what the student owns and the line objects are
     derived from it, so every stage check downstream keeps working unchanged. */
  const codeMode = b.codeMode || "chips";
  const [texts, setTexts] = useState(() =>
    saved && Array.isArray(saved.texts) && saved.texts.length === b.loops.length ? saved.texts : b.loops.map(() => "")
  );
  const [errors, setErrors] = useState(() => b.loops.map(() => []));

  /* Persist on every change, debounced upstream. Wrapped so a storage failure
     can never interrupt a child mid-sentence. */
  useEffect(() => {
    try {
      if (finished) clearDraft("level", level.id);
      else saveDraft("level", level.id, { code, texts, stageIdx, plays });
    } catch (e) {}
  }, [code, texts, stageIdx, plays, finished, level.id]);

  const setText = (t) => {
    const parsed = parseCode(t);
    setTexts(texts.map((x, i) => (i === activeLoop ? t : x)));
    setErrors(errors.map((x, i) => (i === activeLoop ? parsed.errors : x)));
    // only lines that actually parse reach the checker — a half-typed line
    // must never count as progress, and must never be treated as a mistake
    setCode(code.map((ls, i) => (i === activeLoop ? parsed.lines : ls)));
  };

  const add = (mk) => {
    if (code[activeLoop].length >= 20) return;
    setCode(code.map((ls, i) => (i === activeLoop ? [...ls, mk()] : ls)));
  };
  const removeAt = (i) => setCode(code.map((ls, li) => (li === activeLoop ? ls.filter((_, x) => x !== i) : ls)));

  const lines = code[activeLoop];
  const ind = indents(lines);
  const beats = ctx.beats(activeLoop);
  const allowed = b.loops[activeLoop].allow;

  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor
        text={
          finished
            ? "Every stage complete — you wrote that whole thing yourself. That's real live-coding! 🏆"
            : resumed
            ? "Picking up where you left off 🎧 — your code is just as you had it."
            : b.mentor
        }
      />

      {/* stage checklist */}
      <div className="rounded-2xl p-3" style={{ background: C.panel, border: `1px solid ${C.line}` }}>
        {b.stages.map((st, i) => (
          <div
            key={i}
            className="flex items-start gap-2 py-0.5 text-sm font-bold"
            style={{ color: i < stageIdx ? C.green : i === stageIdx ? C.ink : C.dim, opacity: i > stageIdx ? 0.6 : 1 }}
          >
            <span>{i < stageIdx ? "✅" : i === stageIdx ? "🔨" : "🔒"}</span>
            <span>
              Stage {i + 1}: {st.title}
            </span>
          </div>
        ))}
      </div>

      {!finished && (
        <div
          className="rounded-2xl p-3"
          style={{ background: justDone ? "rgba(92,224,126,0.15)" : C.panel2, border: `2px solid ${justDone ? C.green : C.violet}` }}
        >
          <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: justDone ? C.green : C.violet }}>
            {justDone ? "✅ Stage complete!" : `Stage ${stageIdx + 1} · write it in :${b.loops[activeLoop].name}`}
          </div>
          <div className="mt-1 text-sm font-semibold">{stage.brief}</div>
          {stage.requirePlay && (
            <div className="mt-1 text-xs font-bold" style={{ color: plays >= stage.requirePlay ? C.green : C.yellow }}>
              ▶ Played {Math.min(plays, stage.requirePlay)}/{stage.requirePlay}
            </div>
          )}
          {showHint && (
            <div className="mt-2 rounded-xl px-2 py-1 text-xs font-bold" style={{ background: "rgba(255,154,87,0.15)", color: C.orange }}>
              💡 {stage.hint}
            </div>
          )}
        </div>
      )}

      <NoteHighway playInfo={playInfo} elapsed={elapsed} height={140} idleText="Write some code, then press ▶ to hear it" />
      </div>
      <div className={PHASE["gap-3"].edit}>

      {/* loop tabs */}
      {b.loops.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {b.loops.map((lp, i) =>
            unlocked.loops.has(i) ? (
              <Chip key={lp.name} small active={activeLoop === i} onClick={() => setLoopOverride(i)}>
                {lp.icon} :{lp.name}
              </Chip>
            ) : (
              <Chip key={lp.name} small disabled>
                🔒 :{lp.name}
              </Chip>
            )
          )}
        </div>
      )}

      {/* editor */}
      <div>
        <div className="mb-1 flex items-center justify-between font-mono text-xs font-bold" style={{ color: C.violet }}>
          <span>live_loop :{b.loops[activeLoop].name} do</span>
          {b.showBeats && (
            <span style={{ color: Math.abs(beats - 4) < 0.01 ? C.green : C.dim }}>
              {beats} / 4 beats {Math.abs(beats - 4) < 0.01 ? "✅" : ""}
            </span>
          )}
        </div>
        {codeMode === "chips" ? (
          <div className="max-h-52 overflow-y-auto rounded-2xl p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
            {lines.length === 0 && (
              <div className="px-2 py-3 text-center text-sm font-semibold" style={{ color: C.dim }}>
                Empty — tap the chips below to write your first line 👇
              </div>
            )}
            {lines.map((L, i) => (
              <div key={i} className="flex items-center">
                <div className="flex-1">
                  <CodeLine L={L} small indent={ind[i]} />
                </div>
                {!playInfo && (
                  <button
                    onClick={() => removeAt(i)}
                    className="ml-1 rounded-lg px-2 text-xs font-extrabold"
                    style={{ color: C.pink, background: "rgba(255,92,168,0.12)", height: 24 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <CodeEditor
            value={texts[activeLoop]}
            onChange={setText}
            errors={errors[activeLoop]}
            mode={codeMode}
            disabled={!!playInfo}
            chipGroups={Object.entries(CHIP_GROUPS).filter(([k]) => allowed.includes(k) && unlocked.groups.has(k))}
          />
        )}
        <div className="mt-1 font-mono text-xs font-bold" style={{ color: C.violet }}>
          end
        </div>
      </div>

      {/* palette — in a typing mode the chips live inside the editor, where
          they type the line rather than append it */}
      {codeMode === "chips" &&
        Object.entries(CHIP_GROUPS)
          .filter(([k]) => allowed.includes(k) && unlocked.groups.has(k))
          .map(([k, g]) => (
            <div key={k} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-extrabold uppercase" style={{ color: C.dim, minWidth: 62 }}>
                {g.label}
              </span>
              {g.items.map((it) => (
                <Chip key={it.label} small onClick={() => add(it.make)}>
                  {it.label}
                </Chip>
              ))}
            </div>
          ))}

      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          disabled={code.every((ls) => !ls.length)}
          onClick={() =>
            playInfo ? stopAll() : playMulti(code, "mine", () => setPlays((p) => p + 1), b.bpm || 60, 2)
          }
        >
          {playInfo ? "■ Stop" : b.loops.length > 1 ? "▶ Play both loops" : "▶ Play my loop"}
        </BigButton>
        {!finished && (
          <BigButton color={C.orange} onClick={() => setShowHint(true)}>
            💡 Hint
          </BigButton>
        )}
        {code.some((ls) => ls.length) && (
          <BigButton color={C.violet} onClick={() => setShowCopy(true)}>
            📋
          </BigButton>
        )}
        {finished && <BigButton onClick={() => completePhase(2)}>Finish level ⭐</BigButton>}
        {lines.length > 0 && !finished && (
          <Chip small onClick={() => setCode(code.map((ls, i) => (i === activeLoop ? [] : ls)))}>
            🗑 clear loop
          </Chip>
        )}
      </div>

      {showCopy && (
        <CopyCodeModal
          text={trackToSonicPi({ bpm: b.bpm || 120, loops: b.loops }, code)}
          onClose={() => setShowCopy(false)}
        />
      )}
      </div>
    </div>
  );
}

/* ---------- The Club: track select ---------- */
