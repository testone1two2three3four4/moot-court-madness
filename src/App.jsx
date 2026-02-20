import { useState, useRef, useCallback, useEffect } from "react";

const ROUND_NAMES_LEFT = ["First Round", "Round of 32", "Sweet 16", "Quarterfinals", "Semifinals"];
const ROUND_NAMES_RIGHT = ["Semifinals", "Quarterfinals", "Sweet 16", "Round of 32", "First Round"];

const STORAGE_KEY_PARTICIPANTS = "mcm_participants";
const STORAGE_KEY_ADVANCES = "mcm_advances";

function createFreshParticipants() {
  return Array.from({ length: 64 }, (_, i) => ({
    id: i + 1,
    seed: i + 1,
    name: "",
    school: "",
    photo: null,
  }));
}

function createFreshAdvances() {
  return { left: [[], [], [], [], []], right: [[], [], [], [], []], champion: null };
}

/*
 * Load from localStorage, falling back to fresh data if nothing saved.
 * Wrapped in try/catch because localStorage can throw if storage is
 * full or blocked (e.g. some private browsing modes).
 */
function loadParticipants() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PARTICIPANTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 64) return parsed;
    }
  } catch (e) {
    console.warn("Could not load saved participants:", e);
  }
  return createFreshParticipants();
}

function loadAdvances() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ADVANCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.left && parsed.right) return parsed;
    }
  } catch (e) {
    console.warn("Could not load saved advances:", e);
  }
  return createFreshAdvances();
}

function saveParticipants(data) {
  try {
    localStorage.setItem(STORAGE_KEY_PARTICIPANTS, JSON.stringify(data));
  } catch (e) {
    console.warn("Could not save participants:", e);
  }
}

function saveAdvances(data) {
  try {
    localStorage.setItem(STORAGE_KEY_ADVANCES, JSON.stringify(data));
  } catch (e) {
    console.warn("Could not save advances:", e);
  }
}

/*
 * Compress an image to a smaller base64 string before storing it.
 * Photos at full resolution can blow past localStorage's ~5 MB limit
 * quickly with 64 participants, so we resize to 150px and use JPEG.
 */
function compressImage(dataUrl, maxSize = 150) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > h) { h = (maxSize * h) / w; w = maxSize; }
      else       { w = (maxSize * w) / h; h = maxSize; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

/* ── Avatar component ── */
function Avatar({ photo, size = 22, name }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt=""
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", border: "1.5px solid rgba(212,168,67,0.6)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: "rgba(255,255,255,0.15)",
        border: "1.5px dashed rgba(255,255,255,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.45, color: "rgba(255,255,255,0.5)", flexShrink: 0,
      }}
    >
      {name ? name.charAt(0).toUpperCase() : "?"}
    </div>
  );
}

/* ── Team Slot ── */
function Slot({ participant, isWinner, onClickSlot, onClickAdvance }) {
  const isEmpty = !participant;
  const displayName = participant?.name || (participant ? `Participant ${participant.seed}` : "TBD");
  const school = participant?.school || "";

  return (
    <div
      onClick={() => participant && onClickAdvance ? onClickAdvance(participant) : null}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "3px 8px", height: 32,
        background: isEmpty
          ? "rgba(139,63,175,0.25)"
          : isWinner
            ? "linear-gradient(135deg, #6B2D8B, #8B3FAF)"
            : "linear-gradient(135deg, #7B35A0, #A855C8)",
        borderRadius: 4,
        border: isWinner ? "1.5px solid #D4A843" : "1px solid rgba(255,255,255,0.12)",
        cursor: participant ? "pointer" : "default",
        transition: "all 0.2s",
        position: "relative",
        overflow: "hidden",
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        if (participant) {
          e.currentTarget.style.transform = "scale(1.03)";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(107,45,139,0.5)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {participant && <Avatar photo={participant.photo} size={20} name={displayName} />}
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 600, color: "#fff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {isEmpty ? <span style={{ opacity: 0.4 }}>TBD</span> : displayName}
        </div>
        {school && (
          <div style={{
            fontSize: 7.5, color: "rgba(255,255,255,0.6)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {school}
          </div>
        )}
      </div>
      {participant && (
        <div
          onClick={(e) => { e.stopPropagation(); onClickSlot(participant); }}
          style={{
            width: 14, height: 14, borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 8, color: "rgba(255,255,255,0.6)",
            cursor: "pointer", flexShrink: 0,
          }}
          title="Edit participant"
        >
          ✎
        </div>
      )}
      <div style={{
        position: "absolute", bottom: 2, left: 8, right: 8, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.4), transparent)",
      }} />
    </div>
  );
}

/* ── Matchup (pair of slots) ── */
function Matchup({ teamA, teamB, winnerId, onClickSlot, onAdvance }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Slot
        participant={teamA}
        isWinner={teamA && winnerId === teamA.id}
        onClickSlot={onClickSlot}
        onClickAdvance={onAdvance ? (p) => onAdvance(p) : null}
      />
      <Slot
        participant={teamB}
        isWinner={teamB && winnerId === teamB.id}
        onClickSlot={onClickSlot}
        onClickAdvance={onAdvance ? (p) => onAdvance(p) : null}
      />
    </div>
  );
}

