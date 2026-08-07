import { useState, useRef } from "react";

const SCENES = [
  { id: "S01", act: "ACT I",    arabic: "يوسف يمسك يد أبيه",    time: "فجر الحاضر",       emotion: "حنين، ترقب، حب صامت",                  script: "يوسف جالس على كرسي بجانب سرير حمد المحتضر منذ الليل. يده تمسك يد أبيه. نور فجر خافت يتسرب من شق الستارة." },
  { id: "S02", act: "ACT I",    arabic: "الصحراء 1973",          time: "فجر 1973",          emotion: "طفولة، قسوة الحب، الطريق الطويل",        script: "يوسف عشر سنوات يمشي خلف أبيه في رمال الصحراء. كل خطوة لحمد تساوي خطوتين ليوسف. حمد يمشي دون أن يلتفت." },
  { id: "S03", act: "ACT II",   arabic: "سلطة المائدة",          time: "ليل 1993",          emotion: "سلطة، امتثال، توتر تحت السطح",           script: "حمد يجلس في صدر المجلس كالملك. يوسف يحاول يعترض لكنه يصمت. 'الأرض ما تستنّى أحد يا يوسف.'" },
  { id: "S04", act: "ACT II",   arabic: "مطبخ نورة",             time: "بعد العشاء 1993",   emotion: "ضعف مكتوم، حب جريح، صبر المرأة",        script: "نورة تغسل الصحون من الخلف. يوسف يدخل. 'أنا زوجتك. بس أنت دايماً تختار.'" },
  { id: "S05", act: "ACT II",   arabic: "غرفة الليل",            time: "منتصف الليل 1993",  emotion: "وحدة المسنّ، لغة بلا كلمات",             script: "حمد يجلس في الظلام وحده. يوسف يدخل ويجلس بجانبه بدون كلام. خمس دقائق صمت." },
  { id: "S06", act: "ACT III",  arabic: "العيادة 2010",          time: "نهار 2010",         emotion: "انعكاس السلطة، خجل الضعف",               script: "الطبيب يتكلم وينظر ليوسف لا لحمد. 'القرار يرجع لكم.' حمد يلاحظ هذا أول مرة." },
  { id: "S07", act: "ACT III",  arabic: "'زين'",                  time: "بعد العيادة 2010",  emotion: "تحوّل ساكت، إعادة ترتيب العالم",         script: "يوسف يقود بحزم. 'راح تاخذ الأدوية.' حمد ينظر لابنه. 'زين.' أول مرة يسمعها هكذا." },
  { id: "S08", act: "ACT III",  arabic: "أنا تعبت من نفسي",     time: "ليل 2018",          emotion: "أعمق ضعف في الفيلم، إنسانية مجردة",      script: "حمد في السرير. 'أنت تعبت منّي؟' 'لا.' 'لأني أنا تعبت من نفسي.' أول مرة في ثمانين سنة." },
  { id: "S09", act: "ACT IV",   arabic: "ما فيك شيء إلا أنت",   time: "نهار الحاضر",       emotion: "أعلى نقطة عاطفية في الفيلم",             script: "أصابع حمد تضغط على يد يوسف بقوة. يفتح عينيه. 'ما فيك شيء إلا أنت.' يغمض ويسترخي." },
  { id: "S10", act: "EPILOGUE", arabic: "يوسف وحده",            time: "فجر بعد الوفاة",   emotion: "حرية مؤلمة، اكتمال، بداية",              script: "يوسف وحيداً في نفس الصحراء. الكاميرا أمامه هذه المرة. يبكي. ثم يمشي." },
];

