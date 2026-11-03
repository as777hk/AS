import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

function patchFile(path, replacements) {
  let source = readFileSync(path, "utf8");
  for (const [before, after, label] of replacements) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`Could not apply ${label} patch in ${path}; expected source text was not found.`);
    }
    source = source.replace(before, after);
  }
  writeFileSync(path, source);
}

function replaceOnce(path, before, after, label) {
  const source = readFileSync(path, "utf8");
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Could not apply ${label}: expected source text was not found in ${path}.`);
  writeFileSync(path, source.replace(before, after));
}

// JWT plugin creates externally verifiable API tokens. Do not enable the
// separate session-cookie cache JWT unless cookieCache.strategy is also "jwt".
const authPath = "src/lib/auth.ts";
const authSource = readFileSync(authPath, "utf8");
if (authSource.includes("sessionCookieCache: true")) {
  const authPatched = authSource.replace(/\s*sessionCookieCache:\s*true,\s*/g, "\n    ");
  writeFileSync(authPath, authPatched);
}

// Registration completes by returning the new member to the Login screen.
replaceOnce("src/app/register/page.tsx",
  'router.push("/");router.refresh()',
  'router.push("/login");router.refresh()',
  "registration success redirect");

// Footer contains all five assignment categories and a working Terms link.
patchFile("src/components/footer.tsx", [
  [
    '<Link href="/studios?category=Photo%20Studio">Photo studios</Link><Link href="/studios?category=Podcast%20Room">Podcast rooms</Link><Link href="/studios?category=Music%20Suite">Music suites</Link>',
    '<Link href="/studios?category=Photo%20Studio">Photo studios</Link><Link href="/studios?category=Sound%20Stage">Sound stages</Link><Link href="/studios?category=Podcast%20Room">Podcast rooms</Link><Link href="/studios?category=Music%20Suite">Music suites</Link><Link href="/studios?category=Art%20Workshop">Art workshops</Link>',
    "complete footer categories",
  ],
  ['<span>Made for the makers.</span>', '<span><Link href="/terms">Terms of Use</Link> · Made for the makers.</span>', "footer Terms link"],
]);

// Custom 404 illustration.
patchFile("src/app/not-found.tsx", [[
  '<main className="not-found"><span className="eyebrow">404 · LOST IN THE STUDIO</span>',
  '<main className="not-found"><svg aria-hidden="true" viewBox="0 0 240 150" width="220" height="138" className="not-found-art"><rect x="38" y="16" width="164" height="108" rx="12" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M70 93 103 58l23 23 19-18 27 30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="86" cy="43" r="8" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M18 133h204" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span className="eyebrow">404 · LOST IN THE STUDIO</span>',
  "404 illustration",
]]);

// Keep the Host Guarantee area informative without advertising insurance,
// identity checks, or 24/7 staffed support that the current marketplace does not provide.
const supportFile = "src/app/page.tsx";
replaceOnce(supportFile,
  "StudioSpace brings independent hosts and ambitious creators together with clear listing details, transparent booking requests and practical guidance. We explain expectations up front rather than promising insurance or 24/7 services the platform does not provide.",
  "StudioSpace makes host responsibilities, equipment details, booking terms and account-linked profile information visible before a creator sends a request. Hosts and creators should agree on applicable liability coverage and safety requirements before a session.",
  "Host Guarantee responsibility statement");
replaceOnce(supportFile,
  '<div className="support-points"><div><ShieldCheck/><span><strong>Transparent booking details</strong><small>Rates, deposits, capacity and time windows are visible before a request is sent.</small></span></div><div><BadgeCheck/><span><strong>Host-managed listings</strong><small>Hosts control their studio information and manage booking requests directly.</small></span></div><div><Headphones/><span><strong>Clear creator guidance</strong><small>Helpful booking status updates and straightforward next steps for each side.</small></span></div></div>',
  '<div className="support-points"><div><ShieldCheck/><span><strong>Liability & coverage guidance</strong><small>Hosts can disclose applicable property coverage, deposits and responsibilities; insurance arrangements remain between the parties.</small></span></div><div><BadgeCheck/><span><strong>Transparent host profiles</strong><small>Account-linked host names and contact details are visible. A profile is not represented as an independent background check.</small></span></div><div><Headphones/><span><strong>Equipment safety information</strong><small>Hosts can describe equipment, house rules, safe-use instructions and access requirements before confirmation.</small></span></div><div><CalendarCheck/><span><strong>24/7 self-service access</strong><small>Listings, booking records and status updates remain available online at any time; this is not a promise of round-the-clock staffed support.</small></span></div></div>',
  "Host Guarantee and Creator Support requirements");

// Add availability lookup to the frontend API client.
replaceOnce("src/lib/api.ts",
  '  reviews: (id: string) => request<{ data: Review[] }>(`/studios/${id}/reviews`),',
  '  reviews: (id: string) => request<{ data: Review[] }>(`/studios/${id}/reviews`),\n  availability: (id: string, date: string) => request<{ data: Array<{ startTime: string; endTime: string }> }>(`/studios/${id}/availability?date=${encodeURIComponent(date)}`),',
  "availability API client");

// Show the current saved state after opening/reloading a studio detail page.
replaceOnce('src/app/studios/[id]/page.tsx',
  'useEffect(()=>{api.studio(id).then(r=>setStudio(r.data)).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));api.reviews(id).then(r=>setReviews(r.data||[])).catch(()=>setReviews([]))},[id]);',
  'useEffect(()=>{api.studio(id).then(r=>setStudio(r.data)).catch(e=>toast.error(e.message)).finally(()=>setLoading(false));api.reviews(id).then(r=>setReviews(r.data||[])).catch(()=>setReviews([]));if(session?.user?.id)api.wishlist().then(r=>setWish((r.data||[]).includes(id))).catch(()=>undefined)},[id,session?.user?.id]);',
  "persisted wishlist state");
replaceOnce('src/app/studios/[id]/page.tsx',
  '<button className="btn btn-outline" onClick={save}><Heart size={17}/> Save space</button>',
  '<button className="btn btn-outline" onClick={save}><Heart size={17} fill={wish?"currentColor":"none"}/> {wish?"Saved space":"Save space"}</button>',
  "saved studio visual state");

// Display confirmed time windows in the booking modal and prevent a known overlap
// before submission. Server-side collision prevention remains authoritative.
replaceOnce("src/components/booking-modal.tsx",
  'import { useMemo, useState } from "react";',
  'import { useEffect, useMemo, useState } from "react";',
  "booking modal availability effect");
replaceOnce("src/components/booking-modal.tsx",
  'const [loading,setLoading]=useState(false);const router=useRouter();',
  'const [loading,setLoading]=useState(false);const [occupied,setOccupied]=useState<Array<{startTime:string;endTime:string}>>([]);const [availabilityLoading,setAvailabilityLoading]=useState(false);const router=useRouter();',
  "booking modal availability state");
replaceOnce("src/components/booking-modal.tsx",
  'const total=hours*studio.hourlyRate+studio.securityDeposit;async function submit',
  'const total=hours*studio.hourlyRate+studio.securityDeposit;const hasConflict=occupied.some(slot=>start<slot.endTime&&end>slot.startTime);useEffect(()=>{if(!date){setOccupied([]);return}let active=true;setAvailabilityLoading(true);api.availability(studio._id,date).then(r=>{if(active)setOccupied(r.data||[])}).catch(()=>{if(active)setOccupied([])}).finally(()=>{if(active)setAvailabilityLoading(false)});return()=>{active=false}},[studio._id,date]);async function submit',
  "load confirmed booking windows");
replaceOnce("src/components/booking-modal.tsx",
  'if(!date||hours<=0){toast.error("Choose a valid date and time window.");return}setLoading(true);',
  'if(!date||hours<=0){toast.error("Choose a valid date and time window.");return}if(hasConflict){toast.error("That time overlaps an already confirmed booking. Choose another window.");return}setLoading(true);',
  "prevent known confirmed overlap");
replaceOnce("src/components/booking-modal.tsx",
  '<div className="price-breakdown">',
  '<div className="availability-note" role="status">{availabilityLoading?"Checking confirmed reservations…":occupied.length?<>Already confirmed: {occupied.map(slot=>slot.startTime+"–"+slot.endTime).join(", ")}</>:"No confirmed reservations for this date yet."}</div>{hasConflict&&<p className="form-error" role="alert">The selected time overlaps a confirmed reservation.</p>}<div className="price-breakdown">',
  "show availability in booking modal");
replaceOnce("src/components/booking-modal.tsx",
  '<button disabled={loading||hours<=0} className="btn btn-dark btn-full">',
  '<button disabled={loading||hours<=0||hasConflict||availabilityLoading} className="btn btn-dark btn-full">',
  "disable conflicting booking submit");

const termsPath = "src/app/terms/page.tsx";
if (!existsSync(termsPath)) {
  mkdirSync("src/app/terms", { recursive: true });
  writeFileSync(termsPath, `import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function TermsPage() {
  return (
    <SiteShell>
      <section className="page-hero"><div className="container">
        <span className="eyebrow">THE STUDIOSPACE AGREEMENT</span>
        <h1>Terms of <em>use.</em></h1><p>Clear expectations help every creative session start well.</p>
      </div></section>
      <section className="container section"><div className="content-copy">
        <h2>1. Marketplace role</h2><p>StudioSpace helps independent hosts list creative spaces and helps creators discover spaces and send booking requests. A request is not confirmed until the host accepts it in the platform.</p>
        <h2>2. Accurate listings</h2><p>Hosts are responsible for accurate descriptions, rates, deposits, capacity, access instructions, equipment details and current availability. Creators should review the listing and ask the host about any important requirement before booking.</p>
        <h2>3. Safety and responsibility</h2><p>Hosts must provide safe access and explain relevant house rules and equipment instructions. Hosts and creators are responsible for agreeing on appropriate care, permitted use, damage reporting and any insurance or liability arrangements that apply to their session.</p>
        <h2>4. Bookings and cancellations</h2><p>Booking totals are estimates based on the displayed hourly rate and security deposit. A pending request may be cancelled by its creator. Confirmed sessions are subject to the agreed time window and the host's cancellation terms.</p>
        <h2>5. Account use</h2><p>Users must provide accurate account information, protect their sign-in credentials and use the platform respectfully. Hosts may manage only their own studio listings and booking requests.</p>
        <h2>6. Contact and updates</h2><p>These terms describe the current assignment marketplace experience and may be updated as platform features evolve. Review listing details and booking status before travelling to a studio.</p>
        <p><Link href="/studios" className="text-link">Explore available studios</Link></p>
      </div></section>
    </SiteShell>
  );
}
`);
}
replaceOnce("src/components/studio-card.tsx", "<img src={studio.imageUrl || \"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900\"} alt={studio.title}/>", "<img src={studio.imageUrl || \"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900\"} alt={studio.title} loading=\"lazy\" decoding=\"async\"/>", "Improve studio card image loading");
replaceOnce("src/components/studio-card.tsx", "<button className={liked?\"save-button saved\":\"save-button\"} aria-label=\"Save studio\" onClick={toggle}>", "<button className={liked?\"save-button saved\":\"save-button\"} aria-label={liked?\"Remove saved studio\":\"Save studio\"} aria-pressed={liked} onClick={toggle}>", "Expose wishlist button state accessibly");
replaceOnce("src/app/studios/studios-client.tsx", "<input placeholder=\"Search by name or location\" value={q} onChange={e=>setQ(e.target.value)}/>", "<input aria-label=\"Search studios by name or location\" placeholder=\"Search by name or location\" value={q} onChange={e=>setQ(e.target.value)}/>", "Label studio search field");
replaceOnce("src/app/studios/studios-client.tsx", "<select value={category} onChange={e=>choose(e.target.value)}>", "<select aria-label=\"Filter studios by category\" value={category} onChange={e=>choose(e.target.value)}>", "Label category filter");
replaceOnce("src/app/studios/[id]/page.tsx", "<img className=\"detail-gallery-image\" src={img} alt={`${studio.title} view ${i+1}`}/>", "<img className=\"detail-gallery-image\" src={img} alt={`${studio.title} view ${i+1}`} loading=\"lazy\" decoding=\"async\"/>", "Optimize studio detail gallery images");
replaceOnce("src/app/register/page.tsx", "<input required value={name} onChange={e=>setName(e.target.value)} placeholder=\"Your name\"/>", "<input required autoComplete=\"name\" maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder=\"Your name\"/>", "Add name autocomplete and length validation");
replaceOnce("src/app/register/page.tsx", "<input required type=\"email\" value={email} onChange={e=>setEmail(e.target.value)} placeholder=\"you@example.com\"/>", "<input required type=\"email\" autoComplete=\"email\" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder=\"you@example.com\"/>", "Improve registration email validation");
console.log("StudioSpace frontend assignment patches applied.");
