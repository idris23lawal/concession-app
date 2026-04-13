import { useState, useEffect, useRef } from "react";

// ─── Constants ─────────────────────────────────────────────────────────────────
const KEY = "concession_v3";

const DIVISIONS = [
  { id: "womens", label: "622 WOMEN", color: "#c8a96e", accent: "#e8c98e", dim: "#7a6030" },
  { id: "mens",   label: "637 MEN",   color: "#7ab0d4", accent: "#9acef4", dim: "#3a6080" },
];

const SAMPLE_STAFF = [
  { id: "S001", name: "Amara Osei",    role: "manager"    },
  { id: "S002", name: "Jake Fielding", role: "supervisor" },
  { id: "S003", name: "Priya Nair",    role: "staff"      },
  { id: "S004", name: "Tom Walsh",     role: "staff"      },
];

const SAMPLE_PRODUCTS = {
  womens: [
    { id: "W001", name: "Strappy Heel",   colour: "Black",       sku: "W-SH-001", barcode: "111111111111", price: 195.00, stock: 8,  onLoan: 0 },
    { id: "W002", name: "Ankle Boot",     colour: "Tan",         sku: "W-AB-002", barcode: "222222222222", price: 245.00, stock: 6,  onLoan: 1 },
    { id: "W003", name: "Loafer",         colour: "Nude Patent", sku: "W-LF-003", barcode: "333333333333", price: 165.00, stock: 3,  onLoan: 0 },
    { id: "W004", name: "Knee Boot",      colour: "Black",       sku: "W-KB-004", barcode: "444444444444", price: 320.00, stock: 4,  onLoan: 2 },
    { id: "W005", name: "Trainer",        colour: "White",       sku: "W-TR-005", barcode: "555555555555", price: 120.00, stock: 14, onLoan: 0 },
    { id: "W006", name: "Mule",           colour: "Gold",        sku: "W-ML-006", barcode: "666666666666", price: 155.00, stock: 5,  onLoan: 1 },
  ],
  mens: [
    { id: "M001", name: "Oxford",         colour: "Black",       sku: "M-OX-001", barcode: "777777777771", price: 220.00, stock: 10, onLoan: 0 },
    { id: "M002", name: "Chelsea Boot",   colour: "Brown",       sku: "M-CB-002", barcode: "777777777772", price: 280.00, stock: 7,  onLoan: 1 },
    { id: "M003", name: "Derby",          colour: "Tan",         sku: "M-DB-003", barcode: "777777777773", price: 195.00, stock: 5,  onLoan: 0 },
    { id: "M004", name: "Loafer",         colour: "Black Patent",sku: "M-LF-004", barcode: "777777777774", price: 185.00, stock: 4,  onLoan: 1 },
    { id: "M005", name: "Trainer",        colour: "White/Grey",  sku: "M-TR-005", barcode: "777777777775", price: 135.00, stock: 12, onLoan: 0 },
    { id: "M006", name: "Brogue",         colour: "Burgundy",    sku: "M-BR-006", barcode: "777777777776", price: 240.00, stock: 6,  onLoan: 0 },
    { id: "M007", name: "JAPAN",          colour: "17-886",      sku: "40374",    barcode: "5063605815214",price: 0,     stock: 10, onLoan: 0 },
  ],
};

// Shoe size ranges
const WOMENS_SIZES = ["3","3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5","9"];
const MENS_SIZES   = ["6","6.5","7","7.5","8","8.5","9","9.5","10","10.5","11","11.5","12","13"];

const DEFAULT_WEEKLY_GOALS = {
  womens: {
    Monday:    { revenue: 1200, units: 15 }, Tuesday:   { revenue: 1000, units: 12 },
    Wednesday: { revenue: 1100, units: 13 }, Thursday:  { revenue: 1200, units: 15 },
    Friday:    { revenue: 1500, units: 20 }, Saturday:  { revenue: 2000, units: 28 },
    Sunday:    { revenue: 1800, units: 24 },
  },
  mens: {
    Monday:    { revenue: 900,  units: 12 }, Tuesday:   { revenue: 800,  units: 10 },
    Wednesday: { revenue: 850,  units: 11 }, Thursday:  { revenue: 950,  units: 12 },
    Friday:    { revenue: 1200, units: 16 }, Saturday:  { revenue: 1600, units: 22 },
    Sunday:    { revenue: 1400, units: 19 },
  },
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const getDayName  = () => { const d = new Date().getDay(); return DAYS[d===0?6:d-1]; };
const getWeekKey  = () => { const d = new Date(); const m = new Date(d); m.setDate(d.getDate()-(d.getDay()===0?6:d.getDay()-1)); return m.toISOString().slice(0,10); };
const uid         = () => Math.random().toString(36).slice(2,9).toUpperCase();
const fmt = (n) => `€${Number(n).toFixed(2)}`;
const todayStr    = () => new Date().toDateString();
const fmtDT       = (iso) => new Date(iso).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const fmtDate     = (iso) => new Date(iso).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const fmtTime     = (iso) => new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
const loanDuration = (outIso, backIso) => {
  const ms = new Date(backIso||Date.now()) - new Date(outIso);
  const days = Math.floor(ms/86400000), hrs = Math.floor((ms%86400000)/3600000);
  return days > 0 ? `${days}d ${hrs}h` : `${hrs}h`;
};


// ─── Camera Scanner ────────────────────────────────────────────────────────────
function Scanner({ onDetected, onClose, divColor = "#c8a96e" }) {
  const scannerRef = useRef(null);
  const instanceRef = useRef(null);
  const doneRef    = useRef(false);
  const [err, setErr]     = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Load html5-qrcode from CDN if not already loaded
    const loadAndStart = () => {
      if (window.Html5Qrcode) { startScanner(); return; }
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";
      s.onload = startScanner;
      s.onerror = () => setErr("Scanner failed to load — check your connection.");
      document.head.appendChild(s);
    };

    const startScanner = () => {
      if (!scannerRef.current) return;
      const scanner = new window.Html5Qrcode(scannerRef.current.id);
      instanceRef.current = scanner;
      scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 140 } },
        (text) => {
          if (!doneRef.current) {
            doneRef.current = true;
            scanner.stop().catch(()=>{});
            onDetected(text);
          }
        },
        () => {} // ignore not-found frames
      ).then(() => setReady(true))
       .catch(e => {
         const msg = e?.message || String(e);
         if (msg.includes("Permission")) setErr("Camera permission denied — allow camera in your browser settings.");
         else if (msg.includes("NotFound") || msg.includes("device")) setErr("No camera found on this device.");
         else setErr("Camera error: " + msg);
       });
    };

    const t = setTimeout(loadAndStart, 100);
    return () => {
      clearTimeout(t);
      if (instanceRef.current) {
        instanceRef.current.stop().catch(()=>{});
      }
    };
  }, [onDetected]);

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"#050505",display:"flex",flexDirection:"column",fontFamily:"'Outfit',sans-serif"}}>
      <style>{`@keyframes sline{0%{top:8%}50%{top:82%}100%{top:8%}} @keyframes sblink{0%,100%{opacity:1}50%{opacity:.15}} #qr-scanner-box video{object-fit:cover!important;}`}</style>
      <div style={{padding:"16px 20px",background:"#0f0f0f",borderBottom:"1px solid #1c1c1c",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700,fontSize:15,letterSpacing:"0.04em",color:divColor}}>SCAN BARCODE</span>
        <button onClick={onClose} style={{background:"none",border:"1px solid #333",color:"#777",cursor:"pointer",padding:"7px 16px",fontSize:12,fontFamily:"inherit",borderRadius:4}}>✕ Cancel</button>
      </div>
      <div style={{flex:1,position:"relative",overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:"#000"}}>
        {err ? (
          <div style={{textAlign:"center",color:"#e05555",padding:32}}>
            <div style={{fontSize:38,marginBottom:12}}>⚠</div>
            <div style={{fontSize:13,lineHeight:1.7,maxWidth:280}}>{err}</div>
            <button onClick={()=>{setErr(null);doneRef.current=false;instanceRef.current=null;}} style={{marginTop:20,background:divColor,color:"#000",border:"none",padding:"10px 28px",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,borderRadius:4}}>Retry</button>
          </div>
        ) : (
          <div id="qr-scanner-box" ref={scannerRef} style={{width:"100%",height:"100%"}} />
        )}
      </div>
      {ready && !err && (
        <div style={{padding:"12px",background:"#0f0f0f",borderTop:"1px solid #1c1c1c",textAlign:"center",fontSize:11,color:"#555",letterSpacing:"0.1em"}}>
          <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:divColor,marginRight:8,animation:"sblink 1s infinite"}} />POINT AT BARCODE
        </div>
      )}
    </div>
  );
}

