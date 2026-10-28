// Inline dashboard CSS: self-contained (no CDN, no web fonts); light/dark from the system
// preference, overridden by the theme toggle (data-theme on <html>).
export const STYLE = `
:root{--bg:#f6f5f2;--panel:#fff;--ink:#1d1c1a;--muted:#6b6862;--line:#e4e1da;--soft:#efede8;
--done:#1f8a5b;--doing:#b86e00;--todo:#8a867f;--accent:#3550e8;--warn-bg:#fff4e0;--warn-ink:#7a4a00;
--bad:#c0392b;--head:rgba(246,245,242,.92);--shadow:0 1px 2px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04);
color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#121212;--panel:#1b1b1a;--ink:#ecebe8;
--muted:#a19d96;--line:#2c2b29;--soft:#242321;--done:#3fbf86;--doing:#e6a33e;--todo:#8a867f;--accent:#8c9dff;
--warn-bg:#3a2b12;--warn-ink:#f2c47a;--bad:#ff7b6b;--head:rgba(18,18,18,.92);--shadow:none;color-scheme:dark}}
:root[data-theme=dark]{--bg:#121212;--panel:#1b1b1a;--ink:#ecebe8;--muted:#a19d96;--line:#2c2b29;--soft:#242321;
--done:#3fbf86;--doing:#e6a33e;--todo:#8a867f;--accent:#8c9dff;--warn-bg:#3a2b12;--warn-ink:#f2c47a;--bad:#ff7b6b;
--head:rgba(18,18,18,.92);--shadow:none;color-scheme:dark}
*{box-sizing:border-box}
html{scroll-padding-top:120px}
body{margin:0;background:var(--bg);color:var(--ink);overflow-x:hidden;
font:14px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
main.wrap{padding-top:20px;padding-bottom:24px;outline:none;min-height:60vh}
code{font:12px ui-monospace,"Cascadia Code",Consolas,monospace;background:var(--soft);padding:1px 5px;border-radius:4px;
overflow-wrap:anywhere}
h1{font-size:24px;letter-spacing:-.02em;margin:0}
h2{font-size:17px;margin:0 0 4px;letter-spacing:-.01em}
.sub{color:var(--muted);margin:0 0 14px;font-size:13px}
.meta{color:var(--muted);font-size:12px}
.empty{color:var(--muted);background:var(--panel);border:1px dashed var(--line);border-radius:12px;padding:14px 16px;margin:0}
.hint{background:var(--warn-bg);color:var(--warn-ink);border-radius:10px;padding:10px 14px}
.hint a{color:inherit;font-weight:600}
header.top{position:sticky;top:0;z-index:10;background:var(--head);backdrop-filter:blur(8px);
border-bottom:1px solid var(--line)}
.bar-row{max-width:1180px;margin:0 auto;padding:10px 20px 4px;display:flex;align-items:center;
justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{font-size:18px;font-weight:700;letter-spacing:-.01em;min-width:0}
.brand a{color:var(--ink);text-decoration:none}.brand span{color:var(--muted);font-weight:400}
.tools{display:flex;align-items:center;gap:8px}
.tools select,.tools button,.filters input,.filters select,button{border:1px solid var(--line);background:var(--panel);
color:var(--ink);border-radius:8px;padding:5px 10px;font:inherit;font-size:13px}
button{cursor:pointer}button:disabled{opacity:.6;cursor:progress}
.live-dot{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--muted)}
.live-dot::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--todo)}
.live-dot.on{color:var(--done)}.live-dot.on::before{background:var(--done);box-shadow:0 0 0 3px rgba(31,138,91,.2)}
nav.views{max-width:1180px;margin:0 auto;padding:0 14px;display:flex;gap:2px;overflow-x:auto;scrollbar-width:thin}
nav.views a{padding:8px 10px 10px;color:var(--muted);text-decoration:none;font-weight:600;font-size:13.5px;
border-bottom:2px solid transparent;white-space:nowrap}
nav.views a:hover{color:var(--ink)}
nav.views a.active{color:var(--ink);border-bottom-color:var(--accent)}
.block{margin:0 0 24px}
.cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:24px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:24px}
.kpi{display:block;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;
box-shadow:var(--shadow);color:var(--ink);text-decoration:none}
a.kpi:hover{border-color:var(--accent)}
.kpi b{display:block;font-size:24px;letter-spacing:-.02em}.kpi small{color:var(--muted)}
.bar{height:6px;border-radius:99px;background:var(--soft);overflow:hidden;min-width:60px}
.bar i{display:block;height:100%;border-radius:99px;background:var(--done)}
.bar.doing i{background:var(--doing)}
.pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;
white-space:nowrap;border:1px solid currentColor}
.pill::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.s-done{color:var(--done)}.s-doing{color:var(--doing)}.s-todo{color:var(--todo)}
.prows{display:grid;gap:6px}
.prow{display:grid;grid-template-columns:32px minmax(0,1fr) minmax(80px,160px) 44px auto;gap:12px;align-items:center;
padding:8px 12px;background:var(--panel);border:1px solid var(--line);border-radius:10px;color:var(--ink);
text-decoration:none}
.prow:hover{border-color:var(--accent)}
.prow .pct{font-variant-numeric:tabular-nums;color:var(--muted);text-align:right;font-size:12px}
.num{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;font-weight:700;background:var(--soft)}
.st-done .num{background:var(--done);color:#fff}.st-doing .num{background:var(--doing);color:#fff}
.pname{font-weight:650;overflow:hidden;text-overflow:ellipsis}.pname a{color:inherit;text-decoration:none}
.pfocus{color:var(--muted);font-size:12.5px}
.list{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.list li{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 12px;display:flex;
flex-wrap:wrap;gap:4px 10px;justify-content:space-between}
.list a{text-decoration:none;color:var(--ink)}
.chips{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.chip{font-size:11.5px;border:1px solid var(--line);border-radius:6px;padding:0 6px;background:var(--panel);
color:var(--ink);text-decoration:none}
a.chip:hover{border-color:var(--accent)}
.warn{background:var(--warn-bg);color:var(--warn-ink);border-radius:12px;padding:12px 16px}
.warn ul{margin:4px 0 0;padding-left:18px}
.phases{display:grid;gap:10px}
details.phase{background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
details.phase>summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:40px minmax(0,1fr) minmax(120px,220px) auto;
gap:14px;align-items:center;padding:14px 16px}
details.phase>summary::-webkit-details-marker{display:none}
.pbar small{display:block;color:var(--muted);font-size:11.5px;margin-top:4px;text-align:right}
.pbar.wide{margin:0 0 18px}.pbar.wide small{text-align:left}
.ms{list-style:none;margin:0;padding:0 16px 14px 70px;display:grid;gap:8px}
.block>.ms,.detail .ms{padding:0}
.ms li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:start;padding:10px 12px;
border-radius:10px;background:var(--soft)}
.ms .id,.detail .id{font-weight:700;font-variant-numeric:tabular-nums}
.ms .what{font-size:12.5px;color:var(--muted)}
.ms .src{font-size:11.5px;color:var(--muted);margin-top:4px}.ms .src b{font-weight:600}
.mstat{display:grid;gap:6px;justify-items:end}.mstat .bar{width:90px}
.note{font-size:11.5px;color:var(--warn-ink);background:var(--warn-bg);border-radius:6px;padding:1px 6px;
display:inline-block;margin-top:4px}
.detail{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow)}
.dhead{display:flex;gap:14px;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
.dhead>div{flex:1;min-width:0}
.criteria{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.criteria li{padding:6px 10px;border-radius:8px;background:var(--soft)}
.criteria li.ok{color:var(--muted)}.criteria li.ok span{color:var(--done)}
.cgroup{font-size:.95rem;margin:14px 0 6px}.cgroup small{color:var(--muted);font-weight:400}
.commits{margin:0;padding-left:18px;display:grid;gap:4px}
.filters{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-bottom:10px}
.filters input{min-width:220px;flex:1 1 220px}
.filters label{display:flex;gap:6px;align-items:center;color:var(--muted);font-size:13px}
.count{margin:0 0 8px}
.tablebox{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow)}
table{border-collapse:collapse;width:100%;min-width:720px}
th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
tbody tr{cursor:pointer}tbody tr:hover{background:var(--soft)}
tr:last-child td{border-bottom:0}
td.acc{min-width:130px}td.acc small{color:var(--muted)}
.actions{display:flex;gap:10px;align-items:center;margin-bottom:12px}
.notice{color:var(--muted);font-size:12.5px}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));gap:14px}
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
.missing{font-size:12px;color:var(--muted);padding:24px 8px;text-align:center;border:1px dashed var(--line);border-radius:8px}
.timeline{display:grid;gap:10px}
.snap{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;display:grid;
grid-template-columns:150px 1fr;gap:14px;align-items:start}
.snap .when{font-weight:650;font-variant-numeric:tabular-nums}
.snap .when small{display:block;color:var(--muted);font-weight:400}
.thumbs{display:flex;flex-wrap:wrap;gap:10px}.thumbs figure{width:150px}
.thumbs .same{opacity:.55}.thumbs .same .chg{color:var(--muted)}
.chg{font-size:10.5px;font-weight:700;color:var(--accent)}
.feed{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.feed li{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 12px;display:flex;
flex-wrap:wrap;gap:4px 10px;align-items:baseline}
.feed li.fresh{animation:fresh 2.5s ease-out}
@keyframes fresh{from{background:var(--warn-bg);border-color:var(--doing)}}
.fgroup{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin-bottom:6px}
.fgroup ul{list-style:none;margin:4px 0 0;padding:0;font-size:12.5px;display:grid;gap:2px}
.fgroup .code{font-weight:700;color:var(--doing)}
.check{display:flex;gap:12px;align-items:center;margin-bottom:6px}
.cstat{font-weight:600}.c-passed .cstat{color:var(--done)}.c-failed .cstat{color:var(--bad)}.c-running .cstat{color:var(--doing)}
pre{margin:0;overflow-x:auto}
pre.out{background:var(--soft);border-radius:8px;padding:10px 12px;font:12px/1.45 ui-monospace,Consolas,monospace;max-height:260px}
.session{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 12px;margin-top:8px}
.session summary{cursor:pointer;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
.session .list{margin-top:8px}.session .list li{padding:4px 10px}
.privacy{font-size:12.5px;color:var(--muted);border-left:3px solid var(--line);padding:2px 10px;margin:0 0 10px}
.guide{display:grid;grid-template-columns:220px minmax(0,1fr);gap:28px;align-items:start}
.toc{position:sticky;top:110px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.toc ol{margin:6px 0 0;padding-left:18px;display:grid;gap:3px;font-size:13px}
.toc a{text-decoration:none}
.gsec{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 20px;margin-bottom:14px}
.gsec p,.gsec ul{margin:0 0 10px}.gsec ul{padding-left:20px}.gsec li{margin-bottom:3px}
.codebox{margin:0 0 12px;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.code-label{font:11.5px ui-monospace,Consolas,monospace;color:var(--muted);background:var(--soft);padding:4px 12px;
border-bottom:1px solid var(--line)}
.codebox pre{padding:10px 12px}
.codebox code{background:none;padding:0;font-size:12.5px;line-height:1.5;white-space:pre;overflow-wrap:normal}
footer{margin:20px 0 40px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:12.5px;
display:flex;flex-wrap:wrap;gap:6px 22px}
footer b{color:var(--ink);font-weight:600}
.dirty{color:var(--doing)}.clean{color:var(--done)}
@media (max-width:900px){.cols,.guide{grid-template-columns:minmax(0,1fr)}.toc{position:static}}
@media (max-width:720px){
.wrap,.bar-row{padding-left:14px;padding-right:14px}
.tools .theme span{display:none}
details.phase>summary{grid-template-columns:36px minmax(0,1fr);row-gap:8px}
details.phase>summary .pbar,details.phase>summary .pill{grid-column:2;justify-self:start}
details.phase>summary .pbar{justify-self:stretch}
.prow{grid-template-columns:32px minmax(0,1fr) auto}.prow .bar,.prow .pct{display:none}
.ms{padding-left:16px}.ms li{grid-template-columns:auto minmax(0,1fr)}.mstat{grid-column:2;justify-items:start}
.snap{grid-template-columns:1fr}.pair{grid-template-columns:1fr}
.thumbs figure{width:calc(50% - 5px)}.dhead{flex-direction:column}.filters input{min-width:0}}
`;
