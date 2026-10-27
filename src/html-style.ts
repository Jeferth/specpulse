// Inline dashboard CSS: self-contained (no CDN); light/dark from the system preference or the toggle.
export const STYLE = `
:root{--bg:#f6f5f2;--panel:#fff;--ink:#1d1c1a;--muted:#6b6862;--line:#e4e1da;--soft:#efede8;
--done:#1f8a5b;--doing:#c27a12;--todo:#9a968f;--accent:#3d5afe;--warn-bg:#fff4e0;--warn-ink:#8a5300;
--shadow:0 1px 2px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04);color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#121212;--panel:#1b1b1a;--ink:#ecebe8;
--muted:#a19d96;--line:#2c2b29;--soft:#242321;--done:#3fbf86;--doing:#e6a33e;--todo:#77736c;--accent:#7c91ff;
--warn-bg:#3a2b12;--warn-ink:#f2c47a;--shadow:none;color-scheme:dark}}
:root[data-theme=dark]{--bg:#121212;--panel:#1b1b1a;--ink:#ecebe8;--muted:#a19d96;--line:#2c2b29;--soft:#242321;
--done:#3fbf86;--doing:#e6a33e;--todo:#77736c;--accent:#7c91ff;--warn-bg:#3a2b12;--warn-ink:#f2c47a;
--shadow:none;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:32px 20px 48px}
header.top{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px}
h1{font-size:28px;letter-spacing:-.02em;margin:0}
h1 span{color:var(--muted);font-weight:400}
h2{font-size:18px;margin:40px 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 16px;font-size:13px}
code{font:12px ui-monospace,"Cascadia Code",Consolas,monospace;background:var(--soft);padding:1px 5px;border-radius:4px}
a{color:var(--accent)}
button.theme{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;padding:6px 12px;
cursor:pointer;font:inherit}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow)}
.kpi b{display:block;font-size:24px;letter-spacing:-.02em}
.kpi small{color:var(--muted)}
.bar{height:6px;border-radius:99px;background:var(--soft);overflow:hidden}
.bar i{display:block;height:100%;border-radius:99px;background:var(--done)}
.bar.doing i{background:var(--doing)}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;
white-space:nowrap;border:1px solid currentColor}
.pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.s-done{color:var(--done)}.s-doing{color:var(--doing)}.s-todo{color:var(--todo)}
.phases{display:grid;gap:10px}
details.phase{background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
details.phase>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:44px 1fr minmax(120px,220px) auto;
gap:14px;align-items:center;padding:14px 16px}
details.phase>summary::-webkit-details-marker{display:none}
.num{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-weight:700;background:var(--soft)}
.phase.st-done .num{background:var(--done);color:#fff}.phase.st-doing .num{background:var(--doing);color:#fff}
.pname{font-weight:650}.pfocus{color:var(--muted);font-size:12.5px}
.pbar small{display:block;color:var(--muted);font-size:11.5px;margin-top:4px;text-align:right}
.ms{list-style:none;margin:0;padding:0 16px 14px 74px;display:grid;gap:8px}
.ms li{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:start;padding:10px 12px;border-radius:10px;
background:var(--soft)}
.ms .id{font-weight:700;font-variant-numeric:tabular-nums}
.ms .what{font-size:12.5px;color:var(--muted)}
.ms .src{font-size:11.5px;color:var(--muted);margin-top:4px}
.ms .src b{font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.chip{font-size:11px;border:1px solid var(--line);border-radius:6px;padding:0 6px;background:var(--panel)}
.note{font-size:11.5px;color:var(--warn-ink);background:var(--warn-bg);border-radius:6px;padding:1px 6px;
display:inline-block;margin-top:4px}
.tablebox{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
table{border-collapse:collapse;width:100%;min-width:720px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
tr:last-child td{border-bottom:0}
td.acc{min-width:130px}td.acc small{color:var(--muted)}
td details summary{cursor:pointer;color:var(--accent)}
td details ul{margin:6px 0 0;padding-left:16px;font-size:12px}
td details li code{margin-right:4px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px;box-shadow:var(--shadow)}
.card h3{margin:0 0 10px;font-size:15px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.badge{font-size:11px;font-weight:600;color:var(--warn-ink);background:var(--warn-bg);border-radius:99px;padding:2px 9px}
.badge.ok{color:var(--done);background:transparent;border:1px solid var(--done)}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}
figure{margin:0}
figcaption{font-size:11.5px;color:var(--muted);margin-bottom:4px}
.shot{display:block;border:1px solid var(--line);border-radius:8px;overflow:hidden;
background:repeating-conic-gradient(var(--soft) 0 25%,var(--panel) 0 50%) 0 0/16px 16px}
.shot img{display:block;width:100%;height:auto}
.missing{font-size:12px;color:var(--muted);padding:24px 8px;text-align:center;border:1px dashed var(--line);
border-radius:8px}
.timeline{display:grid;gap:10px}
.snap{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;
grid-template-columns:150px 1fr;gap:14px;align-items:start}
.snap .when{font-weight:650;font-variant-numeric:tabular-nums}
.snap .when small{display:block;color:var(--muted);font-weight:400}
.thumbs{display:flex;flex-wrap:wrap;gap:10px}
.thumbs figure{width:150px}
.thumbs .same{opacity:.55}.thumbs .same .chg{color:var(--muted)}
.chg{font-size:10.5px;font-weight:700;color:var(--accent)}
.empty{color:var(--muted);background:var(--panel);border:1px dashed var(--line);border-radius:12px;padding:16px}
footer{margin-top:44px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px;
display:flex;flex-wrap:wrap;gap:6px 22px}
footer b{color:var(--ink);font-weight:600}
.dirty{color:var(--doing)}.clean{color:var(--done)}
@media (max-width:720px){
details.phase>summary{grid-template-columns:40px 1fr;row-gap:8px}
details.phase>summary .pbar,details.phase>summary .pill{grid-column:2;justify-self:start}
details.phase>summary .pbar{justify-self:stretch}
.ms{padding-left:16px}.snap{grid-template-columns:1fr}.pair{grid-template-columns:1fr}
.gallery{grid-template-columns:1fr}.thumbs figure{width:calc(50% - 5px)}}
`;

// Theme toggle: flips data-theme and remembers the choice (this browser only).
export const SCRIPT = `
(function(){var r=document.documentElement,k="specpulse-theme";
try{var s=localStorage.getItem(k);if(s)r.dataset.theme=s}catch(e){}
var b=document.querySelector("button.theme");if(!b)return;
b.addEventListener("click",function(){var dark=r.dataset.theme?r.dataset.theme==="dark"
:matchMedia("(prefers-color-scheme: dark)").matches;r.dataset.theme=dark?"light":"dark";
try{localStorage.setItem(k,r.dataset.theme)}catch(e){}});})();
`;