// ─── Division Picker (shown after login) ───────────────────────────────────────
function DivisionPicker({ user, onPick }) {
  return (
    <div style={{minHeight:"100vh",background:"#0e0c0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:460,textAlign:"center"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,letterSpacing:"0.3em",color:"#888",textTransform:"uppercase",marginBottom:6}}>Welcome, {user.name}</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#f0e8d8",marginBottom:6}}>Select Concession</div>
        <div style={{fontSize:12,color:"#444",marginBottom:36}}>Choose the floor you're working today. Records are kept separately.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {DIVISIONS.map(div => (
            <button key={div.id} onClick={() => onPick(div.id)}
              style={{background:"#111009",border:`2px solid ${div.dim}`,borderRadius:8,padding:"32px 20px",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:12,transition:"all .2s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=div.color; e.currentTarget.style.background="#161412";}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=div.dim; e.currentTarget.style.background="#111009";}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,color:div.color,letterSpacing:"0.04em"}}>{div.id==="womens"?"622":"637"}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:div.color}}>{div.label}</div>
              <div style={{fontSize:11,color:"#555",letterSpacing:"0.06em",textTransform:"uppercase"}}>Concession</div>
            </button>
          ))}
        </div>
        {user.role==="manager" && (
          <div style={{marginTop:20,fontSize:11,color:"#444"}}>As manager, you can view combined reports from History</div>
        )}
      </div>
    </div>
  );
}

// ─── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ staff, onLogin, onQuickSale, onStaffView }) {
  const [id, setId]   = useState("");
  const [err, setErr] = useState("");
  const [showMgr, setShowMgr] = useState(false);
  const attempt = () => {
    const s = staff.find(x => x.id.toLowerCase() === id.trim().toLowerCase());
    if (!s) { setErr("ID not recognised"); return; }
    if (s.role === "staff") { setErr("Staff use the options above — no login needed"); return; }
    onLogin(s);
  };
  return (
    <div style={{minHeight:"100vh",background:"#0e0c0a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,letterSpacing:"0.3em",color:"#888",textTransform:"uppercase",marginBottom:8}}>Company</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:34,color:"#f0e8d8",marginBottom:6}}>Concession</div>
        <div style={{fontSize:12,color:"#555",marginBottom:8}}>Men's &amp; Women's Stock Manager</div>
        <div style={{width:40,height:1,background:"#555",margin:"0 auto 32px"}} />

        {/* Staff options — main box */}
        <div style={{background:"#111009",border:"1px solid #2a2520",borderRadius:8,padding:"22px 20px",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#c8a96e",textTransform:"uppercase",marginBottom:6}}>Sales Staff</div>
          <div style={{fontSize:12,color:"#666",marginBottom:16}}>No login needed — view today's activity or record a quick sale.</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <button onClick={onStaffView}
              style={{padding:"16px 8px",background:"#161412",border:"1px solid #2a2520",color:"#f0e8d8",fontSize:14,fontWeight:600,cursor:"pointer",borderRadius:6,fontFamily:"inherit",transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor="#c8a96e";e.currentTarget.style.color="#c8a96e";}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="#2a2520";e.currentTarget.style.color="#f0e8d8";}}>
              📋 Staff View
            </button>
            <button onClick={onQuickSale}
              style={{padding:"16px 8px",background:"#161412",border:"1px solid #2a2520",color:"#f0e8d8",fontSize:14,fontWeight:600,cursor:"pointer",borderRadius:6,fontFamily:"inherit",transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor="#c8a96e";e.currentTarget.style.color="#c8a96e";}}
              onMouseOut={e=>{e.currentTarget.style.borderColor="#2a2520";e.currentTarget.style.color="#f0e8d8";}}>
              ▣ Quick Sale
            </button>
          </div>
        </div>

        {/* Manager / Supervisor login — secondary, collapsed */}
        <div style={{background:"#0a0908",border:"1px solid #1a1714",borderRadius:8,overflow:"hidden"}}>
          <button onClick={()=>setShowMgr(v=>!v)}
            style={{width:"100%",background:"none",border:"none",padding:"14px 20px",cursor:"pointer",fontFamily:"inherit",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",color:"#555",textTransform:"uppercase"}}>Manager / Supervisor</span>
            <span style={{fontSize:12,color:"#444"}}>{showMgr?"▲":"▼"}</span>
          </button>
          {showMgr&&(
            <div style={{padding:"0 20px 20px",textAlign:"left"}}>
              <label style={{fontSize:11,fontWeight:600,letterSpacing:"0.1em",color:"#555",textTransform:"uppercase",display:"block",marginBottom:8}}>Staff ID</label>
              <input value={id} onChange={e=>{setId(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="e.g. S001"
                style={{width:"100%",background:"#161412",border:"1px solid #2a2520",color:"#f0e8d8",padding:"12px 14px",fontSize:14,outline:"none",borderRadius:4,fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}} />
              {err && <div style={{color:"#e05555",fontSize:12,marginBottom:8}}>{err}</div>}
              <button onClick={attempt} style={{width:"100%",background:"#2a2520",color:"#c0b8a8",border:"1px solid #3a3530",padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase",borderRadius:4,fontFamily:"inherit"}}>
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Product Picker ────────────────────────────────────────────────────────────
function ProductPicker({ products, onSelect, onScanRequest, excludeIds=[], divColor="#c8a96e" }) {
  const [q, setQ] = useState("");
  const hits = products.filter(p =>
    !excludeIds.includes(p.id) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q))
  ).slice(0,8);
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name / SKU / barcode…"
          style={{flex:1,background:"#1a1714",border:"1px solid #2a2520",color:"#f0e8d8",padding:"10px 14px",fontSize:13,outline:"none",borderRadius:4,fontFamily:"inherit"}} />
        <button onClick={onScanRequest} style={{background:divColor,border:"none",color:"#0e0c0a",padding:"10px 14px",cursor:"pointer",fontSize:18,borderRadius:4,display:"flex",alignItems:"center"}}>▣</button>
      </div>
      {q && (
        <div style={{border:"1px solid #2a2520",borderRadius:4,overflow:"hidden",marginBottom:8}}>
          {hits.length===0 ? <div style={{padding:"12px 14px",fontSize:13,color:"#555"}}>No products found</div>
          : hits.map(p => (
            <button key={p.id} onClick={()=>{onSelect(p);setQ("");}}
              style={{width:"100%",background:"none",border:"none",borderBottom:"1px solid #1e1c1a",padding:"11px 14px",cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
              <div>
                <div style={{color:"#f0e8d8",fontSize:13,fontWeight:600}}>{p.name}</div>
                <div style={{color:"#666",fontSize:11,marginTop:2}}>{p.sku} · avail: {p.stock-p.onLoan}</div>
              </div>
              <div style={{color:divColor,fontWeight:700,fontSize:14}}>{fmt(p.price)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Hub Component ──────────────────────────────────────────────────────────
function AIHub({ buildContext, divColor, staff, fmt }) {
  const [activeTab, setActiveTab]     = useState("chat");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput]     = useState("");
  const [loading, setLoading]         = useState(false);
  const [briefing, setBriefing]       = useState(null);
  const [insights, setInsights]       = useState(null);
  const [stockAlert, setStockAlert]   = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [chatHistory]);

  const callAI = async (messages, systemPrompt) => {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await resp.json();
    return data.content?.map(b => b.text || "").join("") || "No response.";
  };

  const ctx = () => JSON.stringify(buildContext(), null, 2);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || loading) return;
    setChatInput("");
    const userMsg = {role:"user", content: q};
    setChatHistory(h => [...h, userMsg]);
    setLoading(true);
    try {
      const system = `You are an AI assistant for a luxury department store concession manager. You have access to live data from both the Men's and Women's concessions. Answer questions concisely and helpfully. Use € for currency. Here is the current store data:\n\n${ctx()}`;
      const history = [...chatHistory, userMsg].map(m => ({role:m.role, content:m.content}));
      const reply = await callAI(history, system);
      setChatHistory(h => [...h, {role:"assistant", content:reply}]);
    } catch(e) {
      setChatHistory(h => [...h, {role:"assistant", content:"Sorry, I couldn't connect. Please try again."}]);
    }
    setLoading(false);
  };

  // ── Sales Insights ─────────────────────────────────────────────────────────
  const runInsights = async () => {
    setLoading(true); setInsights(null);
    try {
      const system = `You are a retail analytics AI for a luxury concession manager. Analyse the store data and provide 4-6 sharp, specific insights. Format each insight as a JSON array with objects: {title, body, type} where type is one of: "positive", "warning", "opportunity", "alert". Return ONLY valid JSON array, no markdown.`;
      const reply = await callAI([{role:"user",content:`Analyse this store data and return insights JSON:\n${ctx()}`}], system);
      const clean = reply.replace(/```json|```/g,"").trim();
      setInsights(JSON.parse(clean));
    } catch(e) {
      setInsights([{title:"Error", body:"Could not generate insights. Check connection.", type:"alert"}]);
    }
    setLoading(false);
  };

  // ── Stock Prediction ───────────────────────────────────────────────────────
  const runStockAlert = async () => {
    setLoading(true); setStockAlert(null);
    try {
      const system = `You are a stock management AI. Based on current stock levels and recent sales velocity, predict which items need restocking urgently. Return a JSON array of objects: {product, division, currentStock, onLoan, available, dailySalesRate, daysRemaining, urgency, recommendation} where urgency is "critical", "urgent", or "monitor". Only include products worth flagging. Return ONLY valid JSON array, no markdown.`;
      const reply = await callAI([{role:"user",content:`Analyse stock and sales data:\n${ctx()}`}], system);
      const clean = reply.replace(/```json|```/g,"").trim();
      setStockAlert(JSON.parse(clean));
    } catch(e) {
      setStockAlert([]);
    }
    setLoading(false);
  };

  // ── EOD Briefing ──────────────────────────────────────────────────────────
  const runBriefing = async () => {
    setLoading(true); setBriefing(null);
    try {
      const system = `You are writing an end-of-day manager briefing for a luxury department store concession. Write a professional, concise briefing (around 200-250 words) covering: overall performance vs targets, top performers, any concerns (low stock, outstanding PS loans, external staff sales), and a recommendation for tomorrow. Use a warm but professional tone. Use € for currency. Write in plain text with short paragraphs — no markdown headers or bullet points.`;
      const reply = await callAI([{role:"user",content:`Write EOD briefing based on:\n${ctx()}`}], system);
      setBriefing(reply);
    } catch(e) {
      setBriefing("Could not generate briefing. Please check your connection.");
    }
    setLoading(false);
  };

  const [busyData,    setBusyData]    = useState(null);
  const [busyInsight, setBusyInsight] = useState(null);

  const runBusyPeriods = async (allSalesData) => {
    // ── Compute from raw data (no AI needed for the chart) ──────────────────
    // Build hourly buckets across all sales passed in
    const hours = Array.from({length:13}, (_,i) => i + 9); // 9am–9pm
    const byHour = {}; hours.forEach(h => { byHour[h] = {count:0, revenue:0}; });
    const byDayHour = {}; // { Mon: {9: count, 10: count, ...}, ... }
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    allSalesData.forEach(s => {
      const d = new Date(s.date);
      const h = d.getHours();
      const day = dayNames[d.getDay()];
      if (byHour[h] !== undefined) {
        byHour[h].count++;
        byHour[h].revenue += s.total || 0;
      }
      if (!byDayHour[day]) byDayHour[day] = {};
      byDayHour[day][h] = (byDayHour[day][h] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(byHour).map(v=>v.count), 1);
    setBusyData({ byHour, byDayHour, hours, maxCount, total: allSalesData.length });

    // ── AI analysis of busy periods ────────────────────────────────────────
    if (allSalesData.length < 3) return; // not enough data
    setLoading(true); setBusyInsight(null);
    try {
      const hourSummary = hours.map(h => `${h}:00 — ${byHour[h].count} sales, €${byHour[h].revenue.toFixed(0)}`).join("\n");
      const system = `You are a retail analyst for a luxury shoe concession in a department store. Based on the hourly sales pattern below, provide 3-4 sharp, actionable insights about busy and quiet periods. Format as JSON array: [{title, body, type}] where type is "positive", "opportunity", "warning", or "alert". Consider: peak staffing needs, when to do stock replenishment (quiet periods), lunch cover, and when to avoid mannequin changes. Return ONLY valid JSON, no markdown.`;
      const reply = await callAI([{role:"user",content:`Hourly sales data:\n${hourSummary}\n\nTotal sales: ${allSalesData.length}`}], system);
      const clean = reply.replace(/```json|```/g,"").trim();
      setBusyInsight(JSON.parse(clean));
    } catch(e) {
      setBusyInsight([{title:"Analysis unavailable",body:"Could not connect. The chart above is still accurate.",type:"alert"}]);
    }
    setLoading(false);
  };

  const TABS = [
    {id:"chat",    label:"💬 Ask AI",        desc:"Ask anything about today"},
    {id:"busy",    label:"📈 Busy Periods",  desc:"Peak hours & traffic patterns"},
    {id:"insights",label:"✦ Sales Insights",  desc:"AI-spotted trends & flags"},
    {id:"stock",   label:"📦 Stock Forecast", desc:"Predict what needs restocking"},
    {id:"briefing",label:"📋 EOD Briefing",   desc:"Ready-to-send daily report"},
  ];

  const insightColors = {positive:{bg:"#1e3a1e",border:"#2e5a2e",text:"#6ea870"},warning:{bg:"#3a2e10",border:"#5a4a18",text:"#c8a030"},opportunity:{bg:"#1e2a3a",border:"#2e4a5a",text:"#70a0c8"},alert:{bg:"#3a1e1e",border:"#5a2e2e",text:"#e07070"}};
  const urgencyColors = {critical:{bg:"#3a1e1e",border:"#6a2e2e",text:"#e07070"},urgent:{bg:"#3a2a10",border:"#6a4a18",text:"#c8a040"},monitor:{bg:"#1e2a1e",border:"#2e4a2e",text:"#6ea870"}};

  const SUGGESTIONS = ["Who sold the most today?","What's low in stock?","How are we tracking vs target?","Any outstanding personal shopper loans?","Which product is selling fastest?","Compare Men's vs Women's today"];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#f0e8d8",marginBottom:4}}>AI Hub <span style={{fontSize:14,color:divColor,fontWeight:400}}>✦</span></div>
          <div style={{fontSize:12,color:"#555",marginBottom:24}}>Manager-only · Powered by Claude · All data stays on your device</div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:24}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{background:activeTab===t.id?divColor+"18":"#111009",border:`1.5px solid ${activeTab===t.id?divColor:"#1e1c1a"}`,borderRadius:6,padding:"12px 10px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all .15s"}}>
            <div style={{fontSize:13,fontWeight:600,color:activeTab===t.id?divColor:"#888",marginBottom:3}}>{t.label}</div>
            <div style={{fontSize:10,color:"#555",letterSpacing:"0.02em"}}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* ── CHAT ── */}
      {activeTab==="chat" && (
        <div>
          <div className="card" style={{display:"flex",flexDirection:"column",height:420,overflow:"hidden"}}>
            <div style={{flex:1,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:12}}>
              {chatHistory.length===0 && (
                <div style={{textAlign:"center",padding:"32px 16px"}}>
                  <div style={{fontSize:28,marginBottom:10}}>✦</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#f0e8d8",marginBottom:6}}>Ask me anything</div>
                  <div style={{fontSize:12,color:"#444",marginBottom:20}}>I have live access to both concessions' data</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                    {SUGGESTIONS.map(s=>(
                      <button key={s} onClick={()=>{setChatInput(s);}} style={{background:"#1a1714",border:"1px solid #2a2520",color:"#888",padding:"6px 12px",fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"inherit",transition:"all .15s"}}
                        onMouseOver={e=>{e.currentTarget.style.borderColor=divColor;e.currentTarget.style.color=divColor;}}
                        onMouseOut={e=>{e.currentTarget.style.borderColor="#2a2520";e.currentTarget.style.color="#888";}}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatHistory.map((msg,i)=>(
                <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"78%",padding:"10px 14px",borderRadius:msg.role==="user"?"8px 8px 2px 8px":"8px 8px 8px 2px",
                    background:msg.role==="user"?divColor+"22":"#1a1714",
                    border:`1px solid ${msg.role==="user"?divColor+"44":"#2a2520"}`,
                    fontSize:13,lineHeight:1.6,color:msg.role==="user"?divColor:"#d0c8b8",whiteSpace:"pre-wrap"}}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && activeTab==="chat" && (
                <div style={{display:"flex",justifyContent:"flex-start"}}>
                  <div style={{padding:"10px 14px",borderRadius:"8px 8px 8px 2px",background:"#1a1714",border:"1px solid #2a2520",fontSize:13,color:"#555"}}>
                    <span style={{animation:"sblink 1s infinite",display:"inline-block"}}>✦ thinking…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{borderTop:"1px solid #1e1c1a",padding:"12px 16px",display:"flex",gap:10}}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
                placeholder="Ask about sales, stock, staff, targets…"
                style={{flex:1,background:"#1a1714",border:"1px solid #2a2520",color:"#f0e8d8",padding:"10px 14px",fontSize:13,outline:"none",borderRadius:4,fontFamily:"inherit"}} />
              <button onClick={sendChat} disabled={!chatInput.trim()||loading}
                style={{background:chatInput.trim()&&!loading?divColor:"#2a2520",color:chatInput.trim()&&!loading?"#0e0c0a":"#555",border:"none",padding:"10px 18px",cursor:chatInput.trim()&&!loading?"pointer":"default",fontSize:13,fontWeight:600,borderRadius:4,fontFamily:"inherit",transition:"all .15s"}}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUSY PERIODS ── */}
      {activeTab==="busy" && (
        <div>
          {!busyData && !loading && (
            <div style={{textAlign:"center",padding:"48px 16px"}}>
              <div style={{fontSize:32,marginBottom:12}}>📈</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#f0e8d8",marginBottom:8}}>Busy Period Analysis</div>
              <div style={{fontSize:13,color:"#555",marginBottom:24,maxWidth:360,margin:"0 auto 24px"}}>See your peak trading hours, quietest periods, and AI recommendations on when to staff up, replenish stock, or make floor changes.</div>
              <button onClick={()=>runBusyPeriods(buildContext().allSales)} style={{background:divColor,color:"#0e0c0a",border:"none",padding:"13px 32px",fontSize:14,fontWeight:700,cursor:"pointer",borderRadius:4,fontFamily:"inherit",letterSpacing:"0.04em"}}>Analyse Busy Periods</button>
            </div>
          )}

          {busyData && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#f0e8d8"}}>Sales by Hour</div>
                  <div style={{fontSize:11,color:"#555",marginTop:2}}>{busyData.total} total sales analysed</div>
                </div>
                <button onClick={()=>{setBusyData(null);setBusyInsight(null);}} style={{background:"none",border:"1px solid #2a2520",color:"#666",padding:"6px 14px",fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"inherit"}}>Reset</button>
              </div>

              {/* Hourly bar chart */}
              <div className="card" style={{padding:"20px 16px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"flex-end",gap:4,height:120}}>
                  {busyData.hours.map(h=>{
                    const {count,revenue} = busyData.byHour[h];
                    const pct = busyData.maxCount > 0 ? (count/busyData.maxCount)*100 : 0;
                    const intensity = pct > 75 ? "high" : pct > 40 ? "mid" : pct > 10 ? "low" : "none";
                    const barColor = intensity==="high" ? "#e07070" : intensity==="mid" ? divColor : intensity==="low" ? divColor+"66" : "#1e1c1a";
                    const label12 = h < 12 ? `${h}am` : h===12 ? "12pm" : `${h-12}pm`;
                    return (
                      <div key={h} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                        {count > 0 && <div style={{fontSize:9,color:"#555",lineHeight:1}}>{count}</div>}
                        <div style={{width:"100%",height:`${Math.max(pct,2)}%`,background:barColor,borderRadius:"2px 2px 0 0",transition:"height .4s ease",position:"relative",cursor:"default"}}
                          title={`${label12}: ${count} sale${count!==1?"s":""} · €${revenue.toFixed(0)}`} />
                        <div style={{fontSize:9,color:intensity==="high"?"#e07070":intensity==="mid"?divColor:"#444",fontWeight:intensity!=="none"?700:400,textAlign:"center",lineHeight:1}}>{label12}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div style={{display:"flex",gap:16,marginTop:14,paddingTop:12,borderTop:"1px solid #1e1c1a",flexWrap:"wrap"}}>
                  {[["#e07070","Peak (>75%)"],[ divColor,"Busy (40–75%)"],[divColor+"66","Moderate"],[{border:"1px solid #2a2520",background:"transparent"},"Quiet"]].map(([col,label])=>(
                    <div key={label} style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"#666"}}>
                      <div style={{width:10,height:10,borderRadius:2,background:typeof col==="string"?col:"transparent",border:typeof col==="object"?col.border:"none"}} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Peak / Quiet callouts */}
              {(()=>{
                const sorted = busyData.hours.filter(h=>busyData.byHour[h].count>0).sort((a,b)=>busyData.byHour[b].count-busyData.byHour[a].count);
                const peak   = sorted.slice(0,3);
                const quiet  = busyData.hours.filter(h=>busyData.byHour[h].count===0 || busyData.byHour[h].count <= Math.ceil(busyData.maxCount*0.15));
                const fmtH   = h => h<12?`${h}am`:h===12?"12pm":`${h-12}pm`;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                    <div style={{background:"#3a1e1e22",border:"1px solid #6a2e2e44",borderRadius:6,padding:"14px 16px"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#e07070",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>🔴 Peak Hours</div>
                      {peak.length===0 ? <div style={{fontSize:12,color:"#555"}}>No sales yet</div> : peak.map(h=>(
                        <div key={h} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{fontSize:13,color:"#f0e8d8",fontWeight:600}}>{fmtH(h)}</span>
                          <span style={{fontSize:12,color:"#e07070",fontWeight:700}}>{busyData.byHour[h].count} sales</span>
                        </div>
                      ))}
                    </div>
                    <div style={{background:"#1e3a1e22",border:"1px solid #2e5a2e44",borderRadius:6,padding:"14px 16px"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#6ea870",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>🟢 Quiet Hours</div>
                      <div style={{fontSize:12,color:"#6ea870",lineHeight:1.7}}>
                        {quiet.length===0 ? "Busy all day!" : quiet.map(h=>fmtH(h)).join(" · ")}
                      </div>
                      <div style={{fontSize:11,color:"#555",marginTop:6}}>Best for: stock replen, mannequin changes, team breaks</div>
                    </div>
                  </div>
                );
              })()}

              {/* AI Insight cards */}
              {loading && <div style={{textAlign:"center",padding:"24px",color:divColor,fontSize:13}}>✦ Analysing patterns…</div>}
              {busyInsight && !loading && (
                <div>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>AI Recommendations</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {busyInsight.map((ins,i)=>{
                      const colors = {positive:{bg:"#1e3a1e",border:"#2e5a2e",text:"#6ea870"},warning:{bg:"#3a2e10",border:"#5a4a18",text:"#c8a030"},opportunity:{bg:"#1e2a3a",border:"#2e4a5a",text:"#70a0c8"},alert:{bg:"#3a1e1e",border:"#5a2e2e",text:"#e07070"}};
                      const c = colors[ins.type]||colors.opportunity;
                      return (
                        <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:6,padding:"14px 16px"}}>
                          <div style={{fontSize:12,fontWeight:700,color:c.text,marginBottom:5,letterSpacing:"0.03em"}}>{ins.title}</div>
                          <div style={{fontSize:13,color:"#c0b8a8",lineHeight:1.6}}>{ins.body}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {busyData && !busyInsight && !loading && busyData.total >= 3 && (
                <button onClick={()=>runBusyPeriods(buildContext().allSales)} style={{background:divColor,color:"#0e0c0a",border:"none",padding:"11px 24px",fontSize:13,fontWeight:700,cursor:"pointer",borderRadius:4,fontFamily:"inherit",marginTop:8}}>✦ Get AI Recommendations</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS ── */}
      {activeTab==="insights" && (
        <div>
          {!insights && !loading && (
            <div style={{textAlign:"center",padding:"48px 16px"}}>
              <div style={{fontSize:32,marginBottom:12}}>✦</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#f0e8d8",marginBottom:8}}>AI Sales Insights</div>
              <div style={{fontSize:13,color:"#555",marginBottom:24,maxWidth:340,margin:"0 auto 24px"}}>Claude will analyse today's sales data, spot trends, and flag anything unusual across both concessions.</div>
              <button onClick={runInsights} style={{background:divColor,color:"#0e0c0a",border:"none",padding:"13px 32px",fontSize:14,fontWeight:700,cursor:"pointer",borderRadius:4,fontFamily:"inherit",letterSpacing:"0.04em"}}>Generate Insights</button>
            </div>
          )}
          {loading && activeTab==="insights" && (
            <div style={{textAlign:"center",padding:"48px 16px",color:divColor}}>
              <div style={{fontSize:28,marginBottom:12,animation:"sblink 1s infinite"}}>✦</div>
              <div style={{fontSize:13,color:"#555"}}>Analysing sales data…</div>
            </div>
          )}
          {insights && !loading && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontSize:12,color:"#555"}}>{insights.length} insights generated</div>
                <button onClick={runInsights} style={{background:"none",border:"1px solid #2a2520",color:"#888",padding:"6px 14px",fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"inherit"}}>Refresh</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {insights.map((ins,i)=>{
                  const c=insightColors[ins.type]||insightColors.opportunity;
                  return(
                    <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:6,padding:"16px 18px"}}>
                      <div style={{fontSize:12,fontWeight:700,color:c.text,marginBottom:6,letterSpacing:"0.04em"}}>{ins.title}</div>
                      <div style={{fontSize:13,color:"#c0b8a8",lineHeight:1.6}}>{ins.body}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK FORECAST ── */}
      {activeTab==="stock" && (
        <div>
          {!stockAlert && !loading && (
            <div style={{textAlign:"center",padding:"48px 16px"}}>
              <div style={{fontSize:32,marginBottom:12}}>📦</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#f0e8d8",marginBottom:8}}>Smart Stock Forecast</div>
              <div style={{fontSize:13,color:"#555",marginBottom:24,maxWidth:340,margin:"0 auto 24px"}}>AI analyses your sales velocity and current stock to predict which items need restocking and how urgently.</div>
              <button onClick={runStockAlert} style={{background:divColor,color:"#0e0c0a",border:"none",padding:"13px 32px",fontSize:14,fontWeight:700,cursor:"pointer",borderRadius:4,fontFamily:"inherit",letterSpacing:"0.04em"}}>Run Stock Forecast</button>
            </div>
          )}
          {loading && activeTab==="stock" && (
            <div style={{textAlign:"center",padding:"48px 16px",color:divColor}}>
              <div style={{fontSize:28,marginBottom:12,animation:"sblink 1s infinite"}}>✦</div>
              <div style={{fontSize:13,color:"#555"}}>Forecasting stock levels…</div>
            </div>
          )}
          {stockAlert && !loading && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontSize:12,color:"#555"}}>{stockAlert.length} items flagged</div>
                <button onClick={runStockAlert} style={{background:"none",border:"1px solid #2a2520",color:"#888",padding:"6px 14px",fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"inherit"}}>Refresh</button>
              </div>
              {stockAlert.length===0 && <div style={{textAlign:"center",padding:"32px",color:"#555",fontSize:13}}>✓ All stock levels look healthy</div>}
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {stockAlert.map((item,i)=>{
                  const c=urgencyColors[item.urgency]||urgencyColors.monitor;
                  return(
                    <div key={i} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:6,padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                          <span style={{fontSize:13,fontWeight:700,color:"#f0e8d8"}}>{item.product}</span>
                          <span style={{fontSize:10,fontWeight:700,color:c.text,background:c.border,padding:"2px 7px",borderRadius:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>{item.urgency}</span>
                          <span style={{fontSize:10,color:"#555"}}>{item.division}</span>
                        </div>
                        <div style={{fontSize:12,color:"#888",marginBottom:6}}>Available: <strong style={{color:c.text}}>{item.available}</strong> · On loan: {item.onLoan} · Total: {item.currentStock}</div>
                        {item.daysRemaining!==undefined && <div style={{fontSize:12,color:"#888",marginBottom:6}}>Est. {item.daysRemaining} day{item.daysRemaining!==1?"s":""} remaining at current velocity</div>}
                        <div style={{fontSize:12,color:"#c0b8a8",fontStyle:"italic"}}>{item.recommendation}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EOD BRIEFING ── */}
      {activeTab==="briefing" && (
        <div>
          {!briefing && !loading && (
            <div style={{textAlign:"center",padding:"48px 16px"}}>
              <div style={{fontSize:32,marginBottom:12}}>📋</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#f0e8d8",marginBottom:8}}>End-of-Day Briefing</div>
              <div style={{fontSize:13,color:"#555",marginBottom:24,maxWidth:340,margin:"0 auto 24px"}}>Generate a professional EOD summary — ready to copy, send to head office, or share with your team.</div>
              <button onClick={runBriefing} style={{background:divColor,color:"#0e0c0a",border:"none",padding:"13px 32px",fontSize:14,fontWeight:700,cursor:"pointer",borderRadius:4,fontFamily:"inherit",letterSpacing:"0.04em"}}>Generate Briefing</button>
            </div>
          )}
          {loading && activeTab==="briefing" && (
            <div style={{textAlign:"center",padding:"48px 16px",color:divColor}}>
              <div style={{fontSize:28,marginBottom:12,animation:"sblink 1s infinite"}}>✦</div>
              <div style={{fontSize:13,color:"#555"}}>Writing your briefing…</div>
            </div>
          )}
          {briefing && !loading && (
            <div>
              <div className="card" style={{padding:24,marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:14,borderBottom:"1px solid #1e1c1a"}}>
                  <div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:"#f0e8d8"}}>End-of-Day Report</div>
                    <div style={{fontSize:11,color:"#555",marginTop:2}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>navigator.clipboard.writeText(briefing).then(()=>{})} style={{background:"#1e1c1a",border:"1px solid #2a2520",color:"#888",padding:"7px 14px",fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"inherit"}}>Copy</button>
                    <button onClick={runBriefing} style={{background:"none",border:"1px solid #2a2520",color:"#888",padding:"7px 14px",fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"inherit"}}>Regenerate</button>
                  </div>
                </div>
                <div style={{fontSize:14,color:"#c8c0b0",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{briefing}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
// ─── Staff Daily View (no login required) ─────────────────────────────────────
function StaffDailyView({ allSales, allRefunds, allLoans, allPsLoans, onBack }) {
  const [div, setDiv]   = useState("womens");
  const [tab, setTab]   = useState("sales");
  const today = new Date().toDateString();
  const divObj  = DIVISIONS.find(d=>d.id===div);
  const divColor = divObj.color;

  const todaySales   = (allSales[div]   ?? []).filter(s=>new Date(s.date).toDateString()===today);
  const todayRefunds = (allRefunds[div] ?? []).filter(r=>new Date(r.date).toDateString()===today);
  const openLoans    = (allLoans[div]   ?? []).filter(l=>!l.returned);
  const openPS       = (allPsLoans[div] ?? []).filter(l=>l.status==="out");

  const totalRev = todaySales.reduce((t,s)=>t+s.total,0);
  const fmt  = n  => `€${Number(n).toFixed(2)}`;
  const fmtT = iso => new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});

  const tabs = [
    {id:"sales",   label:`Sales (${todaySales.length})`},
    {id:"refunds", label:`Refunds (${todayRefunds.length})`},
    {id:"loans",   label:`Loans (${openLoans.length+openPS.length})`},
  ];

  return (
    <div style={{fontFamily:"'Outfit',sans-serif",height:"100vh",background:"#0e0c0a",color:"#f0e8d8",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Header — fixed */}
      <header style={{background:"#0a0908",borderBottom:`2px solid ${divObj.dim}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:48,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:divColor}}>{divObj.label}</span>
          <span style={{fontSize:10,color:"#444",letterSpacing:"0.08em"}}>DAILY VIEW</span>
          <span style={{fontSize:11,color:"#444"}}>· {new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}</span>
        </div>
        <button onClick={onBack} style={{background:"none",border:"1px solid #2a2520",color:"#666",padding:"4px 12px",fontSize:11,cursor:"pointer",borderRadius:4,fontFamily:"inherit"}}>← Back</button>
      </header>

      {/* Division tabs — fixed */}
      <div style={{background:"#0a0908",borderBottom:"1px solid #1a1714",padding:"0 16px",display:"flex",gap:4,flexShrink:0}}>
        {DIVISIONS.map(d=>(
          <button key={d.id} onClick={()=>setDiv(d.id)}
            style={{padding:"8px 14px",background:"none",border:"none",borderBottom:`2px solid ${div===d.id?d.color:"transparent"}`,color:div===d.id?d.color:"#555",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all .15s"}}>
            {d.label}
          </button>
        ))}
      </div>

      {/* Stats row — fixed */}
      <div style={{padding:"10px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,flexShrink:0}}>
        {[
          {label:"Sales",    value:todaySales.length,             color:divColor},
          {label:"Revenue",  value:fmt(totalRev),                 color:divColor},
          {label:"Refunds",  value:todayRefunds.length,           color:"#e07070"},
          {label:"On Loan",  value:openLoans.length+openPS.length,color:"#c8a040"},
        ].map(({label,value,color})=>(
          <div key={label} style={{background:"#111009",border:"1px solid #1e1c1a",borderRadius:6,padding:"8px 10px",textAlign:"center"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color,marginBottom:2}}>{value}</div>
            <div style={{fontSize:9,color:"#555",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Section tabs — fixed */}
      <div style={{padding:"0 16px",display:"flex",gap:6,flexShrink:0,borderBottom:"1px solid #1a1714"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"8px 14px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?divColor:"transparent"}`,color:tab===t.id?divColor:"#555",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all .15s",whiteSpace:"nowrap"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Scrollable content area */}
      <div style={{flex:1,overflow:"auto",padding:"12px 16px"}}>

        {/* Sales tab */}
        {tab==="sales"&&(
          todaySales.length===0
            ? <div style={{color:"#333",fontSize:13,padding:"24px 0",textAlign:"center"}}>No sales recorded yet today</div>
            : <div style={{borderRadius:6,border:"1px solid #1e1c1a",overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:"'Outfit',sans-serif"}}>
                  <thead>
                    <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                      {["Sold By","Style Name","Code","Colour","Size","Price","Discount","Total","Time"].map(h=>(
                        <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:9,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todaySales.map((s,i)=>(
                      <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                        <td style={{padding:"8px 10px",whiteSpace:"nowrap",color:s.isUnassigned?"#c090e0":divColor,fontWeight:600,fontSize:11}}>{s.staffName}</td>
                        <td style={{padding:"8px 10px",fontWeight:600,color:"#f0e8d8",fontSize:11}}>{s.style||s.productName}</td>
                        <td style={{padding:"8px 10px",color:"#888",fontFamily:"monospace",fontSize:10}}>{s.productCode||"—"}</td>
                        <td style={{padding:"8px 10px",color:"#888",fontFamily:"monospace",fontSize:10}}>{s.colour||"—"}</td>
                        <td style={{padding:"8px 10px",textAlign:"center"}}>
                          <span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"1px 6px",borderRadius:3,fontSize:10}}>{s.size||"—"}</span>
                        </td>
                        <td style={{padding:"8px 10px",color:s.discount?"#666":"#c0b8a8",textDecoration:s.discount?"line-through":"none",whiteSpace:"nowrap",fontSize:11}}>{fmt(s.basePrice||s.unitPrice)}</td>
                        <td style={{padding:"8px 10px",whiteSpace:"nowrap"}}>
                          {s.discount?<span style={{background:"#4a2a1a",color:"#e0a070",padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:700}}>{s.discount.label}</span>:<span style={{color:"#333"}}>—</span>}
                        </td>
                        <td style={{padding:"8px 10px",fontFamily:"'Playfair Display',serif",fontSize:13,color:s.discount?"#6ea870":divColor,fontWeight:700,whiteSpace:"nowrap"}}>{fmt(s.total)}</td>
                        <td style={{padding:"8px 10px",color:"#555",whiteSpace:"nowrap",fontSize:10}}>{fmtT(s.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:"#111009",borderTop:`2px solid ${divColor}44`}}>
                      <td colSpan={7} style={{padding:"8px 10px",fontSize:10,color:"#555",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Day Total</td>
                      <td style={{padding:"8px 10px",fontFamily:"'Playfair Display',serif",fontSize:14,color:divColor,fontWeight:700}}>{fmt(totalRev)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
        )}

        {/* Refunds tab */}
        {tab==="refunds"&&(
          todayRefunds.length===0
            ? <div style={{color:"#333",fontSize:13,padding:"24px 0",textAlign:"center"}}>No refunds or exchanges today</div>
            : <div style={{borderRadius:6,border:"1px solid #1e1c1a",overflow:"hidden"}}>
                {todayRefunds.map((r,i)=>(
                  <div key={r.id} style={{padding:"12px 14px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center",background:i%2===0?"#0e0c0a":"#111009"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:8}}>
                        {r.productName}
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:3,background:r.type==="exchange"?"#1e2a3a":"#3a1e1e",color:r.type==="exchange"?"#70a0c8":"#e07070",textTransform:"uppercase"}}>{r.type}</span>
                      </div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>{r.staffName} · Till {r.tillNo} · {fmtT(r.date)}</div>
                    </div>
                    <span style={{fontSize:13,color:"#e07070",fontFamily:"'Playfair Display',serif"}}>−{fmt(r.unitPrice)}</span>
                  </div>
                ))}
              </div>
        )}

        {/* Loans tab */}
        {tab==="loans"&&(
          openLoans.length===0&&openPS.length===0
            ? <div style={{color:"#333",fontSize:13,padding:"24px 0",textAlign:"center"}}>No items currently on loan</div>
            : <div style={{borderRadius:6,border:"1px solid #1e1c1a",overflow:"hidden"}}>
                {openLoans.map((l,i)=>(
                  <div key={l.id} style={{padding:"12px 14px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center",background:i%2===0?"#0e0c0a":"#111009"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{l.productName}{l.size&&<span style={{marginLeft:6,background:divColor+"22",color:divColor,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:3}}>UK {l.size}</span>}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>{l.location} · {l.staffName}</div>
                    </div>
                    <span style={{fontSize:10,color:"#c8a040",fontWeight:700,padding:"2px 8px",background:"#1a1a10",borderRadius:3,border:"1px solid #3a3010"}}>Display</span>
                  </div>
                ))}
                {openPS.map((l,i)=>(
                  <div key={l.id} style={{padding:"12px 14px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center",background:(openLoans.length+i)%2===0?"#0e0c0a":"#111009"}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{l.productName}{l.size&&<span style={{marginLeft:6,background:divColor+"22",color:divColor,fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:3}}>UK {l.size}</span>}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>PS: {l.shopperName} · {l.shopperId}</div>
                    </div>
                    <span style={{fontSize:10,color:"#70a0c8",fontWeight:700,padding:"2px 8px",background:"#1a1e2a",borderRadius:3,border:"1px solid #2a3a4a"}}>PS Loan</span>
                  </div>
                ))}
              </div>
        )}
      </div>
    </div>
  );
}

// ─── Assign Row Component ──────────────────────────────────────────────────────
function AssignRow({ sale, staff, divColor, fmt, onAssign }) {
  const [selectedId, setSelectedId] = useState("");
  return (
    <div className="row-item" style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            {sale.style||sale.productName}
            {sale.colour&&<span style={{color:"#888",fontWeight:400,fontSize:12}}>{sale.colour}</span>}
            {sale.size&&<span style={{background:divColor+"22",color:divColor,fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:3}}>UK {sale.size}</span>}
            <span style={{background:"#3a1e4a",color:"#c090e0",border:"1px solid #5a2e6a",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,letterSpacing:"0.06em"}}>UNASSIGNED</span>
          </div>
          <div style={{fontSize:11,color:"#555",marginTop:3,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{color:divColor,fontWeight:600}}>{sale.tillNo}</span>
            <span style={{color:"#444"}}>·</span>
            <span style={{background:"#1a1714",border:"1px solid #2a2520",color:"#888",padding:"1px 7px",borderRadius:3}}>{new Date(sale.date).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} {new Date(sale.date).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>
          </div>
        </div>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:divColor,flexShrink:0,marginLeft:12}}>{fmt(sale.total)}</span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}
          style={{flex:1,background:"#0a0908",border:"1px solid #2a2520",color:selectedId?"#f0e8d8":"#666",padding:"9px 12px",fontSize:12,borderRadius:4,fontFamily:"inherit",outline:"none"}}>
          <option value="">— Select staff member —</option>
          {staff.map(s=><option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}
        </select>
        <button onClick={()=>selectedId&&onAssign(selectedId)}
          style={{background:selectedId?divColor:"#2a2520",color:selectedId?"#0e0c0a":"#555",border:"none",padding:"9px 16px",fontSize:12,fontWeight:700,cursor:selectedId?"pointer":"default",borderRadius:4,fontFamily:"inherit",transition:"all .15s",whiteSpace:"nowrap"}}>
          Assign
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const load = (k, fb) => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d?.[k] ?? fb; } catch { return fb; } };

  const [staff]       = useState(SAMPLE_STAFF);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [division,     setDivision]     = useState(null);   // "womens" | "mens"

  // ── Till configuration ─────────────────────────────────────────────────────
  // Each till has an id, label, and which division it "belongs to" by default
  const TILLS = {
    womens: [
      { id: "622", label: "622", home: "womens", desc: "622 WOMEN default" },
      { id: "637", label: "637", home: "mens",   desc: "637 MEN default"   },
    ],
    mens: [
      { id: "622", label: "622", home: "womens", desc: "622 WOMEN default" },
      { id: "637", label: "637", home: "mens",   desc: "637 MEN default"   },
    ],
  };
  const divTills     = (d) => TILLS[d] ?? [];
  const defaultTill  = (d) => (TILLS[d] ?? []).find(t => t.home === d)?.id ?? TILLS[d]?.[0]?.id ?? "T1";

  // Per-division data — stored as { womens: [...], mens: [...] }
  const [allProducts,   setAllProducts]   = useState(() => load("products",   SAMPLE_PRODUCTS));
  const [allSales,      setAllSales]      = useState(() => load("sales",      {womens:[],mens:[]}));
  const [allLoans,      setAllLoans]      = useState(() => load("loans",      {womens:[],mens:[]}));
  const [allPsLoans,    setAllPsLoans]    = useState(() => load("psLoans",    {womens:[],mens:[]}));
  const [allRefunds,    setAllRefunds]    = useState(() => load("refunds",    {womens:[],mens:[]}));
  const [allDeliveries, setAllDeliveries] = useState(() => load("deliveries", {womens:[],mens:[]}));
  const [allGoals,      setAllGoals]      = useState(() => load("goals",      {womens:{},mens:{}}));
  const [allFaulty,     setAllFaulty]     = useState(() => load("faulty",     {womens:[],mens:[]}));
  const [allOddShoes,   setAllOddShoes]   = useState(() => load("oddShoes",   {womens:[],mens:[]}));

  // UI state
  const [screen,         setScreen]         = useState("sales");
  const [salesTab,       setSalesTab]        = useState("sales"); // "sales" | "refunds"
  const [activeTill,     setActiveTill]     = useState(null);   // set when division chosen
  const [tillPickerOpen, setTillPickerOpen] = useState(false);
  const [toast,          setToast]          = useState(null);
  const [scanner,        setScanner]        = useState(false);
  const [scanCallback,   setScanCallback]   = useState(null);
  const [goalsModal,     setGoalsModal]     = useState(false);
  const [editGoals,      setEditGoals]      = useState({});
  const [eodLoan,        setEodLoan]        = useState(null);
  const [eodOutcome,     setEodOutcome]     = useState({result:"sold",tillNo:"",note:""});

  // Forms
  const SHOE_SIZES = division === "womens" ? WOMENS_SIZES : MENS_SIZES;
  const blankSaleForm = {product:null, style:"", colour:"", size:"", price:"", customerRef:"", externalStaff:false, extName:"", extId:"", extProductCode:"", discount:null, staffIdOverride:"", korTill:""};
  const blankFaultyForm = {style:"", colour:"", size:"", sku:"", faultType:"", description:"", action:"return"};
  const blankOddForm = {style:"", colour:"", shoe1Size:"", shoe1Foot:"left", shoe2Style:"", shoe2Colour:"", shoe2Sku:"", shoe2Size:"", shoe2Foot:"right", sku:"", foundBy:"", note:"", status:"logged"};
  const [saleForm,    setSaleForm]   = useState(blankSaleForm);
  const [loanForm,    setLoanForm]   = useState({style:"",code:"",colour:"",size:"",location:"",note:""});
  const [psForm,      setPsForm]     = useState({style:"",code:"",colour:"",size:"",shopperName:"",shopperId:"",note:""});
  const [refForm,     setRefForm]    = useState({type:"refund",style:"",code:"",colour:"",size:"",origPrice:"",tillNo:"",reason:"",exchangeStyle:"",exchangeCode:"",exchangeColour:"",exchangeSize:""});
  const [recvForm,    setRecvForm]   = useState({product:null,qty:"",note:""});
  const [faultyForm,  setFaultyForm] = useState(blankFaultyForm);
  const [oddForm,     setOddForm]    = useState(blankOddForm);

  // ── Scan session (pending basket before confirming) ────────────────────────
  const [scanItems,      setScanItems]      = useState([]);
  const [scanStaffId,    setScanStaffId]    = useState("");
  const colourInputRef = useRef(null);
  const [scanMode,       setScanMode]       = useState(false);
  const [histTab,        setHistTab]        = useState("sales");  // history screen tab
  const [allScanLog,     setAllScanLog]     = useState(() => load("scanLog", {womens:[],mens:[]}));
  const [refScanDone,    setRefScanDone]    = useState(false);  // refund scanned
  const [loanScanDone,   setLoanScanDone]   = useState(false);  // loan scanned
  const [faultyScanDone, setFaultyScanDone] = useState(false);  // faulty scanned

  // Global barcode registry — shared across divisions
  const [barcodeRegistry, setBarcodeRegistry] = useState(() => {
    try { return JSON.parse(localStorage.getItem("barcode_registry") || "{}"); } catch { return {}; }
  });
  const [newBarcodeModal, setNewBarcodeModal] = useState(null);
  const [regForm, setRegForm] = useState({style:"",code:"",colour:"",size:""});
  const [pendingScanCb, setPendingScanCb] = useState(null);

  // Persist barcode registry separately
  useEffect(() => {
    try { localStorage.setItem("barcode_registry", JSON.stringify(barcodeRegistry)); } catch {}
  }, [barcodeRegistry]);

  const registerBarcode = (barcode, details) => {
    setBarcodeRegistry(r => ({...r, [barcode]: details}));
  };

  const setScanLog = (fn) => setAllScanLog(p => ({...p, [division]: typeof fn==="function"?fn(p[division]??[]):fn}));

  // Scanner library loaded on demand in Scanner component

  // Persist
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({products:allProducts,sales:allSales,loans:allLoans,psLoans:allPsLoans,refunds:allRefunds,deliveries:allDeliveries,goals:allGoals,faulty:allFaulty,oddShoes:allOddShoes,scanLog:allScanLog})); } catch {}
  }, [allProducts,allSales,allLoans,allPsLoans,allRefunds,allDeliveries,allGoals,allFaulty,allOddShoes,allScanLog]);

  // ── Division-scoped helpers ────────────────────────────────────────────────
  const _isPriv   = (currentUser?.role==="manager"||currentUser?.role==="supervisor") ?? false;
  const isCombined= _isPriv && division==="combined";
  const activeDivId = isCombined ? "womens" : (division ?? "womens");
  const div       = DIVISIONS.find(d => d.id === activeDivId) ?? DIVISIONS[0];
  const products  = isCombined ? [...(allProducts.womens??[]),...(allProducts.mens??[])] : (division?(allProducts[division]??[]):[]);
  const sales     = isCombined ? [...(allSales.womens??[]),...(allSales.mens??[])].sort((a,b)=>new Date(b.date)-new Date(a.date)) : (division?(allSales[division]??[]):[]);
  const loans     = isCombined ? [...(allLoans.womens??[]),...(allLoans.mens??[])] : (division?(allLoans[division]??[]):[]);
  const psLoans   = isCombined ? [...(allPsLoans.womens??[]),...(allPsLoans.mens??[])] : (division?(allPsLoans[division]??[]):[]);
  const refunds   = isCombined ? [...(allRefunds.womens??[]),...(allRefunds.mens??[])] : (division?(allRefunds[division]??[]):[]);
  const deliveries= isCombined ? [...(allDeliveries.womens??[]),...(allDeliveries.mens??[])] : (division?(allDeliveries[division]??[]):[]);
  const faulty    = isCombined ? [...(allFaulty.womens??[]),...(allFaulty.mens??[])] : (division?(allFaulty[division]??[]):[]);
  const oddShoes  = isCombined ? [...(allOddShoes.womens??[]),...(allOddShoes.mens??[])] : (division?(allOddShoes[division]??[]):[]);
  const writeDiv  = isCombined ? "womens" : (division ?? "womens");

  const setProducts   = (fn) => setAllProducts(p   => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));
  const setSales      = (fn) => setAllSales(p      => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));
  const setLoans      = (fn) => setAllLoans(p      => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));
  const setPsLoans    = (fn) => setAllPsLoans(p    => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));
  const setRefunds    = (fn) => setAllRefunds(p    => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));
  const setDeliveries = (fn) => setAllDeliveries(p => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));
  const setFaulty     = (fn) => setAllFaulty(p     => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));
  const setOddShoes   = (fn) => setAllOddShoes(p   => ({...p,   [writeDiv]: typeof fn==="function"?fn(p[writeDiv]??[]):fn}));

  const availStock = p => p.stock - p.onLoan;

  // ── Goals ──────────────────────────────────────────────────────────────────
  const todayGoals = () => {
    const wk=getWeekKey(), day=getDayName();
    return allGoals?.[division]?.[wk]?.[day] ?? DEFAULT_WEEKLY_GOALS[division]?.[day] ?? {revenue:1000,units:12};
  };
  const openGoalsModal = () => {
    const wk=getWeekKey();
    setEditGoals(JSON.parse(JSON.stringify(allGoals?.[division]?.[wk] ?? DEFAULT_WEEKLY_GOALS[division])));
    setGoalsModal(true);
  };
  const saveGoals = () => {
    const wk=getWeekKey();
    setAllGoals(g => ({...g, [division]: {...(g[division]??{}), [wk]: editGoals}}));
    setGoalsModal(false);
    showToast("Targets saved");
  };

  // ── Misc helpers ───────────────────────────────────────────────────────────
  const showToast = (msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const openScanner = (cb) => { setScanCallback(()=>cb); setScanner(true); };

  // Registry-aware scanner — looks up barcode in registry first, then products
  const openRegistryScanner = (cb) => {
    openScanner((barcode) => {
      const registered = barcodeRegistry[barcode];
      const product    = products.find(x=>x.barcode===barcode);
      if (registered) {
        cb({name:registered.style, sku:registered.code, colour:registered.colour, size:registered.size, barcode, fromRegistry:true});
      } else if (product) {
        cb({...product, barcode, fromRegistry:false});
      } else {
        // Unknown — trigger registration modal, then re-run cb after registration
        setRegForm({style:"",code:"",colour:"",size:""});
        setNewBarcodeModal(barcode);
        // Store cb so modal can call it after registration
        setPendingScanCb(()=>cb);
      }
    });
  };
  const handleScan  = (barcode) => {
    // If in scan session mode, always route to session handler
    if (scanMode) { handleBarcodeScan(barcode); return; }
    setScanner(false);
    const registered = barcodeRegistry[barcode];
    const product    = products.find(x => x.barcode === barcode);
    const known      = registered
      ? {name:registered.style, sku:registered.code, colour:registered.colour, size:registered.size, barcode}
      : product || null;
    if (scanCallback) {
      if (known) { scanCallback(known); }
      else {
        setRegForm({style:"",code:"",colour:"",size:""});
        setNewBarcodeModal(barcode);
        setPendingScanCb(()=>scanCallback);
      }
      return;
    }
    // If on sales screen with no callback, auto-start scan session
    if (safeScreen === "sales") { setScanMode(true); handleBarcodeScan(barcode); return; }
    showToast("Barcode not found — register it first","err");
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  // ── Faulty ────────────────────────────────────────────────────────────────
  const recordFaulty = () => {
    const {style, colour, size, sku, faultType, description, action} = faultyForm;
    if (!style.trim()) return showToast("Enter shoe style","err");
    if (!size) return showToast("Select a size","err");
    if (!faultType) return showToast("Select fault type","err");
    setFaulty(p => [{id:uid(), division, staffId:currentUser.id, staffName:currentUser.name,
      style:style.trim(), colour:colour.trim(), size, sku:sku.trim(),
      faultType, description:description.trim(), action,
      date:new Date().toISOString(), status:"open"},...p]);
    setFaultyForm(blankFaultyForm);
    showToast("Faulty item logged");
  };

  // ── Odd Shoes ─────────────────────────────────────────────────────────────
  const recordOddShoe = () => {
    const {style, colour, shoe1Size, shoe1Foot, shoe2Style, shoe2Colour, shoe2Sku, shoe2Size, shoe2Foot, sku, foundBy, note} = oddForm;
    if (!style.trim()) return showToast("Enter shoe style","err");
    if (!shoe1Size || !shoe2Size) return showToast("Select both sizes","err");
    setOddShoes(p => [{id:uid(), division, staffId:currentUser.id, staffName:currentUser.name,
      style:style.trim(), colour:colour.trim(), sku:sku.trim(),
      foundBy: foundBy.trim() || currentUser.id,
      foundByName: staff.find(s=>s.id.toLowerCase()===foundBy.trim().toLowerCase())?.name || foundBy.trim() || currentUser.name,
      shoe1:{size:shoe1Size, foot:shoe1Foot},
      shoe2:{size:shoe2Size, foot:shoe2Foot, style:shoe2Style.trim(), colour:shoe2Colour.trim(), sku:shoe2Sku.trim()},
      note:note.trim(),
      date:new Date().toISOString(), status:"logged"},...p]);
    setOddForm(blankOddForm);
    showToast("Odd pair logged");
  };

  // ── Barcode scan handler — extracts shoe details from label ────────────────
  const handleBarcodeScan = (barcode) => {
    setScanner(false);
    // Check registry first (global across divisions), then products
    const registered = barcodeRegistry[barcode];
    const product    = products.find(x=>x.barcode===barcode);
    const known      = registered || (product ? {style:product.name, code:product.sku, colour:product.colour, size:product.size||""} : null);

    if (!known) {
      // Unknown barcode — show registration modal
      setRegForm({style:"",code:"",colour:"",size:""});
      setNewBarcodeModal(barcode);
      return;
    }

    const scanEntry = {
      id:uid(), division, barcode, date:new Date().toISOString(),
      staffId:scanStaffId||currentUser.id, outcome:"pending",
      style: known.style || "",
      code:  known.code  || "",
      colour:known.colour|| "",
      size:  known.size  || "",
    };
    setScanLog(p=>[scanEntry,...p]);
    const newItem = {
      scanId:    scanEntry.id,
      barcode,
      style:     known.style  || "",
      code:      known.code   || "",
      colour:    known.colour || "",
      size:      known.size   || "",
      price:     product?.price ? String(product.price) : "",
      discount:  null,
      productId: product?.id || null,
    };
    setScanItems(p=>[...p, newItem]);
    showToast(`✓ ${known.style} — enter price & confirm`);
  };

  // ── Confirm all scanned items → save to sales list ────────────────────────
  const confirmScannedSales = () => {
    const valid = scanItems.filter(item=>item.style.trim()&&item.price&&parseFloat(item.price)>0);
    if (valid.length===0) return showToast("No valid items to confirm","err");
    const overrideStaff = scanStaffId ? staff.find(s=>s.id.toLowerCase()===scanStaffId.trim().toLowerCase()) : null;
    const resolvedStaffId   = overrideStaff ? overrideStaff.id   : currentUser.id==="GUEST" ? "UNASSIGNED" : currentUser.id;
    const resolvedStaffName = overrideStaff ? overrideStaff.name : currentUser.id==="GUEST" ? "Unassigned"  : currentUser.name;
    const newSales = valid.map(item=>{
      const base  = parseFloat(item.price)||0;
      const unit  = item.discount ? +(base*(1-item.discount.pct/100)).toFixed(2) : base;
      return {
        id:uid(), division,
        staffId:resolvedStaffId, staffName:resolvedStaffName,
        recordedById:currentUser.id, recordedByName:currentUser.name,
        isExternal:false, extId:null,
        isUnassigned:resolvedStaffId==="UNASSIGNED",
        isManualProduct:!item.productId,
        productId:item.productId||null,
        productName:`${item.style}${item.colour?" ("+item.colour+")":""}`,
        style:item.style, colour:item.colour, size:item.size,
        sku:item.code, productCode:item.code,
        qty:1, basePrice:base, unitPrice:unit, total:unit,
        discount:item.discount||null,
        tillNo:activeTill, customerRef:"", date:new Date().toISOString(),
        viaBarcode:true, scanId:item.scanId,
      };
    });
    setSales(p=>[...newSales,...p]);
    // Update scan log outcomes with style details from confirmed items
    setScanLog(p=>p.map(entry=>{
      const match = valid.find(i=>i.scanId===entry.id);
      if (!match) return entry;
      return {...entry, outcome:"confirmed", style:match.style, code:match.code, colour:match.colour, size:match.size};
    }));
    setScanItems([]);
    setScanStaffId("");
    setScanMode(false);
    showToast(`${valid.length} sale${valid.length!==1?"s":""} confirmed`);
  };

  const recordSale = () => {
    const {product, style, colour, size, price, customerRef, externalStaff, extName, extId, extProductCode, discount, staffIdOverride, korTill} = saleForm;
    if (!activeTill) return showToast("Select your till first","err");
    if (externalStaff && !extName) return showToast("External staff name required","err");
    const styleName  = (product ? product.name   : style).trim();
    const colourName = (product ? product.colour  : colour).trim();
    const basePrice  = parseFloat(price) || product?.price || 0;
    const unitPrice  = discount ? +(basePrice * (1 - discount.pct/100)).toFixed(2) : basePrice;
    if (!styleName)   return showToast("Enter shoe style","err");
    if (!size)        return showToast("Select a size","err");
    if (basePrice<=0) return showToast("Enter sale price","err");
    if (product && availStock(product) < 1) return showToast("No stock available","err");
    const productName = colourName ? `${styleName} (${colourName})` : styleName;
    const isExternal  = !!(externalStaff && extName);
    const isGuest     = currentUser.id === "GUEST";
    // Resolve staff from override, staff lookup, or external
    const overrideStaff = staffIdOverride ? staff.find(s=>s.id.toLowerCase()===staffIdOverride.trim().toLowerCase()) : null;
    const resolvedStaffId   = isExternal ? (extId||"EXT") : overrideStaff ? overrideStaff.id : isGuest ? "UNASSIGNED" : currentUser.id;
    const resolvedStaffName = isExternal ? extName : overrideStaff ? overrideStaff.name : isGuest ? "Unassigned" : currentUser.name;
    const sale = {
      id:uid(), division,
      staffId: resolvedStaffId,
      staffName: resolvedStaffName,
      recordedById: currentUser.id, recordedByName: currentUser.name,
      isExternal, extId: isExternal ? extId : null,
      isUnassigned: resolvedStaffId === "UNASSIGNED",
      isManualProduct: !product,
      productId: product?.id ?? null,
      productName, style: styleName, colour: colourName, size,
      sku: product?.sku ?? extProductCode,
      productCode: product?.sku ?? extProductCode,
      qty:1, basePrice, unitPrice, total:unitPrice,
      discount: discount ?? null,
      korTill: korTill || null,
      tillNo:activeTill, customerRef, date:new Date().toISOString()
    };
    setSales(p=>[sale,...p]);
    if (product) setProducts(p=>p.map(x=>x.id===product.id?{...x,stock:x.stock-1}:x));
    setSaleForm(blankSaleForm);
    showToast(resolvedStaffId==="UNASSIGNED" ? `Sale saved — assign staff later` : `Sale recorded — ${fmt(unitPrice)} · ${activeTill}`);
  };

  const recordLoan = () => {
    const {style,code,colour,size,location,note}=loanForm;
    if (!style.trim()) return showToast("Enter shoe style","err");
    if (!size) return showToast("Select a size","err");
    const productName=`${style.trim()}${colour?" ("+colour+")":""}`;
    setLoans(p=>[{id:uid(),division,staffId:currentUser.id,staffName:currentUser.name,productId:null,productName,style:style.trim(),colour,size,sku:code,qty:1,location:location||"Unspecified",note,date:new Date().toISOString(),returned:false},...p]);
    setLoanForm({style:"",code:"",colour:"",size:"",location:"",note:""});
    showToast(`${productName} on loan`);
  };

  const returnLoan = (loan) => {
    setLoans(p=>p.map(l=>l.id===loan.id?{...l,returned:true,returnedDate:new Date().toISOString(),returnedBy:currentUser.id}:l));
    setProducts(p=>p.map(x=>x.id===loan.productId?{...x,onLoan:Math.max(0,x.onLoan-loan.qty)}:x));
    showToast(`${loan.productName} returned`);
  };

  const recordPsLoan = () => {
    const {style,code,colour,size,shopperName,shopperId,note}=psForm;
    if (!style.trim()) return showToast("Enter shoe style","err");
    if (!size) return showToast("Select a size","err");
    if (!shopperName||!shopperId) return showToast("Shopper name and ID required","err");
    const productName=`${style.trim()}${colour?" ("+colour+")":""}`;
    setPsLoans(p=>[{id:uid(),division,staffId:currentUser.id,staffName:currentUser.name,productId:null,productName,style:style.trim(),colour,size,sku:code,price:0,qty:1,shopperName,shopperId,note,date:new Date().toISOString(),status:"out",eodResult:null},...p]);
    setPsForm({style:"",code:"",colour:"",size:"",shopperName:"",shopperId:"",note:""});
    showToast(`Loan issued to ${shopperName}`);
  };

  const submitEod = () => {
    const {result,tillNo,note}=eodOutcome;
    if (result==="sold"&&!tillNo) return showToast("Till number required","err");
    const l=eodLoan;
    setPsLoans(p=>p.map(x=>x.id===l.id?{...x,status:result==="returned"?"returned":"sold",eodResult:{result,tillNo,note,resolvedBy:currentUser.id,resolvedAt:new Date().toISOString()}}:x));
    setProducts(p=>p.map(x=>x.id===l.productId?{...x,onLoan:Math.max(0,x.onLoan-l.qty),stock:result==="sold"?x.stock-l.qty:x.stock}:x));
    if (result==="sold") setSales(p=>[{id:uid(),division,staffId:currentUser.id,staffName:currentUser.name,productId:l.productId,productName:l.productName,sku:l.sku,qty:l.qty,unitPrice:l.price,total:l.qty*l.price,tillNo,customerRef:`PS:${l.shopperName}`,date:new Date().toISOString(),viaPs:true},...p]);
    setEodLoan(null); setEodOutcome({result:"sold",tillNo:"",note:""});
    showToast(result==="sold"?"PS sale recorded":"Item returned to stock");
  };

  const recordRefund = () => {
    const {type,style,code,colour,size,origPrice,tillNo,reason,exchangeStyle,exchangeCode,exchangeColour,exchangeSize}=refForm;
    if (!style.trim()) return showToast("Enter shoe style","err");
    if (!tillNo) return showToast("Till number required","err");
    const productName=`${style.trim()}${colour?" ("+colour+")":""}`;
    const exchangeProductName=type==="exchange"&&exchangeStyle?`${exchangeStyle.trim()}${exchangeColour?" ("+exchangeColour+")":""}`:null;
    setRefunds(p=>[{id:uid(),type,division,staffId:currentUser.id,staffName:currentUser.name,productId:null,productName,style:style.trim(),colour,size,sku:code,qty:1,unitPrice:parseFloat(origPrice)||0,tillNo,reason,origSaleId:"",date:new Date().toISOString(),exchangeProductName},...p]);
    setRefForm({type:"refund",style:"",code:"",colour:"",size:"",origPrice:"",tillNo:"",reason:"",exchangeStyle:"",exchangeCode:"",exchangeColour:"",exchangeSize:""});
    showToast(`${type==="refund"?"Refund":"Exchange"} recorded`);
  };

  const recordReceive = () => {
    const {product,qty,note}=recvForm;
    if (!product) return showToast("Select a product","err");
    const q=parseInt(qty);
    if (!q||q<=0) return showToast("Enter valid quantity","err");
    setDeliveries(p=>[{id:uid(),division,staffId:currentUser.id,staffName:currentUser.name,productId:product.id,productName:product.name,qty:q,note,date:new Date().toISOString()},...p]);
    setProducts(p=>p.map(x=>x.id===product.id?{...x,stock:x.stock+q}:x));
    setRecvForm({product:null,qty:"",note:""});
    showToast(`+${q} ${product.name} received`);
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const todaySales   = sales.filter(s=>new Date(s.date).toDateString()===todayStr());
  const mySales      = todaySales.filter(s=>s.staffId===currentUser?.id);
  const openPsLoans  = psLoans.filter(l=>l.status==="out");
  const openLoans    = loans.filter(l=>!l.returned);
  const lowStock     = products.filter(p=>availStock(p)<=3);

  // ── Not logged in ──────────────────────────────────────────────────────────
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body{background:#0e0c0a;overflow-x:hidden;-webkit-text-size-adjust:100%;touch-action:pan-y}
    input,select,button{font-family:'Outfit',sans-serif;-webkit-appearance:none;appearance:none}
    input,select{font-size:16px!important;touch-action:manipulation}
    button{touch-action:manipulation}
    ::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-track{background:#0e0c0a}::-webkit-scrollbar-thumb{background:#2a2520}
    .inp{background:#161412;border:1px solid #2a2520;color:#f0e8d8;padding:14px;font-size:16px!important;width:100%;outline:none;transition:border-color .15s;border-radius:8px;font-family:'Outfit',sans-serif}
    .inp::placeholder{color:#3a3530}
    .btn{cursor:pointer;border:none;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;letter-spacing:0.04em;padding:14px 20px;transition:all .15s;border-radius:8px;min-height:50px;touch-action:manipulation}
    .btn-ghost{background:transparent;border:1px solid #2a2520;color:#888}
    .btn-dark{background:#1e1c1a;border:1px solid #2a2520;color:#aaa}
    .btn-main{min-height:54px;font-size:15px}
    .card{background:#111009;border:1px solid #1e1c1a;border-radius:8px}
    .label{font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#666;display:block;margin-bottom:8px}
    .chip{display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 9px;border-radius:4px}
    .chip-red{background:#6e202022;color:#e07070}
    .chip-green{background:#1e4a2222;color:#6ea870}
    .chip-blue{background:#1e2a4a22;color:#70a0c8}
    .chip-grey{background:#2a252022;color:#777}
    .row-item{border-bottom:1px solid #161412;padding:16px 16px;transition:background .1s}
    .nav-item{cursor:pointer;background:none;border:none;font-family:'Outfit',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#555;padding:12px 14px;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;min-height:44px;touch-action:manipulation}
    .section-title{font-family:'Playfair Display',serif;font-size:20px;color:#f0e8d8;margin-bottom:4px}
    .section-sub{font-size:12px;color:#555;margin-bottom:20px}
    @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @media(max-width:600px){
      .section-title{font-size:18px}
      .card{border-radius:8px}
      table{font-size:11px}
      th,td{padding:8px 8px!important;white-space:nowrap}
      .hide-mobile{display:none!important}
    }
  `;

  const GUEST_USER = {id:"GUEST", name:"Quick Sale", role:"staff"};
  const [staffViewMode, setStaffViewMode] = useState(false);

  // ── All non-hook derived state ─────────────────────────────────────────────
  const isPrivileged = (currentUser?.role === "manager" || currentUser?.role === "supervisor") ?? false;
  const isManager    = currentUser?.role === "manager" ?? false;
  const managerScreens = ["goals","loanmgmt","stock","history","eod","receive","ai","assign","scanlog"];
  const safeScreen = (!isPrivileged && managerScreens.includes(screen)) ? "sales" : screen;
  const unassignedSales = sales.filter(s=>s.isUnassigned);
  const divColor = isCombined ? "#a0a0a0" : div.color;
  const divLabel = isCombined ? "Combined" : div.label;
  const tills = divTills(activeDivId);

  const screenList = [
    {id:"sales",   label:"Sales"},
    ...(!isPrivileged ? [
      {id:"loans",   label:"Stock on Loan"},
    ] : []),
    {id:"faulty",  label:"Faulty"+(faulty.filter(f=>f.status==="open").length?" ("+faulty.filter(f=>f.status==="open").length+")":"")},
    {id:"odd",     label:"Odd Shoes"+(oddShoes.filter(o=>o.status==="logged").length?" ("+oddShoes.filter(o=>o.status==="logged").length+")":"")},
    ...(isPrivileged ? [
      {id:"goals",    label:"Team Goal"},
      {id:"assign",   label:"Assign Sales"+(unassignedSales.length?" ("+unassignedSales.length+")":"")},
      {id:"loanmgmt", label:"Loans"+((openLoans.length+openPsLoans.length)?" ("+(openLoans.length+openPsLoans.length)+")":"")},
      {id:"stock",    label:"Stock"},
      {id:"history",  label:"History"},
      {id:"eod",      label:"EOD Report"},
      {id:"scanlog",  label:"Scan Log"},
      {id:"receive",  label:"Receive Stock"},
      ...(isManager ? [{id:"ai", label:"✦ AI Hub"}] : []),
    ] : []),
  ];

  // ── Early returns (after all hooks and const declarations) ─────────────────
  if (!currentUser && !staffViewMode) return (
    <><style>{CSS}</style>
    <LoginScreen staff={staff}
      onLogin={u=>{
        setCurrentUser(u);
        if (u.role==="manager"||u.role==="supervisor") { setDivision("womens"); setActiveTill(null); }
      }}
      onQuickSale={()=>setCurrentUser(GUEST_USER)}
      onStaffView={()=>setStaffViewMode(true)} /></>
  );
  if (staffViewMode && !currentUser) return (
    <StaffDailyView
      allSales={allSales} allRefunds={allRefunds} allLoans={allLoans} allPsLoans={allPsLoans}
      onBack={()=>setStaffViewMode(false)} />
  );
  if (!division && !isPrivileged) return (
    <><style>{CSS}</style><DivisionPicker user={currentUser} onPick={d=>{setDivision(d);setScreen("sales");setActiveTill(defaultTill(d));}} /></>
  );

  return (
    <div style={{fontFamily:"'Outfit',sans-serif",minHeight:"100vh",background:"#0e0c0a",color:"#f0e8d8"}}>
      <style>{CSS}</style>
      <style>{`.inp:focus{border-color:${divColor}} .nav-item.active{color:${divColor};border-bottom-color:${divColor}} .btn-main{background:${divColor};color:#0e0c0a} .btn-main:hover{opacity:.88}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:700,animation:"toastIn .2s ease",whiteSpace:"nowrap",maxWidth:"90vw"}}>
          <div style={{background:toast.type==="err"?"#6e2020":"#1e3020",border:`1px solid ${toast.type==="err"?"#8e303055":"#2e5030"}`,color:toast.type==="err"?"#f5c0c0":"#90d098",padding:"12px 24px",fontSize:13,fontWeight:600,borderRadius:8,boxShadow:"0 4px 24px rgba(0,0,0,0.4)"}}>
            {toast.msg}
          </div>
        </div>
      )}

      {scanner && <Scanner onDetected={handleScan} onClose={()=>setScanner(false)} divColor={divColor} />}

      {/* ── New Barcode Registration Modal ─────────────────────────────────── */}
      {newBarcodeModal && (
        <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Outfit',sans-serif"}}>
          <div style={{background:"#111009",border:`1px solid ${divColor}55`,borderRadius:10,padding:24,width:"100%",maxWidth:420}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#f0e8d8",marginBottom:4}}>New Shoe — Register Barcode</div>
            <div style={{fontSize:12,color:"#555",marginBottom:4}}>Not seen this barcode before. Enter details once and it auto-fills on every scan.</div>
            <div style={{fontFamily:"monospace",fontSize:11,color:divColor,marginBottom:20,padding:"6px 10px",background:"#0a0908",borderRadius:4,border:"1px solid #2a2520"}}>{newBarcodeModal}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#666",display:"block",marginBottom:6}}>Style Name *</label>
                <input className="inp" placeholder="e.g. JAPAN" value={regForm.style} onChange={e=>setRegForm(f=>({...f,style:e.target.value}))} style={{fontSize:15,fontWeight:600}} autoFocus />
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#666",display:"block",marginBottom:6}}>Style Code / Colour <span style={{color:"#444",fontWeight:400}}>(from label)</span></label>
                <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:4,overflow:"hidden"}}>
                  <input placeholder="40374" value={regForm.code} maxLength={5}
                    onChange={e=>{const v=e.target.value.slice(0,5);setRegForm(f=>({...f,code:v}));if(v.length===5)document.getElementById("reg-colour")?.focus();}}
                    style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"10px 12px",fontSize:14,fontFamily:"inherit",minWidth:0}} />
                  <span style={{color:"#444",fontSize:16,padding:"0 6px"}}>/</span>
                  <input id="reg-colour" placeholder="17886" value={regForm.colour} maxLength={5}
                    onChange={e=>setRegForm(f=>({...f,colour:e.target.value.slice(0,5)}))}
                    style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"10px 12px",fontSize:14,fontFamily:"inherit",minWidth:0}} />
                </div>
                <div style={{fontSize:10,color:"#444",marginTop:4}}>Last 5 after dash on line 1 / colour line with no dash</div>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#666",display:"block",marginBottom:6}}>UK Size *</label>
                <select className="inp" value={regForm.size} onChange={e=>setRegForm(f=>({...f,size:e.target.value}))}>
                  <option value="">— Select size —</option>
                  {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
                <button onClick={()=>{setNewBarcodeModal(null);setRegForm({style:"",code:"",colour:"",size:"",});}}
                  style={{padding:"12px",background:"none",border:"1px solid #2a2520",color:"#666",cursor:"pointer",borderRadius:6,fontFamily:"inherit",fontSize:13}}>
                  Cancel
                </button>
                <button onClick={()=>{
                  if(!regForm.style.trim())return showToast("Enter style name","err");
                  if(!regForm.size)return showToast("Select size","err");
                  const details={style:regForm.style.trim(),code:regForm.code,colour:regForm.colour,size:regForm.size};
                  registerBarcode(newBarcodeModal,details);
                  const bc=newBarcodeModal;
                  setNewBarcodeModal(null);
                  setRegForm({style:"",code:"",colour:"",size:""});
                  showToast(`Registered ${details.style} — added to basket`);
                  // If there's a pending scan callback (from non-sales screens), call it
                  if (pendingScanCb) {
                    pendingScanCb({name:details.style,sku:details.code,colour:details.colour,size:details.size,barcode:bc,fromRegistry:true});
                    setPendingScanCb(null);
                  } else {
                    setTimeout(()=>handleBarcodeScan(bc),150);
                  }
                }}
                  style={{padding:"12px",background:divColor,color:"#0e0c0a",border:"none",cursor:"pointer",borderRadius:6,fontFamily:"inherit",fontSize:13,fontWeight:700}}>
                  Register & Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Till change modal */}
      {tillPickerOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:16}}>
          <div className="card" style={{width:"100%",maxWidth:340,padding:28,textAlign:"center"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,marginBottom:4}}>Change Till</div>
            <div style={{fontSize:12,color:"#555",marginBottom:20}}>Currently on <strong style={{color:divColor}}>{activeTill}</strong></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              {tills.map(t=>{
                const isActive = activeTill===t.id;
                const isHome   = t.home===division;
                return (
                  <button key={t.id} onClick={()=>{setActiveTill(t.id);setTillPickerOpen(false);showToast(`Switched to ${t.id}`);}}
                    style={{padding:"18px 12px",fontFamily:"inherit",background:isActive?divColor+"22":"#0a0908",border:`1.5px solid ${isActive?divColor:isHome?"#2a2520":"#3a2520"}`,cursor:"pointer",borderRadius:6,transition:"all .15s",textAlign:"center"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:isActive?divColor:isHome?"#c8c0b0":"#888",marginBottom:4}}>{t.label}</div>
                    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:isHome?divColor+"aa":"#6a4030",marginBottom:isActive?4:0}}>
                      {isHome ? "● Default" : "○ Other div."}
                    </div>
                    <div style={{fontSize:10,color:"#555"}}>{t.desc}</div>
                    {isActive && <div style={{fontSize:10,color:divColor,marginTop:4,fontWeight:600}}>ACTIVE</div>}
                  </button>
                );
              })}
            </div>
            <button className="btn btn-ghost" style={{width:"100%"}} onClick={()=>setTillPickerOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Goals modal */}
      {goalsModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:16}}>
          <div className="card" style={{width:"100%",maxWidth:560,padding:28,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,marginBottom:2}}>{divLabel} Weekly Targets</div>
            <div style={{fontSize:12,color:"#555",marginBottom:22}}>Set revenue and unit goals for each day.</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {DAYS.map(day=>(
                <div key={day} style={{background:"#0a0908",border:"1px solid #1e1c1a",borderRadius:6,padding:"14px 16px"}}>
                  <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.08em",color:divColor,marginBottom:10}}>{day.toUpperCase()}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    <div>
                      <label className="label">Revenue (€)</label>
                      <input className="inp" type="number" min="0" step="50" value={editGoals[day]?.revenue??""} onChange={e=>setEditGoals(g=>({...g,[day]:{...(g[day]||{}),revenue:parseFloat(e.target.value)||0}}))} placeholder={DEFAULT_WEEKLY_GOALS[division]?.[day]?.revenue} />
                    </div>
                    <div>
                      <label className="label">Units</label>
                      <input className="inp" type="number" min="0" value={editGoals[day]?.units??""} onChange={e=>setEditGoals(g=>({...g,[day]:{...(g[day]||{}),units:parseInt(e.target.value)||0}}))} placeholder={DEFAULT_WEEKLY_GOALS[division]?.[day]?.units} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setGoalsModal(false)}>Cancel</button>
              <button className="btn btn-main" style={{flex:2}} onClick={saveGoals}>Save Targets</button>
            </div>
          </div>
        </div>
      )}

      {/* EOD modal */}
      {eodLoan && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:16}}>
          <div className="card" style={{width:"100%",maxWidth:420,padding:28}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,marginBottom:4}}>EOD Sign-off</div>
            <div style={{fontSize:12,color:"#666",marginBottom:20}}>Resolve loan for <strong style={{color:divColor}}>{eodLoan.shopperName}</strong> — {eodLoan.productName} ×{eodLoan.qty}</div>
            <label className="label">Outcome</label>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {[["sold","Item Sold"],["returned","Returned"],["missing","Not Accounted"]].map(([v,l])=>(
                <button key={v} onClick={()=>setEodOutcome(o=>({...o,result:v}))}
                  style={{flex:1,padding:"10px 6px",fontSize:12,fontWeight:600,border:`1.5px solid ${eodOutcome.result===v?divColor:"#2a2520"}`,background:eodOutcome.result===v?divColor+"22":"transparent",color:eodOutcome.result===v?divColor:"#666",cursor:"pointer",borderRadius:4,fontFamily:"inherit",transition:"all .15s"}}>
                  {l}
                </button>
              ))}
            </div>
            {eodOutcome.result==="sold"&&<div style={{marginBottom:14}}><label className="label">Till Number *</label><input className="inp" placeholder="e.g. T3" value={eodOutcome.tillNo} onChange={e=>setEodOutcome(o=>({...o,tillNo:e.target.value}))} /></div>}
            <div style={{marginBottom:20}}><label className="label">Note</label><input className="inp" placeholder="Optional" value={eodOutcome.note} onChange={e=>setEodOutcome(o=>({...o,note:e.target.value}))} /></div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost" style={{flex:1}} onClick={()=>setEodLoan(null)}>Cancel</button>
              <button className="btn btn-main" style={{flex:2}} onClick={submitEod}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{background:"#0a0908",borderBottom:`2px solid ${div.dim}`,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isPrivileged ? (
            /* Manager — division switcher tabs */
            <div style={{display:"flex",gap:4}}>
              {[
                {id:"womens",   label:"Women's", color:DIVISIONS[0].color},
                {id:"mens",     label:"Men's",   color:DIVISIONS[1].color},
                {id:"combined", label:"Combined",color:"#a0a0a0"},
              ].map(t=>(
                <button key={t.id} onClick={()=>setDivision(t.id)}
                  style={{padding:"5px 12px",fontSize:12,fontWeight:700,fontFamily:"inherit",cursor:"pointer",borderRadius:4,border:`1.5px solid ${division===t.id?t.color:"#2a2520"}`,background:division===t.id?t.color+"22":"transparent",color:division===t.id?t.color:"#555",transition:"all .15s"}}>
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:divColor,fontWeight:700}}>{divLabel}</span>
          )}
          {lowStock.length>0&&<span style={{fontSize:10,color:"#e07070",fontWeight:700,background:"#3a1e1e",padding:"2px 7px",borderRadius:3}}>⚠ {lowStock.length} low</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {!isPrivileged && <button onClick={()=>setTillPickerOpen(true)}
            style={{display:"flex",alignItems:"center",gap:4,background:divColor+"18",border:`1px solid ${divColor}44`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontFamily:"inherit"}}>
            <span style={{fontSize:11,color:divColor,fontWeight:700}}>TILL</span>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:divColor,fontWeight:700,marginLeft:2}}>{activeTill}</span>
            <span style={{fontSize:10,color:divColor+"88",marginLeft:2}}>▾</span>
          </button>}
          <span style={{fontSize:12,color:"#555"}}>{currentUser.name}</span>
          <button onClick={()=>{setCurrentUser(null);setDivision(null);setActiveTill(null);}}
            style={{background:"none",border:"1px solid #2a2520",color:"#555",padding:"6px 12px",fontSize:12,cursor:"pointer",borderRadius:6,fontFamily:"inherit",fontWeight:600}}>
            ✕
          </button>
        </div>
      </header>

      {/* Top nav — scrollable horizontal tabs */}
      <nav style={{background:"#0a0908",borderBottom:"1px solid #1a1714",padding:"0 12px",display:"flex",overflowX:"auto",gap:0,WebkitOverflowScrolling:"touch",scrollbarWidth:"none"}}>
        <style>{`.nav-item.active{color:${divColor}!important;border-bottom-color:${divColor}!important}`}</style>
        {screenList.map(s=>(
          <button key={s.id} className={`nav-item ${safeScreen===s.id?"active":""}`} onClick={()=>setScreen(s.id)}>{s.label}</button>
        ))}
      </nav>

      <main style={{padding:"16px 12px",maxWidth:860,margin:"0 auto",paddingBottom:40}}>

        {/* ═══ SALES SCREEN ════════════════════════════════════════════════════ */}
        {safeScreen==="sales" && (
          <div>
            {/* Sub-tabs: Sales | Refunds */}
            <div style={{display:"flex",gap:0,borderBottom:"1px solid #1a1714",marginBottom:20}}>
              {[
                {id:"sales",   label:"Sales"},
                {id:"refunds", label:"Refunds & Exchanges"+(todayRefunds.length?" ("+todayRefunds.length+")":"")},
              ].map(t=>{
                const active = salesTab===t.id;
                return (
                  <button key={t.id} onClick={()=>setSalesTab(t.id)}
                    style={{padding:"10px 18px",background:"none",border:"none",borderBottom:`2px solid ${active?divColor:"transparent"}`,color:active?divColor:"#555",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,transition:"all .15s",whiteSpace:"nowrap"}}>
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* ── SALES TAB ─────────────────────────────────────────────────── */}
            {salesTab==="sales" && (<div>
            {/* ── INPUT MODE (Quick Sale / staff only) ──────────────────────── */}
            {!isPrivileged ? (<div>
            {/* ── SCAN SESSION MODE ─────────────────────────────────────────── */}
            {scanMode ? (
              <div>
                {/* Staff ID + session controls */}
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:180}}>
                    <label className="label">Staff ID (optional)</label>
                    <input className="inp" placeholder="Enter staff ID or leave blank"
                      value={scanStaffId} onChange={e=>setScanStaffId(e.target.value)} />
                    {scanStaffId&&(()=>{
                      const found=staff.find(s=>s.id.toLowerCase()===scanStaffId.trim().toLowerCase());
                      return found
                        ? <div style={{fontSize:11,color:"#6ea870",marginTop:4}}>✓ {found.name}</div>
                        : <div style={{fontSize:11,color:"#e07070",marginTop:4}}>ID not found — unassigned</div>;
                    })()}
                  </div>
                  <button onClick={()=>{setScanner(true);}}
                    style={{display:"flex",alignItems:"center",gap:8,background:divColor,color:"#0e0c0a",border:"none",borderRadius:6,padding:"13px 20px",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,letterSpacing:"0.04em",whiteSpace:"nowrap"}}>
                    <span style={{fontSize:20}}>▣</span> Scan Next Shoe
                  </button>
                  <button onClick={()=>handleBarcodeScan("5063605815214")}
                    style={{display:"flex",alignItems:"center",gap:6,background:"none",border:`1px solid ${divColor}55`,color:divColor,borderRadius:6,padding:"13px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>
                    ▣ Test Scan
                  </button>
                  <button onClick={()=>{setScanItems([]);setScanMode(false);setScanStaffId("");}}
                    style={{background:"none",border:"1px solid #2a2520",color:"#666",padding:"13px 16px",cursor:"pointer",borderRadius:6,fontFamily:"inherit",fontSize:13}}>
                    Cancel Session
                  </button>
                </div>

                {/* Pending scanned items */}
                {scanItems.length===0 ? (
                  <div style={{textAlign:"center",padding:"40px 16px",background:"#111009",borderRadius:8,border:"1px solid #1e1c1a",marginBottom:16}}>
                    <div style={{fontSize:36,marginBottom:12}}>▣</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#f0e8d8",marginBottom:6}}>Ready to Scan</div>
                    <div style={{fontSize:13,color:"#555"}}>Point the camera at the barcode on the shoe label</div>
                  </div>
                ) : (
                  <div style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555"}}>{scanItems.length} shoe{scanItems.length!==1?"s":""} scanned</div>
                      <div style={{fontSize:13,color:divColor,fontWeight:700}}>Total: {fmt(scanItems.reduce((t,i)=>{const b=parseFloat(i.price)||0;return t+(i.discount?+(b*(1-i.discount.pct/100)).toFixed(2):b);},0))}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {scanItems.map((item,i)=>{
                        const base=parseFloat(item.price)||0;
                        const total=item.discount?+(base*(1-item.discount.pct/100)).toFixed(2):base;
                        return (
                          <div key={i} className="card" style={{padding:14}}>
                            {/* Top row: style name + cancel */}
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                              <div style={{flex:1,marginRight:10}}>
                                <label className="label" style={{marginBottom:4}}>Style Name</label>
                                <input className="inp" value={item.style} placeholder="Style name"
                                  onChange={e=>setScanItems(p=>p.map((x,j)=>j===i?{...x,style:e.target.value}:x))} />
                              </div>
                              <button onClick={()=>{
                                setScanLog(p=>p.map(e=>e.id===item.scanId?{...e,outcome:"cancelled"}:e));
                                setScanItems(p=>p.filter((_,j)=>j!==i));
                                showToast("Item removed");
                              }} style={{background:"none",border:"1px solid #3a1e1e",color:"#e07070",cursor:"pointer",borderRadius:6,padding:"8px 12px",fontSize:13,fontFamily:"inherit",marginTop:20,flexShrink:0}}>✕</button>
                            </div>
                            {/* Code / Colour */}
                            <div style={{marginBottom:10}}>
                              <label className="label" style={{marginBottom:4}}>Style Code / Colour</label>
                              <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:8,overflow:"hidden",height:50}}>
                                <input value={item.code} placeholder="Code" maxLength={5}
                                  onChange={e=>setScanItems(p=>p.map((x,j)=>j===i?{...x,code:e.target.value.slice(0,5)}:x))}
                                  style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"0 14px",fontSize:16,fontFamily:"inherit",minWidth:0}} />
                                <span style={{color:"#333",fontSize:18,padding:"0 6px"}}>/</span>
                                <input value={item.colour} placeholder="Colour" maxLength={5}
                                  onChange={e=>setScanItems(p=>p.map((x,j)=>j===i?{...x,colour:e.target.value.slice(0,5)}:x))}
                                  style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"0 14px",fontSize:16,fontFamily:"inherit",minWidth:0}} />
                              </div>
                            </div>
                            {/* Size + Price */}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                              <div>
                                <label className="label" style={{marginBottom:4}}>Size</label>
                                <select className="inp" value={item.size}
                                  onChange={e=>setScanItems(p=>p.map((x,j)=>j===i?{...x,size:e.target.value}:x))}>
                                  <option value="">— Size —</option>
                                  {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="label" style={{marginBottom:4}}>Price (€)</label>
                                <input className="inp" type="number" step="0.01" value={item.price} placeholder="0.00"
                                  onChange={e=>setScanItems(p=>p.map((x,j)=>j===i?{...x,price:e.target.value}:x))} />
                              </div>
                            </div>
                            {/* Discount + Total */}
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                              <div>
                                <label className="label" style={{marginBottom:4}}>Discount</label>
                                <select className="inp" value={item.discount?.id||""}
                                  onChange={e=>{
                                    const opts={bt25:{id:"bt25",label:"BT Staff",pct:25},pct10:{id:"pct10",label:"10% Off",pct:10}};
                                    setScanItems(p=>p.map((x,j)=>j===i?{...x,discount:e.target.value?opts[e.target.value]:null}:x));
                                  }}>
                                  <option value="">None</option>
                                  <option value="bt25">BT Staff 25%</option>
                                  <option value="pct10">10% Off</option>
                                </select>
                              </div>
                              <div>
                                <label className="label" style={{marginBottom:4}}>Total</label>
                                <div className="inp" style={{color:total>0?(item.discount?"#6ea870":divColor):"#444",fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:700,background:"#0a0908",display:"flex",alignItems:"center",borderColor:total>0?divColor+"44":"#1e1c1a"}}>
                                  {total>0?fmt(total):"—"}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {scanItems.length>0&&(
                  <button onClick={confirmScannedSales}
                    style={{width:"100%",background:"#6ea870",color:"#0e0c0a",border:"none",padding:"15px",fontSize:15,fontWeight:700,cursor:"pointer",borderRadius:6,fontFamily:"inherit",letterSpacing:"0.04em"}}>
                    ✓ Confirm {scanItems.length} Sale{scanItems.length!==1?"s":""} — {fmt(scanItems.reduce((t,i)=>{const b=parseFloat(i.price)||0;return t+(i.discount?+(b*(1-i.discount.pct/100)).toFixed(2):b);},0))}
                  </button>
                )}
              </div>

            ) : (
              <div>
                {/* Primary: Big scan button */}
                <button onClick={()=>setScanMode(true)}
                  style={{width:"100%",background:divColor,color:"#0e0c0a",border:"none",borderRadius:8,padding:"22px",cursor:"pointer",fontFamily:"inherit",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:14}}>
                  <span style={{fontSize:32}}>▣</span>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:17,fontWeight:700,letterSpacing:"0.04em"}}>Scan to Record Sale</div>
                    <div style={{fontSize:12,opacity:0.7,marginTop:2}}>Point camera at shoe label barcode</div>
                  </div>
                </button>

                {/* Secondary: Manual entry */}
                  <div style={{marginTop:12}}>
                    <div className="card" style={{padding:20}}>
                      {/* Active till indicator */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,paddingBottom:12,borderBottom:"1px solid #1e1c1a"}}>
                        <div style={{fontSize:11,color:"#555"}}>Recording to</div>
                        <button onClick={()=>setTillPickerOpen(true)} style={{display:"flex",alignItems:"center",gap:8,background:divColor+"18",border:`1px solid ${divColor}55`,borderRadius:4,padding:"5px 10px",cursor:"pointer",fontFamily:"inherit"}}>
                          <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:divColor,fontWeight:700}}>{activeTill}</span>
                          <span style={{fontSize:10,color:divColor+"88"}}>CHANGE ▾</span>
                        </button>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:12}}>
                        {/* Style Name — full width */}
                        <div>
                          <label className="label">Style Name *</label>
                          <input className="inp" placeholder="e.g. JAPAN" value={saleForm.style} onChange={e=>setSaleForm(f=>({...f,style:e.target.value}))} />
                        </div>
                        {/* Code / Colour — full width split bar */}
                        <div>
                          <label className="label">Style Code / Colour</label>
                          <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:8,overflow:"hidden",height:54}}>
                            <input placeholder="Code" value={saleForm.extProductCode} maxLength={5}
                              onChange={e=>{const val=e.target.value.slice(0,5);setSaleForm(f=>({...f,extProductCode:val}));if(val.length===5)colourInputRef.current?.focus();}}
                              style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"0 14px",fontSize:16,fontFamily:"inherit",minWidth:0}} />
                            <span style={{color:"#333",fontSize:18,padding:"0 6px",flexShrink:0}}>/</span>
                            <input ref={colourInputRef} placeholder="Colour" value={saleForm.colour} maxLength={5}
                              onChange={e=>setSaleForm(f=>({...f,colour:e.target.value.slice(0,5)}))}
                              style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"0 14px",fontSize:16,fontFamily:"inherit",minWidth:0}} />
                          </div>
                        </div>
                        {/* Row 2 — Size + Price */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                          <div>
                            <label className="label">Size *</label>
                            <select className="inp" value={saleForm.size} onChange={e=>setSaleForm(f=>({...f,size:e.target.value}))}>
                              <option value="">— Size —</option>
                              {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="label">Price (€) *</label>
                            <input className="inp" type="number" step="0.01" placeholder="0.00" value={saleForm.price} onChange={e=>setSaleForm(f=>({...f,price:e.target.value}))} />
                          </div>
                        </div>
                        {/* Row 3 — Discount + Total */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                          <div>
                            <label className="label">Discount</label>
                            <select className="inp" value={saleForm.discount?.id||""} onChange={e=>{
                              const opts={bt25:{id:"bt25",label:"BT Staff",pct:25},pct10:{id:"pct10",label:"10% Off",pct:10}};
                              setSaleForm(f=>({...f,discount:e.target.value?opts[e.target.value]:null}));
                            }}>
                              <option value="">None</option>
                              <option value="bt25">BT Staff 25%</option>
                              <option value="pct10">10% Off</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">Total</label>
                            {(()=>{
                              const b=parseFloat(saleForm.price)||0;
                              const total=saleForm.discount?+(b*(1-saleForm.discount.pct/100)).toFixed(2):b;
                              return (
                                <div className="inp" style={{color:total>0?(saleForm.discount?"#6ea870":divColor):"#444",fontFamily:"'Playfair Display',serif",fontSize:18,background:"#0a0908",display:"flex",alignItems:"center",fontWeight:700,borderColor:total>0?divColor+"44":"#1e1c1a"}}>
                                  {total>0?fmt(total):"—"}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        {/* Row 4 — Sold By */}
                        <div>
                          <label className="label">Sold By</label>
                          <input className="inp" placeholder={currentUser.id==="GUEST"?"Enter staff ID or leave blank":`Leave blank — defaults to ${currentUser.id}`}
                            value={saleForm.staffIdOverride} onChange={e=>setSaleForm(f=>({...f,staffIdOverride:e.target.value}))} />
                        </div>
                        <div style={{background:"#0a0908",border:`1px solid ${saleForm.externalStaff?divColor+"55":"#1e1c1a"}`,borderRadius:6,padding:"12px 14px"}}>
                          <button onClick={()=>setSaleForm(f=>({...f,externalStaff:!f.externalStaff,extName:"",extId:""}))}
                            style={{width:"100%",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit",padding:0}}>
                            <span style={{fontSize:13,fontWeight:600,color:saleForm.externalStaff?divColor:"#888"}}>Sale by non-team staff</span>
                            <div style={{width:34,height:18,borderRadius:9,background:saleForm.externalStaff?divColor:"#2a2520",position:"relative",flexShrink:0,transition:"background .2s"}}>
                              <div style={{position:"absolute",top:2,left:saleForm.externalStaff?15:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s"}} />
                            </div>
                          </button>
                          {saleForm.externalStaff&&(
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10,paddingTop:10,borderTop:"1px solid #1e1c1a"}}>
                              <div><label className="label">Staff Name *</label>
                                <input className="inp" placeholder="Full name" value={saleForm.extName} onChange={e=>setSaleForm(f=>({...f,extName:e.target.value}))} /></div>
                              <div><label className="label">Till Number</label>
                                <input className="inp" placeholder="e.g. 622" value={saleForm.extId} onChange={e=>setSaleForm(f=>({...f,extId:e.target.value}))} /></div>
                            </div>
                          )}
                        </div>
                        <button className="btn btn-main" style={{width:"100%",padding:13}} onClick={recordSale}>Record Sale</button>
                      </div>
                    </div>
                  </div>

                {/* Today's sales table */}
                {todaySales.length>0&&(
                  <div style={{marginTop:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555"}}>Today's {divLabel} Sales</div>
                      <div style={{fontSize:11,color:"#555"}}>{todaySales.length} sale{todaySales.length!==1?"s":""} · {fmt(todaySales.reduce((t,s)=>t+s.total,0))}</div>
                    </div>
                    <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                        <thead>
                          <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                            {["Sold By","Style Name","Style Code","Style Colour","Size","Orig. Price","Discount","Total","Time"].map(h=>(
                              <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {todaySales.map((s,i)=>(
                            <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                              <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                                <span style={{color:s.isUnassigned?"#c090e0":s.isExternal?"#e0a070":s.staffId===currentUser.id?divColor:"#c0b8a8",fontWeight:600}}>{s.staffName}</span>
                                {s.isUnassigned&&<div style={{fontSize:9,color:"#c090e0",letterSpacing:"0.06em",textTransform:"uppercase"}}>unassigned</div>}
                              </td>
                              <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{s.style||s.productName}</td>
                              <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11,whiteSpace:"nowrap"}}>{s.productCode||"—"}</td>
                              <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11,whiteSpace:"nowrap"}}>{s.colour||"—"}</td>
                              <td style={{padding:"10px 12px",textAlign:"center"}}>
                                <span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{s.size||"—"}</span>
                              </td>
                              <td style={{padding:"10px 12px",color:s.discount?"#777":"#c0b8a8",textDecoration:s.discount?"line-through":"none",whiteSpace:"nowrap"}}>{fmt(s.basePrice||s.unitPrice)}</td>
                              <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                                {s.discount?<span style={{background:"#4a2a1a",color:"#e0a070",border:"1px solid #6a3a2a",padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:700}}>{s.discount.label} −{s.discount.pct}%</span>:<span style={{color:"#333"}}>—</span>}
                              </td>
                              <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:14,color:s.discount?"#6ea870":divColor,fontWeight:700,whiteSpace:"nowrap"}}>{fmt(s.total)}</td>
                              <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap",fontSize:11}}>{fmtTime(s.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{background:"#111009",borderTop:`2px solid ${divColor}44`}}>
                            <td colSpan={7} style={{padding:"10px 12px",fontSize:11,color:"#555",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Day Total</td>
                            <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:16,color:divColor,fontWeight:700}}>{fmt(todaySales.reduce((t,s)=>t+s.total,0))}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Stats at bottom */}
                {(()=>{
                  const g=todayGoals(), rev=todaySales.reduce((t,s)=>t+s.total,0), units=todaySales.reduce((t,s)=>t+s.qty,0);
                  const rp=Math.min(100,g.revenue>0?(rev/g.revenue)*100:0), up=Math.min(100,g.units>0?(units/g.units)*100:0);
                  return (
                    <div style={{marginTop:24}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
                        {[
                          {label:"My Sales Today",   value:mySales.length,                                   color:divColor},
                          {label:"My Revenue",       value:fmt(mySales.reduce((t,s)=>t+s.total,0)),         color:divColor},
                          {label:"Team Sales Today", value:todaySales.length,                                color:"#888"},
                        ].map(({label,value,color})=>(
                          <div key={label} className="card" style={{padding:"14px 16px"}}>
                            <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:6}}>{label}</div>
                            <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,color}}>{value}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,cursor:"pointer"}} onClick={()=>setScreen("goals")}>
                        {[{label:"Revenue",val:fmt(rev),target:fmt(g.revenue),pct:rp,done:rev>=g.revenue},{label:"Units",val:units,target:`${g.units} units`,pct:up,done:units>=g.units}].map(({label,val,target,pct,done})=>(
                          <div key={label} style={{background:"#111009",border:`1px solid ${done?"#3a6a4066":"#1e1c1a"}`,borderRadius:6,padding:"12px 14px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                              <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:done?"#6ea870":"#666"}}>{label}{done&&" ✓"}</span>
                              <span style={{fontSize:11,color:done?"#6ea870":divColor,fontWeight:600}}>{val} <span style={{color:"#444",fontWeight:400}}>/ {target}</span></span>
                            </div>
                            <div style={{background:"#0a0908",borderRadius:3,height:4,overflow:"hidden"}}>
                              <div style={{height:"100%",width:`${pct}%`,background:done?"#6ea870":divColor,borderRadius:3,transition:"width .4s"}} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            </div>) : (
              /* ── MANAGER VIEW — Sales with Combined + Division tabs ─────── */
              (()=>{
                const wSales=allSales.womens??[], mSales=allSales.mens??[];
                const wToday=wSales.filter(s=>new Date(s.date).toDateString()===new Date().toDateString());
                const mToday=mSales.filter(s=>new Date(s.date).toDateString()===new Date().toDateString());
                const wRev=wToday.reduce((t,s)=>t+s.total,0), mRev=mToday.reduce((t,s)=>t+s.total,0);
                const wUnits=wToday.reduce((t,s)=>t+s.qty,0), mUnits=mToday.reduce((t,s)=>t+s.qty,0);
                const wGoal=allGoals?.womens?.[getWeekKey()]?.[getDayName()]??DEFAULT_WEEKLY_GOALS.womens[getDayName()];
                const mGoal=allGoals?.mens?.[getWeekKey()]?.[getDayName()]??DEFAULT_WEEKLY_GOALS.mens[getDayName()];

                const SalesTable = ({rows, dc}) => rows.length===0
                  ? <div style={{textAlign:"center",padding:"32px 16px",color:"#333",fontSize:13}}>No sales recorded</div>
                  : <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                        <thead>
                          <tr style={{background:"#111009",borderBottom:`2px solid ${dc}44`}}>
                            {["Sold By","Style Name","Style Code","Style Colour","Size","Orig. Price","Discount","Total","Time"].map(h=>(
                              <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:dc,whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((s,i)=>(
                            <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                              <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                                <span style={{color:s.isUnassigned?"#c090e0":s.isExternal?"#e0a070":dc,fontWeight:600}}>{s.staffName}</span>
                                {s.isUnassigned&&<div style={{fontSize:9,color:"#c090e0",letterSpacing:"0.06em",textTransform:"uppercase"}}>unassigned</div>}
                              </td>
                              <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{s.style||s.productName}</td>
                              <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{s.productCode||"—"}</td>
                              <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{s.colour||"—"}</td>
                              <td style={{padding:"10px 12px",textAlign:"center"}}>
                                <span style={{background:dc+"22",color:dc,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{s.size||"—"}</span>
                              </td>
                              <td style={{padding:"10px 12px",color:s.discount?"#777":"#c0b8a8",textDecoration:s.discount?"line-through":"none",whiteSpace:"nowrap"}}>{fmt(s.basePrice||s.unitPrice)}</td>
                              <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                                {s.discount?<span style={{background:"#4a2a1a",color:"#e0a070",border:"1px solid #6a3a2a",padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:700}}>{s.discount.label} −{s.discount.pct}%</span>:<span style={{color:"#333"}}>—</span>}
                              </td>
                              <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:14,color:s.discount?"#6ea870":dc,fontWeight:700,whiteSpace:"nowrap"}}>{fmt(s.total)}</td>
                              <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap",fontSize:11}}>{fmtTime(s.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{background:"#111009",borderTop:`2px solid ${dc}44`}}>
                            <td colSpan={7} style={{padding:"10px 12px",fontSize:11,color:"#555",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>Day Total</td>
                            <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:16,color:dc,fontWeight:700}}>{fmt(rows.reduce((t,s)=>t+s.total,0))}</td>
                            <td/>
                          </tr>
                        </tfoot>
                      </table>
                    </div>;

                return (
                  <div>
                    {/* Combined view */}
                    {isCombined&&(
                      <div>
                        {/* Side by side */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                          {[{div:DIVISIONS[0],rev:wRev,units:wUnits,goal:wGoal,count:wToday.length},{div:DIVISIONS[1],rev:mRev,units:mUnits,goal:mGoal,count:mToday.length}].map(({div:d,rev,units,goal,count})=>(
                            <div key={d.id} style={{background:"#111009",border:`1.5px solid ${d.dim}`,borderRadius:8,padding:16}}>
                              <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:d.color,marginBottom:12}}>{d.label}</div>
                              {[{label:"Revenue",val:fmt(rev),target:fmt(goal.revenue),pct:Math.min(100,goal.revenue>0?(rev/goal.revenue)*100:0)},
                                {label:"Units",val:units,target:`${goal.units} target`,pct:Math.min(100,goal.units>0?(units/goal.units)*100:0)}].map(({label,val,target,pct})=>(
                                <div key={label} style={{marginBottom:10}}>
                                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                    <span style={{fontSize:10,color:"#666",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</span>
                                    <span style={{fontSize:11,color:d.color,fontWeight:600}}>{val}<span style={{color:"#444",fontWeight:400,fontSize:10}}> / {target}</span></span>
                                  </div>
                                  <div style={{background:"#0a0908",borderRadius:3,height:4,overflow:"hidden"}}>
                                    <div style={{height:"100%",width:`${pct}%`,background:pct>=100?"#6ea870":d.color,borderRadius:3,transition:"width .5s"}} />
                                  </div>
                                </div>
                              ))}
                              <div style={{fontSize:11,color:"#555",marginTop:10,paddingTop:8,borderTop:"1px solid #1e1c1a"}}>{count} transactions today</div>
                            </div>
                          ))}
                        </div>
                        {/* Combined totals */}
                        <div className="card" style={{padding:"14px 20px",marginBottom:20,display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:12}}>
                          {[{label:"Combined Revenue",val:fmt(wRev+mRev)},{label:"Combined Units",val:wUnits+mUnits},{label:"Total Transactions",val:wToday.length+mToday.length}].map(({label,val})=>(
                            <div key={label} style={{textAlign:"center"}}>
                              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:4}}>{label}</div>
                              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#f0e8d8"}}>{val}</div>
                            </div>
                          ))}
                        </div>
                        {/* Staff breakdown */}
                        <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:8}}>Staff Today — Both Concessions</div>
                        <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                            <thead>
                              <tr style={{background:"#111009",borderBottom:"2px solid #c8a96e44"}}>
                                {["Staff","622 WOMEN","637 MEN","Total"].map(h=>(
                                  <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#c8a96e",whiteSpace:"nowrap"}}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {staff.map((s,i)=>{
                                const all=[...wToday,...mToday].filter(x=>x.staffId===s.id);
                                const wR=wToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.total,0);
                                const mR=mToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.total,0);
                                if(!all.length) return null;
                                return (
                                  <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                                    <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{s.name}</td>
                                    <td style={{padding:"10px 12px",color:wR>0?DIVISIONS[0].color:"#333",fontFamily:"'Playfair Display',serif",fontSize:13}}>{wR>0?fmt(wR):"—"}</td>
                                    <td style={{padding:"10px 12px",color:mR>0?DIVISIONS[1].color:"#333",fontFamily:"'Playfair Display',serif",fontSize:13}}>{mR>0?fmt(mR):"—"}</td>
                                    <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:14,color:"#f0e8d8",fontWeight:700}}>{fmt(all.reduce((t,x)=>t+x.total,0))}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Women's only */}
                    {!isCombined&&division==="womens"&&(
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555"}}>622 WOMEN — Today</div>
                          <div style={{fontSize:11,color:"#555"}}>{wToday.length} sales · {fmt(wRev)}</div>
                        </div>
                        <SalesTable rows={wToday} dc={DIVISIONS[0].color} />
                      </div>
                    )}

                    {/* Men's only */}
                    {!isCombined&&division==="mens"&&(
                      <div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555"}}>637 MEN — Today</div>
                          <div style={{fontSize:11,color:"#555"}}>{mToday.length} sales · {fmt(mRev)}</div>
                        </div>
                        <SalesTable rows={mToday} dc={DIVISIONS[1].color} />
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </div>
        )}

                {safeScreen==="goals"&&isPrivileged&&(()=>{
          const g=todayGoals(), todayRev=todaySales.reduce((t,s)=>t+s.total,0), todayUnits=todaySales.reduce((t,s)=>t+s.qty,0);
          const rp=Math.min(100,g.revenue>0?(todayRev/g.revenue)*100:0), up=Math.min(100,g.units>0?(todayUnits/g.units)*100:0);
          const revDone=todayRev>=g.revenue, unitsDone=todayUnits>=g.units, dayName=getDayName(), wk=getWeekKey();
          const weekDayData=DAYS.map(d=>{
            const dg=allGoals?.[division]?.[wk]?.[d]??DEFAULT_WEEKLY_GOALS[division]?.[d]??{revenue:1000,units:12};
            const monday=new Date(wk), idx=DAYS.indexOf(d), dayDate=new Date(monday);
            dayDate.setDate(monday.getDate()+idx);
            const ds=dayDate.toDateString(), daySales=sales.filter(s=>new Date(s.date).toDateString()===ds);
            const dRev=daySales.reduce((t,s)=>t+s.total,0), dUnits=daySales.reduce((t,s)=>t+s.qty,0);
            return {d,g:dg,dRev,dUnits,isToday:d===dayName,isFuture:dayDate>new Date()&&d!==dayName,pct:dg.revenue>0?Math.min(100,(dRev/dg.revenue)*100):0};
          });
          const staffBoard=staff.map(s=>{const ss=todaySales.filter(x=>x.staffId===s.id);return{...s,rev:ss.reduce((t,x)=>t+x.total,0),units:ss.reduce((t,x)=>t+x.qty,0),count:ss.length};}).sort((a,b)=>b.rev-a.rev);
          return (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <div><div className="section-title">{divLabel} Goal — {dayName}</div><div className="section-sub">Live progress vs today's targets</div></div>
                {currentUser.role==="manager"&&<button className="btn btn-dark" style={{fontSize:12,marginTop:4,color:divColor,borderColor:div.dim}} onClick={openGoalsModal}>✎ Edit Targets</button>}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
                {[{label:"Revenue",val:fmt(todayRev),target:fmt(g.revenue),pct:rp,done:revDone},{label:"Units",val:todayUnits,target:`${g.units} units target`,pct:up,done:unitsDone}].map(({label,val,target,pct,done})=>(
                  <div key={label} className="card" style={{padding:24,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",inset:0,background:`linear-gradient(90deg,${done?"#1e4a22":"#1a1a12"} ${pct}%,transparent ${pct}%)`,opacity:.35,transition:"all .6s"}} />
                    <div style={{position:"relative"}}>
                      <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:done?"#6ea870":"#888",marginBottom:10}}>{label}{done&&" ✓"}</div>
                      <div style={{fontFamily:"'Playfair Display',serif",fontSize:34,color:done?"#6ea870":"#f0e8d8",lineHeight:1}}>{val}</div>
                      <div style={{fontSize:12,color:"#555",marginTop:6}}>of {target}</div>
                      <div style={{marginTop:14,background:"#0a0908",borderRadius:3,height:6,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:done?"#6ea870":divColor,transition:"width .6s",borderRadius:3}} />
                      </div>
                      <div style={{fontSize:11,color:"#555",marginTop:6,textAlign:"right"}}>{pct.toFixed(0)}%</div>
                    </div>
                  </div>
                ))}
              </div>

              {(!revDone||!unitsDone)&&(
                <div style={{background:"#111009",border:"1px solid #1e1c1a",borderRadius:6,padding:"14px 18px",marginBottom:24,display:"flex",gap:24,flexWrap:"wrap"}}>
                  {!revDone&&<div style={{fontSize:13,color:"#888"}}>Still need <span style={{color:divColor,fontWeight:700}}>{fmt(g.revenue-todayRev)}</span> to hit revenue</div>}
                  {!unitsDone&&<div style={{fontSize:13,color:"#888"}}>Still need <span style={{color:divColor,fontWeight:700}}>{g.units-todayUnits} unit{g.units-todayUnits!==1?"s":""}</span> to hit units</div>}
                </div>
              )}

              <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>Staff Leaderboard</div>
              <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a",marginBottom:24}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                  <thead>
                    <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                      {["#","Staff","Sales","Units","Revenue"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffBoard.filter(s=>s.count>0).map((s,i)=>(
                      <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                        <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:18,color:i===0?divColor:"#444"}}>{i===0?"🥇":i+1}</td>
                        <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>
                          {s.name}
                          {s.id===currentUser.id&&<span className="chip" style={{background:divColor+"22",color:divColor,marginLeft:8}}>You</span>}
                        </td>
                        <td style={{padding:"10px 12px",color:"#c0b8a8"}}>{s.count}</td>
                        <td style={{padding:"10px 12px",color:"#c0b8a8"}}>{s.units}</td>
                        <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:15,color:divColor,fontWeight:700}}>{fmt(s.rev)}</td>
                      </tr>
                    ))}
                    {staffBoard.filter(s=>s.count===0).map(s=>(
                      <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:"#0a0908",opacity:0.4}}>
                        <td style={{padding:"10px 12px",color:"#444"}}>—</td>
                        <td style={{padding:"10px 12px",fontWeight:600,color:"#666"}}>
                          {s.name}
                          {s.id===currentUser.id&&<span className="chip" style={{background:divColor+"22",color:divColor,marginLeft:8}}>You</span>}
                        </td>
                        <td colSpan={3} style={{padding:"10px 12px",color:"#444",fontSize:11}}>No sales yet</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>This Week</div>
              <div className="card" style={{padding:"20px 18px"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8,alignItems:"flex-end"}}>
                  {weekDayData.map(({d,g:dg,dRev,isToday,isFuture,pct})=>{
                    const hit=!isFuture&&dRev>=dg.revenue&&dRev>0, barH=isFuture?0:Math.max(4,pct*.9);
                    return (
                      <div key={d} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                        <div style={{fontSize:10,color:isFuture?"#2a2520":hit?"#6ea870":isToday?divColor:"#666",fontWeight:isToday?700:400}}>{isFuture?"—":hit?"✓":dRev>0?`${pct.toFixed(0)}%`:"—"}</div>
                        <div style={{width:"100%",background:"#0a0908",borderRadius:3,height:80,display:"flex",alignItems:"flex-end",overflow:"hidden",border:`1px solid ${isToday?divColor+"33":"#1e1c1a"}`}}>
                          <div style={{width:"100%",height:`${barH}%`,background:hit?"#3a6a40":isToday?divColor:"#2a2520",transition:"height .4s",borderRadius:"2px 2px 0 0"}} />
                        </div>
                        <div style={{fontSize:10,fontWeight:isToday?700:400,color:isToday?divColor:"#555"}}>{d.slice(0,3).toUpperCase()}</div>
                        {!isFuture&&dRev>0&&<div style={{fontSize:9,color:"#444"}}>{fmt(dRev)}</div>}
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #1e1c1a",display:"flex",gap:20,flexWrap:"wrap"}}>
                  <div style={{fontSize:11,color:"#666"}}>Week target: <span style={{color:divColor,fontWeight:700}}>{fmt(weekDayData.reduce((t,{g:dg})=>t+(dg.revenue||0),0))}</span></div>
                  <div style={{fontSize:11,color:"#666"}}>Week total: <span style={{color:"#f0e8d8",fontWeight:700}}>{fmt(weekDayData.reduce((t,{dRev})=>t+dRev,0))}</span></div>
                </div>
              </div>
            </div>
          );
        })()}
        </div>)} {/* end salesTab==="sales" */}

            {/* ── REFUNDS TAB ───────────────────────────────────────────────── */}
            {salesTab==="refunds" && (
          <div>
            {!isPrivileged ? (
            <div>
            <div className="section-sub">Record returned or exchanged shoes</div>
            <div className="card" style={{padding:20,marginBottom:28}}>
              <div style={{display:"flex",gap:8,marginBottom:16}}>
                {[["refund","Refund"],["exchange","Exchange"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setRefForm(f=>({...f,type:v}))}
                    style={{flex:1,padding:"10px",fontSize:13,fontWeight:600,border:`1.5px solid ${refForm.type===v?divColor:"#2a2520"}`,background:refForm.type===v?divColor+"22":"transparent",color:refForm.type===v?divColor:"#555",cursor:"pointer",borderRadius:4,fontFamily:"inherit",transition:"all .15s"}}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#555",marginBottom:4}}>Shoe Returned</div>
                <button onClick={()=>openRegistryScanner(p=>setRefForm(f=>({...f,style:p.name||p.style||"",code:(p.sku||p.code||"").slice(0,5),colour:(p.colour||"").slice(0,5),size:p.size||f.size})))}
                  style={{display:"flex",alignItems:"center",gap:8,background:divColor+"18",border:`1px solid ${divColor}44`,borderRadius:4,padding:"8px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,color:divColor,marginBottom:6,width:"fit-content"}}>
                  <span style={{fontSize:16}}>▣</span> Scan Shoe Label
                </button>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div><label className="label">Style Name *</label>
                    <input className="inp" placeholder="e.g. JAPAN" value={refForm.style} onChange={e=>setRefForm(f=>({...f,style:e.target.value}))} /></div>
                  <div><label className="label">Style Code / Colour</label>
                    <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:4,overflow:"hidden"}}>
                      <input placeholder="" value={refForm.code} maxLength={5} onChange={e=>setRefForm(f=>({...f,code:e.target.value.slice(0,5)}))}
                        style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                      <span style={{color:"#444",fontSize:14,padding:"0 4px"}}>/</span>
                      <input placeholder="" value={refForm.colour} maxLength={5} onChange={e=>setRefForm(f=>({...f,colour:e.target.value.slice(0,5)}))}
                        style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                    </div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div><label className="label">Size</label>
                    <select className="inp" value={refForm.size} onChange={e=>setRefForm(f=>({...f,size:e.target.value}))}>
                      <option value="">— Size —</option>
                      {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Original Price</label>
                    <input className="inp" type="number" step="0.01" placeholder="0.00" value={refForm.origPrice} onChange={e=>setRefForm(f=>({...f,origPrice:e.target.value}))} /></div>
                  <div><label className="label">Till No. *</label>
                    <input className="inp" placeholder="e.g. 622" value={refForm.tillNo} onChange={e=>setRefForm(f=>({...f,tillNo:e.target.value}))} /></div>
                </div>
                <div><label className="label">Reason</label>
                  <input className="inp" placeholder="e.g. wrong size, faulty" value={refForm.reason} onChange={e=>setRefForm(f=>({...f,reason:e.target.value}))} />
                </div>

                {refForm.type==="exchange"&&(
                  <>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#555",marginTop:8,marginBottom:4}}>Shoe Given Out</div>
                    <button onClick={()=>openRegistryScanner(p=>setRefForm(f=>({...f,exchangeStyle:p.name||p.style||"",exchangeCode:(p.sku||p.code||"").slice(0,5),exchangeColour:(p.colour||"").slice(0,5),exchangeSize:p.size||f.exchangeSize})))}
                      style={{display:"flex",alignItems:"center",gap:8,background:divColor+"18",border:`1px solid ${divColor}44`,borderRadius:4,padding:"8px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,color:divColor,marginBottom:6,width:"fit-content"}}>
                      <span style={{fontSize:16}}>▣</span> Scan Shoe Label
                    </button>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div><label className="label">Style Name</label>
                        <input className="inp" placeholder="e.g. JAPAN" value={refForm.exchangeStyle} onChange={e=>setRefForm(f=>({...f,exchangeStyle:e.target.value}))} style={{padding:"7px 10px",fontSize:12}} /></div>
                      <div><label className="label">Style Code / Colour</label>
                        <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:4,overflow:"hidden"}}>
                          <input placeholder="" value={refForm.exchangeCode} maxLength={5} onChange={e=>setRefForm(f=>({...f,exchangeCode:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                          <span style={{color:"#444",fontSize:14,padding:"0 4px"}}>/</span>
                          <input placeholder="" value={refForm.exchangeColour} maxLength={5} onChange={e=>setRefForm(f=>({...f,exchangeColour:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                        </div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 3fr",gap:12}}>
                      <div><label className="label">Size</label>
                        <select className="inp" value={refForm.exchangeSize} onChange={e=>setRefForm(f=>({...f,exchangeSize:e.target.value}))}>
                          <option value="">— Size —</option>
                          {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <button className="btn btn-main" style={{width:"100%",padding:13,marginTop:4}} onClick={recordRefund}>
                  Confirm {refForm.type==="refund"?"Refund":"Exchange"}
                </button>
              </div>
            </div>

            {refunds.length>0&&(
              <div>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>Recent</div>
                <div className="card" style={{overflow:"hidden"}}>
                  {refunds.slice(0,12).map(r=>(
                    <div key={r.id} className="row-item" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600}}>{r.productName}{r.type==="exchange"&&r.exchangeProductName&&<span style={{color:"#555",fontWeight:400}}> → {r.exchangeProductName}</span>}</div>
                        <div style={{fontSize:11,color:"#555",marginTop:2}}>{r.staffName} · Till {r.tillNo} · {fmtDT(r.date)}</div>
                      </div>
                      <span className={`chip ${r.type==="refund"?"chip-red":"chip-blue"}`}>{r.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>) : (
              <div>
                <div className="section-title">{divLabel} — Refunds & Exchanges</div>
                <div className="section-sub">Read-only view of all recorded refunds and exchanges</div>
                {refunds.length===0 ? (
                  <div style={{textAlign:"center",padding:"48px 16px",color:"#333",fontSize:13}}>No refunds or exchanges recorded</div>
                ) : (
                  <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                      <thead>
                        <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                          {["Type","Style Name","Style Code","Style Colour","Size","Price","Reason","Staff","Till","Date","Time"].map(h=>(
                            <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {refunds.map((r,i)=>(
                          <tr key={r.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                            <td style={{padding:"10px 12px"}}>
                              <span className={`chip ${r.type==="refund"?"chip-red":"chip-blue"}`}>{r.type}</span>
                            </td>
                            <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{r.productName||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{r.sku||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{r.colour||"—"}</td>
                            <td style={{padding:"10px 12px",textAlign:"center"}}>
                              {r.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{r.size}</span>:<span style={{color:"#333"}}>—</span>}
                            </td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{r.unitPrice?fmt(r.unitPrice):"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontSize:11}}>{r.reason||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{r.staffName}</td>
                            <td style={{padding:"10px 12px",color:divColor,fontWeight:600}}>{r.tillNo||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(r.date)}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(r.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>)} {/* end salesTab==="refunds" */}
        </div>)} {/* end safeScreen==="sales" */}

        {/* ═══ ISSUE STOCK ON LOAN (all staff) ════════════════════════════════ */}
        {safeScreen==="loans"&&(
          <div>
            {!isPrivileged ? (<div>
            <div className="section-title">{divLabel} — Stock on Loan</div>
            <div className="section-sub">Issue items to displays or personal shoppers</div>

            {/* ── DISPLAY / MANNEQUIN ── */}
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,marginBottom:12}}>Display / Mannequin</div>
            <div className="card" style={{padding:20,marginBottom:24}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* Primary: Scan */}
                <button onClick={()=>openRegistryScanner(p=>setLoanForm(f=>({...f,style:p.name||p.style||"",code:(p.sku||p.code||"").slice(0,5),colour:(p.colour||"").slice(0,5),size:p.size||f.size})))}
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:divColor,color:"#0e0c0a",border:"none",borderRadius:6,padding:"14px",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,width:"100%"}}>
                  <span style={{fontSize:22}}>▣</span> Scan Shoe Label
                </button>
                {/* Secondary: Manual */}
                  <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div><label className="label">Style Name *</label>
                        <input className="inp" placeholder="e.g. JAPAN" value={loanForm.style} onChange={e=>setLoanForm(f=>({...f,style:e.target.value}))} /></div>
                      <div><label className="label">Style Code / Colour</label>
                        <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:4,overflow:"hidden"}}>
                          <input placeholder="" value={loanForm.code} maxLength={5} onChange={e=>setLoanForm(f=>({...f,code:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                          <span style={{color:"#444",fontSize:14,padding:"0 4px"}}>/</span>
                          <input placeholder="" value={loanForm.colour} maxLength={5} onChange={e=>setLoanForm(f=>({...f,colour:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                        </div>
                      </div>
                    </div>
                  </div>
                {loanForm.style&&(
                  <div style={{background:"#161412",border:`1px solid ${divColor}44`,borderRadius:4,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:divColor,fontWeight:600}}>✓ {loanForm.style}{loanForm.code&&` · ${loanForm.code}`}{loanForm.colour&&` / ${loanForm.colour}`}</span>
                    <button onClick={()=>setLoanForm(f=>({...f,style:"",code:"",colour:"",size:""}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14}}>✕</button>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}>
                  <div><label className="label">Size *</label>
                    <select className="inp" value={loanForm.size} onChange={e=>setLoanForm(f=>({...f,size:e.target.value}))}>
                      <option value="">— Size —</option>
                      {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Location / Purpose</label>
                    <input className="inp" placeholder="e.g. Window Mannequin A" value={loanForm.location} onChange={e=>setLoanForm(f=>({...f,location:e.target.value}))} />
                  </div>
                </div>
                <div><label className="label">Note</label>
                  <input className="inp" placeholder="Optional" value={loanForm.note} onChange={e=>setLoanForm(f=>({...f,note:e.target.value}))} />
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"#0a0908",border:"1px solid #1e1c1a",borderRadius:4}}>
                  <span style={{fontSize:14}}>🕐</span>
                  <div>
                    <div style={{fontSize:11,color:"#555"}}>Date &amp; time automatically recorded on issue</div>
                    <div style={{fontSize:12,color:divColor,fontWeight:600,marginTop:1}}>{new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} · {new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
                <button className="btn btn-main" onClick={recordLoan}>Issue Loan</button>
              </div>
            </div>

            {/* ── PERSONAL SHOPPER ── */}
            <div style={{fontSize:12,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,marginBottom:12}}>Personal Shopper</div>
            <div className="card" style={{padding:20}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <button onClick={()=>openRegistryScanner(p=>setPsForm(f=>({...f,style:p.name||p.style||"",code:(p.sku||p.code||"").slice(0,5),colour:(p.colour||"").slice(0,5),size:p.size||f.size})))}
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:divColor,color:"#0e0c0a",border:"none",borderRadius:6,padding:"14px",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,width:"100%"}}>
                  <span style={{fontSize:22}}>▣</span> Scan Shoe Label
                </button>
                  <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div><label className="label">Style Name *</label>
                        <input className="inp" placeholder="e.g. JAPAN" value={psForm.style} onChange={e=>setPsForm(f=>({...f,style:e.target.value}))} /></div>
                      <div><label className="label">Style Code / Colour</label>
                        <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:4,overflow:"hidden"}}>
                          <input placeholder="" value={psForm.code} maxLength={5} onChange={e=>setPsForm(f=>({...f,code:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                          <span style={{color:"#444",fontSize:14,padding:"0 4px"}}>/</span>
                          <input placeholder="" value={psForm.colour} maxLength={5} onChange={e=>setPsForm(f=>({...f,colour:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                        </div>
                      </div>
                    </div>
                  </div>
                {psForm.style&&(
                  <div style={{background:"#161412",border:`1px solid ${divColor}44`,borderRadius:4,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:divColor,fontWeight:600}}>✓ {psForm.style}{psForm.code&&` · ${psForm.code}`}{psForm.colour&&` / ${psForm.colour}`}</span>
                    <button onClick={()=>setPsForm(f=>({...f,style:"",code:"",colour:"",size:""}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14}}>✕</button>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div><label className="label">Size *</label>
                    <select className="inp" value={psForm.size} onChange={e=>setPsForm(f=>({...f,size:e.target.value}))}>
                      <option value="">— Size —</option>
                      {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><label className="label">Shopper Name *</label>
                    <input className="inp" placeholder="Full name" value={psForm.shopperName} onChange={e=>setPsForm(f=>({...f,shopperName:e.target.value}))} /></div>
                  <div><label className="label">Shopper ID *</label>
                    <input className="inp" placeholder="e.g. PS-0042" value={psForm.shopperId} onChange={e=>setPsForm(f=>({...f,shopperId:e.target.value}))} /></div>
                </div>
                <div><label className="label">Note</label>
                  <input className="inp" placeholder="Optional — e.g. appointment 3pm" value={psForm.note} onChange={e=>setPsForm(f=>({...f,note:e.target.value}))} />
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"#0a0908",border:"1px solid #1e1c1a",borderRadius:4}}>
                  <span style={{fontSize:14}}>🕐</span>
                  <div>
                    <div style={{fontSize:11,color:"#555"}}>Date &amp; time automatically recorded on issue</div>
                    <div style={{fontSize:12,color:divColor,fontWeight:600,marginTop:1}}>{new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} · {new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>
                <button className="btn btn-main" onClick={recordPsLoan}>Issue to Personal Shopper</button>
              </div>
            </div>

            {(()=>{
              const myPsLoans = psLoans.filter(l=>l.staffId===currentUser.id).slice(0,5);
              if (!myPsLoans.length) return null;
              return (
                <div style={{marginTop:24}}>
                  <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>My Recent PS Loans</div>
                  <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                      <thead>
                        <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                          {["Style","Code","Colour","Size","Shopper","Shopper ID","Date","Time","Status"].map(h=>(
                            <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {myPsLoans.map((l,i)=>(
                          <tr key={l.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                            <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{l.productName||l.style||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.sku||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.colour||"—"}</td>
                            <td style={{padding:"10px 12px",textAlign:"center"}}>
                              {l.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{l.size}</span>:<span style={{color:"#333"}}>—</span>}
                            </td>
                            <td style={{padding:"10px 12px",color:divColor,fontWeight:600}}>{l.shopperName}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontSize:11}}>{l.shopperId}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(l.date)}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(l.date)}</td>
                            <td style={{padding:"10px 12px"}}>
                              {l.status==="out"&&<span style={{background:"#1a1a10",border:"1px solid #3a3010",color:"#a09020",padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700}}>Out {loanDuration(l.date)}</span>}
                              {l.status==="sold"&&<span className="chip chip-green">Sold</span>}
                              {l.status==="returned"&&<span className="chip chip-blue">Returned</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
            </div>) : (
              <div>
                <div className="section-title">{divLabel} — Stock on Loan</div>
                <div className="section-sub">Read-only view of all active and returned loans</div>
                {loans.length===0 ? (
                  <div style={{textAlign:"center",padding:"48px 16px",color:"#333",fontSize:13}}>No loans recorded</div>
                ) : (
                  <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                      <thead>
                        <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                          {["Status","Style Name","Code","Colour","Size","Location","Staff","Date","Time"].map(h=>(
                            <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loans.map((l,i)=>(
                          <tr key={l.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                            <td style={{padding:"10px 12px"}}>
                              <span className={`chip ${l.returned?"chip-green":"chip-grey"}`}>{l.returned?"Returned":"Active"}</span>
                            </td>
                            <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{l.productName||l.style||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.sku||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.colour||"—"}</td>
                            <td style={{padding:"10px 12px",textAlign:"center"}}>
                              {l.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{l.size}</span>:<span style={{color:"#333"}}>—</span>}
                            </td>
                            <td style={{padding:"10px 12px",color:"#888"}}>{l.location||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{l.staffName}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(l.date)}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(l.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ FAULTY ITEMS ════════════════════════════════════════════════════ */}
        {safeScreen==="faulty"&&(
          <div>
            {!isPrivileged ? (<div>
            <div className="section-title">{divLabel} — Faulty Items</div>
            <div className="section-sub">Log damaged or defective shoes — record only, no stock change</div>
            <div className="card" style={{padding:20,marginBottom:24}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* Primary: Scan */}
                <button onClick={()=>openRegistryScanner(p=>setFaultyForm(f=>({...f,style:p.name||p.style||"",sku:(p.sku||p.code||"").slice(0,5),colour:(p.colour||"").slice(0,5),size:p.size||f.size})))}
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:divColor,color:"#0e0c0a",border:"none",borderRadius:6,padding:"14px",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:700,width:"100%"}}>
                  <span style={{fontSize:22}}>▣</span> Scan Shoe Label
                </button>
                {/* Secondary: Manual */}
                  <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div><label className="label">Style Name *</label>
                        <input className="inp" placeholder="e.g. JAPAN" value={faultyForm.style} onChange={e=>setFaultyForm(f=>({...f,style:e.target.value}))} /></div>
                      <div><label className="label">Style Code / Colour</label>
                        <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:4,overflow:"hidden"}}>
                          <input placeholder="" value={faultyForm.sku} maxLength={5} onChange={e=>setFaultyForm(f=>({...f,sku:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                          <span style={{color:"#444",fontSize:14,padding:"0 4px"}}>/</span>
                          <input placeholder="" value={faultyForm.colour} maxLength={5} onChange={e=>setFaultyForm(f=>({...f,colour:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 10px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                        </div>
                      </div>
                    </div>
                  </div>
                {faultyForm.style&&(
                  <div style={{background:"#161412",border:`1px solid ${divColor}44`,borderRadius:4,padding:"8px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,color:divColor,fontWeight:600}}>✓ {faultyForm.style}{faultyForm.sku&&` · ${faultyForm.sku}`}{faultyForm.colour&&` / ${faultyForm.colour}`}</span>
                    <button onClick={()=>setFaultyForm(f=>({...f,style:"",sku:"",colour:"",size:""}))} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:14}}>✕</button>
                  </div>
                )}
                <div><label className="label">Size *</label>
                  <select className="inp" value={faultyForm.size} onChange={e=>setFaultyForm(f=>({...f,size:e.target.value}))}>
                    <option value="">— Size —</option>
                    {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Fault Type *</label>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    {["Sole Detaching","Stitching","Heel Damage","Buckle / Strap","Colour Transfer","Other"].map(ft=>(
                      <button key={ft} onClick={()=>setFaultyForm(f=>({...f,faultType:ft}))}
                        style={{padding:"9px 6px",fontSize:12,fontWeight:600,border:`1.5px solid ${faultyForm.faultType===ft?divColor:"#2a2520"}`,background:faultyForm.faultType===ft?divColor+"22":"transparent",color:faultyForm.faultType===ft?divColor:"#666",cursor:"pointer",borderRadius:4,fontFamily:"inherit",transition:"all .15s",textAlign:"center"}}>
                        {ft}
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="label">Description / Details</label>
                  <input className="inp" placeholder="Describe the fault in detail…" value={faultyForm.description} onChange={e=>setFaultyForm(f=>({...f,description:e.target.value}))} />
                </div>
                <div>
                  <label className="label">Recommended Action</label>
                  <div style={{display:"flex",gap:8}}>
                    {[["return","Return to Supplier"],["markdown","Markdown / Reduce"],["write-off","Write Off"]].map(([v,l])=>(
                      <button key={v} onClick={()=>setFaultyForm(f=>({...f,action:v}))}
                        style={{flex:1,padding:"9px 6px",fontSize:12,fontWeight:600,border:`1.5px solid ${faultyForm.action===v?divColor:"#2a2520"}`,background:faultyForm.action===v?divColor+"22":"transparent",color:faultyForm.action===v?divColor:"#666",cursor:"pointer",borderRadius:4,fontFamily:"inherit",transition:"all .15s"}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-main" style={{width:"100%",padding:13}} onClick={recordFaulty}>Log Faulty Item</button>
              </div>
            </div>
            {faulty.length>0&&(
              <div>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>
                  Logged <span style={{color:divColor}}>{faulty.length}</span>
                </div>
                <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                    <thead>
                      <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                        {["Style Name","Style Code","Colour","Size","Fault Type","Description","Action","Staff","Date","Time"].map(h=>(
                          <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {faulty.map((f,i)=>(
                        <tr key={f.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{f.style||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{f.sku||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{f.colour||"—"}</td>
                          <td style={{padding:"10px 12px",textAlign:"center"}}>
                            {f.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{f.size}</span>:<span style={{color:"#333"}}>—</span>}
                          </td>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{background:"#3a1e1e",color:"#e07070",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,textTransform:"uppercase"}}>{f.faultType||"—"}</span>
                          </td>
                          <td style={{padding:"10px 12px",color:"#777",fontSize:11,fontStyle:"italic"}}>{f.description||"—"}</td>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{background:"#1e1c1a",border:"1px solid #2a2520",color:"#888",padding:"2px 8px",borderRadius:3,fontSize:10,textTransform:"uppercase"}}>{f.action}</span>
                          </td>
                          <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{f.staffName}</td>
                          <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap",fontSize:11}}>{fmtDate(f.date)}</td>
                          <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap",fontSize:11}}>{fmtTime(f.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>) : (
              <div>
                <div className="section-title">{divLabel} — Faulty Items</div>
                <div className="section-sub">Read-only view of all logged faulty items</div>
                {faulty.length===0 ? (
                  <div style={{textAlign:"center",padding:"48px 16px",color:"#333",fontSize:13}}>No faulty items recorded</div>
                ) : (
                  <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                      <thead>
                        <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                          {["Style Name","Code","Colour","Size","Fault Type","Description","Action","Staff","Date","Time"].map(h=>(
                            <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {faulty.map((f2,i)=>(
                          <tr key={f2.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                            <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{f2.style||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{f2.sku||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{f2.colour||"—"}</td>
                            <td style={{padding:"10px 12px",textAlign:"center"}}>
                              {f2.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{f2.size}</span>:<span style={{color:"#333"}}>—</span>}
                            </td>
                            <td style={{padding:"10px 12px",color:"#e07070",fontWeight:600,fontSize:11}}>{f2.faultType||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontSize:11}}>{f2.description||"—"}</td>
                            <td style={{padding:"10px 12px"}}>
                              <span className="chip chip-red">{f2.action||"—"}</span>
                            </td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{f2.staffName}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(f2.date)}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(f2.date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ ODD SHOES ════════════════════════════════════════════════════════ */}
        {safeScreen==="odd"&&(
          <div>
            {!isPrivileged ? (<div>
            <div className="section-title">{divLabel} — Odd Shoes</div>
            <div className="section-sub">Log mismatched pairs — two left feet, wrong sizes, or mismatched styles</div>

            <div className="card" style={{padding:24,marginBottom:24}}>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* Style + Code/Colour */}
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div>
                    <label className="label">Style Name *</label>
                    <input className="inp" placeholder="e.g. JAPAN" value={oddForm.style} onChange={e=>setOddForm(f=>({...f,style:e.target.value}))} />
                  </div>
                  <div>
                    <label className="label">Style Code / Colour</label>
                    <div style={{display:"flex",alignItems:"center",background:"#161412",border:"1px solid #2a2520",borderRadius:6,overflow:"hidden"}}>
                      <input placeholder="" value={oddForm.sku} maxLength={5}
                        onChange={e=>{const v=e.target.value.slice(0,5);setOddForm(f=>({...f,sku:v}));if(v.length===5)document.getElementById("odd-colour")?.focus();}}
                        style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"14px 12px",fontSize:16,fontFamily:"inherit",minWidth:0}} />
                      <span style={{color:"#444",fontSize:16,padding:"0 4px",flexShrink:0}}>/</span>
                      <input id="odd-colour" placeholder="" value={oddForm.colour} maxLength={5}
                        onChange={e=>setOddForm(f=>({...f,colour:e.target.value.slice(0,5)}))}
                        style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"14px 12px",fontSize:16,fontFamily:"inherit",minWidth:0}} />
                    </div>
                  </div>
                </div>

                {/* Shoe 1 */}
                <div style={{background:"#0a0908",border:"1px solid #1e1c1a",borderRadius:6,padding:"14px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#666",marginBottom:10}}>Shoe 1</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <label className="label">Size *</label>
                      <select className="inp" value={oddForm.shoe1Size} onChange={e=>setOddForm(f=>({...f,shoe1Size:e.target.value}))}>
                        <option value="">— Size —</option>
                        {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Foot</label>
                      <div style={{display:"flex",gap:8,marginTop:2}}>
                        {["left","right"].map(foot=>(
                          <button key={foot} onClick={()=>setOddForm(f=>({...f,shoe1Foot:foot}))}
                            style={{flex:1,padding:"10px",fontSize:12,fontWeight:600,border:`1.5px solid ${oddForm.shoe1Foot===foot?divColor:"#2a2520"}`,background:oddForm.shoe1Foot===foot?divColor+"22":"transparent",color:oddForm.shoe1Foot===foot?divColor:"#666",cursor:"pointer",borderRadius:4,fontFamily:"inherit",textTransform:"capitalize"}}>
                            {foot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shoe 2 */}
                <div style={{background:"#0a0908",border:"1px solid #1e1c1a",borderRadius:6,padding:"14px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#666",marginBottom:10}}>Shoe 2</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div><label className="label">Style Name</label>
                        <input className="inp" placeholder="e.g. JAPAN" value={oddForm.shoe2Style} onChange={e=>setOddForm(f=>({...f,shoe2Style:e.target.value}))} style={{padding:"7px 10px",fontSize:12}} /></div>
                      <div><label className="label">Code / Colour</label>
                        <div style={{display:"flex",alignItems:"center",background:"#0e0c0a",border:"1px solid #2a2520",borderRadius:4,overflow:"hidden"}}>
                          <input placeholder="" value={oddForm.shoe2Sku} maxLength={5}
                            onChange={e=>{const v=e.target.value.slice(0,5);setOddForm(f=>({...f,shoe2Sku:v}));if(v.length===5)document.getElementById("odd2-colour")?.focus();}}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 8px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                          <span style={{color:"#444",fontSize:13,padding:"0 3px"}}>/</span>
                          <input id="odd2-colour" placeholder="" value={oddForm.shoe2Colour} maxLength={5}
                            onChange={e=>setOddForm(f=>({...f,shoe2Colour:e.target.value.slice(0,5)}))}
                            style={{flex:1,background:"none",border:"none",outline:"none",color:"#f0e8d8",padding:"7px 8px",fontSize:12,fontFamily:"inherit",minWidth:0}} />
                        </div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div>
                        <label className="label">Size *</label>
                        <select className="inp" value={oddForm.shoe2Size} onChange={e=>setOddForm(f=>({...f,shoe2Size:e.target.value}))}>
                          <option value="">— Size —</option>
                          {SHOE_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Foot</label>
                        <div style={{display:"flex",gap:8,marginTop:2}}>
                          {["left","right"].map(foot=>(
                            <button key={foot} onClick={()=>setOddForm(f=>({...f,shoe2Foot:foot}))}
                              style={{flex:1,padding:"10px",fontSize:12,fontWeight:600,border:`1.5px solid ${oddForm.shoe2Foot===foot?divColor:"#2a2520"}`,background:oddForm.shoe2Foot===foot?divColor+"22":"transparent",color:oddForm.shoe2Foot===foot?divColor:"#666",cursor:"pointer",borderRadius:4,fontFamily:"inherit",textTransform:"capitalize"}}>
                              {foot}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issue summary */}
                {oddForm.shoe1Size&&oddForm.shoe2Size&&(
                  <div style={{background:"#1e1c1a",borderRadius:4,padding:"10px 14px",fontSize:12,color:"#888"}}>
                    {oddForm.shoe1Foot===oddForm.shoe2Foot
                      ? <span style={{color:"#e07070",fontWeight:600}}>⚠ Two {oddForm.shoe1Foot} feet — {oddForm.shoe1Size} & {oddForm.shoe2Size}</span>
                      : oddForm.shoe1Size!==oddForm.shoe2Size
                      ? <span style={{color:"#c8a040",fontWeight:600}}>⚠ Mismatched sizes — {oddForm.shoe1Foot} {oddForm.shoe1Size} + {oddForm.shoe2Foot} {oddForm.shoe2Size}</span>
                      : <span style={{color:"#6ea870"}}>✓ Correct feet, same size — may be OK</span>}
                  </div>
                )}

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <label className="label">Found By (Staff ID)</label>
                    <input className="inp" placeholder="e.g. S003" value={oddForm.foundBy||""} onChange={e=>setOddForm(f=>({...f,foundBy:e.target.value}))} />
                    {oddForm.foundBy&&(()=>{
                      const found=staff.find(s=>s.id.toLowerCase()===oddForm.foundBy.trim().toLowerCase());
                      return found
                        ? <div style={{fontSize:11,color:"#6ea870",marginTop:4}}>✓ {found.name}</div>
                        : <div style={{fontSize:11,color:"#555",marginTop:4}}>ID not in team list</div>;
                    })()}
                  </div>
                  <div>
                    <label className="label">Note</label>
                    <input className="inp" placeholder="Where found, context…" value={oddForm.note} onChange={e=>setOddForm(f=>({...f,note:e.target.value}))} />
                  </div>
                </div>

                {/* Auto timestamp */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:"#0a0908",border:"1px solid #1e1c1a",borderRadius:6}}>
                  <span style={{fontSize:14}}>🕐</span>
                  <div>
                    <div style={{fontSize:11,color:"#555"}}>Date &amp; time automatically recorded on log</div>
                    <div style={{fontSize:12,color:divColor,fontWeight:600,marginTop:1}}>{new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})} · {new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                </div>

                <button className="btn btn-main" style={{width:"100%",padding:13}} onClick={recordOddShoe}>Log Odd Pair</button>
              </div>
            </div>

            {/* Odd shoes log */}
            {oddShoes.length>0&&(
              <div>
                <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>
                  Logged <span style={{color:divColor}}>{oddShoes.length}</span>
                </div>
                <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                    <thead>
                      <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                        {["Style","Code","Colour","Shoe 1","Shoe 2","Issue","Found By","Date","Time"].map(h=>(
                          <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {oddShoes.map((o,i)=>{
                        const isTwoSameFeet = o.shoe1.foot===o.shoe2.foot;
                        const isMismatch    = o.shoe1.size!==o.shoe2.size;
                        return (
                          <tr key={o.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                            <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{o.style||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{o.sku||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontSize:11}}>{o.colour||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",fontSize:11,whiteSpace:"nowrap"}}>UK {o.shoe1.size} · {o.shoe1.foot}</td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",fontSize:11,whiteSpace:"nowrap"}}>UK {o.shoe2.size} · {o.shoe2.foot}</td>
                            <td style={{padding:"10px 12px"}}>
                              {isTwoSameFeet
                                ? <span style={{background:"#3a1e1e",color:"#e07070",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,textTransform:"uppercase"}}>Two {o.shoe1.foot}s</span>
                                : <span style={{background:"#3a2e10",color:"#c8a040",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,textTransform:"uppercase"}}>Size mismatch</span>}
                            </td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{o.foundByName||o.staffName}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(o.date)}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(o.date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>) : (
              <div>
                <div className="section-title">{divLabel} — Odd Shoes</div>
                <div className="section-sub">Read-only view of all logged odd pairs</div>
                {oddShoes.length===0 ? (
                  <div style={{textAlign:"center",padding:"48px 16px",color:"#333",fontSize:13}}>No odd shoes recorded</div>
                ) : (
                  <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                      <thead>
                        <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                          {["Style Name","Code","Colour","Shoe 1","Shoe 2","Issue","Found By","Date","Time"].map(h=>(
                            <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {oddShoes.map((o,i)=>{
                          const isTwoSameFeet = o.shoe1.foot===o.shoe2.foot;
                          const isMismatch    = o.shoe1.size!==o.shoe2.size;
                          return (
                          <tr key={o.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                            <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{o.style||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{o.sku||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{o.colour||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",fontSize:11,whiteSpace:"nowrap"}}>UK {o.shoe1.size} · {o.shoe1.foot}</td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",fontSize:11,whiteSpace:"nowrap"}}>UK {o.shoe2.size} · {o.shoe2.foot}</td>
                            <td style={{padding:"10px 12px"}}>
                              {isTwoSameFeet
                                ? <span style={{background:"#3a1e1e",color:"#e07070",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3}}>Two {o.shoe1.foot}s</span>
                                : <span style={{background:"#3a2e10",color:"#c8a040",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3}}>Size mismatch</span>}
                            </td>
                            <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{o.foundByName||o.staffName}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(o.date)}</td>
                            <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(o.date)}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ ASSIGN SALES (manager only) ════════════════════════════════════ */}
        {safeScreen==="assign"&&isPrivileged&&(
          <div>
            <div className="section-title">{divLabel} — Assign Sales</div>
            <div className="section-sub">Assign unidentified sales to a staff member</div>
            {unassignedSales.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 16px"}}>
                <div style={{fontSize:32,marginBottom:12}}>✓</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#f0e8d8",marginBottom:6}}>All sales assigned</div>
                <div style={{fontSize:13,color:"#555"}}>No unassigned sales in {divLabel}</div>
              </div>
            ) : (
              <div className="card" style={{overflow:"hidden"}}>
                {unassignedSales.map(s=>(
                  <AssignRow key={s.id} sale={s} staff={staff} divColor={divColor} fmt={fmt}
                    onAssign={(staffId)=>{
                      const found = staff.find(x=>x.id===staffId);
                      if (!found) return;
                      setSales(p=>p.map(x=>x.id===s.id?{...x,staffId:found.id,staffName:found.name,isUnassigned:false}:x));
                      showToast(`Assigned to ${found.name}`);
                    }} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ LOANS (manager only) ════════════════════════════════════════════ */}
        {safeScreen==="loanmgmt"&&isPrivileged&&(
          <div>
            <div className="section-title">{divLabel} — Loans</div>
            <div className="section-sub">All active display loans and personal shopper loans</div>
            <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>Active Loans <span style={{color:divColor}}>{openLoans.length}</span></div>
            {openLoans.length===0?<div style={{color:"#333",fontSize:13,padding:"16px 0"}}>No active loans</div>:(
              <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                    <thead>
                      <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                        {["Style Name","Code","Colour","Size","Qty","Location","Staff","Out Since","Duration",""].map(h=>(
                          <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {openLoans.map((l,i)=>(
                        <tr key={l.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{l.productName||l.style||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.sku||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.colour||"—"}</td>
                          <td style={{padding:"10px 12px",textAlign:"center"}}>
                            {l.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{l.size}</span>:<span style={{color:"#333"}}>—</span>}
                          </td>
                          <td style={{padding:"10px 12px",color:"#c0b8a8"}}>{l.qty}</td>
                          <td style={{padding:"10px 12px",color:"#888"}}>{l.location||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{l.staffName}</td>
                          <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(l.date)} {fmtTime(l.date)}</td>
                          <td style={{padding:"10px 12px",color:"#c8a040",fontSize:11,whiteSpace:"nowrap"}}>{loanDuration(l.date)}</td>
                          <td style={{padding:"10px 12px"}}>
                            <button onClick={()=>returnLoan(l)} style={{background:"#161412",border:`1px solid ${divColor}44`,color:divColor,padding:"5px 12px",cursor:"pointer",borderRadius:4,fontFamily:"inherit",fontSize:11,fontWeight:600}}>Return</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10,marginTop:24}}>Returned <span style={{color:"#444"}}>{loans.filter(l=>l.returned).length}</span></div>
            {loans.filter(l=>l.returned).length===0 ? <div style={{color:"#333",fontSize:13,padding:"16px 0"}}>No returned loans</div> : (
              <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a",opacity:0.7}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                  <thead>
                    <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                      {["Style Name","Code","Colour","Size","Location","Staff","Returned"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#555",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loans.filter(l=>l.returned).map((l,i)=>(
                      <tr key={l.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                        <td style={{padding:"10px 12px",color:"#666",fontWeight:600}}>{l.productName||l.style||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#555",fontFamily:"monospace",fontSize:11}}>{l.sku||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#555",fontFamily:"monospace",fontSize:11}}>{l.colour||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#555"}}>{l.size||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#555"}}>{l.location||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#666",whiteSpace:"nowrap"}}>{l.staffName}</td>
                        <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{l.returnedDate?fmtDate(l.returnedDate):"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PERSONAL SHOPPER LOANS ────────────────────────────────────── */}
            <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10,marginTop:32,paddingTop:24,borderTop:"1px solid #1e1c1a"}}>
              Personal Shopper Loans <span style={{color:divColor}}>{psLoans.length}</span>
            </div>
            {psLoans.length===0 ? <div style={{color:"#333",fontSize:13,padding:"16px 0"}}>No PS loans recorded</div> : (
              <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                  <thead>
                    <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                      {["Status","Style Name","Code","Colour","Size","Shopper","Shopper ID","Issued By","Out Since","Outcome","Till / Location"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {psLoans.map((l,i)=>{
                      const statusColor = l.status==="out"?"#c8a040":l.status==="sold"?"#6ea870":"#70a0c8";
                      const statusLabel = l.status==="out"?"Out":l.status==="sold"?"Sold":"Returned";
                      const outcome = l.eodResult;
                      return (
                        <tr key={l.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{background:statusColor+"22",color:statusColor,border:`1px solid ${statusColor}44`,padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700}}>{statusLabel}</span>
                          </td>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{l.productName||l.style||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.sku||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.colour||"—"}</td>
                          <td style={{padding:"10px 12px",textAlign:"center"}}>
                            {l.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{l.size}</span>:<span style={{color:"#333"}}>—</span>}
                          </td>
                          <td style={{padding:"10px 12px",color:divColor,fontWeight:600}}>{l.shopperName}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontSize:11}}>{l.shopperId}</td>
                          <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{l.staffName}</td>
                          <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(l.date)} {fmtTime(l.date)}</td>
                          <td style={{padding:"10px 12px",fontSize:11,color:outcome?.result==="sold"?"#6ea870":outcome?.result==="returned"?"#70a0c8":"#555"}}>
                            {outcome ? (outcome.result==="sold"?"Sold":"Returned to stock") : (l.status==="out"?<button onClick={()=>{setEodLoan(l);setEodOutcome({result:"sold",tillNo:"",note:""}); }} style={{background:"#161412",border:`1px solid ${divColor}44`,color:divColor,padding:"4px 10px",cursor:"pointer",borderRadius:4,fontFamily:"inherit",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>Resolve ▸</button>:"—")}
                          </td>
                          <td style={{padding:"10px 12px",color:"#c0b8a8",fontSize:11,whiteSpace:"nowrap"}}>
                            {outcome?.tillNo ? <span style={{color:divColor,fontWeight:600}}>Till {outcome.tillNo}</span> : l.status==="returned"?"Back to stock":"—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ HISTORY ══════════════════════════════════════════════════════════ */}
        {safeScreen==="history"&&isPrivileged&&(
          <div>
            <div className="section-title">{divLabel} — History</div>
            <div className="section-sub">All sales and refunds for this concession</div>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
              {[
                {label:"Total Sales",   value:sales.length,                            color:divColor},
                {label:"Total Revenue", value:fmt(sales.reduce((t,s)=>t+s.total,0)),   color:divColor},
                {label:"Refunds",       value:refunds.length,                          color:"#e07070"},
                {label:"Today's Sales", value:todaySales.length,                       color:"#888"},
              ].map(({label,value,color})=>(
                <div key={label} className="card" style={{padding:"12px 10px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color,marginBottom:3}}>{value}</div>
                  <div style={{fontSize:9,color:"#555",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Tabs */}
            <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:"1px solid #1a1714"}}>
              {[{id:"sales",label:`Sales (${sales.length})`},{id:"refunds",label:`Refunds (${refunds.length})`},{id:"staff",label:"By Staff"}].map(t=>(
                <button key={t.id} onClick={()=>setHistTab(t.id)}
                  style={{padding:"8px 14px",background:"none",border:"none",borderBottom:`2px solid ${histTab===t.id?divColor:"transparent"}`,color:histTab===t.id?divColor:"#555",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all .15s",whiteSpace:"nowrap"}}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Sales tab */}
            {histTab==="sales"&&(sales.length===0
              ? <div style={{color:"#333",fontSize:13,padding:"24px 0",textAlign:"center"}}>No sales yet</div>
              : <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                    <thead><tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                      {["Sold By","Style Name","Style Code","Style Colour","Size","Orig. Price","Discount","Total","Date","Time"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {sales.slice(0,100).map((s,i)=>(
                        <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                          <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                            <span style={{color:s.isUnassigned?"#c090e0":s.isExternal?"#e0a070":s.staffId===currentUser.id?divColor:"#c0b8a8",fontWeight:600}}>{s.staffName}</span>
                            {s.isUnassigned&&<div style={{fontSize:9,color:"#c090e0",textTransform:"uppercase"}}>unassigned</div>}
                          </td>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{s.style||s.productName}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{s.productCode||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{s.colour||"—"}</td>
                          <td style={{padding:"10px 12px",textAlign:"center"}}>
                            <span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{s.size||"—"}</span>
                          </td>
                          <td style={{padding:"10px 12px",color:s.discount?"#777":"#c0b8a8",textDecoration:s.discount?"line-through":"none",whiteSpace:"nowrap"}}>{fmt(s.basePrice||s.unitPrice)}</td>
                          <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                            {s.discount?<span style={{background:"#4a2a1a",color:"#e0a070",border:"1px solid #6a3a2a",padding:"2px 7px",borderRadius:3,fontSize:10,fontWeight:700}}>{s.discount.label} −{s.discount.pct}%</span>:<span style={{color:"#333"}}>—</span>}
                          </td>
                          <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:14,color:s.discount?"#6ea870":divColor,fontWeight:700,whiteSpace:"nowrap"}}>{fmt(s.total)}</td>
                          <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(s.date)}</td>
                          <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(s.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{background:"#111009",borderTop:`2px solid ${divColor}44`}}>
                      <td colSpan={7} style={{padding:"10px 12px",fontSize:11,color:"#555",fontWeight:600,textTransform:"uppercase"}}>Total</td>
                      <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:16,color:divColor,fontWeight:700}}>{fmt(sales.reduce((t,s)=>t+s.total,0))}</td>
                      <td colSpan={2}/>
                    </tr></tfoot>
                  </table>
                </div>
            )}
            {/* Refunds tab */}
            {histTab==="refunds"&&(refunds.length===0
              ? <div style={{color:"#333",fontSize:13,padding:"24px 0",textAlign:"center"}}>No refunds yet</div>
              : <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                    <thead><tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                      {["Type","Style Name","Code","Colour","Size","Price","Till","Staff","Date","Time"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {refunds.slice(0,50).map((r,i)=>(
                        <tr key={r.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                          <td style={{padding:"10px 12px"}}>
                            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:r.type==="exchange"?"#1e2a3a":"#3a1e1e",color:r.type==="exchange"?"#70a0c8":"#e07070",textTransform:"uppercase"}}>{r.type}</span>
                          </td>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{r.productName}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{r.sku||"—"}</td>
                          <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{r.colour||"—"}</td>
                          <td style={{padding:"10px 12px",textAlign:"center"}}>
                            {r.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{r.size}</span>:<span style={{color:"#333"}}>—</span>}
                          </td>
                          <td style={{padding:"10px 12px",color:"#e07070",whiteSpace:"nowrap"}}>−{fmt(r.unitPrice)}</td>
                          <td style={{padding:"10px 12px",color:divColor,fontWeight:600}}>{r.tillNo}</td>
                          <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{r.staffName}</td>
                          <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(r.date)}</td>
                          <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtTime(r.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            )}
            {/* By Staff tab */}
            {histTab==="staff"&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
                {staff.map(s=>{const ss=sales.filter(x=>x.staffId===s.id);if(!ss.length)return null;return(
                  <div key={s.id} className="card" style={{padding:"14px 16px"}}>
                    <div style={{fontSize:11,fontWeight:600,color:"#888",marginBottom:4}}>{s.name}</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:divColor}}>{fmt(ss.reduce((t,x)=>t+x.total,0))}</div>
                    <div style={{fontSize:11,color:"#555",marginTop:2}}>{ss.length} sale{ss.length!==1?"s":""}</div>
                  </div>
                );})}
              </div>
            )}
          </div>
        )}

        {/* ═══ PERSONAL SHOPPER EOD (manager) ══════════════════════════════════ */}
        {safeScreen==="ps"&&isPrivileged&&(
          <div>
            <div className="section-title">{divLabel} — Personal Shopper</div>
            <div className="section-sub">Manage end-of-day outcomes for PS loans</div>
            <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>
              Active PS Loans <span style={{color:divColor}}>{openPsLoans.length}</span>
            </div>
            {openPsLoans.length===0 ? <div style={{color:"#333",fontSize:13,padding:"16px 0",marginBottom:24}}>No active PS loans</div> : (
              <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a",marginBottom:24}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                  <thead><tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                    {["Style Name","Code","Colour","Size","Shopper","Shopper ID","Staff","Out Since","Duration","Status",""].map(h=>(
                      <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {openPsLoans.map((l,i)=>(
                      <tr key={l.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                        <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{l.productName||l.style||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.sku||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{l.colour||"—"}</td>
                        <td style={{padding:"10px 12px",textAlign:"center"}}>
                          {l.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 8px",borderRadius:3,fontSize:11}}>{l.size}</span>:<span style={{color:"#333"}}>—</span>}
                        </td>
                        <td style={{padding:"10px 12px",color:divColor,fontWeight:600}}>{l.shopperName}</td>
                        <td style={{padding:"10px 12px",color:"#888",fontSize:11}}>{l.shopperId}</td>
                        <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{l.staffName}</td>
                        <td style={{padding:"10px 12px",color:"#555",fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(l.date)} {fmtTime(l.date)}</td>
                        <td style={{padding:"10px 12px",color:"#c8a040",fontSize:11,whiteSpace:"nowrap"}}>{loanDuration(l.date)}</td>
                        <td style={{padding:"10px 12px"}}>
                          <span style={{background:"#1a1a10",border:"1px solid #3a3010",color:"#a09020",padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:700}}>Out</span>
                        </td>
                        <td style={{padding:"10px 12px"}}>
                          <button onClick={()=>{setEodLoan(l);setEodOutcome({result:"sold",tillNo:"",note:""}); }}
                            style={{background:"#161412",border:`1px solid ${divColor}44`,color:divColor,padding:"5px 12px",cursor:"pointer",borderRadius:4,fontFamily:"inherit",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>EOD ▸</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ EOD REPORT (manager only) ═══════════════════════════════════════ */}
        {safeScreen==="eod"&&isPrivileged&&(()=>{
          const today = new Date().toDateString();
          const todaySales    = sales.filter(s=>new Date(s.date).toDateString()===today);
          const todayRefunds  = refunds.filter(r=>new Date(r.date).toDateString()===today);
          const todayLoans    = loans.filter(l=>new Date(l.date).toDateString()===today);
          const todayPsLoans  = psLoans.filter(l=>new Date(l.date).toDateString()===today);
          const todayDeliveries = deliveries.filter(d=>new Date(d.date).toDateString()===today);
          const todayFaulty   = faulty.filter(f=>new Date(f.date).toDateString()===today);

          const totalRev      = todaySales.reduce((t,s)=>t+s.total,0);
          const totalRefundAmt= todayRefunds.reduce((t,r)=>t+(r.unitPrice||0),0);
          const netRev        = totalRev - totalRefundAmt;
          const discountedSales = todaySales.filter(s=>s.discount);
          const totalDiscount = todaySales.reduce((t,s)=>{
            const base=s.basePrice||s.unitPrice||0;
            const saved=base-(s.unitPrice||0);
            return t+saved;
          },0);
          const staffBreakdown = staff.map(st=>{
            const ss=todaySales.filter(x=>x.staffId===st.id);
            return {...st, units:ss.length, rev:ss.reduce((t,x)=>t+x.total,0)};
          }).filter(st=>st.units>0).sort((a,b)=>b.rev-a.rev);
          const openPsToday   = psLoans.filter(l=>l.status==="out");
          const resolvedPsToday = todayPsLoans.filter(l=>l.status!=="out");
          const exchangeCount = todayRefunds.filter(r=>r.type==="exchange").length;
          const refundCount   = todayRefunds.filter(r=>r.type==="refund").length;

          const dateStr = new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

          // Build plain text report for sharing
          const buildReport = () => {
            const line = "─".repeat(40);
            let r = "";
            r += `EOD REPORT — ${divLabel}\n`;
            r += `${dateStr}\n`;
            r += `${line}\n\n`;

            r += `SALES SUMMARY\n`;
            r += `Total Sales:       ${todaySales.length} units\n`;
            r += `Gross Revenue:     ${fmt(totalRev)}\n`;
            r += `Discounts Given:   ${fmt(totalDiscount)} (${discountedSales.length} sales)\n`;
            r += `Refunds:           ${fmt(totalRefundAmt)} (${refundCount} refunds)\n`;
            r += `Exchanges:         ${exchangeCount}\n`;
            r += `Net Revenue:       ${fmt(netRev)}\n\n`;

            if(staffBreakdown.length>0){
              r += `STAFF PERFORMANCE\n`;
              staffBreakdown.forEach(st=>{
                r += `${st.name} (${st.id}): ${st.units} sale${st.units!==1?"s":""} — ${fmt(st.rev)}\n`;
              });
              r += "\n";
            }

            if(todaySales.length>0){
              r += `SALES DETAIL\n`;
              todaySales.forEach(s=>{
                r += `• ${s.style||s.productName}${s.colour?` (${s.colour})`:""}${s.size?` UK${s.size}`:""} — ${fmt(s.total)}${s.discount?` (${s.discount.label})`:""} — ${s.staffName} — ${fmtTime(s.date)}\n`;
              });
              r += "\n";
            }

            if(todayRefunds.length>0){
              r += `REFUNDS & EXCHANGES\n`;
              todayRefunds.forEach(r2=>{
                r += `• [${r2.type.toUpperCase()}] ${r2.productName} — ${r2.reason||"No reason given"} — ${r2.staffName} — ${fmtTime(r2.date)}\n`;
              });
              r += "\n";
            }

            if(todayLoans.length>0){
              r += `STOCK ON LOAN (TODAY)\n`;
              todayLoans.forEach(l=>{
                r += `• ${l.productName} — ${l.location||"Display"} — ${l.staffName}\n`;
              });
              r += "\n";
            }

            if(openPsToday.length>0){
              r += `OUTSTANDING PS LOANS\n`;
              openPsToday.forEach(l=>{
                r += `• ${l.productName} — ${l.shopperName} (${l.shopperId}) — Out since ${fmtTime(l.date)}\n`;
              });
              r += "\n";
            }

            if(resolvedPsToday.length>0){
              r += `PS LOANS RESOLVED TODAY\n`;
              resolvedPsToday.forEach(l=>{
                r += `• ${l.productName} — ${l.shopperName} — ${l.status==="sold"?"Sold":"Returned"}\n`;
              });
              r += "\n";
            }

            if(todayFaulty.length>0){
              r += `FAULTY ITEMS LOGGED\n`;
              todayFaulty.forEach(f2=>{
                r += `• ${f2.style}${f2.size?` UK${f2.size}`:""} — ${f2.faultType||"Fault"} — ${f2.action||"Action TBC"}\n`;
              });
              r += "\n";
            }

            if(todayDeliveries.length>0){
              r += `STOCK RECEIVED\n`;
              todayDeliveries.forEach(d=>{
                r += `• ${d.productName} ×${d.qty}${d.note?` — ${d.note}`:""}\n`;
              });
              r += "\n";
            }

            r += `${line}\n`;
            r += `Report generated: ${new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})} by ${currentUser.name} (${currentUser.id})\n`;
            r += `Concession App — ${divLabel}`;
            return r;
          };

          return (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                <div>
                  <div className="section-title">{divLabel} — EOD Report</div>
                  <div className="section-sub">{dateStr}</div>
                </div>
                <button onClick={()=>navigator.clipboard.writeText(buildReport()).then(()=>showToast("Report copied"))}
                  style={{background:divColor,color:"#0e0c0a",border:"none",padding:"10px 18px",fontSize:12,fontWeight:700,cursor:"pointer",borderRadius:6,fontFamily:"inherit",whiteSpace:"nowrap",marginTop:4}}>
                  📋 Copy Report
                </button>
              </div>

              {/* Key numbers */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {[
                  {label:"Units Sold",    value:todaySales.length,      color:divColor},
                  {label:"Gross Revenue", value:fmt(totalRev),          color:divColor},
                  {label:"Net Revenue",   value:fmt(netRev),            color:netRev<totalRev?"#c8a040":divColor},
                ].map(({label,value,color})=>(
                  <div key={label} className="card" style={{padding:"14px 12px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color,marginBottom:4}}>{value}</div>
                    <div style={{fontSize:10,color:"#555",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
                {[
                  {label:"Discounts",     value:fmt(totalDiscount),           color:"#c8a040"},
                  {label:"Refunds",       value:`${refundCount} (${fmt(totalRefundAmt)})`, color:"#e07070"},
                  {label:"Exchanges",     value:exchangeCount,                color:"#70a0c8"},
                ].map(({label,value,color})=>(
                  <div key={label} className="card" style={{padding:"14px 12px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color,marginBottom:4}}>{value}</div>
                    <div style={{fontSize:10,color:"#555",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Staff performance */}
              {staffBreakdown.length>0&&(
                <div className="card" style={{overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1714",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:divColor}}>Staff Performance</div>
                  {staffBreakdown.map((st,i)=>(
                    <div key={st.id} style={{padding:"12px 16px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center",background:i===0?divColor+"11":"transparent"}}>
                      <div>
                        <span style={{fontWeight:600,color:i===0?divColor:"#c0b8a8"}}>{st.name}</span>
                        <span style={{fontSize:11,color:"#555",marginLeft:8}}>{st.id}</span>
                        {i===0&&<span style={{marginLeft:8,fontSize:10,color:divColor,fontWeight:700,background:divColor+"22",padding:"2px 7px",borderRadius:3}}>TOP</span>}
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,color:i===0?divColor:divColor+"aa"}}>{fmt(st.rev)}</div>
                        <div style={{fontSize:11,color:"#555"}}>{st.units} unit{st.units!==1?"s":""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sales detail */}
              {todaySales.length>0&&(
                <div className="card" style={{overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1714",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:divColor}}>Sales ({todaySales.length})</div>
                  {todaySales.map(s=>(
                    <div key={s.id} style={{padding:"11px 16px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#f0e8d8"}}>{s.style||s.productName}{s.size&&<span style={{marginLeft:6,fontSize:11,color:divColor}}>UK {s.size}</span>}</div>
                        <div style={{fontSize:11,color:"#555",marginTop:2}}>{s.staffName} · {fmtTime(s.date)}{s.discount&&<span style={{marginLeft:6,color:"#c8a040"}}>{s.discount.label}</span>}</div>
                      </div>
                      <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,color:s.discount?"#6ea870":divColor}}>{fmt(s.total)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Refunds & exchanges */}
              {todayRefunds.length>0&&(
                <div className="card" style={{overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1714",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#e07070"}}>Refunds & Exchanges ({todayRefunds.length})</div>
                  {todayRefunds.map(r=>(
                    <div key={r.id} style={{padding:"11px 16px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#f0e8d8"}}>{r.productName}</div>
                        <div style={{fontSize:11,color:"#555",marginTop:2}}>{r.reason||"No reason"} · {r.staffName} · {fmtTime(r.date)}</div>
                      </div>
                      <span className={`chip ${r.type==="refund"?"chip-red":"chip-blue"}`}>{r.type}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Outstanding PS loans */}
              {openPsToday.length>0&&(
                <div className="card" style={{overflow:"hidden",marginBottom:16,border:"1px solid #c8a04044"}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1714",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#c8a040"}}>⚠ Outstanding PS Loans ({openPsToday.length})</div>
                  {openPsToday.map(l=>(
                    <div key={l.id} style={{padding:"11px 16px",borderBottom:"1px solid #1a1714"}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#f0e8d8"}}>{l.productName}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>{l.shopperName} · {l.shopperId} · Out {loanDuration(l.date)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Faulty */}
              {todayFaulty.length>0&&(
                <div className="card" style={{overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1714",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#e07070"}}>Faulty Items ({todayFaulty.length})</div>
                  {todayFaulty.map(f2=>(
                    <div key={f2.id} style={{padding:"11px 16px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#f0e8d8"}}>{f2.style}{f2.size&&` UK${f2.size}`}</div>
                        <div style={{fontSize:11,color:"#555",marginTop:2}}>{f2.faultType} · {f2.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Stock received */}
              {todayDeliveries.length>0&&(
                <div className="card" style={{overflow:"hidden",marginBottom:16}}>
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #1a1714",fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"#6ea870"}}>Stock Received ({todayDeliveries.length})</div>
                  {todayDeliveries.map(d=>(
                    <div key={d.id} style={{padding:"11px 16px",borderBottom:"1px solid #1a1714",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#f0e8d8"}}>{d.productName} <span style={{color:divColor}}>×{d.qty}</span></div>
                      {d.note&&<div style={{fontSize:11,color:"#555"}}>{d.note}</div>}
                    </div>
                  ))}
                </div>
              )}

              {todaySales.length===0&&todayRefunds.length===0&&(
                <div style={{textAlign:"center",padding:"48px 16px",color:"#333",fontSize:13}}>No activity recorded today</div>
              )}

              {/* Copy button at bottom too */}
              <button onClick={()=>navigator.clipboard.writeText(buildReport()).then(()=>showToast("Report copied — paste anywhere"))}
                style={{width:"100%",background:divColor,color:"#0e0c0a",border:"none",padding:"16px",fontSize:14,fontWeight:700,cursor:"pointer",borderRadius:8,fontFamily:"inherit",marginTop:8}}>
                📋 Copy Full Report to Clipboard
              </button>
              <div style={{textAlign:"center",fontSize:11,color:"#444",marginTop:8}}>Paste into WhatsApp, email, or your reporting system</div>
            </div>
          );
        })()}

        {/* ═══ SCAN LOG (manager only) ══════════════════════════════════════════ */}
        {safeScreen==="scanlog"&&isPrivileged&&(()=>{
          const scanLog = allScanLog[division] ?? [];
          const todayLog = scanLog.filter(e=>new Date(e.date).toDateString()===new Date().toDateString());
          const confirmed = scanLog.filter(e=>e.outcome==="confirmed").length;
          const cancelled = scanLog.filter(e=>e.outcome==="cancelled").length;
          const pending   = scanLog.filter(e=>e.outcome==="pending").length;
          return (
            <div>
              <div className="section-title">{divLabel} — Scan Log</div>
              <div className="section-sub">Every barcode scanned — confirmed, cancelled, and pending</div>

              {/* Summary stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
                {[
                  {label:"Total Scans",    value:scanLog.length,  color:"#c0b8a8"},
                  {label:"Confirmed",      value:confirmed,        color:"#6ea870"},
                  {label:"Cancelled",      value:cancelled,        color:"#e07070"},
                  {label:"Today's Scans",  value:todayLog.length,  color:divColor},
                ].map(({label,value,color})=>(
                  <div key={label} className="card" style={{padding:"14px 12px",textAlign:"center"}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,color,marginBottom:4}}>{value}</div>
                    <div style={{fontSize:10,color:"#555",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
                  </div>
                ))}
              </div>

              {scanLog.length===0 ? (
                <div style={{textAlign:"center",padding:"48px 16px",color:"#333",fontSize:13}}>No scans recorded yet</div>
              ) : (
                <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                    <thead>
                      <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                        {["Date","Time","Barcode","Style Name","Code","Colour","Size","Staff ID","Outcome"].map(h=>(
                          <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {scanLog.slice(0,100).map((e,i)=>{
                        const outcomeColor = e.outcome==="confirmed"?"#6ea870":e.outcome==="cancelled"?"#e07070":"#c8a040";
                        const outcomeLabel = e.outcome==="confirmed"?"✓ Confirmed":e.outcome==="cancelled"?"✕ Cancelled":"⏳ Pending";
                        return (
                          <tr key={e.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                            <td style={{padding:"10px 12px",color:"#888",whiteSpace:"nowrap"}}>{fmtDate(e.date)}</td>
                            <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap"}}>{fmtTime(e.date)}</td>
                            <td style={{padding:"10px 12px",fontFamily:"monospace",color:"#666",fontSize:11,letterSpacing:"0.04em"}}>{e.barcode}</td>
                            <td style={{padding:"10px 12px",color:"#f0e8d8",fontWeight:600}}>{e.style||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{e.code||"—"}</td>
                            <td style={{padding:"10px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{e.colour||"—"}</td>
                            <td style={{padding:"10px 12px",textAlign:"center"}}>
                              {e.size?<span style={{background:divColor+"22",color:divColor,fontWeight:700,padding:"2px 7px",borderRadius:3,fontSize:11}}>{e.size}</span>:<span style={{color:"#333"}}>—</span>}
                            </td>
                            <td style={{padding:"10px 12px",color:divColor,fontWeight:600}}>{e.staffId||"—"}</td>
                            <td style={{padding:"10px 12px"}}>
                              <span style={{background:outcomeColor+"22",color:outcomeColor,border:`1px solid ${outcomeColor}44`,padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:700}}>
                                {outcomeLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ RECEIVE STOCK (manager) ══════════════════════════════════════════ */}
        {safeScreen==="receive"&&currentUser.role==="manager"&&(
          <div>
            <div className="section-title">{divLabel} — Stock Received</div>
            <div className="section-sub">Log of all deliveries received from head office</div>
            {deliveries.length===0 ? (
              <div style={{textAlign:"center",padding:"48px 16px",color:"#333",fontSize:13}}>No deliveries recorded yet</div>
            ) : (
              <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                  <thead>
                    <tr style={{background:"#111009",borderBottom:`2px solid ${divColor}44`}}>
                      {["Product","Qty","Staff","Note","Date","Time"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:divColor,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.slice(0,20).map((d,i)=>(
                      <tr key={d.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                        <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{d.productName}</td>
                        <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:16,color:"#6ea870",fontWeight:700}}>+{d.qty}</td>
                        <td style={{padding:"10px 12px",color:"#c0b8a8",whiteSpace:"nowrap"}}>{d.staffName}</td>
                        <td style={{padding:"10px 12px",color:"#666",fontSize:11}}>{d.note||"—"}</td>
                        <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap",fontSize:11}}>{fmtDate(d.date)}</td>
                        <td style={{padding:"10px 12px",color:"#555",whiteSpace:"nowrap",fontSize:11}}>{fmtTime(d.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ COMBINED VIEW (manager only) ════════════════════════════════════ */}
        {safeScreen==="combined"&&currentUser.role==="manager"&&(()=>{
          const wSales=allSales.womens??[], mSales=allSales.mens??[];
          const wToday=wSales.filter(s=>new Date(s.date).toDateString()===todayStr());
          const mToday=mSales.filter(s=>new Date(s.date).toDateString()===todayStr());
          const wRev=wToday.reduce((t,s)=>t+s.total,0), mRev=mToday.reduce((t,s)=>t+s.total,0);
          const wUnits=wToday.reduce((t,s)=>t+s.qty,0), mUnits=mToday.reduce((t,s)=>t+s.qty,0);
          const wGoal=allGoals?.womens?.[getWeekKey()]?.[getDayName()]??DEFAULT_WEEKLY_GOALS.womens[getDayName()];
          const mGoal=allGoals?.mens?.[getWeekKey()]?.[getDayName()]??DEFAULT_WEEKLY_GOALS.mens[getDayName()];
          return (
            <div>
              <div className="section-title">Combined View</div>
              <div className="section-sub">Men's + Women's — manager overview</div>

              {/* Side by side comparison */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:28}}>
                {[{div:DIVISIONS[0],rev:wRev,units:wUnits,goal:wGoal,sales:wToday},{div:DIVISIONS[1],rev:mRev,units:mUnits,goal:mGoal,sales:mToday}].map(({div:d,rev,units,goal,sales:ds})=>(
                  <div key={d.id} style={{background:"#111009",border:`1.5px solid ${d.dim}`,borderRadius:8,padding:20}}>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:d.color,marginBottom:16}}>{d.label}</div>
                    {[{label:"Revenue",val:fmt(rev),target:fmt(goal.revenue),pct:Math.min(100,goal.revenue>0?(rev/goal.revenue)*100:0)},
                      {label:"Units",val:units,target:`${goal.units} target`,pct:Math.min(100,goal.units>0?(units/goal.units)*100:0)}].map(({label,val,target,pct})=>(
                      <div key={label} style={{marginBottom:12}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                          <span style={{fontSize:11,color:"#666",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</span>
                          <span style={{fontSize:12,color:d.color,fontWeight:600}}>{val} <span style={{color:"#444",fontWeight:400,fontSize:10}}>/ {target}</span></span>
                        </div>
                        <div style={{background:"#0a0908",borderRadius:3,height:5,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:pct>=100?"#6ea870":d.color,borderRadius:3,transition:"width .5s"}} />
                        </div>
                      </div>
                    ))}
                    <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1e1c1a",fontSize:11,color:"#555"}}>{ds.length} transactions today</div>
                  </div>
                ))}
              </div>

              {/* Combined total */}
              <div className="card" style={{padding:"18px 24px",marginBottom:24,display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:16}}>
                {[{label:"Combined Revenue",val:fmt(wRev+mRev)},{label:"Combined Units",val:wUnits+mUnits},{label:"Combined Sales",val:wToday.length+mToday.length}].map(({label,val})=>(
                  <div key={label} style={{textAlign:"center"}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:6}}>{label}</div>
                    <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#f0e8d8"}}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Staff breakdown across both */}
              <div style={{fontSize:12,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#555",marginBottom:10}}>Staff — Today (All Concessions)</div>
              <div style={{overflowX:"auto",borderRadius:6,border:"1px solid #1e1c1a"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>
                  <thead>
                    <tr style={{background:"#111009",borderBottom:"2px solid #c8a96e44"}}>
                      {["Staff","622 WOMEN","637 MEN","Total"].map(h=>(
                        <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#c8a96e",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s,i)=>{
                      const ws=[...wToday,...mToday].filter(x=>x.staffId===s.id);
                      const wOnlyRev=wToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.total,0);
                      const mOnlyRev=mToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.total,0);
                      if(!ws.length) return null;
                      return(
                        <tr key={s.id} style={{borderBottom:"1px solid #1a1714",background:i%2===0?"#0e0c0a":"#111009"}}>
                          <td style={{padding:"10px 12px",fontWeight:600,color:"#f0e8d8"}}>{s.name}</td>
                          <td style={{padding:"10px 12px",color:wOnlyRev>0?DIVISIONS[0].color:"#333",fontFamily:"'Playfair Display',serif",fontSize:14}}>{wOnlyRev>0?fmt(wOnlyRev):"—"}</td>
                          <td style={{padding:"10px 12px",color:mOnlyRev>0?DIVISIONS[1].color:"#333",fontFamily:"'Playfair Display',serif",fontSize:14}}>{mOnlyRev>0?fmt(mOnlyRev):"—"}</td>
                          <td style={{padding:"10px 12px",fontFamily:"'Playfair Display',serif",fontSize:15,color:"#f0e8d8",fontWeight:700}}>{fmt(ws.reduce((t,x)=>t+x.total,0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ═══ AI HUB (manager only) ════════════════════════════════════════ */}
        {safeScreen==="ai" && currentUser.role==="manager" && (() => {
          // ── Build context snapshot for AI ──────────────────────────────────
          const buildContext = () => {
            const wSales = allSales.womens ?? [];
            const mSales = allSales.mens   ?? [];
            const wToday = wSales.filter(s => new Date(s.date).toDateString() === todayStr());
            const mToday = mSales.filter(s => new Date(s.date).toDateString() === todayStr());
            const allToday = [...wToday.map(s=>({...s,div:"Women's"})), ...mToday.map(s=>({...s,div:"Men's"}))];
            const wGoal = todayGoals(); // current division goal
            const wRevToday = wToday.reduce((t,s)=>t+s.total,0);
            const mRevToday = mToday.reduce((t,s)=>t+s.total,0);
            const wUnitsToday = wToday.reduce((t,s)=>t+s.qty,0);
            const mUnitsToday = mToday.reduce((t,s)=>t+s.qty,0);
            const wGoalData = allGoals?.womens?.[getWeekKey()]?.[getDayName()] ?? DEFAULT_WEEKLY_GOALS.womens[getDayName()];
            const mGoalData = allGoals?.mens?.[getWeekKey()]?.[getDayName()]   ?? DEFAULT_WEEKLY_GOALS.mens[getDayName()];
            const wProds = allProducts.womens ?? [];
            const mProds = allProducts.mens   ?? [];
            const allProds = [...wProds.map(p=>({...p,div:"Women's"})), ...mProds.map(p=>({...p,div:"Men's"}))];
            const openPS = [...(allPsLoans.womens??[]).filter(l=>l.status==="out").map(l=>({...l,div:"Women's"})),
                            ...(allPsLoans.mens??[]).filter(l=>l.status==="out").map(l=>({...l,div:"Men's"}))];
            const staffBreakdown = staff.map(s => ({
              name: s.name, id: s.id,
              womensRev: wToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.total,0),
              womensUnits: wToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.qty,0),
              mensRev: mToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.total,0),
              mensUnits: mToday.filter(x=>x.staffId===s.id).reduce((t,x)=>t+x.qty,0),
            }));
            // Last 7 days sales by division
            const last7 = Array.from({length:7},(_,i)=>{
              const d = new Date(); d.setDate(d.getDate()-i);
              const ds = d.toDateString();
              return { date: d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}),
                wRev: wSales.filter(s=>new Date(s.date).toDateString()===ds).reduce((t,s)=>t+s.total,0),
                mRev: mSales.filter(s=>new Date(s.date).toDateString()===ds).reduce((t,s)=>t+s.total,0) };
            }).reverse();
            return {
              today: getDayName(), date: new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"}),
              womens: { revToday: wRevToday, unitsToday: wUnitsToday, revTarget: wGoalData.revenue, unitsTarget: wGoalData.units,
                lowStock: wProds.filter(p=>p.stock-p.onLoan<=3).map(p=>({name:p.name,avail:p.stock-p.onLoan,total:p.stock})),
                topSeller: wToday.length ? [...wToday].sort((a,b)=>b.total-a.total)[0]?.productName : "none",
                salesCount: wToday.length },
              mens: { revToday: mRevToday, unitsToday: mUnitsToday, revTarget: mGoalData.revenue, unitsTarget: mGoalData.units,
                lowStock: mProds.filter(p=>p.stock-p.onLoan<=3).map(p=>({name:p.name,avail:p.stock-p.onLoan,total:p.stock})),
                topSeller: mToday.length ? [...mToday].sort((a,b)=>b.total-a.total)[0]?.productName : "none",
                salesCount: mToday.length },
              staff: staffBreakdown,
              openPersonalShopperLoans: openPS.map(l=>({product:l.productName,shopper:l.shopperName,div:l.div,issuedAt:fmtDT(l.date)})),
              last7DaysRevenue: last7,
              allTodaySales: allToday.map(s=>({product:s.productName,qty:s.qty,price:fmt(s.unitPrice),total:s.total,staff:s.staffName,till:s.tillNo,div:s.div,external:!!s.isExternal,date:s.date})),
              allSales: [...wSales,...mSales].map(s=>({total:s.total,date:s.date,div:s.division})),
            };
          };

          return <AIHub buildContext={buildContext} divColor={divColor} staff={staff} fmt={fmt} />;
        })()}

      </main>
    </div>
  );
