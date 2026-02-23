import { useState, useRef, useCallback } from "react";

const ROUND_NAMES_LEFT = ["First Round", "Round of 32", "Sweet 16", "Quarterfinals", "Semifinals"];
const ROUND_DATES_LEFT = ["Mar 3\u20134", "Mar 10\u201311", "Mar 17\u201318", "Mar 24", "Mar 31"];
const ROUND_NAMES_RIGHT = ["Semifinals", "Quarterfinals", "Sweet 16", "Round of 32", "First Round"];
const ROUND_DATES_RIGHT = ["Mar 31", "Mar 24", "Mar 17\u201318", "Mar 10\u201311", "Mar 3\u20134"];

function initParticipants() {
  return Array.from({ length: 64 }, (_, i) => ({
    id: i + 1,
    seed: i + 1,
    name: "",
    school: "",
    photo: null,
  }));
}

function initAdvances() {
  return { left: [[], [], [], [], []], right: [[], [], [], [], []], champion: null };
}

function Avatar({ photo, size = 24, name }) {
  if (photo) {
    return (
      <img src={photo} alt=""
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1.5px solid rgba(212,168,67,0.7)", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "rgba(255,255,255,0.18)", border: "1.5px dashed rgba(255,255,255,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 700, color: "rgba(255,255,255,0.6)", flexShrink: 0,
    }}>
      {name ? name.charAt(0).toUpperCase() : "?"}
    </div>
  );
}

function Slot({ participant, isWinner, onClickSlot, onClickAdvance }) {
  const isEmpty = !participant;
  const displayName = participant?.name || (participant ? `Participant ${participant.seed}` : "TBD");
  const school = participant?.school || "";

  return (
    <div
      onClick={() => participant && onClickAdvance ? onClickAdvance(participant) : null}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 8px", height: 36,
        background: isEmpty
          ? "rgba(139,63,175,0.22)"
          : isWinner
            ? "linear-gradient(135deg, #5C2680, #7B35A0)"
            : "linear-gradient(135deg, #7B35A0, #A855C8)",
        borderRadius: 4,
        border: isWinner ? "2px solid #D4A843" : "1px solid rgba(255,255,255,0.12)",
        cursor: participant ? "pointer" : "default",
        transition: "all 0.2s",
        position: "relative", overflow: "hidden", minWidth: 0,
      }}
      onMouseEnter={(e) => { if (participant) { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(107,45,139,0.5)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {participant && <Avatar photo={participant.photo} size={24} name={displayName} />}
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "#fff",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}>
          {isEmpty ? <span style={{ opacity: 0.4, fontWeight: 500 }}>TBD</span> : displayName}
        </div>
        {school && (
          <div style={{
            fontSize: 9, color: "#F0D68A", fontWeight: 500,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            letterSpacing: "0.02em",
          }}>
            {school}
          </div>
        )}
      </div>
      {participant && (
        <div
          onClick={(e) => { e.stopPropagation(); onClickSlot(participant); }}
          style={{
            width: 16, height: 16, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "rgba(255,255,255,0.7)",
            cursor: "pointer", flexShrink: 0,
          }}
          title="Edit participant"
        >✎</div>
      )}
      <div style={{ position: "absolute", bottom: 2, left: 8, right: 8, height: 1, background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.35), transparent)" }} />
    </div>
  );
}

function Matchup({ teamA, teamB, winnerId, onClickSlot, onAdvance }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Slot participant={teamA} isWinner={teamA && winnerId === teamA.id} onClickSlot={onClickSlot} onClickAdvance={onAdvance ? (p) => onAdvance(p) : null} />
      <Slot participant={teamB} isWinner={teamB && winnerId === teamB.id} onClickSlot={onClickSlot} onClickAdvance={onAdvance ? (p) => onAdvance(p) : null} />
    </div>
  );
}

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
        <line x1={isLeft ? 0 : 14} y1={topY} x2={7} y2={topY} stroke="#D4A843" strokeWidth="1.2" opacity="0.45" />
        <line x1={isLeft ? 0 : 14} y1={botY} x2={7} y2={botY} stroke="#D4A843" strokeWidth="1.2" opacity="0.45" />
        <line x1={7} y1={topY} x2={7} y2={botY} stroke="#D4A843" strokeWidth="1.2" opacity="0.45" />
        <line x1={7} y1={midY} x2={isLeft ? 14 : 0} y2={midY} stroke="#D4A843" strokeWidth="1.2" opacity="0.45" />
      </g>
    );
  }
  return <svg width={14} height={height} style={{ flexShrink: 0 }}>{lines}</svg>;
}