const ACT_COLORS = {
  "ACT I":    "#C9A84C",
  "ACT II":   "#C04040",
  "ACT III":  "#4488CC",
  "ACT IV":   "#60A860",
  "EPILOGUE": "#D4982A",
};

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
    body: JSON.stringify({ scene }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export default function PipelineDashboard() {
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(SCENES.map(s => [s.id, { status: "pending", prompts: null, error: null }]))
  );
  const [selected, setSelected] = useState("S01");
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const abortRef = useRef(false);

  const addLog = (msg, type = "info") =>
    setLog(prev => [...prev.slice(-40), { msg, type, t: new Date().toLocaleTimeString() }]);

  const setStatus = (id, patch) =>
    setStatuses(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const runAll = async () => {
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
        const prompts = await generatePrompts(scene);
        setStatus(scene.id, { status: "done", prompts });
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
    setStatus(scene.id, { status: "running" });
    setSelected(scene.id);
    addLog(`⟳  Running ${scene.id} — ${scene.arabic}`, "info");
    try {
      const prompts = await generatePrompts(scene);
      setStatus(scene.id, { status: "done", prompts });
      addLog(`✓  ${scene.id} done`, "success");
    } catch (e) {
      setStatus(scene.id, { status: "error", error: e.message });
      addLog(`✗  ${scene.id} error: ${e.message}`, "error");
    }
  };

  const resetAll = () => {
    setStatuses(Object.fromEntries(SCENES.map(s => [s.id, { status: "pending", prompts: null, error: null }])));
    setLog([]);
  };

  const doneCount = Object.values(statuses).filter(s => s.status === "done").length;
  const progress = Math.round((doneCount / SCENES.length) * 100);
  const selectedScene = SCENES.find(s => s.id === selected);
  const selectedStatus = statuses[selected];
  const actColor = ACT_COLORS[selectedScene?.act] || "#C9A84C";

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#E0D8C8", fontFamily: "monospace, Georgia, serif", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "14px 24px", borderBottom: "1px solid #1A1A1A", background: "#080808", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "9px", letterSpacing: "5px", color: "#C9A84C", marginBottom: "3px" }}>EVENTO AI STUDIOS · CLAUDE CODE PIPELINE</div>
          <div style={{ fontSize: "16px", fontWeight: "300", letterSpacing: "1px" }}>الجذر / THE ROOT — Storyboard Generator</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ fontSize: "11px", color: "#555", marginRight: "8px" }}>
            {doneCount}/{SCENES.length} scenes · {progress}%
          </div>
          {!running ? (
            <>
              <button onClick={runAll} style={{ padding: "8px 20px", background: "#C9A84C", color: "#000", border: "none", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", letterSpacing: "2px", fontWeight: "bold" }}>
                ▶ RUN ALL
              </button>
              <button onClick={resetAll} style={{ padding: "8px 16px", background: "transparent", color: "#555", border: "1px solid #2A2A2A", cursor: "pointer", fontFamily: "monospace", fontSize: "11px" }}>
                RESET
              </button>
            </>
          ) : (
            <button onClick={() => abortRef.current = true} style={{ padding: "8px 20px", background: "#C04040", color: "#fff", border: "none", cursor: "pointer", fontFamily: "monospace", fontSize: "11px", letterSpacing: "2px" }}>
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
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
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

          {/* Scene Info */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #111", background: "#0A0A0A" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "9px", letterSpacing: "4px", color: actColor, marginBottom: "6px" }}>
                  {selectedScene?.act} · {selectedScene?.id}
                </div>
                <div style={{ fontSize: "22px", fontWeight: "200", marginBottom: "4px" }}>{selectedScene?.arabic}</div>
                <div style={{ fontSize: "11px", color: "#555" }}>{selectedScene?.time} · {selectedScene?.emotion}</div>
              </div>
              <button
                onClick={() => runSingle(selectedScene)}
                disabled={running || selectedStatus?.status === "running"}
                style={{
                  padding: "7px 18px",
                  background: "transparent",
                  border: `1px solid ${actColor}60`,
                  color: actColor,
                  cursor: running ? "default" : "pointer",
                  fontFamily: "monospace",
                  fontSize: "10px",
                  letterSpacing: "2px",
                  opacity: running ? 0.4 : 1,
                }}>
                ▶ RUN THIS
              </button>
            </div>
          </div>

          {/* Script Excerpt */}
          <div style={{ padding: "12px 24px", background: "#070707", borderBottom: "1px solid #0E0E0E" }}>
            <div style={{ fontSize: "9px", letterSpacing: "3px", color: "#333", marginBottom: "6px" }}>SCRIPT EXCERPT</div>
            <div style={{ fontSize: "12px", color: "#4A4438", lineHeight: "1.8", fontStyle: "italic", direction: "rtl", textAlign: "right" }}>
              {selectedScene?.script}
            </div>
          </div>

          {/* Prompts Output */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {selectedStatus?.status === "pending" && (
              <div style={{ color: "#333", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: "12px" }}>○</div>
                Queued — press RUN ALL or RUN THIS
              </div>
            )}
            {selectedStatus?.status === "running" && (
              <div style={{ color: "#C9A84C", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
                <div style={{ fontSize: "24px", marginBottom: "12px" }}>◌</div>
                Calling Claude API...
              </div>
            )}
            {selectedStatus?.status === "error" && (
              <div style={{ color: "#C04040", fontSize: "13px", padding: "20px", background: "#0F0808", border: "1px solid #C0404020" }}>
                ✗ Error: {selectedStatus.error}
              </div>
            )}
            {selectedStatus?.status === "done" && selectedStatus.prompts && (() => {
              const p = selectedStatus.prompts;
              const blocks = [
                { key: "midjourney", label: "🎨 MIDJOURNEY v7",    color: "#7B2FFF", content: p.midjourney },
                { key: "runway",     label: "🎬 RUNWAY GEN-3",     color: "#E84545", content: p.runway     },
                { key: "sound",      label: "🎵 SOUND DIRECTION",  color: "#00C9A7", content: p.sound      },
              ];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {blocks.map(b => (
                    <PromptBlock key={b.key} label={b.label} color={b.color} content={b.content} />
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Log */}
        <div style={{ width: "240px", borderLeft: "1px solid #111", background: "#050505", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #111", fontSize: "9px", letterSpacing: "3px", color: "#444" }}>
            PIPELINE LOG
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {log.length === 0 && (
              <div style={{ color: "#222", fontSize: "10px", padding: "12px", textAlign: "center" }}>— waiting —</div>
            )}
            {log.map((entry, i) => (
              <div key={i} style={{
                fontSize: "9px",
                lineHeight: "1.6",
                padding: "2px 4px",
                color: entry.type === "success" ? "#50A050"
                     : entry.type === "error"   ? "#C04040"
                     : entry.type === "system"  ? "#C9A84C"
                     : entry.type === "warn"    ? "#E8A020"
                     : "#555",
                fontFamily: "monospace",
              }}>
                <span style={{ color: "#222", marginRight: "6px" }}>{entry.t}</span>
                {entry.msg}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{ borderTop: "1px solid #111", padding: "12px" }}>
            {Object.entries(STATUS_STYLE).map(([key, val]) => {
              const count = Object.values(statuses).filter(s => s.status === key).length;
              return count > 0 ? (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "9px", color: val.color, letterSpacing: "1px" }}>{val.label}</span>
                  <span style={{ fontSize: "9px", color: "#333" }}>{count}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>

      </div>
    </div>
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
    <div style={{ background: "#0A0A0A", border: `1px solid ${color}25`, padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "9px", letterSpacing: "3px", color }}>{label}</div>
        <button onClick={copy} style={{ padding: "3px 10px", background: copied ? "#1A3A1A" : "#111", border: `1px solid ${copied ? "#50A050" : "#1A1A1A"}`, color: copied ? "#50A050" : "#444", cursor: "pointer", fontFamily: "monospace", fontSize: "8px", letterSpacing: "1px" }}>
          {copied ? "COPIED ✓" : "COPY"}
        </button>
      </div>
      <div style={{ fontSize: "12px", color: "#999", lineHeight: "1.8", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>
        {content || "—"}
      </div>
    </div>
  );
}
