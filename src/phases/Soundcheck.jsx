import React, { useState, useEffect } from "react";
import { CHIP_GROUPS } from "../data/chipGroups.js";
import { applyBugs, optionsFor } from "../data/tracks.js";
import { END, LOOP } from "../engine/interpreter.js";
import { codeToText, parseCode } from "../engine/parser.js";
import { indents } from "../engine/sonicpi.js";
import { useActiveLine } from "../hooks/useClock.js";
import { C, PHASE } from "../theme.js";
import { CodeEditor } from "../ui/CodeEditor.jsx";
import { CodeLine } from "../ui/CodeLine.jsx";
import { NoteHighway } from "../ui/NoteHighway.jsx";
import { BigButton, Chip, Mentor } from "../ui/controls.jsx";

export function Soundcheck({ track, playInfo, playTag, elapsed, playLines, stopAll, onDone, draft, saveDraft, clearDraft }) {
  /* Repairs already made survive the tab closing — an hour of listening for a
     sour note is not something to ask a child to do twice. */
  const saved = (draft && draft.club && draft.club[track.id]) || null;
  const [resumed] = useState(() => !!saved);
  const [loopLines, setLoopLines] = useState(() =>
    saved && Array.isArray(saved.loopLines) && saved.loopLines.length === track.loops.length ? saved.loopLines : applyBugs(track)
  );
  /* The club runs the same ramp as the studio: tap to debug on the first
     tracks, chips-that-type in the middle, typing alone by Rave Siren. */
  const codeMode = track.codeMode || "chips";
  const [texts, setTexts] = useState(() =>
    saved && Array.isArray(saved.texts) && saved.texts.length === track.loops.length
      ? saved.texts
      : applyBugs(track).map((ls) => codeToText(ls))
  );
  const [errors, setErrors] = useState(() => track.loops.map(() => []));

  useEffect(() => {
    try {
      saveDraft("club", track.id, { loopLines, texts });
    } catch (e) {}
  }, [loopLines, texts, track.id]);
  const [sel, setSel] = useState(0);
  const [selLine, setSelLine] = useState(null);
  const [hints, setHints] = useState(false);
  const activeLine = useActiveLine(playInfo, elapsed);

  /* Soundcheck passes only when every loop matches the studio version again.
     The old check counted the designated bug lines alone, so a player who
     repaired all three bugs and then knocked a different note out of place
     still passed — and carried that wrong note into the live set. Lines the
     player changed themselves are counted separately so the mentor can say
     which of the two is going on. */
  /* Typing lets a student add or delete lines, so this can no longer assume the
     two sides are the same length — indexing past the end used to throw. A
     length change is itself a mismatch: the studio version is the target. */
  const diffs = track.loops.map((lp, li) => {
    const mine = loopLines[li] || [];
    const n = Math.max(lp.lines.length, mine.length);
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = lp.lines[i], b = mine[i];
      if (!a || !b || String(a.v ?? "") !== String(b.v ?? "") || a.t !== b.t) out.push(i);
    }
    return out;
  });
  const fixedPerLoop = diffs.map((d) => d.length === 0);
  const isBugLine = (li, i) => !!(loopLines[li] && loopLines[li][i] && loopLines[li][i].bug);
  const bugsLeft = diffs.reduce((n, d, li) => n + d.filter((i) => isBugLine(li, i)).length, 0);
  const strayLines = diffs.reduce((n, d, li) => n + d.filter((i) => !isBugLine(li, i)).length, 0);
  const allFixed = bugsLeft === 0 && strayLines === 0;

  const lines = loopLines[sel];
  const orig = track.loops[sel].lines;
  const ind = indents(lines);

  function setLineValue(i, raw) {
    const L = lines[i];
    const v = L.t === "play" || L.t === "sleep" ? parseFloat(raw) : raw;
    const next = loopLines.map((ls, li) => (li === sel ? ls.map((x, xi) => (xi === i ? { ...x, v } : x)) : ls));
    setLoopLines(next);
    setSelLine(null);
  }

  return (
    <div className={PHASE["gap-3"].grid}>
      <div className={PHASE["gap-3"].watch}>
      <Mentor
        text={
          allFixed
            ? "Soundcheck complete — this track slaps again. The booth is yours."
            : resumed && bugsLeft > 0 && bugsLeft < track.bugs.length
            ? `Picking up where you left off — ${bugsLeft} bug${bugsLeft === 1 ? "" : "s"} still to find.`
            : bugsLeft === 0
              ? `All ${track.bugs.length} bugs fixed — nice ears! ${strayLines === 1 ? "One line" : `${strayLines} lines`} still ${strayLines === 1 ? "doesn't" : "don't"} match the studio version though. Open Hints to see which, or put it back and we're away.`
              : `This track came back from the studio with ${track.bugs.length} bugs. Solo each loop, compare with the fixed version, and repair it by ear. ${bugsLeft} bug${bugsLeft === 1 ? "" : "s"} left!`
        }
      />
      <NoteHighway playInfo={playInfo} elapsed={elapsed} height={150} idleText="Solo a loop to hear the bugs" />
      </div>
      <div className={PHASE["gap-3"].edit}>
      <div className="flex flex-wrap gap-2">
        {track.loops.map((lp, i) => {
          const clean = fixedPerLoop[i];
          return (
            <Chip key={lp.name} small active={sel === i} onClick={() => { setSel(i); setSelLine(null); }}>
              {lp.name}
              <span style={{ opacity: 0.7 }}>{clean ? " clean" : " bug"}</span>
            </Chip>
          );
        })}
      </div>
      {codeMode === "chips" ? (
        <div className="max-h-56 overflow-y-auto rounded-[4px] p-2" style={{ background: "#151233", border: `1px solid ${C.line}` }}>
          {lines.map((L, i) => (
            <CodeLine
              key={i}
              L={L}
              small
              indent={ind[i]}
              active={playTag === "mine" && activeLine === i + 1}
              selected={selLine === i}
              warn={hints && orig[i] && String(L.v) !== String(orig[i].v)}
              onTap={L.t === "synth" ? null : () => setSelLine(selLine === i ? null : i)}
            />
          ))}
        </div>
      ) : (
        <CodeEditor
          value={texts[sel]}
          onChange={(t) => {
            const parsed = parseCode(t);
            setTexts(texts.map((x, i) => (i === sel ? t : x)));
            setErrors(errors.map((x, i) => (i === sel ? parsed.errors : x)));
            // keep the bug marker on lines the student has not retyped, so the
            // mentor can still tell a planted bug from their own edit
            const prev = loopLines[sel] || [];
            const tagged = parsed.lines.map((L, i) => (prev[i] && prev[i].bug && prev[i].t === L.t ? { ...L, bug: true } : L));
            setLoopLines(loopLines.map((ls, i) => (i === sel ? tagged : ls)));
          }}
          errors={errors[sel]}
          mode={codeMode}
          disabled={!!playInfo}
          minRows={10}
          chipGroups={Object.entries(CHIP_GROUPS).filter(([k]) => ["drums", "notes", "sleeps", "synth"].includes(k))}
        />
      )}
      {codeMode === "chips" && selLine !== null && (
        <div className="flex flex-wrap gap-1.5 rounded-[4px] p-2" style={{ background: C.panel, border: `1px solid ${C.yellow}` }}>
          <span className="w-full text-xs font-extrabold" style={{ color: C.yellow }}>
            Change line to:
          </span>
          {optionsFor(lines[selLine], track.loops[sel].pool).map((o) => (
            <Chip key={o} small active={String(lines[selLine].v) === o} onClick={() => setLineValue(selLine, o)}>
              {lines[selLine].t === "sample" ? ":" + o : o}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <BigButton
          color={C.aqua}
          onClick={() => (playTag === "mine" ? stopAll(true) : playLines([LOOP(2), ...lines, END()], "mine", null, track.bpm))}
        >
          {playTag === "mine" ? "Stop" : "Solo this loop"}
        </BigButton>
        <BigButton
          color={C.violet}
          onClick={() => (playTag === "target" ? stopAll(true) : playLines([LOOP(2), ...orig, END()], "target", null, track.bpm))}
        >
          {playTag === "target" ? "Stop" : "Hear it fixed"}
        </BigButton>
        <BigButton color={C.orange} onClick={() => setHints(true)}>
          Hints
        </BigButton>
      </div>
      {hints && !allFixed && (
        <div className="rounded-[4px] px-3 py-2 text-xs font-bold" style={{ background: "rgba(255,154,87,0.12)", color: C.orange }}>
          {track.bugs.map((b, i) => (
            <div key={i}>• {b.hint}</div>
          ))}
          {strayLines > 0 && <div>• {strayLines === 1 ? "One line you changed doesn't" : `${strayLines} lines you changed don't`} match the studio version — they're the highlighted ones.</div>}
        </div>
      )}
      <BigButton
        disabled={!allFixed}
        why={
          bugsLeft > 0
            ? `${bugsLeft} bug${bugsLeft === 1 ? "" : "s"} still to find`
            : `Put ${strayLines === 1 ? "one changed line" : "the changed lines"} back`
        }
        onClick={() => onDone(loopLines.map((ls) => ls.map((x) => ({ ...x }))))}
      >
        Soundcheck done — take the booth
      </BigButton>
      </div>
    </div>
  );
}

/* ---------- Live Set: perform to the crowd ---------- */