/* ── Bracket connector lines ── */
function Connectors({ count, height, side }) {
  const pairCount = count / 2;
  const segH = height / count;
  const lines = [];
  for (let i = 0; i < pairCount; i++) {
    const topY = segH * (i * 2) + segH / 2;
    const botY = segH * (i * 2 + 1) + segH / 2;
    const midY = (topY + botY) / 2;
    const isLeft = side === "left";
    lines.push(
      <g key={i}>
        <line x1={isLeft ? 0 : 12} y1={topY} x2={6} y2={topY} stroke="#D4A843" strokeWidth="1" opacity="0.5" />
        <line x1={isLeft ? 0 : 12} y1={botY} x2={6} y2={botY} stroke="#D4A843" strokeWidth="1" opacity="0.5" />
        <line x1={6} y1={topY} x2={6} y2={botY} stroke="#D4A843" strokeWidth="1" opacity="0.5" />
        <line x1={6} y1={midY} x2={isLeft ? 12 : 0} y2={midY} stroke="#D4A843" strokeWidth="1" opacity="0.5" />
      </g>
    );
  }
  return (
    <svg width={12} height={height} style={{ flexShrink: 0 }}>
      {lines}
    </svg>
  );
}

/* ── Laurel wreath logo ── */
function LaurelLogo() {
  return (
    <svg viewBox="0 0 280 100" width="260" height="95" style={{ display: "block", margin: "0 auto" }}>
      <g transform="translate(90,50)" fill="none" stroke="#C084D8" strokeWidth="1.3">
        <path d="M0,0 C-8,-16 -24,-28 -40,-32" />
        <ellipse cx="-24" cy="-18" rx="10" ry="5" transform="rotate(-50 -24 -18)" fill="#C084D8" opacity="0.35" />
        <ellipse cx="-34" cy="-27" rx="8" ry="4" transform="rotate(-55 -34 -27)" fill="#C084D8" opacity="0.3" />
        <ellipse cx="-14" cy="-10" rx="8" ry="4" transform="rotate(-40 -14 -10)" fill="#C084D8" opacity="0.4" />
        <path d="M0,0 C-10,-12 -30,-16 -42,-14" />
        <ellipse cx="-28" cy="-10" rx="9" ry="4" transform="rotate(-25 -28 -10)" fill="#C084D8" opacity="0.33" />
        <path d="M0,0 C-10,12 -28,22 -42,24" />
        <ellipse cx="-26" cy="14" rx="9" ry="4.5" transform="rotate(35 -26 14)" fill="#C084D8" opacity="0.35" />
        <ellipse cx="-36" cy="20" rx="7" ry="3.5" transform="rotate(40 -36 20)" fill="#C084D8" opacity="0.3" />
        <path d="M0,0 C-6,16 -20,30 -34,36" />
        <ellipse cx="-18" cy="20" rx="8" ry="4" transform="rotate(55 -18 20)" fill="#C084D8" opacity="0.37" />
      </g>
      <g transform="translate(190,50)" fill="none" stroke="#C084D8" strokeWidth="1.3">
        <path d="M0,0 C8,-16 24,-28 40,-32" />
        <ellipse cx="24" cy="-18" rx="10" ry="5" transform="rotate(50 24 -18)" fill="#C084D8" opacity="0.35" />
        <ellipse cx="34" cy="-27" rx="8" ry="4" transform="rotate(55 34 -27)" fill="#C084D8" opacity="0.3" />
        <ellipse cx="14" cy="-10" rx="8" ry="4" transform="rotate(40 14 -10)" fill="#C084D8" opacity="0.4" />
        <path d="M0,0 C10,-12 30,-16 42,-14" />
        <ellipse cx="28" cy="-10" rx="9" ry="4" transform="rotate(25 28 -10)" fill="#C084D8" opacity="0.33" />
        <path d="M0,0 C10,12 28,22 42,24" />
        <ellipse cx="26" cy="14" rx="9" ry="4.5" transform="rotate(-35 26 14)" fill="#C084D8" opacity="0.35" />
        <ellipse cx="36" cy="20" rx="7" ry="3.5" transform="rotate(-40 36 20)" fill="#C084D8" opacity="0.3" />
        <path d="M0,0 C6,16 20,30 34,36" />
        <ellipse cx="18" cy="20" rx="8" ry="4" transform="rotate(-55 18 20)" fill="#C084D8" opacity="0.37" />
      </g>
      <text x="140" y="62" textAnchor="middle" fontFamily="'Playfair Display',Georgia,serif" fontSize="40" fontWeight="700" fill="#D4A843">C</text>
    </svg>
  );
}

