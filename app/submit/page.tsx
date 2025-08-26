
'use client'; import { useState } from 'react';
type FormState={title:string;description:string;starts_at:string;ends_at:string;location_name:string;address:string;ticket_url:string;image_url:string;organizer_email:string};
export default function Submit(){const [s,setS]=useState<FormState>({title:'',description:'',starts_at:'',ends_at:'',location_name:'',address:'',ticket_url:'',image_url:'',organizer_email:''}); const [msg,setMsg]=useState<string|null>(null);
async function onSubmit(e:React.FormEvent){e.preventDefault(); setMsg('Submitting...'); const r=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)}); const j=await r.json(); setMsg(r.ok?'Thanks! Pending review.':(j.error||'Something went wrong.')); if(r.ok) setS({title:'',description:'',starts_at:'',ends_at:'',location_name:'',address:'',ticket_url:'',image_url:'',organizer_email:''}); }
function u<K extends keyof FormState>(k:K,v:FormState[K]){setS(p=>({...p,[k]:v}))}
return(<div className='container'><h1>Submit an Event</h1><form onSubmit={onSubmit} className='card' style={{display:'grid',gap:12}}>
<label>Title*<input required className='btn' style={{borderColor:'#ddd'}} value={s.title} onChange={e=>u('title',e.target.value)}/></label>
<label>Description*<textarea required className='btn' style={{borderColor:'#ddd',height:120}} value={s.description} onChange={e=>u('description',e.target.value)}/></label>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<label>Starts*<input type='datetime-local' required className='btn' style={{borderColor:'#ddd'}} value={s.starts_at} onChange={e=>u('starts_at',e.target.value)}/></label>
<label>Ends<input type='datetime-local' className='btn' style={{borderColor:'#ddd'}} value={s.ends_at} onChange={e=>u('ends_at',e.target.value)}/></label>
</div>
<label>Location*<input required className='btn' style={{borderColor:'#ddd'}} value={s.location_name} onChange={e=>u('location_name',e.target.value)}/></label>
<label>Address<input className='btn' style={{borderColor:'#ddd'}} value={s.address} onChange={e=>u('address',e.target.value)}/></label>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<label>Tickets URL<input type='url' className='btn' style={{borderColor:'#ddd'}} value={s.ticket_url} onChange={e=>u('ticket_url',e.target.value)}/></label>
<label>Image URL<input type='url' className='btn' style={{borderColor:'#ddd'}} value={s.image_url} onChange={e=>u('image_url',e.target.value)}/></label>
</div>
<label>Organizer Email*<input type='email' required className='btn' style={{borderColor:'#ddd'}} value={s.organizer_email} onChange={e=>u('organizer_email',e.target.value)}/></label>
<button className='btn btn-primary'>Submit for review</button>{msg && <div>{msg}</div>}
</form></div>) }