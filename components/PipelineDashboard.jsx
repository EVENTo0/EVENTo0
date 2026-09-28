import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { SCENES, ACT_COLORS } from "../lib/scenes";

const STATUS_STYLE = {
  pending: { color: "#444",    label: "QUEUED",  dot: "#333"    },
  running: { color: "#C9A84C", label: "RUNNING", dot: "#C9A84C" },
  done:    { color: "#60A860", label: "DONE",    dot: "#60A860" },
  error:   { color: "#C04040", label: "ERROR",   dot: "#C04040" },
};

async function generatePrompts(scene) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sceneId: scene.id }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function exportAllPrompts(statuses) {
  const scenes = SCENES.map(s => {
    const st = statuses[s.id];
    return {
      id: s.id,
      act: s.act,
      arabic: s.arabic,
      time: s.time,
      emotion: s.emotion,
      status: st.status,
      prompts: st.prompts || null,
      cast: st.cast || null,
      quality: st.quality || null,
    };
  });

  const payload = {
    film: "الجذر / THE ROOT",
    exported: new Date().toISOString(),
    scenes,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `root-storyboard-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PipelineDashboard() {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(SCENES.map(s => [s.id, { status: "pending", prompts: null, error: null }]))
  );
  const [selected, setSelected] = useState("S01");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [apiHealth, setApiHealth] = useState(null); // null=checking, true=ok, false=missing
  const abortRef = useRef(false);
  const logEndRef = useRef(null);

  // Check API health on mount
  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(d => setApiHealth(d.ok))
      .catch(() => setApiHealth(false));
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const addLog = (msg, type = "info") =>
    setLog(prev => [...prev.slice(-60), { msg, type, t: new Date().toLocaleTimeString() }]);

  const setStatus = (id, patch) =>
    setStatuses(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const runAll = async () => {
    if (apiHealth === false) {
      addLog("✗ API key not configured — see banner above", "error");
      return;
    }
    setRunning(true);
    abortRef.current = false;
    addLog("╔══ Pipeline started — الجذر / THE ROOT ══╗", "system");

    let done = 0;
    for (const scene of SCENES) {
      if (abortRef.current) { addLog("Pipeline aborted by user", "warn"); break; }
      setStatus(scene.id, { status: "running" });
      setSelected(scene.id);
      addLog(`⟳  ${scene.id} — ${scene.arabic}`, "info");
      try {
        const r = await generatePrompts(scene);
        setStatus(scene.id, { status: "done", prompts: r.prompts, quality: r.quality, cast: r.cast });
        done++;
        addLog(`✓  ${scene.id} — prompts generated`, "success");
      } catch (e) {
        setStatus(scene.id, { status: "error", error: e.message });
        addLog(`✗  ${scene.id} — ${e.message}`, "error");
      }
      await new Promise(r => setTimeout(r, 600));
    }

    addLog(`╚══ Complete: ${done}/${SCENES.length} scenes ══╝`, "system");
    setRunning(false);
  };

  const runSingle = async (scene) => {
    if (running) return;
    if (apiHealth === false) {
      addLog("✗ API key not configured — see banner above", "error");
      return;
    }
    setStatus(scene.id, { status: "running" });
    setSelected(scene.id);
    addLog(`⟳  Running ${scene.id} — ${scene.arabic}`, "info");
    try {
      const r = await generatePrompts(scene);
      setStatus(scene.id, { status: "done", prompts: r.prompts, quality: r.quality, cast: r.cast });
      addLog(`✓  ${scene.id} done`, "success");
    } catch (e) {
      setStatus(scene.id, { status: "error", error: e.message });
      addLog(`✗  ${scene.id} error: ${e.message}`, "error");
    }
  };

  const resetAll = () => {
    if (running) return;
    setStatuses(Object.fromEntries(SCENES.map(s => [s.id, { status: "pending", prompts: null, error: null }])));
    setLog([]);
  };

  const doneCount = Object.values(statuses).filter(s => s.status === "done").length;
  const errorCount = Object.values(statuses).filter(s => s.status === "error").length;
  const progress = Math.round((doneCount / SCENES.length) * 100);
  const selectedScene = SCENES.find(s => s.id === selected);
  const selectedStatus = statuses[selected];
  const actColor = ACT_COLORS[selectedScene?.act] || "#C9A84C";
  const canExport = doneCount > 0;

  return (
    <>
      <Head>
        <title>الجذر / THE ROOT — Storyboard Pipeline</title>
      </Head>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes spin-ring {
          to { transform: rotate(360deg); }
        }
        .running-dot { animation: pulse-dot 1.2s ease-in-out infinite; }
        .spin-ring   { animation: spin-ring 1.4s linear infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2A2A; border-radius: 2px; }
        button:hover { opacity: 0.85; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#060606", color: "#E0D8C8", fontFamily: "monospace, Georgia, serif", display: "flex", flexDirection: "column" }}>

        {/* API Health Banner */}
        {apiHealth === false && (
          <div style={{ background: "#1A0808", borderBottom: "1px solid #C0404040", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#C04040" }}>
              ✗ <strong>ANTHROPIC_API_KEY not configured.</strong> Add it to <code style={{ background: "#0F0808", padding: "1px 6px" }}>.env.local</code> and restart the server.
            </span>
            <span style={{ fontSize: "10px", color: "#555" }}>docs/product/STORYBOARD-BRIEF.md · FR-01</span>
          </div>
        )}
        {apiHealth === true && (
          <div style={{ background: "#071207", borderBottom: "1px solid #50A05030", padding: "8px 24px" }}>
            <span style={{ fontSize: "10px", color: "#50A050" }}>✓ Anthropic API key configured — pipeline ready</span>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #1A1A1A", background: "#080808", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "9px", letterSpacing: "5px", color: "#C9A84C", marginBottom: "3px" }}>EVENTO AI STUDIOS · AAA+ PIPELINE</div>
            <div style={{ fontSize: "16px", fontWeight: "300", letterSpacing: "1px" }}>الجذر / THE ROOT — Storyboard Generator</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ fontSize: "11px", color: "#555", marginRight: "4px" }}>
              {doneCount}/{SCENES.length} · {progress}%
              {errorCount > 0 && <span style={{ color: "#C04040", marginLeft: "8px" }}>{errorCount} err</span>}
            </div>

            {canExport && (
              <button
                onClick={() => exportAllPrompts(statuses)}
                style={{ padding: "7px 14px", background: "transparent", border: "1px solid #C9A84C40", color: "#C9A84C", cursor: "pointer", fontFamily: "monospace", fontSize: "10px", letterSpacing: "1px" }}>
                ↓ EXPORT JSON
              </button>
            )}

            {!running ? (
              <>
                <button
                  onClick={runAll}
                  disabled={apiHealth === false}
                  style={{ padding: "8px 20px", background: apiHealth === false ? "#333" : "#C9A84C", color: apiHealth === false ? "#666" : "#000", border: "none", cursor: apiHealth === false ? "default" : "pointer", fontFamily: "monospace", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold" }}>
                  ▶ RUN ALL
                </button>
                <button
                  onClick={resetAll}
                  style={{ padding: "8px 16px", background: "transparent", color: "#555", border: "1px solid #2A2A2A", cursor: "pointer", fontFamily: "monospace", fontSize: "11px" }}>
                  RESET
                </button>
              </>
            ) : (
              <button
                onClick={() => abortRef.current = true}
                style={{ padding: "8px 20px", background: "#C04040", color: "#fff", border: "none", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", letterSpacing: "2px" }}>
                ■ STOP
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: "2px", background: "#111" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #C9A84C, #E8C870)", transition: "width 0.5s" }} />
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

          {/* Left: Scene List */}
          <div style={{ width: "200px", borderRight: "1px solid #111", background: "#080808", overflowY: "auto", flexShrink: 0 }}>
            {SCENES.map(scene => {
              const st = statuses[scene.id];
              const sc = STATUS_STYLE[st.status];
              const ac = ACT_COLORS[scene.act];
              const isSelected = selected === scene.id;
              return (
                <div key={scene.id} onClick={() => setSelected(scene.id)}
                  style={{ padding: "11px 14px", borderBottom: "1px solid #0E0E0E", cursor: "pointer", background: isSelected ? "#0F0F0F" : "transparent", borderLeft: `2px solid ${isSelected ? ac : "transparent"}`, transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                    <span style={{ fontSize: "9px", letterSpacing: "2px", color: ac }}>{scene.id}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <span className={st.status === "running" ? "running-dot" : ""} style={{ width: "5px", height: "5px", borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
                      <span style={{ fontSize: "8px", color: sc.color, letterSpacing: "1px" }}>{sc.label}</span>
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: isSelected ? "#E0D8C8" : "#666", lineHeight: "1.4" }}>{scene.arabic}</div>
                  <div style={{ fontSize: "9px", color: "#333", marginTop: "2px" }}>{scene.time}</div>
                </div>
              );
            })}
          </div>

          {/* Center: Main Panel */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

            {/* Scene Info Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #111", background: "#0A0A0A" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "9px", letterSpacing: "4px", color: actColor, marginBottom: "6px" }}>
                    {selectedScene?.act} · {selectedScene?.id}
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: "200", marginBottom: "4px", direction: "rtl" }}>{selectedScene?.arabic}</div>
                  <div style={{ fontSize: "11px", color: "#555" }}>{selectedScene?.time} · {selectedScene?.emotion}</div>
                </div>
                <button
                  onClick={() => runSingle(selectedScene)}
                  disabled={running || selectedStatus?.status === "running" || apiHealth === false}
                  style={{
                    padding: "7px 18px",
                    background: "transparent",
                    border: `1px solid ${actColor}60`,
                    color: actColor,
                    cursor: (running || apiHealth === false) ? "default" : "pointer",
                    fontFamily: "monospace",
                    fontSize: "10px",
                    letterSpacing: "2px",
                    opacity: (running || apiHealth === false) ? 0.35 : 1,
                  }}>
                  ▶ RUN THIS
                </button>
              </div>
            </div>

            {/* Script Excerpt */}
            <div style={{ padding: "12px 24px", background: "#070707", borderBottom: "1px solid #0E0E0E" }}>
              <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#2A2A2A", marginBottom: "6px" }}>SCRIPT EXCERPT</div>
              <div style={{ fontSize: "12px", color: "#3A3430", lineHeight: "1.9", fontStyle: "italic", direction: "rtl", textAlign: "right" }}>
                {selectedScene?.script}
              </div>
            </div>

            {/* Prompts Output */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {selectedStatus?.status === "pending" && (
                <div style={{ color: "#2A2A2A", fontSize: "13px", padding: "50px 0", textAlign: "center" }}>
                  <div style={{ fontSize: "28px", marginBottom: "14px", color: "#1E1E1E" }}>○</div>
                  <div>Queued — press <span style={{ color: "#C9A84C" }}>RUN ALL</span> or <span style={{ color: actColor }}>RUN THIS</span></div>
                </div>
              )}

              {selectedStatus?.status === "running" && (
                <div style={{ color: "#C9A84C", fontSize: "13px", padding: "50px 0", textAlign: "center" }}>
                  <div className="spin-ring" style={{ display: "inline-block", width: "28px", height: "28px", border: "2px solid #C9A84C30", borderTopColor: "#C9A84C", borderRadius: "50%", marginBottom: "16px" }} />
                  <div>Calling Claude API — generating prompts...</div>
                  <div style={{ fontSize: "10px", color: "#555", marginTop: "6px" }}>{selectedScene?.arabic}</div>
                </div>
              )}

              {selectedStatus?.status === "error" && (
                <div>
                  <div style={{ color: "#C04040", fontSize: "12px", padding: "16px 18px", background: "#0F0808", border: "1px solid #C0404030", marginBottom: "12px" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "2px", marginBottom: "8px", color: "#C04040" }}>ERROR</div>
                    {selectedStatus.error}
                  </div>
                  <button
                    onClick={() => runSingle(selectedScene)}
                    disabled={running}
                    style={{ padding: "7px 16px", background: "transparent", border: "1px solid #C0404060", color: "#C04040", cursor: running ? "default" : "pointer", fontFamily: "monospace", fontSize: "10px" }}>
                    ↺ RETRY THIS SCENE
                  </button>
                </div>
              )}

              {selectedStatus?.status === "done" && selectedStatus.prompts && (() => {
                const p = selectedStatus.prompts;
                const blocks = [
                  { key: "midjourney", label: "🎨 MIDJOURNEY v7",   color: "#7B2FFF", content: p.midjourney },
                  { key: "runway",     label: "🎬 RUNWAY GEN-3",    color: "#E84545", content: p.runway     },
                  { key: "sound",      label: "🎵 SOUND DIRECTION", color: "#00C9A7", content: p.sound      },
                ];
                const q = selectedStatus.quality;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", fontSize: "9px", letterSpacing: "1px" }}>
                      {q && (
                        <span style={{ padding: "3px 9px", border: `1px solid ${q.ok ? "#50A05060" : "#E8A02060"}`, color: q.ok ? "#50A050" : "#E8A020" }}>
                          {q.ok ? "✓ QUALITY CHECKS PASSED" : `⚠ ${q.issues.length} ISSUE${q.issues.length > 1 ? "S" : ""}`}
                          {q.attempts > 1 ? ` · AUTO-FIXED IN ${q.attempts} TRIES` : ""}
                        </span>
                      )}
                      {selectedStatus.cast?.map(c => (
                        <span key={c.name} style={{ color: "#666" }}>{c.name} · {c.age}</span>
                      ))}
                    </div>
                    {q && !q.ok && (
                      <div style={{ fontSize: "10px", color: "#E8A020", lineHeight: 1.7, border: "1px solid #E8A02030", padding: "8px 12px" }}>
                        {q.issues.map(i => <div key={i}>· {i}</div>)}
                      </div>
                    )}
                    {blocks.map(b => (
                      <PromptBlock key={b.key} label={b.label} color={b.color} content={b.content} />
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Right: Log Panel */}
          <div style={{ width: "240px", borderLeft: "1px solid #111", background: "#050505", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #111", fontSize: "9px", letterSpacing: "3px", color: "#333" }}>
              PIPELINE LOG
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
              {log.length === 0 && (
                <div style={{ color: "#1A1A1A", fontSize: "10px", padding: "16px", textAlign: "center" }}>— awaiting run —</div>
              )}
              {log.map((entry, i) => (
                <div key={i} style={{
                  fontSize: "9px",
                  lineHeight: "1.7",
                  padding: "1px 4px",
                  color: entry.type === "success" ? "#50A050"
                       : entry.type === "error"   ? "#C04040"
                       : entry.type === "system"  ? "#C9A84C"
                       : entry.type === "warn"    ? "#E8A020"
                       : "#444",
                  fontFamily: "monospace", direction: "ltr", unicodeBidi: "isolate",
                }}>
                  <span style={{ color: "#1E1E1E", marginRight: "6px" }}>{entry.t}</span>
                  <bdi>{entry.msg}</bdi>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>

            {/* Stats */}
            <div style={{ borderTop: "1px solid #111", padding: "10px 12px" }}>
              {Object.entries(STATUS_STYLE).map(([key, val]) => {
                const count = Object.values(statuses).filter(s => s.status === key).length;
                return count > 0 ? (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "9px", color: val.color, letterSpacing: "1px" }}>{val.label}</span>
                    <span style={{ fontSize: "9px", color: "#333" }}>{count}</span>
                  </div>
                ) : null;
              })}
              {canExport && (
                <button
                  onClick={() => exportAllPrompts(statuses)}
                  style={{ marginTop: "8px", width: "100%", padding: "6px", background: "transparent", border: "1px solid #C9A84C30", color: "#C9A84C60", cursor: "pointer", fontFamily: "monospace", fontSize: "8px", letterSpacing: "2px" }}>
                  ↓ EXPORT {doneCount} SCENE{doneCount > 1 ? "S" : ""}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function PromptBlock({ label, color, content }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ background: "#0A0A0A", border: `1px solid ${color}20`, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color }}>{label}</div>
        <button
          onClick={copy}
          style={{ padding: "3px 10px", background: copied ? "#1A3A1A" : "#111", border: `1px solid ${copied ? "#50A050" : "#1A1A1A"}`, color: copied ? "#50A050" : "#444", cursor: "pointer", fontFamily: "monospace", fontSize: "8px", letterSpacing: "1px" }}>
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </div>
      <div style={{ fontSize: "12px", color: "#999", lineHeight: "1.9", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>
        {content || "—"}
      </div>
    </div>
  );
}
