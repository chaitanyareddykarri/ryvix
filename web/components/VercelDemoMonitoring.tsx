"use client";
import {useState} from 'react';
export default function VercelDemoMonitoring(){
  const [sample,setSample]=useState({requests:1240,latency:142,errors:0.3});
  return <section aria-label="Vercel simulated monitoring" style={{padding:20,marginBottom:24,border:'1px solid #64748b',borderRadius:12}}>
    <h2>Vercel monitoring demo <small>? Simulated data</small></h2>
    <p>Example metrics for ryvix.co.in. These are not measurements from Vercel and do not indicate real service health.</p>
    <div style={{display:'flex',gap:24,flexWrap:'wrap',margin:'16px 0'}}>
      <span>Requests / hour: <strong>{sample.requests}</strong></span>
      <span>Response p95: <strong>{sample.latency} ms</strong></span>
      <span>Error rate: <strong>{sample.errors}%</strong></span>
    </div>
    <button onClick={()=>setSample({requests:1000+Math.floor(Math.random()*500),latency:100+Math.floor(Math.random()*160),errors:Number((Math.random()*1.5).toFixed(1))})}>Generate demo sample</button>
    <p>Real audit and security records remain separate below.</p>
  </section>;
}
