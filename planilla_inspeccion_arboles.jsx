import { useState, useRef, useEffect, useCallback } from "react";

// ─── jsPDF via CDN (loaded in index.html or injected) ───────────────────────
// We'll load it dynamically if not present
function loadJsPDF() {
  return new Promise((resolve) => {
    if (window.jspdf) return resolve(window.jspdf);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf);
    document.head.appendChild(s);
  });
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --yellow: #F5BE00;
    --dark:   #1A1A2E;
    --green:  #2D6A4F;
    --green2: #40916C;
    --green3: #52B788;
    --bg:     #F0F4EE;
    --white:  #FFFFFF;
    --border: #C8D8C0;
    --text:   #1C2B1A;
    --label:  #3A5240;
    --secbg:  #E4EEE0;
    --r:      10px;
    --sh:     0 2px 14px rgba(45,106,79,.10);
  }

  body {
    font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
  }

  /* ── HEADER ── */
  .hdr { background: var(--dark); position: sticky; top:0; z-index:200; box-shadow: 0 3px 18px rgba(0,0,0,.28); }
  .hdr-inner { display:flex; align-items:center; gap:14px; padding:12px 18px; }
  .hdr-logo {
    background: var(--yellow); color: var(--dark);
    font-weight:900; font-size:9px; letter-spacing:.5px; text-transform:uppercase;
    padding:5px 8px; border-radius:5px; line-height:1.4; flex-shrink:0;
  }
  .hdr-title { font-size:15px; font-weight:700; color:#fff; line-height:1.2; }
  .hdr-sub   { font-size:11px; color:rgba(255,255,255,.55); }
  .prog-bar  { height:3px; background:rgba(255,255,255,.12); }
  .prog-fill { height:100%; background:var(--yellow); transition:width .4s ease; }

  /* ── LAYOUT ── */
  .wrap { max-width:680px; margin:0 auto; padding:18px 14px 48px; display:flex; flex-direction:column; gap:16px; }

  /* ── SECTION CARD ── */
  .card { background:var(--white); border-radius:var(--r); box-shadow:var(--sh); overflow:hidden; }
  .card-hdr {
    background: var(--green); color:#fff;
    padding:10px 16px; font-size:12.5px; font-weight:700;
    letter-spacing:.5px; text-transform:uppercase;
    display:flex; align-items:center; gap:8px;
  }
  .card-body { padding:16px; display:flex; flex-direction:column; gap:12px; }

  /* ── SUBLABEL ── */
  .sub-lbl {
    font-size:11px; font-weight:700; color:var(--green2);
    text-transform:uppercase; letter-spacing:.5px;
    padding:4px 0 3px; border-bottom:1.5px solid var(--border);
  }

  /* ── GRID ROWS ── */
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  .g2m { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

  /* ── FIELD ── */
  .fld { display:flex; flex-direction:column; gap:4px; }
  .fld label { font-size:11px; font-weight:600; color:var(--label); text-transform:uppercase; letter-spacing:.4px; }
  .fld input, .fld select, .fld textarea {
    width:100%; border:1.5px solid var(--border); border-radius:7px;
    padding:9px 12px; font-size:14px; color:var(--text); background:#FAFCF9;
    font-family:inherit; transition:border-color .2s, box-shadow .2s;
    -webkit-appearance:none; appearance:none;
  }
  .fld input:focus, .fld select:focus, .fld textarea:focus {
    outline:none; border-color:var(--green3);
    box-shadow:0 0 0 3px rgba(82,183,136,.18); background:#fff;
  }
  .fld textarea { min-height:90px; resize:vertical; line-height:1.5; }

  /* ── CHECKS / RADIOS ── */
  .chk-grp { display:flex; flex-wrap:wrap; gap:8px; }
  .chk-item { display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none; }
  .chk-item input { width:18px; height:18px; accent-color:var(--green); cursor:pointer; flex-shrink:0; }
  .chk-item span { font-size:13px; }

  /* ── CAV TABLE ── */
  .cav-tbl { width:100%; border-collapse:collapse; font-size:13px; }
  .cav-tbl th, .cav-tbl td { border:1.5px solid var(--border); padding:7px 10px; text-align:center; }
  .cav-tbl th { background:var(--secbg); font-weight:600; color:var(--label); font-size:12px; }
  .cav-tbl td:first-child { text-align:left; font-weight:500; }
  .cav-tbl input[type=checkbox] { width:18px; height:18px; accent-color:var(--green); cursor:pointer; }

  /* ── SIGNATURE ── */
  .sig-wrap {
    border:2px dashed var(--border); border-radius:8px;
    background:#FAFCF9; position:relative; overflow:hidden; touch-action:none;
  }
  .sig-wrap canvas { display:block; width:100%; height:160px; cursor:crosshair; touch-action:none; }
  .sig-hint {
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    color:#B0C4B0; font-size:13px; pointer-events:none; white-space:nowrap;
  }
  .sig-acts { display:flex; gap:8px; margin-top:8px; }

  /* ── IMAGE UPLOAD ── */
  .img-drop {
    border:2px dashed var(--border); border-radius:8px; background:#FAFCF9;
    padding:20px; text-align:center; cursor:pointer; position:relative;
    transition:border-color .2s, background .2s;
  }
  .img-drop:hover { border-color:var(--green3); background:#F0F7F3; }
  .img-drop input { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
  .img-drop-icon { font-size:34px; margin-bottom:6px; }
  .img-drop-txt  { font-size:13px; color:var(--label); font-weight:500; }
  .img-drop-sub  { font-size:11px; color:#8FAB8A; margin-top:3px; }
  .img-prev { width:100%; max-height:260px; object-fit:contain; border-radius:6px; margin-top:10px; }

  /* ── BUTTONS ── */
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px;
    border:none; border-radius:8px; padding:10px 16px; font-size:13px;
    font-weight:600; cursor:pointer; transition:all .18s; font-family:inherit;
    -webkit-tap-highlight-color:transparent; }
  .btn-clear  { background:#FEE2E2; color:#B91C1C; flex:1; }
  .btn-clear:hover  { background:#FECACA; }
  .btn-reset  { background:var(--secbg); color:var(--label); }
  .btn-reset:hover  { background:var(--border); }
  .btn-dl     { background:var(--green); color:#fff; flex:2; font-size:14px; padding:12px 20px; }
  .btn-dl:hover     { background:#235C40; }
  .btn-dl:active    { transform:scale(.98); }
  .btn-dl:disabled  { opacity:.6; cursor:not-allowed; }

  /* ── ACTION BAR ── */
  .act-bar { background:var(--white); border-radius:var(--r); box-shadow:var(--sh); padding:16px; display:flex; gap:10px; flex-wrap:wrap; }

  /* ── TOAST ── */
  .toast {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(80px);
    background:var(--green); color:#fff; padding:12px 24px; border-radius:25px;
    font-size:14px; font-weight:600; box-shadow:0 4px 20px rgba(0,0,0,.2);
    transition:transform .3s ease; z-index:9999; white-space:nowrap; pointer-events:none;
  }
  .toast.show { transform:translateX(-50%) translateY(0); }

  @media (max-width:420px) {
    .g3 { grid-template-columns:1fr 1fr; }
    .g2m { grid-template-columns:1fr; }
  }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function SectionCard({ icon, title, children }) {
  return (
    <div className="card">
      <div className="card-hdr">
        <span>{icon}</span> {title}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="fld">
      <label>{label}</label>
      {children}
    </div>
  );
}

function SubLabel({ children }) {
  return <div className="sub-lbl">{children}</div>;
}

function CheckItem({ label, checked, onChange }) {
  return (
    <label className="chk-item">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function RadioItem({ label, name, value, current, onChange }) {
  return (
    <label className="chk-item">
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => onChange(value)} />
      <span>{label}</span>
    </label>
  );
}

// ─── SIGNATURE PAD ───────────────────────────────────────────────────────────
function SignaturePad({ onHasSig }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const hasSig = useRef(false);
  const dpr = window.devicePixelRatio || 1;

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.parentElement.clientWidth;
    const h = 160;
    const data = hasSig.current ? canvas.toDataURL() : null;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1C2B1A";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (data) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, w, h);
      img.src = data;
    }
  }, [dpr]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const startDraw = (e) => {
    drawing.current = true;
    const ctx = canvasRef.current.getContext("2d");
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (!hasSig.current) { hasSig.current = true; onHasSig(true); }
  };

  const stopDraw = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    hasSig.current = false;
    onHasSig(false);
  };

  const getDataURL = () => hasSig.current ? canvasRef.current.toDataURL("image/png") : null;

  // Expose via ref trick
  SignaturePad.getDataURL = getDataURL;
  SignaturePad.clear = clear;

  return (
    <>
      <div className="sig-wrap">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        />
        {!hasSig.current && <div className="sig-hint">✍️ Firme aquí con el dedo o mouse</div>}
      </div>
      <div className="sig-acts">
        <button className="btn btn-clear" onClick={clear}>🗑 Borrar firma</button>
      </div>
    </>
  );
}

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const INIT = {
  // Meta
  fecha: "", aviso: "", arme: "",
  // Árbol
  especie: "", calle: "", nref: "",
  arbolSeco: false, arbolSemiseco: false,
  // Params
  altura: "", dap: "", inclinacion: "",
  gradoInclinacion: "",
  oriCalle: false, oriPropiedad: false, oriVereda: false,
  copaDesbal: false, copaDescopado: false, copaDesBrot: false,
  // Fuste
  descortez: false, fructif: false, codominFuste: false, chorreados: false,
  cavPeqBasal: false, cavPeqMedia: false, cavPeqAlta: false,
  cavGrandBasal: false, cavGrandMedia: false, cavGrandAlta: false,
  cavLong: "", espPared: "",
  // Raíces
  raicesExp: false, levVereda: "", fisuras: "",
  // Ramas
  ramaQueb: false, ramaSecas: false, ramaCav: false, ramaBajas: false,
  ramaTocones: false, ramaExcesivas: false, ramaInvasion: false,
  ramaMalAng: false, ramaCodominantes: false,
  // Hojas
  defoliacion: "",
  hojaColor: false, hojaEnf: false, hojaManchas: false, hojaInsectos: false,
  // Recomendaciones
  recReducRiesgo: false, recElimInterf: false, recAdecSitio: false, recRegEstruc: false,
  podaFormacion: false, podaLimpieza: false, podaAclareo: false, podaRefaldado: false, podaTerciado: false,
  corteSuperficial: false, corteProfundo: false,
  recFitosan: false, recTrasplante: false, recExtraccion: false,
  // Observaciones / Inspector
  observaciones: "",
  inspNombre: "", inspDni: "",
  // Foto
  nroInforme: "",
};

// ─── PROGRESS ────────────────────────────────────────────────────────────────
const KEY_FIELDS = ["fecha", "especie", "calle", "nref", "altura", "dap"];

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [form, setForm] = useState({ ...INIT });
  const [fotoURL, setFotoURL] = useState(null);
  const [fotoName, setFotoName] = useState(null);
  const [hasSig, setHasSig] = useState(false);
  const [toast, setToast] = useState({ msg: "", show: false });
  const [generating, setGenerating] = useState(false);
  const sigRef = useRef(null);

  // Inject CSS
  useEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = css;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const progress = Math.round(
    (KEY_FIELDS.filter(k => String(form[k]).trim() !== "").length / KEY_FIELDS.length) * 100
  );

  const showToast = (msg) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2600);
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setFotoURL(ev.target.result); setFotoName(file.name); };
    reader.readAsDataURL(file);
  };

  const resetAll = () => {
    if (!confirm("¿Limpiar todos los datos del formulario?")) return;
    setForm({ ...INIT });
    setFotoURL(null);
    setFotoName(null);
    setHasSig(false);
    if (SignaturePad.clear) SignaturePad.clear();
    showToast("Formulario limpiado");
  };

  // ── PDF GENERATION ──────────────────────────────────────────────────────────
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { jsPDF } = await loadJsPDF();
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210, H = 297, L = 14, R = 14, TW = W - L - R;

      const DARK  = [26, 26, 46];
      const GREEN = [45, 106, 79];
      const GREEN2 = [64, 145, 108];
      const YELLOW = [245, 190, 0];
      const GRAY  = [228, 238, 224];
      const LIGHT = [240, 247, 238];
      const TEXT  = [28, 43, 26];

      const f = form;
      let fechaStr = f.fecha;
      if (fechaStr) { const [y, m, d] = fechaStr.split("-"); fechaStr = `${d}/${m}/${y}`; }

      // ── PAGE HEADER ──
      const drawPageHeader = () => {
        doc.setFillColor(...DARK);
        doc.rect(0, 0, W, 22, "F");
        doc.setFillColor(...YELLOW);
        doc.roundedRect(L, 4, 22, 14, 2, 2, "F");
        doc.setFontSize(5.5); doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK);
        doc.text("BUENOS", L + 11, 8.5, { align: "center" });
        doc.text("AIRES",  L + 11, 12,  { align: "center" });
        doc.text("CIUDAD", L + 11, 15.5,{ align: "center" });
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("Planilla de Inspección de Árboles", 42, 11);
        doc.setFontSize(7); doc.setFont("helvetica", "normal");
        doc.text("Gobierno de la Ciudad Autónoma de Buenos Aires", 42, 16.5);
        // Meta bar
        doc.setFillColor(...LIGHT);
        doc.roundedRect(L, 26, TW, 10, 2, 2, "F");
        const metaItems = [["Fecha:", fechaStr||"—"], ["Aviso:", f.aviso||"—"], ["ARME:", f.arme||"—"]];
        metaItems.forEach(([lbl, val], i) => {
          const x = L + 3 + i * 60;
          doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN2);
          doc.text(lbl, x, 32.5);
          doc.setFont("helvetica","normal"); doc.setTextColor(...TEXT);
          doc.text(val, x + doc.getTextWidth(lbl) + 2, 32.5);
        });
      };

      // ── SECTION HEADER ──
      let y = 0;
      const secHdr = (title) => {
        doc.setFillColor(...GREEN);
        doc.roundedRect(L, y, TW, 8, 2, 2, "F");
        doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
        doc.text(title.toUpperCase(), L + 4, y + 5.5);
        y += 11;
      };

      const miniLbl = (txt) => {
        doc.setFontSize(7); doc.setFont("helvetica","bolditalic"); doc.setTextColor(...GREEN2);
        doc.text(txt, L + 2, y); y += 4.5;
      };

      const fieldLine = (label, val, x = L + 2) => {
        doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN2);
        doc.text(label + ":", x, y);
        doc.setFont("helvetica","normal"); doc.setTextColor(...TEXT);
        doc.text(String(val || "—"), x + doc.getTextWidth(label + ": ") + 1, y);
        y += 5.5;
      };

      const twoCols = (pairs) => {
        const cw = TW / 2;
        for (let i = 0; i < pairs.length; i += 2) {
          const [l1, v1] = pairs[i];
          const [l2, v2] = pairs[i + 1] || ["", ""];
          doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN2);
          doc.text(l1 + ":", L + 2, y);
          doc.setFont("helvetica","normal"); doc.setTextColor(...TEXT);
          doc.text(String(v1||"—"), L + 2 + doc.getTextWidth(l1+": ")+1, y);
          if (l2) {
            doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN2);
            doc.text(l2 + ":", L + 2 + cw, y);
            doc.setFont("helvetica","normal"); doc.setTextColor(...TEXT);
            doc.text(String(v2||"—"), L + 2 + cw + doc.getTextWidth(l2+": ")+1, y);
          }
          y += 5.5;
        }
      };

      const checkRow = (items) => {
        let cx = L + 2;
        const rowH = 5.5;
        items.forEach(([label, checked]) => {
          const needed = doc.getTextWidth("■ " + label) + 7;
          if (cx + needed > W - R - 2) { cx = L + 2; y += rowH; }
          doc.setFontSize(7.5); doc.setFont("helvetica","normal");
          if (checked) { doc.setTextColor(...GREEN); doc.text("■", cx, y); }
          else          { doc.setTextColor(185, 200, 183); doc.text("□", cx, y); }
          doc.setTextColor(...TEXT); doc.text(label, cx + 4, y);
          cx += needed;
        });
        y += rowH + 1;
      };

      // ══════════════ PAGE 1 ══════════════
      drawPageHeader();
      y = 40;

      // ÁRBOL
      secHdr("Información del Árbol");
      fieldLine("Especie botánica", f.especie);
      twoCols([["Calle", f.calle], ["N°/Ref.", f.nref]]);
      checkRow([["Árbol seco", f.arbolSeco], ["Árbol semiseco", f.arbolSemiseco]]);
      y += 2;

      // PARÁMETROS
      secHdr("Parámetros Mecánicos y Sanitarios");
      twoCols([["Altura (m)", f.altura], ["D.A.P. (cm)", f.dap], ["Inclinación", f.inclinacion], ["Grado", f.gradoInclinacion]]);
      miniLbl("Orientación de la inclinación:");
      checkRow([["Hacia la calle", f.oriCalle], ["Hacia la propiedad", f.oriPropiedad], ["Hacia el largo de la vereda", f.oriVereda]]);
      miniLbl("Copa:");
      checkRow([["Desbalanceada", f.copaDesbal], ["Descopado", f.copaDescopado], ["Descopado y brotado", f.copaDesBrot]]);
      y += 2;

      // FUSTE
      secHdr("Fuste");
      checkRow([["Descortezamiento", f.descortez], ["Fructificaciones fúngicas", f.fructif], ["Codominancias", f.codominFuste], ["Chorreados", f.chorreados]]);
      miniLbl("Cavidades:");
      // Table
      const cw = [32, 22, 22, 22];
      const tx = L + 2;
      doc.setFillColor(...GRAY);
      doc.rect(tx, y, 98, 6, "F");
      ["", "Basal", "Media", "Alta"].forEach((c, i) => {
        const cx2 = tx + cw.slice(0,i).reduce((a,b)=>a+b,0);
        doc.setFontSize(6.5); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN2);
        doc.text(c, cx2 + cw[i]/2, y+4, { align:"center" });
      });
      y += 6;
      [["Pequeñas", f.cavPeqBasal, f.cavPeqMedia, f.cavPeqAlta], ["Grandes", f.cavGrandBasal, f.cavGrandMedia, f.cavGrandAlta]].forEach(row => {
        doc.setDrawColor(...GRAY); doc.rect(tx, y, 98, 6, "S");
        row.forEach((cell, i) => {
          const cx2 = tx + cw.slice(0,i).reduce((a,b)=>a+b,0);
          if (i === 0) {
            doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(...TEXT);
            doc.text(String(cell), cx2 + 2, y+4);
          } else {
            doc.setTextColor(cell ? 45:185, cell?106:200, cell?79:183);
            doc.text(cell?"■":"□", cx2+cw[i]/2, y+4, { align:"center" });
          }
        });
        y += 6;
      });
      y += 2;
      twoCols([["Cavidad longitudinal (m)", f.cavLong], ["Espesor pared remanente (cm)", f.espPared]]);
      y += 2;

      // RAÍCES
      secHdr("Raíces");
      checkRow([["Expuestas", f.raicesExp]]);
      twoCols([["Levanta vereda (m²)", f.levVereda], ["Fisuras frente propiedad", f.fisuras]]);
      y += 2;

      // RAMAS
      secHdr("Ramas");
      checkRow([
        ["Quebradas/Fisuradas", f.ramaQueb], ["Secas/en ápices", f.ramaSecas],
        ["Con cavidades/tumores/cancros", f.ramaCav], ["Bajas", f.ramaBajas],
        ["Tocones", f.ramaTocones], ["Excesivas/Cruzadas", f.ramaExcesivas],
        ["Invasión espacio aéreo", f.ramaInvasion], ["Mal ángulo de inserción", f.ramaMalAng],
        ["Codominantes", f.ramaCodominantes]
      ]);
      y += 2;

      // HOJAS
      secHdr("Hojas");
      miniLbl("Defoliación:");
      checkRow([["Parcial", f.defoliacion==="PARCIAL"], ["Total", f.defoliacion==="TOTAL"], ["Ninguna", f.defoliacion==="NINGUNA"]]);
      checkRow([["Coloración anormal", f.hojaColor], ["Síntomas enfermedades", f.hojaEnf], ["Manchas foliares", f.hojaManchas], ["Signos de insectos", f.hojaInsectos]]);
      y += 2;

      // RECOMENDACIONES
      secHdr("Recomendaciones del Inspector");
      miniLbl("A – Objetivos de la poda:");
      checkRow([["Reducción de riesgo", f.recReducRiesgo], ["Eliminar interferencias", f.recElimInterf], ["Adecuación al sitio", f.recAdecSitio], ["Regulación de estructura", f.recRegEstruc]]);
      miniLbl("B – Tipos de poda:");
      checkRow([["Formación", f.podaFormacion], ["Limpieza", f.podaLimpieza], ["Aclareo", f.podaAclareo], ["Refaldado", f.podaRefaldado], ["Terciado", f.podaTerciado]]);
      miniLbl("C – Corte de raíces:");
      checkRow([["Superficial", f.corteSuperficial], ["Profundo", f.corteProfundo]]);
      checkRow([["D – Tratamiento fitosanitario", f.recFitosan], ["E – Trasplante", f.recTrasplante], ["F – Extracción", f.recExtraccion]]);
      y += 2;

      // OBSERVACIONES
      secHdr("Observaciones");
      const obsText = f.observaciones || "—";
      const obsLines = doc.splitTextToSize(obsText, TW - 4);
      doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(...TEXT);
      obsLines.forEach(line => { doc.text(line, L+2, y); y += 5; });
      for (let i = 0; i < Math.max(3, obsLines.length + 1); i++) {
        doc.setDrawColor(...GRAY); doc.line(L+2, y, W-R-2, y); y += 5;
      }
      y += 3;

      // INSPECTOR
      secHdr("Inspector de Arbolado");
      twoCols([["Nombre y apellido", f.inspNombre], ["D.N.I.", f.inspDni]]);

      const sigURL = SignaturePad.getDataURL ? SignaturePad.getDataURL() : null;
      if (sigURL) {
        const sigH = 28;
        doc.setDrawColor(...GREEN); doc.setLineWidth(0.5);
        doc.roundedRect(L+2, y, TW-4, sigH, 2, 2, "S");
        try { doc.addImage(sigURL, "PNG", L+2, y, TW-4, sigH, undefined, "FAST"); } catch(e){}
        y += sigH + 2;
      } else {
        doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);
        doc.roundedRect(L+2, y, TW-4, 20, 2, 2, "S");
        doc.setFontSize(7); doc.setTextColor(185,200,183);
        doc.text("(sin firma)", W/2, y+11, { align:"center" });
        y += 22;
      }
      const lblY = y+2;
      doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);
      const third = TW / 3;
      [0,1,2].forEach(i => doc.line(L+i*third+4, lblY, L+(i+1)*third-4, lblY));
      doc.setFontSize(6.5); doc.setFont("helvetica","italic"); doc.setTextColor(...GREEN2);
      ["Nombre y apellido","D.N.I.","Firma"].forEach((t,i) =>
        doc.text(t, L+i*third+third/2, lblY+4, { align:"center" }));

      // ══════════════ PAGE 2 ══════════════
      doc.addPage();
      drawPageHeader();

      // Foto header
      doc.setFillColor(...GREEN);
      doc.roundedRect(L, 40, TW, 8, 2, 2, "F");
      doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
      doc.text("REGISTRO FOTOGRÁFICO", L+4, 45.5);

      doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN2);
      doc.text("Informe N°:", L+2, 55);
      doc.setFont("helvetica","normal"); doc.setTextColor(...TEXT);
      doc.text(f.nroInforme||"—", L+28, 55);

      doc.setFont("helvetica","bold"); doc.setTextColor(...GREEN2);
      doc.text("Calle:", L+2, 61);
      doc.setFont("helvetica","normal"); doc.setTextColor(...TEXT);
      doc.text((f.calle||"—")+"  N°/Ref.: "+(f.nref||"—"), L+16, 61);

      const imgBoxY = 66, imgBoxH = H - imgBoxY - 16, imgBoxW = TW;

      if (fotoURL) {
        const imgEl = new Image();
        await new Promise(r => { imgEl.onload = r; imgEl.src = fotoURL; });
        const sw = imgBoxW / imgEl.naturalWidth;
        const sh = imgBoxH / imgEl.naturalHeight;
        const sc = Math.min(sw, sh);
        const dw = imgEl.naturalWidth * sc, dh = imgEl.naturalHeight * sc;
        const dx = L + (imgBoxW - dw) / 2, dy = imgBoxY + (imgBoxH - dh) / 2;
        doc.setDrawColor(...GREEN); doc.setLineWidth(0.7);
        doc.roundedRect(L, imgBoxY, imgBoxW, imgBoxH, 3, 3, "S");
        try { doc.addImage(fotoURL, "JPEG", dx, dy, dw, dh, undefined, "FAST"); }
        catch(e) { try { doc.addImage(fotoURL, "PNG", dx, dy, dw, dh, undefined, "FAST"); } catch(_){} }
      } else {
        doc.setFillColor(...LIGHT);
        doc.roundedRect(L, imgBoxY, imgBoxW, imgBoxH, 3, 3, "F");
        doc.setDrawColor(...GRAY); doc.setLineWidth(0.5);
        doc.roundedRect(L, imgBoxY, imgBoxW, imgBoxH, 3, 3, "S");
        doc.setFontSize(10); doc.setFont("helvetica","italic"); doc.setTextColor(185,200,183);
        doc.text("Imagen del ejemplar", W/2, imgBoxY+imgBoxH/2, { align:"center" });
      }

      const fname = `Planilla_Arbol_${(f.calle||"sin_calle").replace(/ /g,"_")}_${(f.nref||"").replace(/ /g,"")}.pdf`;
      doc.save(fname);
      showToast("✅ PDF descargado correctamente");
    } catch (err) {
      console.error(err);
      showToast("❌ Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-inner">
          <div className="hdr-logo">Buenos<br/>Aires<br/>Ciudad</div>
          <div>
            <div className="hdr-title">Planilla de Inspección de Árboles</div>
            <div className="hdr-sub">Gobierno de la Ciudad Autónoma de Buenos Aires</div>
          </div>
        </div>
        <div className="prog-bar">
          <div className="prog-fill" style={{ width: progress + "%" }} />
        </div>
      </header>

      <div className="wrap">

        {/* ── DATOS DEL INFORME ── */}
        <SectionCard icon="📋" title="Datos del Informe">
          <div className="g3">
            <Field label="Fecha">
              <input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
            </Field>
            <Field label="Aviso N°">
              <input type="text" value={form.aviso} onChange={e => set("aviso", e.target.value)} placeholder="Ej: 12345" />
            </Field>
            <Field label="ARME">
              <input type="text" value={form.arme} onChange={e => set("arme", e.target.value)} placeholder="Código" />
            </Field>
          </div>
        </SectionCard>

        {/* ── INFORMACIÓN DEL ÁRBOL ── */}
        <SectionCard icon="🌳" title="Información del Árbol">
          <Field label="Especie botánica">
            <input type="text" value={form.especie} onChange={e => set("especie", e.target.value)} placeholder="Ej: Tipuana tipu" />
          </Field>
          <div className="g2">
            <Field label="Calle">
              <input type="text" value={form.calle} onChange={e => set("calle", e.target.value)} placeholder="Nombre de la calle" />
            </Field>
            <Field label="N° / Referencia">
              <input type="text" value={form.nref} onChange={e => set("nref", e.target.value)} placeholder="Ej: 1234" />
            </Field>
          </div>
          <SubLabel>Estado general</SubLabel>
          <div className="chk-grp">
            <CheckItem label="🍂 Árbol seco"     checked={form.arbolSeco}     onChange={v => set("arbolSeco", v)} />
            <CheckItem label="🌿 Árbol semiseco"  checked={form.arbolSemiseco} onChange={v => set("arbolSemiseco", v)} />
          </div>
        </SectionCard>

        {/* ── PARÁMETROS ── */}
        <SectionCard icon="📐" title="Parámetros Mecánicos y Sanitarios">
          <div className="g3">
            <Field label="Altura (m)">
              <input type="number" value={form.altura} onChange={e => set("altura", e.target.value)} placeholder="0.0" step="0.1" min="0" />
            </Field>
            <Field label="D.A.P. (cm)">
              <input type="number" value={form.dap} onChange={e => set("dap", e.target.value)} placeholder="0.0" step="0.1" min="0" />
            </Field>
            <Field label="Inclinación">
              <select value={form.inclinacion} onChange={e => set("inclinacion", e.target.value)}>
                <option value="">—</option>
                <option value="SI">SÍ</option>
                <option value="NO">NO</option>
              </select>
            </Field>
          </div>
          <SubLabel>Grado de inclinación</SubLabel>
          <div className="chk-grp">
            <RadioItem label="Mayor a 40°" name="grado" value="Mayor a 40°" current={form.gradoInclinacion} onChange={v => set("gradoInclinacion", v)} />
            <RadioItem label="Menor a 40°" name="grado" value="Menor a 40°" current={form.gradoInclinacion} onChange={v => set("gradoInclinacion", v)} />
          </div>
          <SubLabel>Orientación de la inclinación</SubLabel>
          <div className="chk-grp">
            <CheckItem label="Hacia la calle"            checked={form.oriCalle}     onChange={v => set("oriCalle", v)} />
            <CheckItem label="Hacia la propiedad"        checked={form.oriPropiedad} onChange={v => set("oriPropiedad", v)} />
            <CheckItem label="Hacia el largo de la vereda" checked={form.oriVereda}  onChange={v => set("oriVereda", v)} />
          </div>
          <SubLabel>Copa</SubLabel>
          <div className="chk-grp">
            <CheckItem label="Desbalanceada"      checked={form.copaDesbal}    onChange={v => set("copaDesbal", v)} />
            <CheckItem label="Descopado"          checked={form.copaDescopado} onChange={v => set("copaDescopado", v)} />
            <CheckItem label="Descopado y brotado" checked={form.copaDesBrot}  onChange={v => set("copaDesBrot", v)} />
          </div>
        </SectionCard>

        {/* ── FUSTE ── */}
        <SectionCard icon="🪵" title="Fuste">
          <div className="chk-grp">
            <CheckItem label="Descortezamiento"       checked={form.descortez}     onChange={v => set("descortez", v)} />
            <CheckItem label="Fructificaciones fúngicas" checked={form.fructif}    onChange={v => set("fructif", v)} />
            <CheckItem label="Codominancias"          checked={form.codominFuste}  onChange={v => set("codominFuste", v)} />
            <CheckItem label="Chorreados"             checked={form.chorreados}    onChange={v => set("chorreados", v)} />
          </div>
          <SubLabel>Cavidades</SubLabel>
          <table className="cav-tbl">
            <thead>
              <tr><th>Tamaño / Parte</th><th>Basal</th><th>Media</th><th>Alta</th></tr>
            </thead>
            <tbody>
              {[
                ["Pequeñas", "cavPeqBasal",   "cavPeqMedia",   "cavPeqAlta"],
                ["Grandes",  "cavGrandBasal",  "cavGrandMedia", "cavGrandAlta"],
              ].map(([label, k1, k2, k3]) => (
                <tr key={label}>
                  <td>{label}</td>
                  {[k1,k2,k3].map(k => (
                    <td key={k}>
                      <input type="checkbox" checked={form[k]} onChange={e => set(k, e.target.checked)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="g2">
            <Field label="Cavidad longitudinal en fuste (m)">
              <input type="number" value={form.cavLong} onChange={e => set("cavLong", e.target.value)} placeholder="0.0" step="0.01" min="0" />
            </Field>
            <Field label="Espesor pared remanente (cm)">
              <input type="number" value={form.espPared} onChange={e => set("espPared", e.target.value)} placeholder="0.0" step="0.1" min="0" />
            </Field>
          </div>
        </SectionCard>

        {/* ── RAÍCES ── */}
        <SectionCard icon="🌱" title="Raíces">
          <div className="chk-grp">
            <CheckItem label="Expuestas" checked={form.raicesExp} onChange={v => set("raicesExp", v)} />
          </div>
          <div className="g2">
            <Field label="Levanta vereda (m²)">
              <input type="number" value={form.levVereda} onChange={e => set("levVereda", e.target.value)} placeholder="0.0" step="0.01" min="0" />
            </Field>
            <Field label="Fisuras frente a propiedad">
              <select value={form.fisuras} onChange={e => set("fisuras", e.target.value)}>
                <option value="">—</option>
                <option value="SI">SÍ</option>
                <option value="NO">NO</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        {/* ── RAMAS ── */}
        <SectionCard icon="🌿" title="Ramas">
          <div className="chk-grp">
            {[
              ["Quebradas / Fisuradas",          "ramaQueb"],
              ["Secas / Secas en los ápices",    "ramaSecas"],
              ["Con cavidades, tumores o cancros","ramaCav"],
              ["Bajas",                           "ramaBajas"],
              ["Tocones",                         "ramaTocones"],
              ["Excesivas / Cruzadas",            "ramaExcesivas"],
              ["Invasión de espacio aéreo",       "ramaInvasion"],
              ["Con mal ángulo de inserción",     "ramaMalAng"],
              ["Codominantes",                    "ramaCodominantes"],
            ].map(([label, key]) => (
              <CheckItem key={key} label={label} checked={form[key]} onChange={v => set(key, v)} />
            ))}
          </div>
        </SectionCard>

        {/* ── HOJAS ── */}
        <SectionCard icon="🍃" title="Hojas">
          <SubLabel>Defoliación</SubLabel>
          <div className="chk-grp">
            <RadioItem label="Parcial" name="defoliacion" value="PARCIAL" current={form.defoliacion} onChange={v => set("defoliacion", v)} />
            <RadioItem label="Total"   name="defoliacion" value="TOTAL"   current={form.defoliacion} onChange={v => set("defoliacion", v)} />
            <RadioItem label="Ninguna" name="defoliacion" value="NINGUNA" current={form.defoliacion} onChange={v => set("defoliacion", v)} />
          </div>
          <div className="chk-grp">
            <CheckItem label="Coloración anormal"    checked={form.hojaColor}    onChange={v => set("hojaColor", v)} />
            <CheckItem label="Síntomas de enfermedades" checked={form.hojaEnf}   onChange={v => set("hojaEnf", v)} />
            <CheckItem label="Con manchas foliares"  checked={form.hojaManchas}  onChange={v => set("hojaManchas", v)} />
            <CheckItem label="Signos de insectos"    checked={form.hojaInsectos} onChange={v => set("hojaInsectos", v)} />
          </div>
        </SectionCard>

        {/* ── RECOMENDACIONES ── */}
        <SectionCard icon="✅" title="Recomendaciones del Inspector">
          <SubLabel>A – Objetivos de la poda</SubLabel>
          <div className="chk-grp">
            <CheckItem label="Reducción de riesgo"     checked={form.recReducRiesgo} onChange={v => set("recReducRiesgo", v)} />
            <CheckItem label="Eliminar interferencias" checked={form.recElimInterf}  onChange={v => set("recElimInterf", v)} />
            <CheckItem label="Adecuación al sitio"     checked={form.recAdecSitio}   onChange={v => set("recAdecSitio", v)} />
            <CheckItem label="Regulación de estructura" checked={form.recRegEstruc}  onChange={v => set("recRegEstruc", v)} />
          </div>
          <SubLabel>B – Tipos de poda</SubLabel>
          <div className="chk-grp">
            <CheckItem label="Formación" checked={form.podaFormacion} onChange={v => set("podaFormacion", v)} />
            <CheckItem label="Limpieza"  checked={form.podaLimpieza}  onChange={v => set("podaLimpieza", v)} />
            <CheckItem label="Aclareo"   checked={form.podaAclareo}   onChange={v => set("podaAclareo", v)} />
            <CheckItem label="Refaldado" checked={form.podaRefaldado} onChange={v => set("podaRefaldado", v)} />
            <CheckItem label="Terciado"  checked={form.podaTerciado}  onChange={v => set("podaTerciado", v)} />
          </div>
          <SubLabel>C – Corte de raíces</SubLabel>
          <div className="chk-grp">
            <CheckItem label="Superficial" checked={form.corteSuperficial} onChange={v => set("corteSuperficial", v)} />
            <CheckItem label="Profundo"    checked={form.corteProfundo}    onChange={v => set("corteProfundo", v)} />
          </div>
          <SubLabel>Otras recomendaciones</SubLabel>
          <div className="chk-grp">
            <CheckItem label="D – Tratamiento fitosanitario" checked={form.recFitosan}   onChange={v => set("recFitosan", v)} />
            <CheckItem label="E – Trasplante"                checked={form.recTrasplante} onChange={v => set("recTrasplante", v)} />
            <CheckItem label="F – Extracción"                checked={form.recExtraccion} onChange={v => set("recExtraccion", v)} />
          </div>
        </SectionCard>

        {/* ── OBSERVACIONES ── */}
        <SectionCard icon="📝" title="Observaciones">
          <Field label="Observaciones del inspector">
            <textarea value={form.observaciones} onChange={e => set("observaciones", e.target.value)} placeholder="Ingrese observaciones adicionales..." />
          </Field>
        </SectionCard>

        {/* ── INSPECTOR ── */}
        <SectionCard icon="👤" title="Inspector de Arbolado">
          <div className="g2">
            <Field label="Nombre y apellido">
              <input type="text" value={form.inspNombre} onChange={e => set("inspNombre", e.target.value)} placeholder="Nombre completo" />
            </Field>
            <Field label="D.N.I.">
              <input type="text" value={form.inspDni} onChange={e => set("inspDni", e.target.value)} placeholder="00.000.000" />
            </Field>
          </div>
          <SubLabel>Firma digital</SubLabel>
          <SignaturePad ref={sigRef} onHasSig={setHasSig} />
        </SectionCard>

        {/* ── REGISTRO FOTOGRÁFICO ── */}
        <SectionCard icon="📸" title="Registro Fotográfico">
          <Field label="N° de Informe">
            <input type="text" value={form.nroInforme} onChange={e => set("nroInforme", e.target.value)} placeholder="Número de informe" />
          </Field>
          <div className="img-drop">
            <input type="file" accept="image/*" capture="environment" onChange={handleImage} />
            <div className="img-drop-icon">📷</div>
            <div className="img-drop-txt">{fotoName ? `✅ ${fotoName}` : "Tomar foto o seleccionar imagen"}</div>
            <div className="img-drop-sub">JPG, PNG o HEIC · Se ajusta automáticamente</div>
          </div>
          {fotoURL && <img src={fotoURL} className="img-prev" alt="Vista previa" />}
        </SectionCard>

        {/* ── ACCIONES ── */}
        <div className="act-bar">
          <button className="btn btn-reset" onClick={resetAll}>🔄 Limpiar formulario</button>
          <button className="btn btn-dl" onClick={generatePDF} disabled={generating}>
            {generating ? "⏳ Generando..." : "⬇ Descargar PDF"}
          </button>
        </div>

      </div>

      {/* TOAST */}
      <div className={`toast${toast.show ? " show" : ""}`}>{toast.msg}</div>
    </>
  );
}