function LaurelLogo() {
  return (
    <svg viewBox="0 0 280 100" width="220" height="80" style={{ display: "block", margin: "0 auto" }}>
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

function TrophySVG({ size = 52 }) {
  return (
    <svg viewBox="0 0 50 50" width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <circle cx="25" cy="25" r="23" fill="none" stroke="#D4A843" strokeWidth="1.8" opacity="0.7" />
      <path d="M18 14h14v5c0 5-3 9-7 11-4-2-7-6-7-11v-5z" fill="#D4A843" opacity="0.3" stroke="#D4A843" strokeWidth="1.4" />
      <path d="M15 14c-2.5 0-5 2.5-5 5.5s2.5 5.5 5 5" fill="none" stroke="#D4A843" strokeWidth="1.4" />
      <path d="M35 14c2.5 0 5 2.5 5 5.5s-2.5 5.5-5 5" fill="none" stroke="#D4A843" strokeWidth="1.4" />
      <rect x="22" y="31" width="6" height="3" rx="1" fill="#D4A843" opacity="0.5" />
      <rect x="19" y="34" width="12" height="2.5" rx="1" fill="#D4A843" opacity="0.7" />
    </svg>
  );
}

export default function App() {
  const [participants, setParticipants] = useState(initParticipants);
  const [advances, setAdvances] = useState(initAdvances);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", school: "", photo: null });
  const fileRef = useRef(null);

  const BRACKET_H = 1220;

  const pById = useCallback((id) => participants.find((p) => p.id === id), [participants]);

  const getTeams = useCallback(
    (side, round, matchIdx) => {
      const sideP = side === "left" ? participants.slice(0, 32) : participants.slice(32, 64);
      if (round === 0) return [sideP[matchIdx * 2], sideP[matchIdx * 2 + 1]];
      const prevA = advances[side][round - 1]?.[matchIdx * 2];
      const prevB = advances[side][round - 1]?.[matchIdx * 2 + 1];
      return [prevA ? pById(prevA) : null, prevB ? pById(prevB) : null];
    },
    [participants, advances, pById]
  );

  const advanceTeam = useCallback((side, round, matchIdx, participant) => {
    setAdvances((prev) => {
      const next = { ...prev, [side]: prev[side].map((r) => [...r]) };
      next[side][round] = [...(next[side][round] || [])];
      next[side][round][matchIdx] = participant.id;
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

  const crownChampion = useCallback((participant) => {
    setAdvances((prev) => ({ ...prev, champion: participant.id }));
  }, []);

  const openEdit = (p) => { setEditing(p.id); setForm({ name: p.name, school: p.school, photo: p.photo }); };
  const saveEdit = () => {
    setParticipants((prev) => prev.map((p) => p.id === editing ? { ...p, name: form.name, school: form.school, photo: form.photo } : p));
    setEditing(null);
  };
  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const renderSide = (side) => {
    const roundCounts = [16, 8, 4, 2, 1];
    const rounds = [];
    for (let r = 0; r < 5; r++) {
      const matchups = [];
      for (let m = 0; m < roundCounts[r]; m++) {
        const [teamA, teamB] = getTeams(side, r, m);
        const winnerId = advances[side][r]?.[m];
        matchups.push(
          <Matchup key={m} teamA={teamA} teamB={teamB} winnerId={winnerId}
            onClickSlot={openEdit} onAdvance={(p) => advanceTeam(side, r, m, p)}
          />
        );
      }
      const roundEl = (
        <div key={`round-${r}`} style={{
          display: "flex", flexDirection: "column", justifyContent: "space-around",
          height: BRACKET_H, flexShrink: 0, width: 145,
        }}>
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

  const leftFinalist = advances.left[4]?.[0] ? pById(advances.left[4][0]) : null;
  const rightFinalist = advances.right[4]?.[0] ? pById(advances.right[4][0]) : null;
  const champion = advances.champion ? pById(advances.champion) : null;
  const editingP = editing ? pById(editing) : null;

  const FinalistSlot = ({ finalist, isChamp }) => (
    <div
      onClick={() => finalist && crownChampion(finalist)}
      style={{
        width: 180, height: 48, borderRadius: 6,
        background: isChamp
          ? "linear-gradient(135deg, #4a1a7a, #2d1054)"
          : finalist ? "linear-gradient(135deg, #7B35A0, #A855C8)" : "rgba(139,63,175,0.18)",
        border: isChamp ? "2.5px solid #D4A843" : "1.5px solid rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", gap: 8, padding: "0 10px",
        cursor: finalist ? "pointer" : "default",
        boxShadow: isChamp ? "0 0 20px rgba(212,168,67,0.3)" : "none",
        transition: "all 0.25s",
      }}
      onMouseEnter={(e) => { if (finalist) e.currentTarget.style.boxShadow = "0 4px 16px rgba(107,45,139,0.5)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = isChamp ? "0 0 20px rgba(212,168,67,0.3)" : "none"; }}
    >
      {finalist && <Avatar photo={finalist.photo} size={30} name={finalist.name || `P${finalist.seed}`} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 12.5, fontWeight: 700, color: "#fff",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block",
          textShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}>
          {finalist ? (finalist.name || `Participant ${finalist.seed}`) : <span style={{ opacity: 0.35, fontWeight: 400 }}>TBD</span>}
        </span>
        {finalist?.school && (
          <span style={{ fontSize: 10, color: "#F0D68A", fontWeight: 500, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {finalist.school}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      fontFamily: "'Montserrat', system-ui, sans-serif",
      background: "#FDF8F0", minHeight: "100vh", color: "#2D2D2D",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <section style={{ padding: "10px 6px 10px", position: "relative" }}>

        {/* Round labels with dates */}
        <div style={{ display: "flex", justifyContent: "center", margin: "0 auto 6px" }}>
          <div style={{ display: "flex", width: "100%", gap: 2, alignItems: "stretch" }}>
            {ROUND_NAMES_LEFT.map((name, i) => (
              <div key={`l${i}`} style={{
                flex: 1, textAlign: "center", background: "#6B2D8B",
                padding: "6px 3px", borderRadius: 4, minWidth: 0,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{name}</div>
                <div style={{ fontSize: 9, color: "#F0D68A", fontWeight: 500, marginTop: 1 }}>{ROUND_DATES_LEFT[i]}</div>
              </div>
            ))}
            <div style={{
              flex: 1.3, textAlign: "center",
              background: "linear-gradient(135deg, #B8860B, #D4A843)",
              padding: "6px 3px", borderRadius: 4, minWidth: 0,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#1a0a2e", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.3 }}>Championship</div>
              <div style={{ fontSize: 9.5, color: "#3d1560", fontWeight: 600, marginTop: 1 }}>Apr 7</div>
            </div>
            {ROUND_NAMES_RIGHT.map((name, i) => (
              <div key={`r${i}`} style={{
                flex: 1, textAlign: "center", background: "#6B2D8B",
                padding: "6px 3px", borderRadius: 4, minWidth: 0,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1.3 }}>{name}</div>
                <div style={{ fontSize: 9, color: "#F0D68A", fontWeight: 500, marginTop: 1 }}>{ROUND_DATES_RIGHT[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bracket */}
        <div style={{ display: "flex", justifyContent: "center", margin: "0 auto", overflowX: "auto", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "stretch", width: "100%" }}>

            {renderSide("left")}

            {/* Center column */}
            <div style={{
              display: "flex", flexDirection: "column",
              justifyContent: "center", alignItems: "center",
              padding: "0 8px", minWidth: 210, height: BRACKET_H,
              position: "relative",
            }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <LaurelLogo />
                <h1 style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "1.55rem", fontWeight: 400, color: "#2D2D2D",
                  letterSpacing: "0.03em", lineHeight: 1.1, margin: "2px 0 0",
                }}>
                  Moot <span style={{ color: "#D4A843", fontWeight: 700, fontSize: "1.8rem" }}>C</span>ourt Madness
                </h1>
                <div style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "0.85rem", color: "#8B3FAF", letterSpacing: "0.2em", marginTop: 3,
                }}>
                  powered by <span style={{ fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" }}>CICERO</span>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 10, flexWrap: "wrap" }}>
                  {[
                    ["Tournament", "Mar 3 \u2013 Apr 7, 2026"],
                    ["Format", "Single Elimination"],
                  ].map(([label, value]) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", color: "#B8860B", fontWeight: 700, marginBottom: 1 }}>{label}</div>
                      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 11, color: "#4a1a7a", fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ width: 60, height: 2, background: "linear-gradient(90deg, transparent, #D4A843, transparent)", margin: "0 auto 14px" }} />

              <TrophySVG size={48} />

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                <FinalistSlot finalist={leftFinalist} isChamp={champion?.id === leftFinalist?.id} />
                <div style={{ textAlign: "center", fontSize: 10, color: "#6B2D8B", fontWeight: 800, letterSpacing: "0.15em" }}>VS</div>
                <FinalistSlot finalist={rightFinalist} isChamp={champion?.id === rightFinalist?.id} />
              </div>

              {champion ? (
                <div style={{
                  marginTop: 14, textAlign: "center",
                  background: "linear-gradient(135deg, rgba(212,168,67,0.12), rgba(184,134,11,0.08))",
                  border: "2px solid #D4A843", borderRadius: 10,
                  padding: "12px 24px",
                  boxShadow: "0 0 30px rgba(212,168,67,0.2)",
                }}>
                  <Avatar photo={champion.photo} size={44} name={champion.name || `P${champion.seed}`} />
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 15, color: "#B8860B", fontWeight: 700,
                    letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 6,
                  }}>Champion</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2D2D", marginTop: 3 }}>{champion.name || `Participant ${champion.seed}`}</div>
                  {champion.school && (
                    <div style={{ fontSize: 11.5, color: "#6B2D8B", fontWeight: 600, marginTop: 1 }}>{champion.school}</div>
                  )}
                </div>
              ) : (
                <div style={{
                  marginTop: 14, textAlign: "center",
                  background: "rgba(212,168,67,0.06)",
                  border: "1.5px dashed rgba(212,168,67,0.3)", borderRadius: 10,
                  padding: "10px 24px",
                }}>
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 13, color: "#B8860B", fontWeight: 700,
                    letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.5,
                  }}>Champion</div>
                </div>
              )}
            </div>

            {renderSide("right")}
          </div>
        </div>
      </section>

      <footer style={{ background: "#0d0517", padding: "14px 20px", textAlign: "center" }}>
        <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 12, color: "#D4A843" }}>Moot Court Madness</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 10 }}>Powered by CICERO · © 2026</span>
      </footer>

      {/* Edit Modal */}
      {editing && editingP && (
        <div onClick={() => setEditing(null)} style={{
          position: "fixed", inset: 0, background: "rgba(13,5,23,0.82)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(5px)",
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "linear-gradient(135deg, #1a0a2e, #2d1054)",
            border: "1px solid rgba(212,168,67,0.35)", borderRadius: 14,
            padding: "28px 24px", width: 360, maxWidth: "92vw",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          }}>
            <h3 style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "1.15rem", color: "#F0D68A", marginBottom: 16, textAlign: "center",
            }}>
              Edit Participant #{editingP.seed}
            </h3>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div onClick={() => fileRef.current?.click()} style={{
                width: 80, height: 80, borderRadius: "50%", margin: "0 auto 8px",
                background: form.photo ? `url(${form.photo}) center/cover` : "rgba(255,255,255,0.08)",
                border: "2px dashed rgba(212,168,67,0.4)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#D4A843")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(212,168,67,0.4)")}
              >
                {!form.photo && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 1.3 }}>Click to<br />upload</span>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              {form.photo && (
                <button onClick={() => setForm((f) => ({ ...f, photo: null }))} style={{
                  background: "none", border: "none", color: "rgba(255,255,255,0.45)",
                  fontSize: 12, cursor: "pointer", textDecoration: "underline",
                }}>Remove photo</button>
              )}
            </div>
            <label style={{ display: "block", marginBottom: 14 }}>
              <span style={{ fontSize: 11, color: "#D4A843", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Name</span>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Participant name"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 6,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)",
                  color: "#fff", fontSize: 14, fontFamily: "'Montserrat', sans-serif", outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#D4A843")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.18)")}
              />
            </label>
            <label style={{ display: "block", marginBottom: 22 }}>
              <span style={{ fontSize: 11, color: "#D4A843", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>School / Organization</span>
              <input value={form.school} onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                placeholder="School or organization name"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 6,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)",
                  color: "#fff", fontSize: 14, fontFamily: "'Montserrat', sans-serif", outline: "none",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#D4A843")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.18)")}
              />
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setEditing(null)} style={{
                flex: 1, padding: "10px", borderRadius: 8,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 13,
                cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
              }}>Cancel</button>
              <button onClick={saveEdit} style={{
                flex: 1, padding: "10px", borderRadius: 8,
                background: "linear-gradient(135deg, #B8860B, #D4A843)",
                border: "none", color: "#1a0a2e", fontWeight: 700, fontSize: 13,
                cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
