"use client";

import Link from "next/link";
import {useEffect, useState} from "react";

const initialCode = `<style>body{font-family:system-ui;background:#102034;color:#fff;padding:32px}button{background:#38bdf8;border:0;padding:12px;border-radius:8px}</style>
<h1>My demo website</h1>
<p>Edit this HTML to update the preview.</p>
<button onclick="this.textContent='Hello from the demo!'">Try me</button>`;
const scenarios = {
  normal: {name: "Normal sample", cpu: 18, memory: 42, disk: 31, event: "No security event in this sample. This is not a security scan."},
  load: {name: "High-load sample", cpu: 92, memory: 86, disk: 31, event: "Simulated CPU and memory pressure. A real server would require fresh telemetry and diagnosis."},
  security: {name: "Security-event sample", cpu: 34, memory: 48, disk: 31, event: "Simulated repeated failed SSH logins. No real attack was detected and no firewall rule was changed."},
};
const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";

export default function ServerDemoPage() {
  const [connected, setConnected] = useState(false);
  const [scenario, setScenario] = useState<keyof typeof scenarios>("normal");
  const [code, setCode] = useState(initialCode);
  const [preview, setPreview] = useState(initialCode);
  useEffect(() => { const timer = setTimeout(() => setPreview(code), 300); return () => clearTimeout(timer); }, [code]);
  const sample = scenarios[scenario];
  return <main style={{maxWidth:1100,margin:"0 auto",padding:"2rem 1rem"}}>
    <Link href="/servers">Back to real servers</Link>
    <h1>Server and coding demo</h1>
    <p role="note"><strong>DEMO — sample data only.</strong> This page does not connect GitHub, enroll a server, run a security scan or deploy code. Changes stay in this page and reset when you leave.</p>
    <section style={{padding:"1rem",border:"1px solid #475569",borderRadius:12,marginBlock:20}}>
      <h2>1. Try a repository connection</h2>
      <p>Sample repository: <code>demo/static-website</code> · Branch: <code>main</code></p>
      <button className="btn-primary" onClick={() => setConnected(value => !value)}>{connected ? "Disconnect demo repository" : "Connect demo repository"}</button>
      <p role="status">{connected ? "Demo repository linked to demo-web-01 (simulated)." : "Demo repository not connected."}</p>
      <p>For a real repository, use <Link href="/dashboard">Connect GitHub on the dashboard</Link>. Enroll its server separately in the same project/environment to collect actual telemetry.</p>
    </section>
    <section aria-label="Sample server telemetry" style={{padding:"1rem",border:"1px solid #475569",borderRadius:12}}>
      <h2>2. Inspect a sample server</h2>
      <p><strong>demo-web-01</strong> · Ubuntu · Mock server · No agent connected</p>
      <label>Demo scenario <select value={scenario} onChange={event => setScenario(event.target.value as keyof typeof scenarios)}>
        {Object.entries(scenarios).map(([key,value]) => <option key={key} value={key}>{value.name}</option>)}
      </select></label>
      <dl style={{display:"flex",gap:24,flexWrap:"wrap"}}>{([["CPU",sample.cpu],["Memory",sample.memory],["Disk",sample.disk]] as const).map(([label,value]) => <div key={label}><dt>{label} (sample)</dt><dd>{value}%</dd></div>)}</dl>
      <p role="status">{sample.event}</p>
      <p>Sample log: <code>demo-web-01 nginx: example request completed</code></p>
      <Link href="/servers">Connect a real server</Link>
    </section>
    <section style={{marginTop:24}}>
      <h2>3. Edit code and see the preview change</h2>
      <p>This isolated browser demo accepts HTML, inline CSS and JavaScript. Network requests are blocked; it does not build a framework or write to your repository.</p>
      <label htmlFor="demo-code">Demo page source</label>
      <textarea id="demo-code" value={code} maxLength={20000} spellCheck={false} onChange={event => setCode(event.target.value)} style={{display:"block",width:"100%",minHeight:200,fontFamily:"monospace",marginBlock:12}} />
      <button className="btn-secondary" onClick={() => setCode(initialCode)}>Reset demo code</button>
      <p role="status">{code === preview ? "Demo preview up to date" : "Updating demo preview…"}</p>
      <iframe title="Editable demo preview" sandbox="allow-scripts" referrerPolicy="no-referrer"
        srcDoc={`<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="${policy}"></head><body>${preview}</body></html>`}
        style={{width:"100%",height:360,border:"1px solid #475569",borderRadius:12,background:"white"}} />
    </section>
  </main>;
}