/* ── Trophy icon ── */
function TrophySVG() {
  return (
    <svg viewBox="0 0 50 50" width="44" height="44" style={{ display: "block", margin: "0 auto 6px" }}>
      <circle cx="25" cy="25" r="23" fill="none" stroke="#D4A843" strokeWidth="1.5" opacity="0.6" />
      <path d="M18 14h14v5c0 5-3 9-7 11-4-2-7-6-7-11v-5z" fill="#D4A843" opacity="0.25" stroke="#D4A843" strokeWidth="1.2" />
      <path d="M15 14c-2.5 0-5 2.5-5 5.5s2.5 5.5 5 5" fill="none" stroke="#D4A843" strokeWidth="1.2" />
      <path d="M35 14c2.5 0 5 2.5 5 5.5s-2.5 5.5-5 5" fill="none" stroke="#D4A843" strokeWidth="1.2" />
      <rect x="22" y="31" width="6" height="3" rx="1" fill="#D4A843" opacity="0.4" />
      <rect x="19" y="34" width="12" height="2.5" rx="1" fill="#D4A843" opacity="0.6" />
    </svg>
  );
}

/* ════════════════════════════════════════════
   MAIN APP COMPONENT
   ════════════════════════════════════════════ */
export default function App() {
  const [participants, setParticipants] = useState(loadParticipants);
  const [advances, setAdvances] = useState(loadAdvances);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", school: "", photo: null });
  const [tab, setTab] = useState("bracket");
  const [saveStatus, setSaveStatus] = useState(null); // "saved" | "error" | null
  const fileRef = useRef(null);

  const BRACKET_H = 1180;

  /* Auto-save participants whenever they change */
  useEffect(() => {
    saveParticipants(participants);
    setSaveStatus("saved");
    const timer = setTimeout(() => setSaveStatus(null), 1500);
    return () => clearTimeout(timer);
  }, [participants]);

  /* Auto-save advances whenever they change */
  useEffect(() => {
    saveAdvances(advances);
    setSaveStatus("saved");
    const timer = setTimeout(() => setSaveStatus(null), 1500);
    return () => clearTimeout(timer);
  }, [advances]);

  /* participant lookup */
  const pById = useCallback((id) => participants.find((p) => p.id === id), [participants]);

  /* get teams for a given matchup */
  const getTeams = useCallback(
    (side, round, matchIdx) => {
      const sideParticipants = side === "left" ? participants.slice(0, 32) : participants.slice(32, 64);
      if (round === 0) {
        return [sideParticipants[matchIdx * 2], sideParticipants[matchIdx * 2 + 1]];
      }
      const prevA = advances[side][round - 1]?.[matchIdx * 2];
      const prevB = advances[side][round - 1]?.[matchIdx * 2 + 1];
      return [prevA ? pById(prevA) : null, prevB ? pById(prevB) : null];
    },
    [participants, advances, pById]
  );

  /* advance a team */
  const advanceTeam = useCallback((side, round, matchIdx, participant) => {
    setAdvances((prev) => {
      const next = { ...prev, [side]: prev[side].map((r) => [...r]) };
      next[side][round] = [...(next[side][round] || [])];
      next[side][round][matchIdx] = participant.id;

      // Clear downstream rounds if a pick changed
      for (let r = round + 1; r < 5; r++) {
        const downIdx = Math.floor(matchIdx / Math.pow(2, r - round));
        if (next[side][r]?.[downIdx]) {
          next[side][r] = [...(next[side][r] || [])];
          next[side][r][downIdx] = undefined;
        }
      }
      if (round === 4 && prev.champion) next.champion = null;
      return next;
    });
  }, []);

  /* crown champion */
  const crownChampion = useCallback((participant) => {
    setAdvances((prev) => ({ ...prev, champion: participant.id }));
  }, []);

  /* edit handlers */
  const openEdit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, school: p.school, photo: p.photo });
  };
  const saveEdit = () => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === editing ? { ...p, name: form.name, school: form.school, photo: form.photo } : p
      )
    );
    setEditing(null);
  };
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      // Compress before storing so 64 photos don't exceed localStorage limits
      const compressed = await compressImage(ev.target.result, 150);
      setForm((f) => ({ ...f, photo: compressed }));
    };
    reader.readAsDataURL(file);
  };

  /* Reset all data */
  const resetAll = () => {
    if (window.confirm("This will clear ALL participant data and bracket progress. Are you sure?")) {
      const fresh = createFreshParticipants();
      setParticipants(fresh);
      setAdvances(createFreshAdvances());
      saveParticipants(fresh);
      saveAdvances(createFreshAdvances());
    }
  };

  /* render one side of the bracket */
  const renderSide = (side) => {
    const roundCounts = [16, 8, 4, 2, 1];
    const rounds = [];

    for (let r = 0; r < 5; r++) {
      const matchups = [];
      for (let m = 0; m < roundCounts[r]; m++) {
        const [teamA, teamB] = getTeams(side, r, m);
        const winnerId = advances[side][r]?.[m];
        matchups.push(
          <Matchup
            key={m}
            teamA={teamA}
            teamB={teamB}
            winnerId={winnerId}
            onClickSlot={openEdit}
            onAdvance={(p) => advanceTeam(side, r, m, p)}
          />
        );
      }

      const roundEl = (
        <div
          key={`round-${r}`}
          style={{
            display: "flex", flexDirection: "column", justifyContent: "space-around",
            height: BRACKET_H, flexShrink: 0, width: 130,
          }}
        >
          {matchups}
        </div>
      );

      if (side === "left") {
        rounds.push(roundEl);
        if (r < 4) rounds.push(<Connectors key={`conn-${r}`} count={roundCounts[r]} height={BRACKET_H} side="left" />);
      } else {
        if (r < 4) rounds.unshift(<Connectors key={`conn-${r}`} count={roundCounts[r]} height={BRACKET_H} side="right" />);
        rounds.unshift(roundEl);
      }
    }
    return rounds;
  };

  /* championship data */
  const leftFinalist = advances.left[4]?.[0] ? pById(advances.left[4][0]) : null;
  const rightFinalist = advances.right[4]?.[0] ? pById(advances.right[4][0]) : null;
  const champion = advances.champion ? pById(advances.champion) : null;
  const editingP = editing ? pById(editing) : null;

  return (
    <div style={{ fontFamily: "'Montserrat', system-ui, sans-serif", background: "#FDF8F0", minHeight: "100vh", color: "#2D2D2D" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ═══ HERO ═══ */}
      <header
        style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #2d1054 30%, #4a1a7a 60%, #2d1054 100%)",
          padding: "36px 16px 28px", textAlign: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #D4A843, transparent)" }} />

        <div style={{ position: "relative", zIndex: 2 }}>
          <LaurelLogo />
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "2.4rem", fontWeight: 400, color: "#fff",
            letterSpacing: "0.03em", lineHeight: 1.1, margin: "4px 0 0",
          }}>
            Moot <span style={{ color: "#D4A843", fontWeight: 700, fontSize: "2.7rem" }}>C</span>ourt Madness
          </h1>
          <div style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "1.05rem", color: "#F0D68A", letterSpacing: "0.25em", marginTop: 4,
          }}>
            powered by{" "}
            <span style={{ fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" }}>CICERO</span>
          </div>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "0.95rem", color: "rgba(255,255,255,0.6)",
            marginTop: 10, letterSpacing: "0.06em",
          }}>
            The Ultimate Legal Advocacy Tournament
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 18, flexWrap: "wrap" }}>
            {[
              ["Tournament", "March 3 \u2013 April 7, 2026"],
              ["Teams", "64 Competitors"],
              ["Format", "Single Elimination"],
              ["Championship", "April 7, 2026"],
            ].map(([label, value]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "#D4A843", fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "0.85rem", color: "#fff" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
            {["bracket", "schedule", "details"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "8px 24px", borderRadius: 30,
                  background: tab === t ? "linear-gradient(135deg, #B8860B, #D4A843)" : "rgba(255,255,255,0.08)",
                  color: tab === t ? "#1a0a2e" : "rgba(255,255,255,0.7)",
                  border: tab === t ? "none" : "1px solid rgba(255,255,255,0.15)",
                  fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "0.7rem",
                  letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer",
                  transition: "all 0.25s",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ═══ BRACKET TAB ═══ */}
      {tab === "bracket" && (
        <section style={{ padding: "16px 8px 40px", position: "relative" }}>
          {/* Save indicator */}
          <div style={{
            position: "fixed", bottom: 20, right: 20, zIndex: 999,
            display: "flex", gap: 8, alignItems: "center",
          }}>
            {saveStatus === "saved" && (
              <div style={{
                background: "rgba(34,120,69,0.9)", color: "#fff",
                padding: "6px 14px", borderRadius: 20,
                fontSize: "0.7rem", fontWeight: 600,
                animation: "fadeIn 0.3s ease",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
              }}>
                ✓ Saved
              </div>
            )}
            <button
              onClick={resetAll}
              title="Reset all data"
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(107,45,139,0.85)", border: "1px solid rgba(212,168,67,0.3)",
                color: "#F0D68A", fontSize: "0.85rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              ↺
            </button>
          </div>

          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{
              fontSize: "0.7rem", color: "#8B3FAF", fontWeight: 500,
              background: "rgba(139,63,175,0.08)", padding: "5px 16px",
              borderRadius: 20, display: "inline-block",
            }}>
              Click a team to advance them &nbsp;·&nbsp; Click ✎ to edit participant details &amp; upload photos &nbsp;·&nbsp; Data saves automatically
            </span>
          </div>

          {/* Round labels */}
          <div style={{ display: "flex", justifyContent: "center", maxWidth: 1520, margin: "0 auto 8px" }}>
            <div style={{ display: "flex", width: "100%", gap: 2 }}>
              {[...ROUND_NAMES_LEFT, "Finals", ...ROUND_NAMES_RIGHT].map((name, i) => (
                <div key={i} style={{
                  flex: i === 5 ? 1.2 : 1, textAlign: "center",
                  fontSize: "0.52rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.1em", color: i === 5 ? "#1a0a2e" : "#fff",
                  background: i === 5 ? "linear-gradient(135deg, #B8860B, #D4A843)" : "#6B2D8B",
                  padding: "5px 2px", borderRadius: 3,
                }}>{name}</div>
              ))}
            </div>
          </div>

          {/* The bracket */}
          <div className="bracket-scroll" style={{ display: "flex", justifyContent: "center", maxWidth: 1520, margin: "0 auto", overflowX: "auto", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "stretch", minWidth: 1400 }}>
              {renderSide("left")}

              {/* Championship column */}
              <div style={{
                display: "flex", flexDirection: "column", justifyContent: "center",
                alignItems: "center", padding: "0 10px", minWidth: 150, height: BRACKET_H,
              }}>
                <TrophySVG />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                  {/* Left finalist slot */}
                  <div
                    onClick={() => leftFinalist && crownChampion(leftFinalist)}
                    style={{
                      width: 140, height: 36, borderRadius: 5,
                      background: champion?.id === leftFinalist?.id
                        ? "linear-gradient(135deg, #6B2D8B, #3d1560)"
                        : leftFinalist ? "linear-gradient(135deg, #7B35A0, #A855C8)" : "rgba(139,63,175,0.2)",
                      border: champion?.id === leftFinalist?.id ? "2px solid #D4A843" : "1px solid rgba(255,255,255,0.12)",
                      display: "flex", alignItems: "center", gap: 6, padding: "0 8px",
                      cursor: leftFinalist ? "pointer" : "default",
                    }}
                  >
                    {leftFinalist && <Avatar photo={leftFinalist.photo} size={22} name={leftFinalist.name || `P${leftFinalist.seed}`} />}
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {leftFinalist ? (leftFinalist.name || `Participant ${leftFinalist.seed}`) : <span style={{ opacity: 0.4 }}>TBD</span>}
                    </span>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 8, color: "#8B3FAF", fontWeight: 600, letterSpacing: "0.1em" }}>VS</div>
                  {/* Right finalist slot */}
                  <div
                    onClick={() => rightFinalist && crownChampion(rightFinalist)}
                    style={{
                      width: 140, height: 36, borderRadius: 5,
                      background: champion?.id === rightFinalist?.id
                        ? "linear-gradient(135deg, #6B2D8B, #3d1560)"
                        : rightFinalist ? "linear-gradient(135deg, #7B35A0, #A855C8)" : "rgba(139,63,175,0.2)",
                      border: champion?.id === rightFinalist?.id ? "2px solid #D4A843" : "1px solid rgba(255,255,255,0.12)",
                      display: "flex", alignItems: "center", gap: 6, padding: "0 8px",
                      cursor: rightFinalist ? "pointer" : "default",
                    }}
                  >
                    {rightFinalist && <Avatar photo={rightFinalist.photo} size={22} name={rightFinalist.name || `P${rightFinalist.seed}`} />}
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {rightFinalist ? (rightFinalist.name || `Participant ${rightFinalist.seed}`) : <span style={{ opacity: 0.4 }}>TBD</span>}
                    </span>
                  </div>
                </div>
                {champion ? (
                  <div style={{ marginTop: 10, textAlign: "center" }}>
                    <Avatar photo={champion.photo} size={36} name={champion.name || `P${champion.seed}`} />
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "0.7rem", color: "#B8860B", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 4 }}>Champion</div>
                    <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#4a1a7a", marginTop: 1 }}>{champion.name || `Participant ${champion.seed}`}</div>
                  </div>
                ) : (
                  <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "0.65rem", color: "#B8860B", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 10, opacity: 0.5 }}>Champion</div>
                )}
              </div>

              {renderSide("right")}
            </div>
          </div>
        </section>
      )}

      {/* ═══ SCHEDULE TAB ═══ */}
      {tab === "schedule" && (
        <section style={{ padding: "40px 20px 60px", maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.8rem", color: "#4a1a7a", textAlign: "center", marginBottom: 8 }}>Tournament Schedule</h2>
          <div style={{ width: 50, height: 2, background: "#D4A843", margin: "0 auto 30px" }} />
          {[
            { date: "March 3\u20134, 2026", round: "First Round", detail: "64 teams \u2192 32 teams \u00B7 32 matchups" },
            { date: "March 10\u201311, 2026", round: "Round of 32", detail: "32 teams \u2192 16 teams \u00B7 16 matchups" },
            { date: "March 17\u201318, 2026", round: "Sweet Sixteen", detail: "16 teams \u2192 8 teams \u00B7 8 matchups" },
            { date: "March 24, 2026", round: "Quarterfinals", detail: "8 teams \u2192 4 teams \u00B7 4 matchups" },
            { date: "March 31, 2026", round: "Semifinals", detail: "4 teams \u2192 2 teams \u00B7 2 matchups" },
            { date: "April 7, 2026", round: "Championship", detail: "The final showdown for the title" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#8B3FAF", border: "2.5px solid #D4A843", flexShrink: 0, marginTop: 4 }} />
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#6B2D8B", letterSpacing: "0.03em" }}>{item.date}</div>
                <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.1rem", color: "#2D2D2D", marginTop: 1 }}>{item.round}</div>
                <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 1 }}>{item.detail}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ═══ DETAILS TAB ═══ */}
      {tab === "details" && (
        <section style={{ background: "linear-gradient(135deg, #1a0a2e, #2d1054)", padding: "40px 20px 60px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.8rem", color: "#fff", textAlign: "center", marginBottom: 8 }}>Tournament Details</h2>
          <div style={{ width: 50, height: 2, background: "#D4A843", margin: "0 auto 30px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, maxWidth: 1000, margin: "0 auto" }}>
            {[
              { icon: "\u2696", title: "Format", desc: "64 teams compete in a single-elimination bracket across six rounds of intense oral advocacy. Each round features a new legal issue drawn from landmark cases and emerging jurisprudence." },
              { icon: "\u2699", title: "Powered by CICERO", desc: "CICERO provides the competitive intelligence platform that drives scoring, analytics, and real-time bracket updates throughout the tournament." },
              { icon: "\uD83C\uDFC6", title: "Championship", desc: "The final two advocates face off in a special championship round judged by a distinguished panel. The champion earns the Moot Court Madness title.", badge: "April 7, 2026" },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(212,168,67,0.2)",
                  borderRadius: 10, padding: "24px 20px", textAlign: "center",
                  transition: "transform 0.3s, border-color 0.3s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = "#D4A843"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(212,168,67,0.2)"; }}
              >
                <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>{card.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.05rem", color: "#F0D68A", marginBottom: 8 }}>{card.title}</h3>
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{card.desc}</p>
                {card.badge && (
                  <span style={{ display: "inline-block", background: "linear-gradient(135deg, #B8860B, #D4A843)", color: "#1a0a2e", padding: "3px 14px", borderRadius: 20, fontWeight: 700, fontSize: "0.75rem", marginTop: 10 }}>{card.badge}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background: "#0d0517", padding: "24px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1rem", color: "#D4A843", marginBottom: 4 }}>Moot Court Madness</div>
        <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>Powered by CICERO · © 2026 All Rights Reserved</p>
      </footer>

      {/* ═══ EDIT MODAL ═══ */}
      {editing && editingP && (
        <div
          onClick={() => setEditing(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(13,5,23,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, #1a0a2e, #2d1054)",
              border: "1px solid rgba(212,168,67,0.3)", borderRadius: 14,
              padding: "28px 24px", width: 340, maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.1rem", color: "#F0D68A", marginBottom: 16, textAlign: "center" }}>
              Edit Participant #{editingP.seed}
            </h3>

            {/* Photo upload */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 72, height: 72, borderRadius: "50%", margin: "0 auto 8px",
                  background: form.photo ? `url(${form.photo}) center/cover` : "rgba(255,255,255,0.08)",
                  border: "2px dashed rgba(212,168,67,0.4)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#D4A843")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,168,67,0.4)")}
              >
                {!form.photo && (
                  <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.3 }}>
                    Click to<br />upload
                  </span>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              {form.photo && (
                <button
                  onClick={() => setForm((f) => ({ ...f, photo: null }))}
                  style={{
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.4)", fontSize: "0.65rem",
                    cursor: "pointer", textDecoration: "underline",
                  }}
                >
                  Remove photo
                </button>
              )}
            </div>

            {/* Name input */}
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ fontSize: "0.65rem", color: "#D4A843", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Participant name"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 6,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", fontSize: "0.85rem",
                  fontFamily: "'Montserrat', sans-serif", outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#D4A843")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
              />
            </label>

            {/* School input */}
            <label style={{ display: "block", marginBottom: 20 }}>
              <span style={{ fontSize: "0.65rem", color: "#D4A843", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>School / Organization</span>
              <input
                value={form.school}
                onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                placeholder="School or organization name"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 6,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", fontSize: "0.85rem",
                  fontFamily: "'Montserrat', sans-serif", outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#D4A843")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
              />
            </label>

            {/* Save / Cancel */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setEditing(null)}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.8rem",
                  cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                style={{
                  flex: 1, padding: "9px", borderRadius: 8,
                  background: "linear-gradient(135deg, #B8860B, #D4A843)",
                  border: "none", color: "#1a0a2e", fontWeight: 700, fontSize: "0.8rem",
                  cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
