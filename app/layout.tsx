
import "./globals.css"; import Link from "next/link"; import CookieConsent from "@/components/CookieConsent";
export const metadata={title:"Lisbon 360 – Events & Eats",description:"Find and share the best events in Lisbon.",metadataBase:new URL("https://example.com")};
export default function RootLayout({children}:{children:React.ReactNode}){
  const GA_ID=process.env.NEXT_PUBLIC_GA_ID;
  return (<html lang="en"><head>
    <script dangerouslySetInnerHTML={{__html:`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag('consent','default',{'ad_user_data':'denied','ad_personalization':'denied','ad_storage':'denied','analytics_storage':'denied'});`}}/>
    {GA_ID && (<><script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}></script><script dangerouslySetInnerHTML={{__html:`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);} gtag('js',new Date()); gtag('config','${GA_ID}');`}}/></>)}
  </head><body>
    <header className="card" style={{borderRadius:0}}>
      <nav className="container" style={{display:'flex',gap:'1rem'}}>
        <Link href="/">Lisbon 360</Link><Link href="/events">Events</Link><Link href="/submit">Submit</Link><Link href="/blog">Bloggers</Link><Link href="/advertise">Advertise</Link>
      </nav>
    </header>
    <main className="container" style={{paddingTop:'1rem'}}>{children}</main>
    <footer className="container" style={{padding:'2rem 0',color:'#666'}}>© {new Date().getFullYear()} Lisbon 360 · <Link href="/privacy">Privacy</Link> · <Link href="/about">About</Link></footer>
    <CookieConsent/>
  </body></html>);
}