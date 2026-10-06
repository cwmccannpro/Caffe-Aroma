import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, DM_Mono, Kaushan_Script } from "next/font/google";
import "./globals.css";
import TimeDriver from "@/components/system/TimeDriver";
import { business } from "@data/business";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  display: "swap",
});
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });
const script = Kaushan_Script({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://caffearomabuffalo.com"),
  title: {
    default: "Caffe Aroma | Coffee by day, cocktails by night | Elmwood Village, Buffalo",
    template: "%s | Caffe Aroma, Buffalo",
  },
  description: business.description,
  openGraph: {
    title: "Caffe Aroma | Elmwood Village, Buffalo",
    description: business.tagline + " Order ahead from 6 AM to midnight.",
    type: "website",
    locale: "en_US",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0a13",
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint so a visitor at 10 PM never sees a daytime flash.
// Also picks the first-paint still of the storefront (the hero is outside) and preloads it. Mirrors sampleTod().night in src/lib/timeOfDay.ts.
const NIGHT_BOOT = `(function(){document.documentElement.classList.add('js');try{var p=new Intl.DateTimeFormat('en-US',{timeZone:'${business.timezone}',hour:'numeric',minute:'numeric',hour12:false}).formatToParts(new Date());var h=0,m=0;p.forEach(function(q){if(q.type==='hour')h=+q.value%24;if(q.type==='minute')m=+q.value});var x=h+m/60;if(x<6)x=24;var P=[6,9,12,15,18,21],pi=0;P.forEach(function(v,i){if(Math.abs(v-x)<Math.abs(P[pi]-x))pi=i});document.documentElement.setAttribute('data-poster',String(pi));document.documentElement.setAttribute('data-scene','ext');var l=document.createElement('link');l.rel='preload';l.as='image';l.type='image/webp';l.href='/posters/ext-'+['06','09','12','15','18','21'][pi]+'.webp';document.head.appendChild(l);function s(a,b,v){var t=Math.min(1,Math.max(0,(v-a)/(b-a)));return t*t*(3-2*t)}var n=Math.max(s(18.5,18.95,x),1-s(6,7.3,x));document.documentElement.style.setProperty('--night',n.toFixed(3))}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${hanken.variable} ${dmMono.variable} ${script.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NIGHT_BOOT }} />
      </head>
      <body>
        <TimeDriver />
        {children}
      </body>
    </html>
  );
}
