
import Link from "next/link";
export type EventRecord={id:string;title:string;description:string|null;starts_at:string;ends_at:string|null;category:string|null;location_name:string|null;city:string|null;address:string|null;ticket_url:string|null;image_url:string|null};
export default function EventCard({evt}:{evt:EventRecord}){
  const jsonLd={"@context":"https://schema.org","@type":"Event","name":evt.title,"startDate":new Date(evt.starts_at).toISOString(),"location":{"@type":"Place","name":evt.location_name||"Lisbon"}};
  return (<article className="card">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd)}}/>
    <h3 style={{fontWeight:600}}>{evt.title}</h3>
    <div style={{color:"#666"}}>{new Date(evt.starts_at).toLocaleString()} {evt.ends_at?("– "+new Date(evt.ends_at).toLocaleString()):""}</div>
    {evt.description && <p>{evt.description}</p>}
    {evt.ticket_url && <Link href={evt.ticket_url} target="_blank" className="btn btn-primary">Tickets / Info</Link>}
  </article>);
}