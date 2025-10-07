
'use client';
import { useEffect, useState } from 'react';
declare global { interface Window { gtag:any } }
export default function CookieConsent(){
  const [v,setV]=useState(false);
  useEffect(()=>{ if(!localStorage.getItem('cookie-consent')) setV(true); },[]);
  const accept=()=>{localStorage.setItem('cookie-consent','accepted'); setV(false); if(window.gtag) window.gtag('consent','update',{'ad_user_data':'granted','ad_personalization':'granted','ad_storage':'granted','analytics_storage':'granted'});};
  const decline=()=>{localStorage.setItem('cookie-consent','declined'); setV(false); if(window.gtag) window.gtag('consent','update',{'ad_user_data':'denied','ad_personalization':'denied','ad_storage':'denied','analytics_storage':'denied'});};
  if(!v) return null;
  return (<div style={{position:'fixed',left:'50%',bottom:16,transform:'translateX(-50%)',zIndex:9999}}><div className='card'><div>We use cookies for analytics/ads. Accept?</div><div style={{display:'flex',gap:8,marginTop:8}}><button onClick={accept} className='btn btn-primary'>Accept</button><button onClick={decline} className='btn'>Decline</button></div></div></div>);
}