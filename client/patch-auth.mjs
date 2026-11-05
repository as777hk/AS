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
replaceOnce("src/app/register/page.tsx", "<input required type=\"password\" value={password} onChange={e=>setPassword(e.target.value)} placeholder=\"Create a secure password\"/>", "<input required type=\"password\" autoComplete=\"new-password\" minLength={6} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder=\"Create a secure password\"/>", "Add registration password input constraints");
replaceOnce("src/app/add-studio/page.tsx", "<input required type=\"url\" value={data.imageUrl} onChange={e=>set(\"imageUrl\",e.target.value)} placeholder=\"Paste an ImgBB or image URL\"/>", "<input required type=\"url\" maxLength={2048} aria-label=\"Studio cover image URL\" value={data.imageUrl} onChange={e=>set(\"imageUrl\",e.target.value)} placeholder=\"Paste an ImgBB or image URL\"/>", "Validate and label cover image URL");
replaceOnce("src/app/add-studio/page.tsx", "<textarea required rows={5} value={data.overview} onChange={e=>set(\"overview\",e.target.value)} placeholder=\"Describe the space, ideal uses, access and anything creators should know.\"/>", "<textarea required rows={5} minLength={30} maxLength={5000} value={data.overview} onChange={e=>set(\"overview\",e.target.value)} placeholder=\"Describe the space, ideal uses, access and anything creators should know.\"/>", "Constrain studio overview length");
replaceOnce("src/components/booking-modal.tsx", "<section className=\"modal-card\">", "<section className=\"modal-card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"booking-modal-title\">", "Make booking modal accessible as a dialog");
replaceOnce("src/components/booking-modal.tsx", "<h2>Book {studio.title}</h2>", "<h2 id=\"booking-modal-title\">Book {studio.title}</h2>", "Connect booking modal accessible title");
replaceOnce("src/app/my-bookings/page.tsx", "<div className=\"modal-backdrop\"><div className=\"modal-card\"><span className=\"eyebrow\">CANCEL BOOKING</span>", "<div className=\"modal-backdrop\"><div className=\"modal-card\" role=\"alertdialog\" aria-modal=\"true\" aria-labelledby=\"cancel-booking-title\"><span className=\"eyebrow\">CANCEL BOOKING</span>", "Add accessible cancel booking confirmation dialog");
replaceOnce("src/app/my-bookings/page.tsx", "<h2>Are you sure?</h2><p className=\"muted\">Cancel your pending request", "<h2 id=\"cancel-booking-title\">Are you sure?</h2><p className=\"muted\">Cancel your pending request", "Label booking cancellation confirmation");
replaceOnce("src/app/my-listings/page.tsx", "<div className=\"modal-backdrop\"><div className=\"modal-card\"><span className=\"eyebrow\">CONFIRM DELETION</span>", "<div className=\"modal-backdrop\"><div className=\"modal-card\" role=\"alertdialog\" aria-modal=\"true\" aria-labelledby=\"delete-listing-title\"><span className=\"eyebrow\">CONFIRM DELETION</span>", "Add accessible listing deletion confirmation");
replaceOnce("src/app/my-listings/page.tsx", "<h2>Delete this listing?</h2><p className=\"muted\">This will permanently remove", "<h2 id=\"delete-listing-title\">Delete this listing?</h2><p className=\"muted\">This will permanently remove", "Label listing deletion confirmation");
replaceOnce("src/components/footer.tsx", "<input type=\"email\" required placeholder=\"Your email address\" value={email} onChange={e=>setEmail(e.target.value)}/>", "<input type=\"email\" required autoComplete=\"email\" maxLength={254} aria-label=\"Newsletter email address\" placeholder=\"Your email address\" value={email} onChange={e=>setEmail(e.target.value)}/>", "Improve newsletter form accessibility and validation");
replaceOnce("src/app/my-listings/page.tsx", "<img src={s.imageUrl} alt=\"\"/>", "<img src={s.imageUrl} alt={s.title} loading=\"lazy\" decoding=\"async\"/>", "Add semantic alt text and lazy loading to listing table");
replaceOnce("src/app/my-bookings/page.tsx", "<span className={`status status-${b.status.toLowerCase()}`}>{b.status}</span>", "<span role=\"status\" aria-label={`Booking status: ${b.status}`} className={`status status-${b.status.toLowerCase()}`}>{b.status}</span>", "Announce booking status to assistive technology");
const packageJsonPath = "package.json";
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
if (packageJson.dependencies?.jspdf !== "4.2.1") {
  packageJson.dependencies = { ...packageJson.dependencies, jspdf: "4.2.1" };
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
}

replaceOnce("src/app/add-studio/page.tsx", ")} as any);toast.success(", ")});toast.success(", "Remove unsafe add-studio any cast");
replaceOnce("src/app/not-found.tsx", "This page isn't ", "This page isn&apos;t ", "Escape apostrophe on 404 page");
replaceOnce("src/app/page.tsx", "someone's next big idea.", "someone&apos;s next big idea.", "Escape apostrophe on homepage");
replaceOnce("src/app/studios/[id]/page.tsx", "<h2>What's included</h2>", "<h2>What&apos;s included</h2>", "Escape apostrophe on studio details");
writeFileSync("src/app/saved/page.tsx", "\"use client\";\n\nimport { useEffect, useState } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport { toast } from \"sonner\";\nimport { SiteShell } from \"@/components/site-shell\";\nimport { authClient } from \"@/lib/auth-client\";\nimport { api, Studio } from \"@/lib/api\";\nimport { StudioCard } from \"@/components/studio-card\";\nimport { EmptyState } from \"@/components/empty-state\";\n\nexport default function SavedPage() {\n  const router = useRouter();\n  const { data: session, isPending } = authClient.useSession();\n  const [items, setItems] = useState<Studio[]>([]);\n  const [loaded, setLoaded] = useState(false);\n\n  useEffect(() => {\n    const userId = session?.user?.id;\n    if (isPending || !userId) return;\n\n    let active = true;\n    api\n      .wishlist()\n      .then(({ data: ids }) =>\n        Promise.all(ids.map((id) => api.studio(id).then((result) => result.data).catch(() => null))),\n      )\n      .then((result) => {\n        if (active) {\n          setItems(result.filter((studio): studio is Studio => studio !== null));\n          setLoaded(true);\n        }\n      })\n      .catch((error: unknown) => {\n        if (active) {\n          toast.error(error instanceof Error ? error.message : \"Could not load saved studios\");\n          setLoaded(true);\n        }\n      });\n\n    return () => {\n      active = false;\n    };\n  }, [isPending, session?.user?.id]);\n\n  useEffect(() => {\n    if (!isPending && !session) router.replace(\"/login?callbackUrl=%2Fsaved\");\n  }, [isPending, session, router]);\n\n  const busy = isPending || (!!session && !loaded);\n\n  return (\n    <SiteShell>\n      <section className=\"page-hero\">\n        <div className=\"container\">\n          <span className=\"eyebrow\">YOUR SHORTLIST</span>\n          <h1>Saved <em>spaces.</em></h1>\n          <p>A personal collection of places worth coming back to.</p>\n        </div>\n      </section>\n      <section className=\"container section\">\n        {busy ? (\n          <div className=\"studio-grid\">\n            {[1, 2, 3].map((item) => <div className=\"skeleton-card\" key={item} />)}\n          </div>\n        ) : items.length ? (\n          <div className=\"studio-grid\">\n            {items.map((studio) => (\n              <StudioCard key={studio._id} studio={studio} saved onSave={() => {\n                setItems((current) => current.filter((item) => item._id !== studio._id));\n              }} />\n            ))}\n          </div>\n        ) : (\n          <EmptyState\n            title=\"Keep the good ones close\"\n            description=\"Tap the heart on a studio card to save it for later.\"\n            href=\"/studios\"\n            cta=\"Explore studios\"\n          />\n        )}\n      </section>\n    </SiteShell>\n  );\n}\n");
writeFileSync("src/app/studios/studios-client.tsx", "\"use client\";\n\nimport { useEffect, useState } from \"react\";\nimport { useSearchParams, useRouter } from \"next/navigation\";\nimport { Search, SlidersHorizontal } from \"lucide-react\";\nimport { SiteShell } from \"@/components/site-shell\";\nimport { StudioCard } from \"@/components/studio-card\";\nimport { EmptyState } from \"@/components/empty-state\";\nimport { api, Studio, categories, categoryLabels } from \"@/lib/api\";\n\nexport default function StudiosPage() {\n  const params = useSearchParams();\n  const router = useRouter();\n  const category = params.get(\"category\") || \"\";\n  const [query, setQuery] = useState(\"\");\n  const [studios, setStudios] = useState<Studio[]>([]);\n  const [loadedKey, setLoadedKey] = useState(\"\");\n  const requestKey = category + \"\\u0000\" + query;\n  const loading = loadedKey !== requestKey;\n\n  useEffect(() => {\n    let active = true;\n    const search = new URLSearchParams();\n    if (category) search.set(\"category\", category);\n    if (query.trim()) search.set(\"q\", query.trim());\n\n    api\n      .studios(search.size ? \"?\" + search.toString() : \"\")\n      .then((result) => {\n        if (active) {\n          setStudios(result.data || []);\n          setLoadedKey(requestKey);\n        }\n      })\n      .catch(() => {\n        if (active) {\n          setStudios([]);\n          setLoadedKey(requestKey);\n        }\n      });\n\n    return () => {\n      active = false;\n    };\n  }, [category, query, requestKey]);\n\n  function choose(value: string) {\n    const next = new URLSearchParams(params.toString());\n    if (value) next.set(\"category\", value);\n    else next.delete(\"category\");\n    router.replace(\"/studios\" + (next.size ? \"?\" + next.toString() : \"\"), { scroll: false });\n  }\n\n  return (\n    <SiteShell>\n      <section className=\"page-hero\">\n        <div className=\"container\">\n          <span className=\"eyebrow\">THE STUDIO DIRECTORY</span>\n          <h1>Find your <em>creative space.</em></h1>\n          <p>Distinctive rooms, ready for the work only you can make.</p>\n        </div>\n      </section>\n      <section className=\"container section\">\n        <div className=\"filter-bar\">\n          <div className=\"search-field\">\n            <Search />\n            <input\n              aria-label=\"Search studios by name or location\"\n              placeholder=\"Search by name or location\"\n              value={query}\n              onChange={(event) => setQuery(event.target.value)}\n            />\n          </div>\n          <div className=\"select-filter\">\n            <SlidersHorizontal />\n            <select aria-label=\"Filter studios by category\" value={category} onChange={(event) => choose(event.target.value)}>\n              <option value=\"\">All categories</option>\n              {categories.map((item) => (\n                <option key={item} value={item}>{categoryLabels[item] || item}</option>\n              ))}\n            </select>\n          </div>\n        </div>\n        {loading ? (\n          <div className=\"studio-grid\">\n            {[1, 2, 3, 4, 5, 6].map((item) => <div className=\"skeleton-card\" key={item} />)}\n          </div>\n        ) : studios.length ? (\n          <div className=\"studio-grid\">\n            {studios.map((studio) => <StudioCard key={studio._id} studio={studio} />)}\n          </div>\n        ) : (\n          <EmptyState\n            title=\"No studios match those filters\"\n            description=\"Try a different category or a broader location search.\"\n            href=\"/studios\"\n            cta=\"Reset filters\"\n          />\n        )}\n      </section>\n    </SiteShell>\n  );\n}\n");
writeFileSync("src/components/booking-modal.tsx", "\"use client\";\n\nimport { useEffect, useMemo, useState } from \"react\";\nimport { X, CalendarDays, Clock3 } from \"lucide-react\";\nimport { Studio, api } from \"@/lib/api\";\nimport { toast } from \"sonner\";\nimport { useRouter } from \"next/navigation\";\n\ntype OccupiedSlot = { startTime: string; endTime: string };\n\nexport function BookingModal({ studio, onClose }: { studio: Studio; onClose: () => void }) {\n  const [date, setDate] = useState(\"\");\n  const [start, setStart] = useState(\"10:00\");\n  const [end, setEnd] = useState(\"12:00\");\n  const [loading, setLoading] = useState(false);\n  const [availability, setAvailability] = useState<{ date: string; slots: OccupiedSlot[]; failed?: boolean } | null>(null);\n  const router = useRouter();\n\n  const occupied = availability?.date === date ? availability.slots : [];\n  const availabilityLoading = Boolean(date) && availability?.date !== date;\n  const availabilityFailed = availability?.date === date && availability.failed === true;\n  const hours = useMemo(() => {\n    const [startHour, startMinute] = start.split(\":\").map(Number);\n    const [endHour, endMinute] = end.split(\":\").map(Number);\n    return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);\n  }, [start, end]);\n  const total = hours * studio.hourlyRate + studio.securityDeposit;\n  const hasConflict = occupied.some((slot) => start < slot.endTime && end > slot.startTime);\n  // Calendar-day validity is enforced by the backend.\n\n  useEffect(() => {\n    if (!date) return;\n    let active = true;\n    api.availability(studio._id, date)\n      .then((result) => {\n        if (active) setAvailability({ date, slots: result.data || [] });\n      })\n      .catch(() => {\n        if (active) setAvailability({ date, slots: [], failed: true });\n      });\n    return () => {\n      active = false;\n    };\n  }, [studio._id, date]);\n\n  async function submit(event: React.FormEvent) {\n    event.preventDefault();\n    if (!date || hours <= 0 || start >= end) {\n      toast.error(\"Choose a valid date and increasing time window.\");\n      return;\n    }\n    if (hasConflict) {\n      toast.error(\"That time overlaps an already confirmed booking. Choose another window.\");\n      return;\n    }\n\n    setLoading(true);\n    try {\n      await api.createBooking({\n        studioId: studio._id,\n        studioTitle: studio.title,\n        date,\n        startTime: start,\n        endTime: end,\n        hours,\n        hourlyRate: studio.hourlyRate,\n        securityDeposit: studio.securityDeposit,\n        totalAmount: total,\n      });\n      toast.success(\"Booking request sent to the host.\");\n      router.push(\"/my-bookings\");\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Unable to create booking\");\n    } finally {\n      setLoading(false);\n    }\n  }\n\n  return (\n    <div className=\"modal-backdrop\" onMouseDown={(event) => {\n      if (event.target === event.currentTarget) onClose();\n    }}>\n      <section className=\"modal-card\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"booking-modal-title\">\n        <button className=\"modal-close\" onClick={onClose} aria-label=\"Close booking dialog\"><X /></button>\n        <span className=\"eyebrow\">RESERVE YOUR SPACE</span>\n        <h2 id=\"booking-modal-title\">Book {studio.title}</h2>\n        <p className=\"muted\">Choose the date and production hours. Your request will be sent as Pending.</p>\n        <form onSubmit={submit} className=\"form-stack\">\n          <label>\n            Booking date\n            <div className=\"input-icon\">\n              <CalendarDays />\n              <input required type=\"date\" min={undefined} value={date} onChange={(event) => setDate(event.target.value)} />\n            </div>\n          </label>\n          <div className=\"two-fields\">\n            <label>\n              Start time\n              <div className=\"input-icon\">\n                <Clock3 />\n                <input type=\"time\" required value={start} onChange={(event) => setStart(event.target.value)} />\n              </div>\n            </label>\n            <label>\n              End time\n              <div className=\"input-icon\">\n                <Clock3 />\n                <input type=\"time\" required value={end} onChange={(event) => setEnd(event.target.value)} />\n              </div>\n            </label>\n          </div>\n          <div className=\"availability-note\" role=\"status\">\n            {!date ? \"Select a date to check confirmed reservations.\" :\n              availabilityLoading ? \"Checking confirmed reservations…\" :\n              availabilityFailed ? \"Live availability could not be loaded. The server will validate the request before saving.\" :\n              occupied.length ? <>Already confirmed: {occupied.map((slot) => slot.startTime + \"–\" + slot.endTime).join(\", \")}</> :\n              \"No confirmed reservations for this date yet.\"}\n          </div>\n          {hasConflict && <p className=\"form-error\" role=\"alert\">The selected time overlaps a confirmed reservation.</p>}\n          <div className=\"price-breakdown\">\n            <div><span>{hours.toFixed(1)} hours × ${studio.hourlyRate}/hr</span><strong>${(hours * studio.hourlyRate).toFixed(2)}</strong></div>\n            <div><span>Refundable security deposit</span><strong>${studio.securityDeposit.toFixed(2)}</strong></div>\n            <div className=\"price-total\"><span>Estimated total</span><strong>${total.toFixed(2)}</strong></div>\n          </div>\n          <button disabled={loading || hours <= 0 || hasConflict || availabilityLoading} className=\"btn btn-dark btn-full\">\n            {loading ? \"Sending request…\" : \"Request booking\"}\n          </button>\n        </form>\n      </section>\n    </div>\n  );\n}\n");
writeFileSync("src/components/navbar.tsx", "\"use client\";\n\nimport Link from \"next/link\";\nimport { usePathname, useRouter } from \"next/navigation\";\nimport { useState } from \"react\";\nimport { authClient } from \"@/lib/auth-client\";\nimport { ThemeToggle } from \"@/components/theme-toggle\";\nimport { Menu, X, ChevronDown, LogOut, Plus, LayoutGrid, CalendarDays, UserRound } from \"lucide-react\";\nimport { toast } from \"sonner\";\n\nexport function Navbar() {\n  const pathname = usePathname();\n  const router = useRouter();\n  const [mobile, setMobile] = useState(false);\n  const [menu, setMenu] = useState(false);\n  const { data: session, isPending } = authClient.useSession();\n  const user = session?.user;\n\n  const closeMenus = () => {\n    setMobile(false);\n    setMenu(false);\n  };\n\n  const logout = async () => {\n    try {\n      await authClient.signOut();\n      await fetch(\"/api/auth/cookie\", { method: \"DELETE\" });\n      closeMenus();\n      toast.success(\"You have been signed out.\");\n      router.push(\"/\");\n      router.refresh();\n    } catch {\n      toast.error(\"Could not sign out. Please try again.\");\n    }\n  };\n\n  const active = (href: string) =>\n    ((href === \"/studios\" ? pathname.startsWith(\"/studios\") : pathname === href) ? \"nav-link active\" : \"nav-link\");\n\n  return (\n    <header className=\"site-header\">\n      <div className=\"container nav-wrap\">\n        <Link href=\"/\" className=\"brand\" onClick={closeMenus}>\n          <span className=\"brand-mark\">S</span>\n          <span>studio<span className=\"brand-accent\">space</span><small>CREATIVE SPACES, SHARED</small></span>\n        </Link>\n        <nav className={mobile ? \"main-nav open\" : \"main-nav\"}>\n          <Link className={active(\"/\")} href=\"/\" onClick={closeMenus}>Home</Link>\n          <Link className={active(\"/studios\")} href=\"/studios\" onClick={closeMenus}>Explore Studios</Link>\n          <Link className=\"nav-link\" href=\"/#how-it-works\" onClick={closeMenus}>How It Works</Link>\n          <Link className=\"nav-link\" href=\"/#about-us\" onClick={closeMenus}>About Us</Link>\n        </nav>\n        <div className=\"nav-actions\">\n          <ThemeToggle />\n          {!isPending && (user ? (\n            <div className=\"profile-area\">\n              <button\n                className=\"profile-trigger\"\n                onClick={() => setMenu((current) => !current)}\n                aria-expanded={menu}\n                aria-haspopup=\"menu\"\n              >\n                <img src={user.image || \"https://ui-avatars.com/api/?name=Creator\"} alt=\"Profile\" />\n                <span>{user.name}</span>\n                <ChevronDown size={15} />\n              </button>\n              {menu && (\n                <div className=\"profile-menu\" role=\"menu\">\n                  <div className=\"menu-user\"><strong>{user.name}</strong><small>{user.email}</small></div>\n                  <Link href=\"/dashboard\" role=\"menuitem\" onClick={closeMenus}><LayoutGrid size={16} /> Dashboard</Link>\n                  <Link href=\"/add-studio\" role=\"menuitem\" onClick={closeMenus}><Plus size={16} /> Add New Studio</Link>\n                  <Link href=\"/my-listings\" role=\"menuitem\" onClick={closeMenus}><UserRound size={16} /> My Studio Listings</Link>\n                  <Link href=\"/my-bookings\" role=\"menuitem\" onClick={closeMenus}><CalendarDays size={16} /> My Bookings</Link>\n                  <button onClick={logout} role=\"menuitem\"><LogOut size={16} /> Logout</button>\n                </div>\n              )}\n            </div>\n          ) : (\n            <div className=\"auth-links\">\n              <Link href=\"/login\" className=\"btn btn-ghost\" onClick={closeMenus}>Login</Link>\n              <Link href=\"/register\" className=\"btn btn-dark\" onClick={closeMenus}>Register</Link>\n            </div>\n          ))}\n          <button\n            className=\"mobile-toggle\"\n            onClick={() => setMobile((current) => !current)}\n            aria-label=\"Toggle menu\"\n            aria-expanded={mobile}\n          >\n            {mobile ? <X /> : <Menu />}\n          </button>\n        </div>\n      </div>\n    </header>\n  );\n}\n");

replaceOnce(
  "src/components/navbar.tsx",
  '<Link href="/" className="brand" onClick={closeMenus}>',
  '<Link href="/" className="brand" aria-label="StudioSpace home" title="Go to homepage" onClick={(event) => { closeMenus(); if (pathname === "/") { event.preventDefault(); window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); } }}>',
  "Make StudioSpace logo an explicit working Home control"
);

const completeTermsPage = `import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function TermsPage() {
  return (
    <SiteShell>
      <section className="page-hero">
        <div className="container">
          <span className="eyebrow">THE STUDIOSPACE AGREEMENT</span>
          <h1>Terms of <em>use.</em></h1>
          <p>Clear expectations help every creative session start well.</p>
        </div>
      </section>
      <section className="container section">
        <div className="content-copy">
          <h2>1. Marketplace role</h2>
          <p>StudioSpace helps independent hosts list creative spaces and helps creators discover spaces and send booking requests. A request remains Pending until the host accepts it in the platform.</p>
          <h2>2. Accurate listings</h2>
          <p>Hosts are responsible for accurate descriptions, rates, deposits, capacity, access instructions, equipment details and current availability. Creators should review listing information and clarify important requirements before booking.</p>
          <h2>3. Safety and responsibility</h2>
          <p>Hosts must explain relevant house rules, equipment instructions and safe access requirements. Hosts and creators should agree on permitted use, equipment care, damage reporting and any insurance or liability arrangements that apply to a session.</p>
          <h2>4. Bookings and cancellations</h2>
          <p>Booking totals are estimates based on the displayed hourly rate and security deposit. A creator may cancel a Pending request. Confirmed sessions are subject to the agreed time window and cancellation arrangements made with the host.</p>
          <h2>5. Account use</h2>
          <p>Users must provide accurate account information, protect their sign-in credentials and use the platform respectfully. Hosts may manage only their own studio listings and booking requests.</p>
          <h2>6. Updates and contact</h2>
          <p>These terms describe the current StudioSpace assignment marketplace experience and may be updated as features evolve. Review the listing and booking status before travelling to a studio.</p>
          <p><Link href="/studios" className="text-link">Explore available studios</Link></p>
        </div>
      </section>
    </SiteShell>
  );
}
`;
writeFileSync("src/app/terms/page.tsx", completeTermsPage);

console.log("StudioSpace frontend assignment patches applied.");

// StudioSpace brand refresh — editorial, tactile and intentionally product-led.
replaceOnce("src/app/layout.tsx", "import \"./globals.css\";", "import \"./globals.css\";\nimport \"./brand-refresh.css\";", "load StudioSpace brand system");
replaceOnce("src/app/layout.tsx", "export const metadata: Metadata = { title: \"StudioSpace — Creative spaces, shared\", description: \"Discover and book inspiring photography, film, podcast, music and art spaces.\" };", "export const metadata: Metadata = { title: \"StudioSpace — Space to make.\", description: \"Discover distinctive photography, film, podcast, music and art spaces. Compare practical details and send a clear booking request.\" , icons: { icon: \"/studiospace-mark.svg\", shortcut: \"/studiospace-mark.svg\" } };", "refresh StudioSpace metadata");
writeFileSync("src/app/brand-refresh.css", "\n@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&display=swap');\n\n:root {\n  --ss-paper: #f4f1eb;\n  --ss-paper-deep: #eae6dd;\n  --ss-ink: #191d1a;\n  --ss-muted: #6a6e67;\n  --ss-line: #dedbd2;\n  --ss-accent: #df5a43;\n  --ss-accent-dark: #bd4634;\n  --ss-sage: #dfe6dc;\n  --ss-white: #fffefa;\n  --ss-radius: 18px;\n  --ss-shadow: 0 18px 50px rgba(28, 31, 27, .08);\n}\n\nhtml { scroll-behavior: smooth; }\nbody {\n  margin: 0;\n  color: var(--ss-ink);\n  background: var(--ss-paper);\n  font-family: \"DM Sans\", \"Manrope\", Arial, sans-serif;\n  font-size: 16px;\n  line-height: 1.65;\n  -webkit-font-smoothing: antialiased;\n  text-rendering: optimizeLegibility;\n}\n::selection { color: #fff; background: var(--ss-accent); }\na { color: inherit; }\nbutton, input, textarea, select { font: inherit; }\nbutton, a { -webkit-tap-highlight-color: transparent; }\n:focus-visible { outline: 3px solid rgba(223, 90, 67, .58); outline-offset: 3px; }\n.container { width: min(1280px, calc(100% - 56px)); margin-inline: auto; }\n.section { padding-block: clamp(64px, 8vw, 112px); }\nh1, h2, h3, h4 {\n  color: var(--ss-ink);\n  font-family: \"Manrope\", \"DM Sans\", Arial, sans-serif;\n  letter-spacing: -.045em;\n  line-height: 1.08;\n}\nh1 { font-size: clamp(2.8rem, 6vw, 5.4rem); font-weight: 700; }\nh2 { font-size: clamp(2.15rem, 4vw, 3.65rem); font-weight: 700; }\nh3 { font-size: 1.35rem; font-weight: 700; }\np { line-height: 1.75; }\n.muted { color: var(--ss-muted); }\n.eyebrow, .ss-kicker {\n  display: inline-flex;\n  align-items: center;\n  gap: 10px;\n  color: var(--ss-accent-dark);\n  font-size: .7rem;\n  font-weight: 800;\n  letter-spacing: .16em;\n  line-height: 1.3;\n  text-transform: uppercase;\n}\n.eyebrow::before, .ss-kicker::before {\n  width: 22px;\n  height: 1px;\n  background: currentColor;\n  content: \"\";\n}\n.brand { display: inline-flex; align-items: center; gap: 11px; color: var(--ss-ink); text-decoration: none; }\n.brand > span:last-child { display: inline-flex; flex-direction: column; font-family: \"Manrope\", sans-serif; font-size: 1.2rem; font-weight: 800; letter-spacing: -.07em; line-height: .95; }\n.brand-accent { color: var(--ss-accent); }\n.brand small { margin-top: 6px; color: #81847c; font-family: \"DM Sans\", sans-serif; font-size: .51rem; font-weight: 700; letter-spacing: .15em; line-height: 1; }\n.brand-mark-custom { display: inline-flex; width: 43px; height: 43px; flex: 0 0 43px; align-items: center; justify-content: center; overflow: hidden; }\n.brand-mark-custom img { display: block; width: 43px; height: 43px; object-fit: contain; }\n.footer-brand .brand-mark-custom, .footer-brand .brand-mark-custom img { width: 39px; height: 39px; flex-basis: 39px; }\n\n.site-header {\n  position: sticky;\n  z-index: 80;\n  top: 0;\n  border-bottom: 1px solid rgba(25, 29, 26, .08);\n  background: rgba(244, 241, 235, .92);\n  backdrop-filter: blur(18px);\n  -webkit-backdrop-filter: blur(18px);\n}\n.nav-wrap { min-height: 78px; display: flex; align-items: center; justify-content: space-between; gap: 26px; }\n.main-nav { display: flex; align-items: center; justify-content: center; gap: clamp(16px, 2.3vw, 32px); }\n.nav-link { position: relative; padding: 10px 0; color: #666b64; font-size: .86rem; font-weight: 600; text-decoration: none; transition: color .2s ease; }\n.nav-link:hover, .nav-link.active { color: var(--ss-ink); }\n.nav-link.active::after { position: absolute; right: 0; bottom: 2px; left: 0; height: 2px; background: var(--ss-accent); content: \"\"; }\n.nav-actions, .auth-links { display: flex; align-items: center; gap: 10px; }\n.profile-trigger { min-height: 44px; border: 1px solid var(--ss-line); border-radius: 999px; background: var(--ss-white); color: var(--ss-ink); }\n.profile-trigger img { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }\n.profile-menu { border: 1px solid var(--ss-line); border-radius: 14px; background: var(--ss-white); box-shadow: var(--ss-shadow); }\n.profile-menu a, .profile-menu button { color: var(--ss-ink); }\n.mobile-toggle { border: 1px solid var(--ss-line); border-radius: 50%; background: var(--ss-white); color: var(--ss-ink); }\n\n.btn {\n  display: inline-flex;\n  min-height: 48px;\n  align-items: center;\n  justify-content: center;\n  gap: 10px;\n  padding: 0 21px;\n  border: 1px solid transparent;\n  border-radius: 999px;\n  font-size: .88rem;\n  font-weight: 700;\n  letter-spacing: -.01em;\n  text-decoration: none;\n  transition: transform .2s ease, background .2s ease, border-color .2s ease, color .2s ease;\n}\n.btn:hover { transform: translateY(-2px); }\n.btn-dark { border-color: var(--ss-ink); background: var(--ss-ink); color: #fff !important; }\n.btn-dark:hover { border-color: var(--ss-accent); background: var(--ss-accent); }\n.btn-ghost { border-color: transparent; background: transparent; color: var(--ss-ink); }\n.btn-outline { border-color: var(--ss-line); background: transparent; color: var(--ss-ink); }\n.btn-full { width: 100%; }\n.btn:disabled { cursor: not-allowed; opacity: .58; transform: none; }\n\n.ss-hero { padding: 18px 0 0; }\n.ss-hero-topline { width: min(1280px, calc(100% - 56px)); margin: 0 auto 12px; display: flex; align-items: center; justify-content: space-between; color: #777b73; font-size: .66rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }\n.ss-hero-swiper { width: min(1440px, calc(100% - 28px)); margin: 0 auto; overflow: hidden; border-radius: 24px; background: #1a201d; }\n.ss-hero-panel { position: relative; min-height: min(700px, calc(100svh - 120px)); min-height: max(600px, min(700px, calc(100svh - 120px))); overflow: hidden; background: #202824; isolation: isolate; }\n.ss-hero-image { position: absolute; z-index: -2; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; filter: saturate(.78) contrast(1.04); }\n.ss-hero-overlay { position: absolute; z-index: -1; inset: 0; background: linear-gradient(90deg, rgba(15, 21, 18, .86) 0%, rgba(15, 21, 18, .64) 42%, rgba(15, 21, 18, .12) 100%), linear-gradient(0deg, rgba(15, 21, 18, .24), transparent 55%); }\n.ss-hero-content { min-height: inherit; display: flex; align-items: flex-end; justify-content: space-between; gap: 36px; padding-top: 92px; padding-bottom: 94px; color: #fff; }\n.ss-hero-copy { width: min(760px, 78%); }\n.ss-hero-copy .ss-kicker { color: #f4a18d; }\n.ss-hero-copy h1 { max-width: 12ch; margin: 22px 0 22px; color: #fff; font-family: \"Playfair Display\", Georgia, serif; font-size: clamp(3.8rem, 7.8vw, 7.3rem); font-weight: 600; letter-spacing: -.065em; line-height: .94; }\n.ss-hero-copy h1 em { color: #f0a08c; font-weight: 600; }\n.ss-hero-copy > p:not(.ss-kicker) { max-width: 540px; margin: 0; color: rgba(255,255,255,.82); font-size: clamp(1rem, 1.4vw, 1.15rem); }\n.ss-hero-actions { display: flex; flex-wrap: wrap; gap: 11px; margin-top: 30px; }\n.ss-hero-actions .btn-light { border-color: #f5eee5; background: #f5eee5; color: var(--ss-ink); }\n.ss-hero-actions .btn-light:hover { border-color: #fff; background: #fff; }\n.ss-hero-actions .btn-quiet { border-color: rgba(255,255,255,.45); background: rgba(255,255,255,.08); color: #fff; backdrop-filter: blur(8px); }\n.ss-hero-index { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; color: rgba(255,255,255,.78); font-size: .68rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }\n.ss-hero-index strong { color: #fff; font-family: \"Playfair Display\", Georgia, serif; font-size: 2.8rem; font-weight: 600; letter-spacing: -.05em; }\n.ss-hero-swiper .swiper-pagination { right: auto !important; bottom: 26px !important; left: 28px !important; width: auto !important; text-align: left; }\n.ss-hero-swiper .swiper-pagination-bullet { width: 22px; height: 3px; margin: 0 5px 0 0 !important; border-radius: 2px; background: rgba(255,255,255,.52); opacity: 1; }\n.ss-hero-swiper .swiper-pagination-bullet-active { width: 42px; background: #f08c75; }\n.ss-hero-foot { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 18px 0 28px; border-bottom: 1px solid var(--ss-line); color: #73776f; font-size: .74rem; }\n.ss-hero-foot strong { color: var(--ss-ink); font-size: .78rem; }\n\n.ss-section { padding: clamp(72px, 8vw, 116px) 0; }\n.ss-section-head { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 18px 40px; margin-bottom: 34px; }\n.ss-section-head .ss-kicker { grid-column: 1 / -1; }\n.ss-section-head h2 { max-width: 680px; margin: 0; font-size: clamp(2.4rem, 4.7vw, 4.25rem); }\n.ss-section-head h2 em { color: var(--ss-accent); font-family: \"Playfair Display\", Georgia, serif; font-weight: 600; }\n.ss-section-head p { max-width: 430px; margin: 0; color: var(--ss-muted); font-size: .97rem; }\n.ss-section-head .text-link { grid-column: 2; grid-row: 2; align-self: center; color: var(--ss-ink); font-weight: 700; text-decoration-color: var(--ss-accent); text-underline-offset: 5px; }\n.ss-featured { background: var(--ss-paper); }\n.ss-category-section { background: var(--ss-paper-deep); }\n.ss-category-grid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 12px; }\n.ss-category-card { position: relative; min-height: 190px; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; padding: 20px; border: 1px solid rgba(25,29,26,.1); border-radius: 14px; background: rgba(255,254,250,.72); color: var(--ss-ink); text-decoration: none; transition: transform .22s ease, background .22s ease, box-shadow .22s ease; }\n.ss-category-card:hover { transform: translateY(-5px); background: var(--ss-white); box-shadow: var(--ss-shadow); }\n.ss-category-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 12px; background: var(--ss-sage); color: var(--ss-ink); }\n.ss-category-card strong { max-width: 12ch; font-size: 1.05rem; letter-spacing: -.03em; line-height: 1.2; }\n.ss-category-card small { color: var(--ss-muted); font-size: .72rem; }\n.ss-category-arrow { position: absolute; right: 18px; bottom: 18px; color: var(--ss-accent); }\n\n.ss-steps { background: #1d2420; color: #f8f4ec; }\n.ss-steps .ss-section-head h2, .ss-steps .ss-section-head p { color: #f8f4ec; }\n.ss-steps .ss-section-head .ss-kicker { color: #f39c86; }\n.ss-steps-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 0; margin-top: 54px; border-top: 1px solid rgba(255,255,255,.2); }\n.ss-step { min-height: 205px; padding: 24px 24px 8px 0; border-right: 1px solid rgba(255,255,255,.18); }\n.ss-step + .ss-step { padding-left: 24px; }\n.ss-step:last-child { border-right: 0; }\n.ss-step-number { color: #f39c86; font-family: \"Playfair Display\", Georgia, serif; font-size: 2.3rem; }\n.ss-step h3 { margin: 24px 0 10px; color: #fff; font-size: 1.18rem; }\n.ss-step p { max-width: 245px; margin: 0; color: rgba(255,255,255,.66); font-size: .88rem; }\n\n.ss-about { background: var(--ss-paper); }\n.ss-about-grid { display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: clamp(36px, 7vw, 96px); }\n.ss-about-visual { position: relative; min-height: 510px; overflow: hidden; border-radius: 18px; background: #d5d4c9; }\n.ss-about-visual img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }\n.ss-about-note { position: absolute; right: 18px; bottom: 18px; width: min(230px, 66%); padding: 18px; border: 1px solid rgba(255,255,255,.5); border-radius: 12px; background: rgba(248,245,238,.92); color: var(--ss-ink); box-shadow: var(--ss-shadow); }\n.ss-about-note strong { display: block; font-family: \"Playfair Display\", Georgia, serif; font-size: 1.65rem; font-weight: 600; }\n.ss-about-note span { color: var(--ss-muted); font-size: .76rem; }\n.ss-about-copy h2 { margin: 18px 0; font-size: clamp(2.35rem, 4.4vw, 4rem); }\n.ss-about-copy h2 em { color: var(--ss-accent); font-family: \"Playfair Display\", Georgia, serif; font-weight: 600; }\n.ss-about-copy > p { color: var(--ss-muted); }\n.ss-principles { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 20px; margin-top: 30px; }\n.ss-principle { display: flex; align-items: flex-start; gap: 12px; }\n.ss-principle-icon { width: 35px; height: 35px; flex: 0 0 35px; display: grid; place-items: center; border-radius: 50%; background: var(--ss-sage); color: var(--ss-ink); }\n.ss-principle strong { display: block; font-size: .9rem; }\n.ss-principle small { display: block; margin-top: 4px; color: var(--ss-muted); font-size: .76rem; line-height: 1.5; }\n\n.ss-host-band { padding: clamp(44px, 6vw, 78px) 0; background: #e8d7cb; }\n.ss-host-band-inner { display: flex; align-items: center; justify-content: space-between; gap: 30px; }\n.ss-host-band h2 { max-width: 680px; margin: 12px 0; font-size: clamp(2.2rem, 4vw, 3.7rem); }\n.ss-host-band p { max-width: 600px; margin: 0; color: #64645d; }\n.ss-host-band .ss-kicker { color: #a74937; }\n\n.page-hero { position: relative; overflow: hidden; padding: clamp(66px, 8vw, 108px) 0 clamp(54px, 6vw, 78px); border-bottom: 1px solid var(--ss-line); background: var(--ss-paper-deep); }\n.page-hero h1 { max-width: 900px; margin: 20px 0 12px; font-size: clamp(2.8rem, 6vw, 5.1rem); }\n.page-hero h1 em { color: var(--ss-accent); font-family: \"Playfair Display\", Georgia, serif; font-weight: 600; }\n.page-hero p { max-width: 630px; margin: 0; color: var(--ss-muted); font-size: 1.05rem; }\n.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 34px; padding: 10px; border: 1px solid var(--ss-line); border-radius: 14px; background: var(--ss-white); box-shadow: 0 8px 22px rgba(28,31,27,.035); }\n.search-field, .select-filter { min-height: 50px; display: flex; align-items: center; gap: 12px; padding: 0 14px; color: var(--ss-muted); }\n.search-field { flex: 1; }\n.search-field input, .select-filter select { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--ss-ink); }\n.select-filter { min-width: 220px; border-left: 1px solid var(--ss-line); }\n.studio-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 22px; }\n.studio-card { overflow: hidden; border: 1px solid rgba(25,29,26,.08); border-radius: 16px; background: var(--ss-white); box-shadow: 0 8px 24px rgba(28,31,27,.035); transition: transform .25s ease, box-shadow .25s ease; }\n.studio-card:hover { transform: translateY(-5px); box-shadow: var(--ss-shadow); }\n.studio-image-wrap { position: relative; overflow: hidden; aspect-ratio: 1.43; background: var(--ss-paper-deep); }\n.studio-image-wrap > a { display: block; width: 100%; height: 100%; }\n.studio-image-wrap img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .55s cubic-bezier(.2,.7,.25,1); }\n.studio-card:hover .studio-image-wrap img { transform: scale(1.045); }\n.category-pill { position: absolute; left: 14px; bottom: 14px; padding: 7px 11px; border: 1px solid rgba(255,255,255,.6); border-radius: 999px; background: rgba(248,245,239,.93); color: var(--ss-ink); font-size: .68rem; font-weight: 800; letter-spacing: .04em; }\n.save-button { position: absolute; top: 13px; right: 13px; width: 39px; height: 39px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.72); border-radius: 50%; background: rgba(248,245,239,.94); color: var(--ss-ink); cursor: pointer; }\n.save-button.saved { color: var(--ss-accent); }\n.studio-card h3, .studio-card h2 { margin: 0; }\n.studio-card .studio-card-body { padding: 18px; }\n.studio-card .studio-title { font-size: 1.12rem; }\n.studio-card .studio-meta { color: var(--ss-muted); font-size: .79rem; }\n.empty-state { padding: 56px 24px; border: 1px dashed var(--ss-line); border-radius: 16px; background: rgba(255,254,250,.6); text-align: center; }\n.empty-state h3 { margin: 12px 0 8px; }\n.empty-state p { color: var(--ss-muted); }\n.skeleton-card { min-height: 330px; border-radius: 16px; background: linear-gradient(100deg, #e7e3da 20%, #f5f2ed 45%, #e7e3da 70%); background-size: 200% 100%; animation: ss-shimmer 1.5s linear infinite; }\n@keyframes ss-shimmer { to { background-position-x: -200%; } }\n\n.auth-page { min-height: calc(100vh - 78px); display: grid; place-items: center; padding: 58px 20px; background: radial-gradient(circle at 12% 12%, rgba(223,90,67,.08), transparent 28%), var(--ss-paper); }\n.auth-card { width: min(490px, 100%); padding: clamp(26px, 5vw, 44px); border: 1px solid var(--ss-line); border-radius: 18px; background: var(--ss-white); box-shadow: var(--ss-shadow); }\n.form-stack { gap: 18px; }\n.form-stack label { color: var(--ss-ink); font-size: .84rem; font-weight: 700; }\n.form-stack input, .form-stack textarea, .form-stack select, .input-icon input { width: 100%; min-height: 48px; border: 1px solid var(--ss-line); border-radius: 10px; background: #fffefa; color: var(--ss-ink); }\n.form-stack input, .form-stack textarea, .form-stack select { padding: 12px 14px; }\n.form-stack input:focus, .form-stack textarea:focus, .form-stack select:focus { border-color: var(--ss-accent); outline: 3px solid rgba(223,90,67,.12); }\n.input-icon { display: flex; align-items: center; gap: 10px; }\n.modal-backdrop { background: rgba(16,20,17,.68); backdrop-filter: blur(8px); }\n.modal-card { border: 1px solid var(--ss-line); border-radius: 18px; background: var(--ss-white); box-shadow: 0 24px 80px rgba(0,0,0,.2); }\n.modal-card h2 { letter-spacing: -.05em; }\n.availability-note { padding: 12px 14px; border: 1px solid var(--ss-line); border-radius: 10px; background: var(--ss-paper); color: var(--ss-muted); font-size: .8rem; line-height: 1.5; }\n.price-breakdown { border-radius: 12px; background: var(--ss-paper); }\n.not-found { min-height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 20px; text-align: center; }\n\n.image-upload-control { position: relative; display: flex; min-height: 48px; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; padding: 10px 14px; border: 1px dashed #c9c4b9; border-radius: 10px; background: #f8f5ee; color: var(--ss-ink); font-size: .8rem; font-weight: 700; cursor: pointer; }\n.image-upload-control input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }\n.image-upload-control:has(input:disabled) { cursor: progress; opacity: .65; }\n.uploaded-image-preview { display: block; width: min(100%, 480px); max-height: 230px; margin-top: 12px; border-radius: 12px; object-fit: cover; }\n\n.site-footer { padding: 68px 0 26px; border-top: 1px solid rgba(255,255,255,.1); background: #1a201c; color: #f5f1e9; }\n.site-footer h4 { color: #f5f1e9; }\n.site-footer a { color: rgba(245,241,233,.75); text-decoration: none; }\n.site-footer a:hover { color: #fff; }\n.site-footer .brand { color: #fff; }\n.site-footer .brand small { color: rgba(245,241,233,.55); }\n.site-footer .brand-accent { color: #f08d76; }\n.site-footer .footer-copy { max-width: 330px; color: rgba(245,241,233,.65); }\n.site-footer .socials a { width: 36px; height: 36px; display: inline-grid; place-items: center; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; }\n.site-footer .socials a:hover { border-color: #f08d76; background: rgba(240,141,118,.12); }\n.site-footer .x-logo { font-size: 1rem; color: #fff; }\n\n.dark body { color: #eeeae1; background: #151a17; }\n.dark h1, .dark h2, .dark h3, .dark h4 { color: #f4f0e8; }\n.dark .site-header { border-color: rgba(255,255,255,.08); background: rgba(21,26,23,.92); }\n.dark .brand, .dark .nav-link, .dark .profile-trigger { color: #f4f0e8; }\n.dark .nav-link { color: #c1c4bc; }\n.dark .ss-section, .dark .ss-featured, .dark .ss-about { background: #151a17; }\n.dark .ss-category-section, .dark .page-hero { border-color: rgba(255,255,255,.08); background: #202722; }\n.dark .ss-category-card, .dark .studio-card, .dark .auth-card, .dark .profile-menu { border-color: rgba(255,255,255,.1); background: #202722; color: #f4f0e8; }\n.dark .ss-category-card strong, .dark .studio-card h2, .dark .studio-card h3 { color: #f4f0e8; }\n.dark .filter-bar, .dark .search-field, .dark .select-filter, .dark .modal-card { border-color: rgba(255,255,255,.12); background: #202722; color: #f4f0e8; }\n.dark .search-field input, .dark .select-filter select, .dark .form-stack input, .dark .form-stack textarea, .dark .form-stack select, .dark .input-icon input { border-color: #414b43; background: #181f1b; color: #f4f0e8; }\n.dark .page-hero p, .dark .ss-section-head p, .dark .ss-about-copy > p, .dark .ss-principle small { color: #b4b9b0; }\n.dark .ss-about-note { border-color: rgba(255,255,255,.12); background: rgba(29,36,32,.94); color: #fff; }\n.dark .ss-about-note span { color: #c1c4bc; }\n.dark .ss-host-band { background: #342b26; }\n.dark .ss-host-band p { color: #d2c7bd; }\n.dark .empty-state { border-color: #414b43; background: #202722; }\n.dark .empty-state h3 { color: #f4f0e8; }\n.dark .btn-outline, .dark .btn-ghost { border-color: #414b43; color: #f4f0e8; }\n.dark .btn-light { color: #171b19; }\n.dark .site-footer { border-color: rgba(255,255,255,.06); background: #101512; }\n.dark .image-upload-control { border-color: #414b43; background: #181f1b; color: #f4f0e8; }\n\n@media (max-width: 980px) {\n  .container { width: min(100% - 40px, 760px); }\n  .main-nav { gap: 14px; }\n  .ss-category-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }\n  .ss-about-grid { grid-template-columns: 1fr; }\n  .ss-about-visual { min-height: 420px; }\n  .studio-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }\n  .ss-hero-panel, .ss-hero-content { min-height: 620px; }\n}\n@media (max-width: 720px) {\n  .container { width: calc(100% - 34px); }\n  .nav-wrap { min-height: 68px; }\n  .main-nav { position: absolute; top: calc(100% + 1px); right: 0; left: 0; display: none; flex-direction: column; align-items: stretch; gap: 2px; padding: 14px 20px 20px; border-bottom: 1px solid var(--ss-line); background: var(--ss-paper); box-shadow: var(--ss-shadow); }\n  .main-nav.open { display: flex; }\n  .main-nav .nav-link { padding: 12px 4px; }\n  .nav-actions { gap: 7px; }\n  .nav-actions .auth-links .btn { min-height: 40px; padding-inline: 13px; font-size: .78rem; }\n  .profile-trigger span { display: none; }\n  .ss-hero { padding-top: 10px; }\n  .ss-hero-topline { width: calc(100% - 34px); font-size: .58rem; }\n  .ss-hero-swiper { width: calc(100% - 16px); border-radius: 16px; }\n  .ss-hero-panel, .ss-hero-content { min-height: 650px; }\n  .ss-hero-content { align-items: flex-end; padding-top: 56px; padding-bottom: 82px; }\n  .ss-hero-copy { width: 100%; }\n  .ss-hero-copy h1 { max-width: 10ch; font-size: clamp(3.2rem, 13vw, 5.1rem); }\n  .ss-hero-copy > p:not(.ss-kicker) { max-width: 90%; font-size: .95rem; }\n  .ss-hero-index { display: none; }\n  .ss-hero-swiper .swiper-pagination { bottom: 20px !important; left: 20px !important; }\n  .ss-hero-foot { align-items: flex-start; flex-direction: column; gap: 6px; font-size: .67rem; }\n  .ss-section { padding: 68px 0; }\n  .ss-section-head { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }\n  .ss-section-head h2 { font-size: 2.5rem; }\n  .ss-section-head .text-link { align-self: flex-start; }\n  .ss-category-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 9px; }\n  .ss-category-card { min-height: 166px; padding: 16px; }\n  .ss-steps-grid { grid-template-columns: 1fr 1fr; }\n  .ss-step { min-height: 185px; padding: 18px 14px 18px 0; border-bottom: 1px solid rgba(255,255,255,.18); }\n  .ss-step + .ss-step { padding-left: 14px; }\n  .ss-step:nth-child(2) { border-right: 0; }\n  .ss-step:nth-child(3) { border-bottom: 0; }\n  .ss-step:nth-child(4) { border-right: 0; border-bottom: 0; }\n  .ss-about-visual { min-height: 330px; }\n  .ss-principles { grid-template-columns: 1fr; }\n  .ss-host-band-inner { align-items: flex-start; flex-direction: column; }\n  .studio-grid { grid-template-columns: 1fr; gap: 16px; }\n  .filter-bar { align-items: stretch; flex-direction: column; padding: 9px; }\n  .search-field, .select-filter { min-height: 48px; }\n  .select-filter { border-top: 1px solid var(--ss-line); border-left: 0; }\n  .page-hero { padding-block: 58px 48px; }\n  .page-hero h1 { font-size: 3rem; }\n  .auth-page { min-height: 70vh; padding: 34px 17px; }\n  .site-footer { padding-top: 52px; }\n}\n@media (prefers-reduced-motion: reduce) {\n  html { scroll-behavior: auto; }\n  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }\n}\n");
mkdirSync("public", { recursive: true });
writeFileSync("public/studiospace-mark.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" role=\"img\" aria-labelledby=\"title\">\n  <title id=\"title\">StudioSpace mark</title>\n  <rect x=\"2\" y=\"2\" width=\"60\" height=\"60\" rx=\"17\" fill=\"#191d1a\"/>\n  <g fill=\"none\" stroke=\"#f4f1eb\" stroke-width=\"3.2\" stroke-linecap=\"round\">\n    <path d=\"M15 24V15h9M40 15h9v9M49 40v9h-9M24 49h-9v-9\"/>\n  </g>\n  <path d=\"M42 25c-3.1-4.4-14.7-5.3-18.4 1.1-3.8 6.7 5.4 9 10.8 10.9 5.1 1.8 6.5 7.5 2.4 11.3-4.2 3.9-12.4 2.8-16-1.1\"\n    fill=\"none\" stroke=\"#df5a43\" stroke-width=\"5.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n</svg>");
writeFileSync("public/studiospace-logo.svg", "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"368\" height=\"76\" viewBox=\"0 0 368 76\" role=\"img\" aria-labelledby=\"title desc\">\n  <title id=\"title\">StudioSpace</title>\n  <desc id=\"desc\">StudioSpace wordmark with an original S monogram inside a studio framing mark.</desc>\n  <g transform=\"translate(4 6)\">\n    <rect x=\"2\" y=\"2\" width=\"60\" height=\"60\" rx=\"17\" fill=\"#191d1a\"/>\n    <g fill=\"none\" stroke=\"#f4f1eb\" stroke-width=\"3.2\" stroke-linecap=\"round\">\n      <path d=\"M15 24V15h9M40 15h9v9M49 40v9h-9M24 49h-9v-9\"/>\n    </g>\n    <path d=\"M42 25c-3.1-4.4-14.7-5.3-18.4 1.1-3.8 6.7 5.4 9 10.8 10.9 5.1 1.8 6.5 7.5 2.4 11.3-4.2 3.9-12.4 2.8-16-1.1\"\n      fill=\"none\" stroke=\"#df5a43\" stroke-width=\"5.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  </g>\n  <text x=\"82\" y=\"39\" font-family=\"Manrope, DM Sans, Arial, sans-serif\" font-size=\"29\" font-weight=\"800\" letter-spacing=\"-1.8\" fill=\"#191d1a\">studio<tspan fill=\"#df5a43\">space</tspan></text>\n  <text x=\"84\" y=\"57\" font-family=\"DM Sans, Arial, sans-serif\" font-size=\"8.5\" font-weight=\"700\" letter-spacing=\"2\" fill=\"#73776f\">CREATIVE SPACES, SHARED</text>\n</svg>");
replaceOnce("src/components/navbar.tsx", '<span className="brand-mark">S</span>', '<span className="brand-mark brand-mark-custom"><img src="/studiospace-mark.svg" alt="" aria-hidden="true"/></span>', "install StudioSpace navbar mark");
replaceOnce("src/components/footer.tsx", '<span className="brand-mark">S</span>', '<span className="brand-mark brand-mark-custom"><img src="/studiospace-mark.svg" alt="" aria-hidden="true"/></span>', "install StudioSpace footer mark");
replaceOnce("src/components/footer.tsx", '<strong className="x-logo">ð•</strong>', '<strong className="x-logo">𝕏</strong>', "repair footer X mark");
writeFileSync("src/app/page.tsx", "\"use client\";\n\nimport Link from \"next/link\";\nimport { useEffect, useState } from \"react\";\nimport { Swiper, SwiperSlide } from \"swiper/react\";\nimport { Autoplay, EffectFade, Pagination } from \"swiper/modules\";\nimport \"swiper/css\";\nimport \"swiper/css/effect-fade\";\nimport \"swiper/css/pagination\";\nimport {\n  ArrowRight, ArrowUpRight, Camera, Clapperboard, Mic2, Music2, Palette,\n  Search, CalendarCheck, ShieldCheck, BadgeCheck, Users, MapPin, Clock3\n} from \"lucide-react\";\nimport { SiteShell } from \"@/components/site-shell\";\nimport { StudioCard } from \"@/components/studio-card\";\nimport { EmptyState } from \"@/components/empty-state\";\nimport { api, Studio, categories, categoryLabels } from \"@/lib/api\";\n\nconst slides = [\n  {\n    kicker: \"A PLACE TO MAKE\",\n    title: \"Find the room where the work happens.\",\n    copy: \"Daylight studios, sound-treated rooms and production spaces with details you can plan around.\",\n    image: \"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=2200\",\n    imageAlt: \"A considered creative workspace with natural light\",\n    index: \"01\"\n  },\n  {\n    kicker: \"BUILT AROUND YOUR CRAFT\",\n    title: \"The right setting changes the whole shoot.\",\n    copy: \"Compare equipment, capacity, rates and availability before you send a booking request.\",\n    image: \"https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=2200\",\n    imageAlt: \"A recording and production studio\",\n    index: \"02\"\n  },\n  {\n    kicker: \"FOR THE PEOPLE BEHIND THE WORK\",\n    title: \"Your space has a story. Give it a stage.\",\n    copy: \"List your studio, set clear expectations and meet the next production team looking for a place like yours.\",\n    image: \"https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=2200\",\n    imageAlt: \"An artist studio filled with materials and works in progress\",\n    index: \"03\"\n  }\n];\n\nconst steps = [\n  { number: \"01\", title: \"Find your setting\", copy: \"Search by category, location and the details that matter to your production.\", icon: Search },\n  { number: \"02\", title: \"Check the details\", copy: \"Review equipment, access notes, capacity, rates and confirmed availability.\", icon: BadgeCheck },\n  { number: \"03\", title: \"Send a request\", copy: \"Choose your production hours and send a clear request to the host.\", icon: CalendarCheck },\n  { number: \"04\", title: \"Make the work\", copy: \"Coordinate the final details with your host, then get on with creating.\", icon: Camera }\n];\n\nfunction categoryIcon(category: string) {\n  const value = category.toLowerCase();\n  if (value.includes(\"photo\")) return Camera;\n  if (value.includes(\"film\") || value.includes(\"stage\")) return Clapperboard;\n  if (value.includes(\"podcast\") || value.includes(\"sound\")) return Mic2;\n  if (value.includes(\"music\")) return Music2;\n  return Palette;\n}\n\nfunction categoryDescription(category: string) {\n  const value = category.toLowerCase();\n  if (value.includes(\"photo\")) return \"Light, backdrops and room to frame the shot.\";\n  if (value.includes(\"film\") || value.includes(\"stage\")) return \"Production-ready space for the full crew.\";\n  if (value.includes(\"podcast\") || value.includes(\"sound\")) return \"Quiet rooms and considered acoustics.\";\n  if (value.includes(\"music\")) return \"A place to record, rehearse and refine.\";\n  return \"Workshops and open rooms for hands-on ideas.\";\n}\n\nexport default function HomePage() {\n  const [featured, setFeatured] = useState<Studio[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState(false);\n\n  useEffect(() => {\n    let active = true;\n    api.featured()\n      .then((result) => {\n        if (active) setFeatured((result.data || []).slice(0, 6));\n      })\n      .catch(() => {\n        if (active) setLoadError(true);\n      })\n      .finally(() => {\n        if (active) setLoading(false);\n      });\n    return () => {\n      active = false;\n    };\n  }, []);\n\n  return (\n    <SiteShell>\n      <div className=\"home-refresh\">\n        <section className=\"ss-hero\" aria-label=\"StudioSpace introduction\">\n          <div className=\"ss-hero-topline\">\n            <span>Independent creative spaces</span>\n            <span>Discover / Book / Make</span>\n          </div>\n          <Swiper\n            className=\"ss-hero-swiper\"\n            modules={[Autoplay, EffectFade, Pagination]}\n            effect=\"fade\"\n            loop\n            speed={850}\n            autoplay={{ delay: 6800, disableOnInteraction: false, pauseOnMouseEnter: true }}\n            pagination={{ clickable: true }}\n          >\n            {slides.map((slide) => (\n              <SwiperSlide key={slide.index}>\n                <article className=\"ss-hero-panel\">\n                  <img className=\"ss-hero-image\" src={slide.image} alt={slide.imageAlt} fetchPriority={slide.index === \"01\" ? \"high\" : \"auto\"} />\n                  <div className=\"ss-hero-overlay\" />\n                  <div className=\"ss-hero-content container\">\n                    <div className=\"ss-hero-copy\">\n                      <p className=\"ss-kicker\">{slide.kicker}</p>\n                      <h1>{slide.title}</h1>\n                      <p>{slide.copy}</p>\n                      <div className=\"ss-hero-actions\">\n                        <Link href=\"/studios\" className=\"btn btn-light\">Explore studios <ArrowRight size={17} /></Link>\n                        <Link href=\"/add-studio\" className=\"btn btn-quiet\">List your space <ArrowUpRight size={17} /></Link>\n                      </div>\n                    </div>\n                    <div className=\"ss-hero-index\">\n                      <strong>{slide.index}</strong>\n                      <span>StudioSpace collection</span>\n                    </div>\n                  </div>\n                </article>\n              </SwiperSlide>\n            ))}\n          </Swiper>\n          <div className=\"ss-hero-foot container\">\n            <span><strong>For the makers.</strong> Spaces with a purpose, not just an address.</span>\n            <span>Photography · Film · Sound · Art</span>\n          </div>\n        </section>\n\n        <section className=\"ss-section ss-featured\">\n          <div className=\"container\">\n            <div className=\"ss-section-head\">\n              <p className=\"ss-kicker\">THE CURRENT COLLECTION / 01</p>\n              <h2>Rooms with a <em>point of view.</em></h2>\n              <p>A short list of spaces to get your next idea moving. Open a listing to see the details, ask the right questions and check available time.</p>\n              <Link href=\"/studios\" className=\"text-link\">View all studios <ArrowUpRight size={16} /></Link>\n            </div>\n            {loading ? (\n              <div className=\"studio-grid\">\n                {[1, 2, 3, 4, 5, 6].map((item) => <div className=\"skeleton-card\" key={item} />)}\n              </div>\n            ) : featured.length ? (\n              <div className=\"studio-grid\">\n                {featured.map((studio) => <StudioCard key={studio._id} studio={studio} />)}\n              </div>\n            ) : (\n              <EmptyState\n                title={loadError ? \"The collection is taking a moment\" : \"The next great space starts here\"}\n                description={loadError ? \"The studio directory could not be reached just now. Try the full collection again.\" : \"There are no featured listings yet. Explore the directory or add the first space.\"}\n                href=\"/studios\"\n                cta=\"Explore the directory\"\n              />\n            )}\n          </div>\n        </section>\n\n        <section className=\"ss-section ss-category-section\">\n          <div className=\"container\">\n            <div className=\"ss-section-head\">\n              <p className=\"ss-kicker\">START WITH YOUR MEDIUM / 02</p>\n              <h2>Choose the kind of <em>room you need.</em></h2>\n              <p>Different work asks for different surroundings. Start with your discipline, then narrow the search by place and practical details.</p>\n              <Link href=\"/studios\" className=\"text-link\">Browse the full directory <ArrowUpRight size={16} /></Link>\n            </div>\n            <div className=\"ss-category-grid\">\n              {categories.map((category, index) => {\n                const Icon = categoryIcon(category);\n                return (\n                  <Link className=\"ss-category-card\" key={category} href={\"/studios?category=\" + encodeURIComponent(category)}>\n                    <span className=\"ss-category-icon\"><Icon size={22} strokeWidth={1.7} /></span>\n                    <div>\n                      <strong>{categoryLabels[category] || category}</strong>\n                      <small>{categoryDescription(category)}</small>\n                    </div>\n                    <ArrowUpRight className=\"ss-category-arrow\" size={18} />\n                  </Link>\n                );\n              })}\n            </div>\n          </div>\n        </section>\n\n        <section className=\"ss-section ss-steps\" id=\"how-it-works\">\n          <div className=\"container\">\n            <div className=\"ss-section-head\">\n              <p className=\"ss-kicker\">A CLEARER WAY TO BOOK / 03</p>\n              <h2>From first search to <em>first take.</em></h2>\n              <p>Good production starts with fewer unknowns. The important details are part of the listing and the booking flow.</p>\n            </div>\n            <div className=\"ss-steps-grid\">\n              {steps.map((step) => {\n                const Icon = step.icon;\n                return (\n                  <article className=\"ss-step\" key={step.number}>\n                    <span className=\"ss-step-number\">{step.number}</span>\n                    <h3>{step.title}</h3>\n                    <p>{step.copy}</p>\n                  </article>\n                );\n              })}\n            </div>\n          </div>\n        </section>\n\n        <section className=\"ss-section ss-about\" id=\"about-us\">\n          <div className=\"container ss-about-grid\">\n            <div className=\"ss-about-visual\">\n              <img src=\"https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200\" alt=\"An independent artist workspace with creative materials\" loading=\"lazy\" />\n              <div className=\"ss-about-note\">\n                <strong>Make room.</strong>\n                <span>For the work only you can make.</span>\n              </div>\n            </div>\n            <div className=\"ss-about-copy\">\n              <p className=\"ss-kicker\">A MARKETPLACE FOR MAKERS / 04</p>\n              <h2>Space is part of the <em>creative process.</em></h2>\n              <p>StudioSpace brings independent hosts and ambitious creators together. Find a room that suits the work, understand what is included and send a booking request with the details in view.</p>\n              <div className=\"ss-principles\">\n                <div className=\"ss-principle\">\n                  <span className=\"ss-principle-icon\"><MapPin size={17} /></span>\n                  <span><strong>Know the setting</strong><small>Location, capacity and access information in one place.</small></span>\n                </div>\n                <div className=\"ss-principle\">\n                  <span className=\"ss-principle-icon\"><Clock3 size={17} /></span>\n                  <span><strong>Understand the terms</strong><small>Rates, deposits and requested hours before you book.</small></span>\n                </div>\n                <div className=\"ss-principle\">\n                  <span className=\"ss-principle-icon\"><ShieldCheck size={17} /></span>\n                  <span><strong>Agree on responsibilities</strong><small>Hosts and creators clarify safety, access and coverage directly.</small></span>\n                </div>\n                <div className=\"ss-principle\">\n                  <span className=\"ss-principle-icon\"><Users size={17} /></span>\n                  <span><strong>Meet the host</strong><small>Account-linked host details help start a clear conversation.</small></span>\n                </div>\n              </div>\n            </div>\n          </div>\n        </section>\n\n        <section className=\"ss-host-band\">\n          <div className=\"container ss-host-band-inner\">\n            <div>\n              <p className=\"ss-kicker\">HAVE A SPACE WORTH SHARING?</p>\n              <h2>Your studio could be someone else’s starting point.</h2>\n              <p>Present your space with accurate details, clear expectations and the information a production team needs before sending a request.</p>\n            </div>\n            <Link href=\"/add-studio\" className=\"btn btn-dark\">List your space <ArrowUpRight size={17} /></Link>\n          </div>\n        </section>\n      </div>\n    </SiteShell>\n  );\n}\n");
mkdirSync("src/app/api/upload", { recursive: true });
writeFileSync("src/app/api/upload/route.ts", "import { NextResponse } from \"next/server\";\nimport { auth } from \"@/lib/auth\";\n\nexport const runtime = \"nodejs\";\n\nexport async function POST(request: Request) {\n  try {\n    const session = await auth.api.getSession({ headers: request.headers });\n    if (!session?.user) {\n      return NextResponse.json({ message: \"Sign in before uploading a studio image.\" }, { status: 401 });\n    }\n\n    const apiKey = process.env.IMGBB_API_KEY;\n    if (!apiKey) {\n      return NextResponse.json({ message: \"Image uploads are not configured yet. Add IMGBB_API_KEY to the frontend Vercel project, or paste a hosted image URL.\" }, { status: 503 });\n    }\n\n    const form = await request.formData();\n    const image = form.get(\"image\");\n    if (!image || typeof image === \"string\" || typeof image.size !== \"number\") {\n      return NextResponse.json({ message: \"Choose an image file to upload.\" }, { status: 400 });\n    }\n    if (!image.type.startsWith(\"image/\")) {\n      return NextResponse.json({ message: \"Only image files can be uploaded.\" }, { status: 415 });\n    }\n    if (image.size > 32_000_000) {\n      return NextResponse.json({ message: \"Choose an image smaller than 32 MB.\" }, { status: 413 });\n    }\n\n    const payload = new FormData();\n    payload.append(\"image\", image, image.name || \"studiospace-image\");\n    const upstream = await fetch(\"https://api.imgbb.com/1/upload?key=\" + encodeURIComponent(apiKey), {\n      method: \"POST\",\n      body: payload,\n      cache: \"no-store\"\n    });\n    const result = await upstream.json().catch(() => null);\n    const imageUrl = result?.data?.display_url || result?.data?.url;\n    if (!upstream.ok || result?.success !== true || typeof imageUrl !== \"string\") {\n      return NextResponse.json({ message: result?.error?.message || \"The image host could not complete the upload.\" }, { status: 502 });\n    }\n\n    return NextResponse.json({ data: { url: imageUrl } }, { status: 201, headers: { \"Cache-Control\": \"no-store\" } });\n  } catch {\n    return NextResponse.json({ message: \"The image upload could not be completed. Please try again.\" }, { status: 500 });\n  }\n}\n");
replaceOnce("src/app/add-studio/page.tsx", 'const [busy,setBusy]=useState(false);', 'const [busy,setBusy]=useState(false);const [uploading,setUploading]=useState(false);', "add studio image upload state");
replaceOnce("src/app/add-studio/page.tsx", 'async function submit(e:React.FormEvent){', "async function uploadImage(file: File) {\n  if (!file.type.startsWith(\"image/\")) {\n    toast.error(\"Choose an image file.\");\n    return;\n  }\n  if (file.size > 32_000_000) {\n    toast.error(\"Choose an image smaller than 32 MB.\");\n    return;\n  }\n  setUploading(true);\n  try {\n    const form = new FormData();\n    form.append(\"image\", file);\n    const response = await fetch(\"/api/upload\", { method: \"POST\", body: form });\n    const result = await response.json().catch(() => ({}));\n    if (!response.ok || typeof result?.data?.url !== \"string\") {\n      throw new Error(result?.message || \"Image upload failed.\");\n    }\n    set(\"imageUrl\", result.data.url);\n    toast.success(\"Studio image uploaded.\");\n  } catch (error) {\n    toast.error(error instanceof Error ? error.message : \"Image upload failed.\");\n  } finally {\n    setUploading(false);\n  }\n}\nasync function submit(e:React.FormEvent){", "add secure studio image upload handler");
replaceOnce("src/app/add-studio/page.tsx", 'async function submit(e:React.FormEvent){e.preventDefault();', 'async function submit(e:React.FormEvent){e.preventDefault();if(uploading){toast.error("Wait for the image upload to finish.");return;}', "prevent submit while image upload is running");
replaceOnce("src/app/add-studio/page.tsx", "<input required type=\"url\" maxLength={2048} aria-label=\"Studio cover image URL\" value={data.imageUrl} onChange={e=>set(\"imageUrl\",e.target.value)} placeholder=\"Paste an ImgBB or image URL\"/>", "<input required type=\"url\" maxLength={2048} aria-label=\"Studio cover image URL\" value={data.imageUrl} onChange={e=>set(\"imageUrl\",e.target.value)} placeholder=\"Paste an ImgBB or image URL\"/><div className=\"image-upload-control\"><span>{uploading ? \"Uploading image…\" : \"Choose an image from your device\"}</span><input type=\"file\" accept=\"image/jpeg,image/png,image/webp\" aria-label=\"Upload studio cover image\" disabled={uploading} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void uploadImage(file);e.currentTarget.value=\"\";}}/></div>{data.imageUrl && <img className=\"uploaded-image-preview\" src={data.imageUrl} alt=\"Studio cover preview\"/>}", "add ImgBB file upload control and preview");

// Fix the inherited oversized category badge/decorative overlay on listing photography.
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + "\n/* Studio directory card badge: keep category labels compact and prevent legacy decorative pseudo-elements from covering photography. */\n.studio-card .studio-image-wrap {\n  position: relative !important;\n  overflow: hidden !important;\n  isolation: isolate;\n}\n.studio-card .studio-image-wrap > a {\n  position: relative !important;\n  display: block !important;\n  width: 100% !important;\n  height: 100% !important;\n  overflow: hidden !important;\n  isolation: isolate;\n}\n.studio-card .studio-image-wrap::before,\n.studio-card .studio-image-wrap::after,\n.studio-card .studio-image-wrap > a::before,\n.studio-card .studio-image-wrap > a::after {\n  content: none !important;\n  display: none !important;\n}\n.studio-card .studio-image-wrap img {\n  position: relative !important;\n  z-index: 0 !important;\n  display: block !important;\n  width: 100% !important;\n  height: 100% !important;\n  object-fit: cover !important;\n}\n.studio-card .studio-image-wrap .category-pill {\n  position: absolute !important;\n  inset: auto auto 14px 14px !important;\n  display: inline-flex !important;\n  width: max-content !important;\n  min-width: 0 !important;\n  max-width: calc(100% - 28px) !important;\n  height: auto !important;\n  min-height: 0 !important;\n  max-height: none !important;\n  align-items: center !important;\n  padding: 7px 11px !important;\n  overflow: hidden !important;\n  border: 1px solid rgba(255,255,255,.68) !important;\n  border-radius: 999px !important;\n  background: rgba(25,29,26,.78) !important;\n  color: #fff !important;\n  font-size: .68rem !important;\n  font-weight: 800 !important;\n  letter-spacing: .055em !important;\n  line-height: 1.25 !important;\n  text-transform: uppercase !important;\n  white-space: nowrap !important;\n  transform: none !important;\n  z-index: 4 !important;\n  box-shadow: 0 4px 14px rgba(0,0,0,.16) !important;\n}\n.studio-card .studio-image-wrap .category-pill::before,\n.studio-card .studio-image-wrap .category-pill::after {\n  content: none !important;\n  display: none !important;\n}\n.studio-card .studio-image-wrap .save-button {\n  position: absolute !important;\n  top: 13px !important;\n  right: 13px !important;\n  z-index: 5 !important;\n}\n");
// Client feedback implementation: polished navigation, hero gradients, non-overlapping slider, vibrant sections and footer.
replaceOnce("src/components/navbar.tsx", '<header className="site-header">', '<header className="site-header nav-glass">', "glass navigation header");
replaceOnce("src/components/navbar.tsx", '<Link href="/register" className="btn btn-dark" onClick={closeMenus}>Register</Link>', '<Link href="/register" className="btn btn-register" onClick={closeMenus}>Register</Link>', "gradient Register CTA");
replaceOnce("src/app/page.tsx", 'import { Autoplay, EffectFade, Pagination } from "swiper/modules";', 'import { Autoplay, Pagination } from "swiper/modules";', "remove fade transition module");
replaceOnce("src/app/page.tsx", 'import "swiper/css/effect-fade";', "", "remove legacy fade effect stylesheet");
replaceOnce("src/app/page.tsx", 'modules={[Autoplay, EffectFade, Pagination]}\n            effect="fade"\n            loop\n            speed={850}', 'modules={[Autoplay, Pagination]}\n            loop\n            slidesPerView={1}\n            speed={720}', "use single-track slider to prevent ghost slides");
replaceOnce("src/app/page.tsx", '<h1>{slide.title}</h1>', '<h1>{slide.index === "01" ? <>Find the room <span className="ss-gradient-text">where the work happens.</span></> : slide.index === "02" ? <><span className="ss-gradient-text">The right</span> setting <span className="ss-gradient-text">changes the</span> whole shoot.</> : <>Your space has a story. <span className="ss-gradient-text">Give it a stage.</span></>}</h1>', "gradient hero heading highlights");
replaceOnce("src/app/page.tsx", 'className="ss-category-card" key={category}', 'className={"ss-category-card ss-category-card-tone-" + ((index % 5) + 1)} key={category}', "distinct category card colour accents");
replaceOnce("src/app/page.tsx", '<span className="ss-category-icon">', '<span className={"ss-category-icon ss-category-icon-tone-" + ((index % 5) + 1)}>', "distinct category icon colours");
replaceOnce("src/app/page.tsx", '<div>\n                      <strong>{categoryLabels[category] || category}</strong>\n                      <small>{categoryDescription(category)}</small>\n                    </div>', '<div className="ss-category-copy">\n                      <strong>{categoryLabels[category] || category}</strong>\n                      <small>{categoryDescription(category)}</small>\n                    </div>', "separate category title and description spacing");
replaceOnce("src/app/page.tsx", '<span className="ss-step-number">{step.number}</span>\n                    <h3>{step.title}</h3>', '<span className="ss-step-number">{step.number}</span>\n                    <span className="ss-step-icon"><Icon size={21} strokeWidth={1.8} /></span>\n                    <h3>{step.title}</h3>', "add glass step icons");
replaceOnce("src/app/page.tsx", '<h2>Your studio could be someone else’s starting point.</h2>', '<h2><span className="ss-gradient-text">Your studio</span> could be someone else’s starting point.</h2>', "gradient host CTA phrase");
replaceOnce("src/components/footer.tsx", 'import { Instagram, Linkedin, Facebook } from "lucide-react";', 'import { Github, Linkedin, Mail, Facebook } from "lucide-react";', "footer social icon imports");
{
    const footerPath = "src/components/footer.tsx";
    let footerSource = readFileSync(footerPath, "utf8");
    const socialStart = footerSource.indexOf('<div className="socials">');
    const socialClose = socialStart >= 0 ? footerSource.indexOf("</div>", socialStart) : -1;
    if (socialStart < 0 || socialClose < 0) throw new Error("Could not locate the footer social links block.");
    const replacement = '<div className="socials"><a href="https://github.com/Annika-Islam" aria-label="GitHub" target="_blank" rel="noopener noreferrer"><Github/></a><a href="https://www.linkedin.com/in/as-full-stack-dev/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer"><Linkedin/></a><a href="mailto:" aria-label="Email StudioSpace"><Mail/></a><a href="https://www.facebook.com" aria-label="Facebook" target="_blank" rel="noopener noreferrer"><Facebook/></a></div>';
    footerSource = footerSource.slice(0, socialStart) + replacement + footerSource.slice(socialClose + 6);
    writeFileSync(footerPath, footerSource);
  }
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + "\n/* Client-requested visual refinement: clear navigation, vivid sections and readable footer. */\n.site-header.nav-glass {\n  background: rgba(255, 254, 250, .86);\n  border-bottom: 1px solid rgba(25, 29, 26, .09);\n  box-shadow: 0 8px 28px rgba(25, 29, 26, .055);\n  backdrop-filter: blur(18px) saturate(150%);\n  -webkit-backdrop-filter: blur(18px) saturate(150%);\n}\n.dark .site-header.nav-glass {\n  background: rgba(21, 26, 23, .86);\n  border-bottom-color: rgba(255,255,255,.1);\n  box-shadow: 0 8px 28px rgba(0,0,0,.18);\n}\n.nav-link::after {\n  content: \"\";\n  position: absolute;\n  right: 0;\n  bottom: 2px;\n  left: 0;\n  height: 2px;\n  border-radius: 99px;\n  background: linear-gradient(90deg, #f18b57 0%, #df5a83 52%, #8b70dd 100%);\n  transform: scaleX(0);\n  transform-origin: left;\n  transition: transform .24s ease;\n}\n.nav-link:hover::after, .nav-link.active::after { transform: scaleX(1); }\n.btn-register {\n  border: 0 !important;\n  background: linear-gradient(110deg, #e66b4d 0%, #d65373 55%, #8a68cb 100%) !important;\n  color: #fff !important;\n  box-shadow: 0 7px 18px rgba(205, 81, 105, .2);\n}\n.btn-register:hover {\n  box-shadow: 0 10px 25px rgba(205, 81, 105, .32);\n  transform: translateY(-2px) scale(1.025);\n}\n.ss-hero-topline {\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 16px;\n  letter-spacing: .12em;\n}\n.ss-hero-topline span {\n  display: inline-flex;\n  min-height: 34px;\n  align-items: center;\n  padding: 7px 13px;\n  border: 1px solid rgba(25,29,26,.09);\n  border-radius: 999px;\n  background: rgba(255,254,250,.74);\n  color: #686b64;\n  font-size: .65rem;\n  letter-spacing: .12em;\n  box-shadow: 0 3px 10px rgba(25,29,26,.025);\n}\n.ss-hero-topline span:last-child {\n  border-color: rgba(223,90,67,.2);\n  background: rgba(223,90,67,.07);\n  color: #a74839;\n}\n.dark .ss-hero-topline span {\n  border-color: rgba(255,255,255,.13);\n  background: rgba(29,36,32,.76);\n  color: #dedbd2;\n}\n.dark .ss-hero-topline span:last-child {\n  border-color: rgba(240,141,118,.25);\n  background: rgba(240,141,118,.1);\n  color: #f5a18d;\n}\n.ss-hero-copy h1 .ss-gradient-text,\n.ss-gradient-text {\n  display: inline;\n  background: linear-gradient(105deg, #ffb36b 0%, #f17878 43%, #d98ad0 72%, #e7bd75 100%);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  -webkit-text-fill-color: transparent;\n}\n.ss-hero-swiper {\n  position: relative;\n  isolation: isolate;\n  overflow: hidden;\n}\n.ss-hero-swiper .swiper-wrapper { align-items: stretch; }\n.ss-hero-swiper .swiper-slide {\n  position: relative;\n  height: auto;\n  flex-shrink: 0;\n  overflow: hidden;\n}\n.ss-hero-panel { min-height: clamp(600px, 70vh, 720px); }\n.ss-hero-content {\n  box-sizing: border-box;\n  padding-top: clamp(116px, 14vh, 168px);\n  padding-bottom: clamp(88px, 10vh, 116px);\n}\n.ss-hero-image { z-index: 0; }\n.ss-hero-overlay { z-index: 1; }\n.ss-hero-content { position: relative; z-index: 2; }\n.ss-hero-swiper .swiper-pagination { z-index: 5; }\n.ss-hero-index { position: relative; z-index: 3; }\n.ss-category-section {\n  position: relative;\n  isolation: isolate;\n  overflow: hidden;\n  background:\n    radial-gradient(ellipse at 8% 14%, rgba(237, 147, 111, .17), transparent 33%),\n    radial-gradient(ellipse at 88% 20%, rgba(123, 145, 210, .18), transparent 34%),\n    radial-gradient(ellipse at 54% 100%, rgba(191, 139, 194, .15), transparent 38%),\n    linear-gradient(135deg, #f0ece5 0%, #f7f3ef 52%, #ebe9e5 100%);\n}\n.ss-category-grid { position: relative; z-index: 1; gap: 14px; }\n.ss-category-card {\n  min-height: 198px;\n  justify-content: flex-start;\n  gap: 18px;\n  border-color: rgba(45, 47, 43, .09);\n  background: rgba(255,254,250,.82);\n  box-shadow: 0 9px 26px rgba(33, 37, 33, .04);\n  backdrop-filter: blur(10px);\n}\n.ss-category-card:hover {\n  border-color: rgba(217, 91, 106, .26);\n  transform: translateY(-6px);\n  box-shadow: 0 17px 35px rgba(33,37,33,.1);\n}\n.ss-category-icon {\n  width: 50px;\n  height: 50px;\n  border: 1px solid rgba(255,255,255,.68);\n  border-radius: 15px;\n  box-shadow: inset 0 1px 0 rgba(255,255,255,.65), 0 6px 15px rgba(40,40,40,.07);\n}\n.ss-category-icon-tone-1 { background: linear-gradient(140deg,#ffe1d1,#f5a68b); color: #9d4834; }\n.ss-category-icon-tone-2 { background: linear-gradient(140deg,#ffe6d1,#f5be78); color: #92541d; }\n.ss-category-icon-tone-3 { background: linear-gradient(140deg,#dcecf4,#91c6d4); color: #245c74; }\n.ss-category-icon-tone-4 { background: linear-gradient(140deg,#e8def8,#b99be2); color: #60428d; }\n.ss-category-icon-tone-5 { background: linear-gradient(140deg,#dcebe0,#9ac8ad); color: #326247; }\n.ss-category-card-tone-1 { background: linear-gradient(145deg,rgba(255,251,246,.96),rgba(255,236,226,.9)); }\n.ss-category-card-tone-2 { background: linear-gradient(145deg,rgba(255,251,245,.96),rgba(250,239,223,.92)); }\n.ss-category-card-tone-3 { background: linear-gradient(145deg,rgba(249,253,255,.96),rgba(226,241,246,.92)); }\n.ss-category-card-tone-4 { background: linear-gradient(145deg,rgba(252,249,255,.96),rgba(238,230,250,.92)); }\n.ss-category-card-tone-5 { background: linear-gradient(145deg,rgba(249,253,249,.96),rgba(227,241,231,.92)); }\n.ss-category-copy {\n  display: flex;\n  flex: 1;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 9px;\n  padding-right: 14px;\n}\n.ss-category-card .ss-category-copy strong {\n  display: block;\n  max-width: 100%;\n  font-size: 1.06rem;\n  line-height: 1.2;\n}\n.ss-category-card .ss-category-copy small {\n  display: block;\n  max-width: 24ch;\n  margin: 0;\n  color: #686d68;\n  font-size: .79rem;\n  line-height: 1.5;\n}\n.ss-category-arrow { transition: transform .22s ease, color .22s ease; }\n.ss-category-card:hover .ss-category-arrow {\n  color: #c74e61;\n  transform: translate(3px,-3px);\n}\n.ss-steps {\n  position: relative;\n  isolation: isolate;\n  overflow: hidden;\n  background:\n    radial-gradient(ellipse at 10% 14%, rgba(220, 105, 100, .19), transparent 32%),\n    radial-gradient(ellipse at 90% 18%, rgba(119, 106, 197, .22), transparent 35%),\n    radial-gradient(ellipse at 52% 105%, rgba(64, 150, 142, .13), transparent 42%),\n    #171f1e;\n}\n.ss-steps::before, .ss-steps::after {\n  position: absolute;\n  z-index: -1;\n  width: 300px;\n  height: 300px;\n  border-radius: 50%;\n  filter: blur(65px);\n  opacity: .16;\n  content: \"\";\n  pointer-events: none;\n}\n.ss-steps::before { top: 4%; left: -180px; background: #fa846b; }\n.ss-steps::after { right: -170px; bottom: -8%; background: #9580ed; }\n.ss-steps .ss-section-head h2 em {\n  background: linear-gradient(100deg,#ffb36b,#f17891 55%,#bd9bf0);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  -webkit-text-fill-color: transparent;\n}\n.ss-steps-grid {\n  position: relative;\n  gap: 15px;\n  margin-top: 42px;\n  border-top: 0;\n}\n.ss-step {\n  position: relative;\n  min-height: 258px;\n  padding: 25px 22px 24px !important;\n  overflow: hidden;\n  border: 1px solid rgba(255,255,255,.15) !important;\n  border-radius: 18px;\n  background: linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.025));\n  box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 12px 26px rgba(0,0,0,.1);\n  backdrop-filter: blur(14px);\n  transition: transform .24s ease, border-color .24s ease, box-shadow .24s ease;\n}\n.ss-step::before {\n  position: absolute;\n  top: 0;\n  right: 18px;\n  left: 18px;\n  height: 3px;\n  border-radius: 0 0 8px 8px;\n  background: linear-gradient(90deg,#f7a46c,#e16b8f,#9983e8);\n  content: \"\";\n}\n.ss-step:hover {\n  transform: translateY(-6px);\n  border-color: rgba(245,150,151,.48) !important;\n  box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 20px 38px rgba(0,0,0,.2);\n}\n.ss-step-number {\n  display: block;\n  width: max-content;\n  background: linear-gradient(105deg,#ffbd7b,#f17b8f 54%,#ae99f0);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  -webkit-text-fill-color: transparent;\n  font-family: \"Manrope\",sans-serif;\n  font-size: 2.1rem;\n  font-weight: 800;\n  letter-spacing: -.06em;\n}\n.ss-step-icon {\n  display: inline-grid;\n  width: 42px;\n  height: 42px;\n  place-items: center;\n  margin-top: 20px;\n  border: 1px solid rgba(255,255,255,.13);\n  border-radius: 13px;\n  background: linear-gradient(145deg,rgba(245,139,120,.23),rgba(153,131,232,.18));\n  color: #ffd0bd;\n}\n.ss-step h3 { margin: 14px 0 9px; }\n.ss-step p { max-width: 28ch; font-size: .91rem; }\n.ss-host-band {\n  position: relative;\n  overflow: hidden;\n  background:\n    radial-gradient(ellipse at 84% 8%,rgba(180,127,218,.19),transparent 34%),\n    radial-gradient(ellipse at 12% 90%,rgba(235,112,101,.2),transparent 34%),\n    linear-gradient(110deg,#f0ded4 0%,#eee2e5 52%,#e5e0ef 100%);\n}\n.ss-host-band h2 .ss-gradient-text {\n  background: linear-gradient(100deg,#e56b45 0%,#d94d80 52%,#875dc4 100%);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n  -webkit-text-fill-color: transparent;\n}\n.site-footer .footer-copy { max-width: 390px; font-size: .97rem; line-height: 1.75; }\n.site-footer h4 {\n  margin: 0 0 18px;\n  color: #fff;\n  font-size: 1rem;\n  font-weight: 700;\n  letter-spacing: .12em;\n  text-transform: uppercase;\n}\n.site-footer .footer-grid > div > a:not(.brand),\n.site-footer .footer-grid > div > p,\n.site-footer .footer-grid > div > form,\n.site-footer .footer-grid > div > small { font-size: .94rem; }\n.site-footer .footer-grid > div > a:not(.brand) { line-height: 1.8; }\n.site-footer input { min-height: 48px; padding: 11px 14px; font-size: .95rem; }\n.site-footer button { min-height: 46px; font-size: .92rem; }\n.site-footer .socials { display: flex; align-items: center; gap: 11px; margin-top: 23px; }\n.site-footer .socials a {\n  width: 44px; height: 44px; border-color: rgba(255,255,255,.24);\n  border-radius: 50%; background: rgba(255,255,255,.045); color: #fff;\n  transition: transform .2s ease, background .2s ease, border-color .2s ease;\n}\n.site-footer .socials a:hover { transform: translateY(-3px); border-color: #ee9b83; background: rgba(238,155,131,.14); }\n.site-footer .socials svg { width: 20px; height: 20px; stroke-width: 1.9; }\n.dark .ss-category-section {\n  background: radial-gradient(ellipse at 8% 14%,rgba(237,147,111,.11),transparent 33%),radial-gradient(ellipse at 88% 20%,rgba(123,145,210,.13),transparent 34%),#1b231f;\n}\n.dark .ss-category-card-tone-1,.dark .ss-category-card-tone-2,.dark .ss-category-card-tone-3,.dark .ss-category-card-tone-4,.dark .ss-category-card-tone-5 {\n  border-color: rgba(255,255,255,.1); background: rgba(35,43,38,.88);\n}\n.dark .ss-category-card .ss-category-copy small { color: #bfc5bc; }\n@media (max-width: 980px) {\n  .ss-category-grid { grid-template-columns: repeat(3,minmax(0,1fr)); }\n  .ss-step { min-height: 250px; }\n}\n@media (max-width: 720px) {\n  .ss-hero-panel { min-height: 650px; }\n  .ss-category-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }\n  .ss-steps-grid { grid-template-columns: 1fr 1fr; gap: 12px; }\n  .ss-step { min-height: 235px; padding: 22px 17px !important; }\n  .site-footer .socials { gap: 9px; }\n}\n@media (max-width: 440px) {\n  .ss-category-grid { grid-template-columns: 1fr; }\n  .ss-category-card { min-height: 156px; }\n  .ss-steps-grid { grid-template-columns: 1fr; }\n  .ss-step { min-height: 205px; }\n}\n@media (prefers-reduced-motion: reduce) {\n  .nav-link::after, .ss-category-card, .ss-step, .ss-category-arrow { transition: none; }\n}\n");
console.log("StudioSpace client-requested UI/UX refinements applied.");

console.log("StudioSpace editorial brand, homepage and secure ImgBB upload patches applied.");


// StudioSpace account experience and optional email OTP verification.
writeFileSync("src/lib/auth.ts", "import { betterAuth } from \"better-auth\";\nimport { mongodbAdapter } from \"@better-auth/mongo-adapter\";\nimport { emailOTP, jwt, twoFactor } from \"better-auth/plugins\";\nimport { db } from \"@/lib/mongodb\";\n\nconst baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || \"http://localhost:3000\";\nconst emailOtpEnabled = Boolean(process.env.RESEND_API_KEY && process.env.AUTH_FROM_EMAIL);\n\nasync function sendStudioSpaceCode({ email, otp, type }: { email: string; otp: string; type: string }) {\n  const apiKey = process.env.RESEND_API_KEY;\n  const from = process.env.AUTH_FROM_EMAIL;\n  if (!apiKey || !from) {\n    throw new Error(\"Email code delivery is not configured. Add RESEND_API_KEY and AUTH_FROM_EMAIL in Vercel.\");\n  }\n\n  const heading = type === \"email-verification\"\n    ? \"Confirm your email address\"\n    : type === \"sign-in\"\n      ? \"Your sign-in code\"\n      : \"Reset your StudioSpace password\";\n  const explanation = type === \"email-verification\"\n    ? \"Enter this code to verify your email and finish creating your StudioSpace account.\"\n    : type === \"sign-in\"\n      ? \"Enter this code on the StudioSpace sign-in page to access your account.\"\n      : \"Enter this code to continue resetting your StudioSpace password.\";\n\n  const html = [\n    '<div style=\"margin:0;padding:36px 16px;background:#f4f1eb;font-family:Arial,sans-serif;color:#191d1a\">',\n    '<div style=\"max-width:520px;margin:0 auto;padding:34px;background:#fffefa;border:1px solid #e2ded5;border-radius:18px\">',\n    '<p style=\"margin:0 0 22px;color:#c15142;font-size:12px;font-weight:700;letter-spacing:2px\">STUDIOSPACE ACCOUNT SECURITY</p>',\n    '<h1 style=\"margin:0 0 12px;font-size:26px;line-height:1.2\">' + heading + '</h1>',\n    '<p style=\"margin:0;color:#686d66;font-size:15px;line-height:1.7\">' + explanation + '</p>',\n    '<div style=\"margin:28px 0;padding:19px 12px;border-radius:12px;background:#f3eee7;text-align:center;color:#191d1a;font-size:34px;font-weight:800;letter-spacing:10px\">' + otp + '</div>',\n    '<p style=\"margin:0;color:#777a72;font-size:13px;line-height:1.6\">This code expires in five minutes. If you did not request it, you can ignore this message.</p>',\n    '<p style=\"margin:28px 0 0;color:#777a72;font-size:12px\">StudioSpace, Creative spaces shared.</p>',\n    '</div></div>'\n  ].join(\"\");\n\n  const response = await fetch(\"https://api.resend.com/emails\", {\n    method: \"POST\",\n    headers: { Authorization: \"Bearer \" + apiKey, \"Content-Type\": \"application/json\" },\n    body: JSON.stringify({\n      from,\n      to: [email],\n      subject: heading + \" | StudioSpace\",\n      html,\n      text: heading + \". \" + explanation + \" Your code is \" + otp + \". It expires in five minutes.\"\n    }),\n    cache: \"no-store\"\n  });\n\n  if (!response.ok) {\n    const detail = await response.text().catch(() => \"\");\n    console.error(\"StudioSpace email delivery failed:\", response.status, detail.slice(0, 240));\n    throw new Error(\"We could not send the email code. Please try again shortly.\");\n  }\n}\n\nexport const auth = betterAuth({\n  baseURL,\n  secret: process.env.BETTER_AUTH_SECRET || \"development-only-secret-change-before-deploy-32chars\",\n  database: mongodbAdapter(db),\n  trustedOrigins: [baseURL, \"http://localhost:3000\"],\n  emailAndPassword: {\n    enabled: true,\n    minPasswordLength: 8,\n    requireEmailVerification: emailOtpEnabled\n  },\n  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {\n    google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }\n  } : {},\n  plugins: [\n    emailOTP({\n      overrideDefaultEmailVerification: true,\n      sendVerificationOnSignUp: emailOtpEnabled,\n      disableSignUp: true,\n      otpLength: 6,\n      expiresIn: 300,\n      allowedAttempts: 5,\n      storeOTP: \"hashed\",\n      async sendVerificationOTP({ email, otp, type }) {\n        await sendStudioSpaceCode({ email, otp, type });\n      }\n    }),\n    jwt({\n      jwt: {\n        definePayload: ({ user }) => ({\n          id: user.id,\n          email: user.email.toLowerCase(),\n          name: user.name,\n        }),\n      },\n    }),\n    twoFactor({ issuer: \"StudioSpace\", allowPasswordless: true, backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: \"encrypted\" } })\n  ],\n  advanced: { useSecureCookies: process.env.NODE_ENV === \"production\" },\n});\n");
writeFileSync("src/lib/auth-client.ts", "\"use client\";\nimport { createAuthClient } from \"better-auth/react\";\nimport { emailOTPClient, jwtClient, twoFactorClient } from \"better-auth/client/plugins\";\n\nexport const authClient = createAuthClient({\n  plugins: [jwtClient(), emailOTPClient(), twoFactorClient({ twoFactorPage: \"/two-factor\" })]\n});\n\nexport async function syncAuthCookie() {\n  const { data, error } = await authClient.token();\n  if (error || !data?.token) throw new Error(error?.message || \"Could not create secure API session.\");\n  const response = await fetch(\"/api/auth/cookie\", {\n    method: \"POST\",\n    headers: { \"Content-Type\": \"application/json\" },\n    body: JSON.stringify({ token: data.token })\n  });\n  if (!response.ok) throw new Error(\"Could not establish the secure API session.\");\n}\n");
writeFileSync("src/app/login/login-client.tsx", "\"use client\";\n\nimport Link from \"next/link\";\nimport { useMemo, useState } from \"react\";\nimport { useRouter, useSearchParams } from \"next/navigation\";\nimport { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from \"lucide-react\";\nimport { toast } from \"sonner\";\nimport { SiteShell } from \"@/components/site-shell\";\nimport { authClient, syncAuthCookie } from \"@/lib/auth-client\";\n\nfunction safeInternalCallback(value: string | null): string {\n  if (!value || !value.startsWith(\"/\") || value.startsWith(\"//\") || value.includes(\"\\\\\")) return \"/\";\n  try {\n    const base = \"https://studiospace.invalid\";\n    const parsed = new URL(value, base);\n    if (parsed.origin !== base) return \"/\";\n    return parsed.pathname + parsed.search + parsed.hash;\n  } catch {\n    return \"/\";\n  }\n}\n\nexport default function LoginPage() {\n  const router = useRouter();\n  const search = useSearchParams();\n  const callback = useMemo(() => safeInternalCallback(search.get(\"callbackUrl\")), [search]);\n  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === \"true\";\n  const [email, setEmail] = useState(\"\");\n  const [password, setPassword] = useState(\"\");\n  const [otp, setOtp] = useState(\"\");\n  const [mode, setMode] = useState<\"password\" | \"code\">(\"password\");\n  const [codeSent, setCodeSent] = useState(false);\n  const [busy, setBusy] = useState(false);\n\n  async function finishLogin() {\n    await syncAuthCookie();\n    toast.success(\"Welcome back.\");\n    router.push(callback);\n    router.refresh();\n  }\n\n  async function loginWithPassword(event: React.FormEvent) {\n    event.preventDefault();\n    setBusy(true);\n    try {\n      const result = await authClient.signIn.email({ email: email.trim(), password });\n      if (result.error) throw new Error(result.error.message || \"Unable to sign in.\");\n      await finishLogin();\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Unable to sign in.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function sendCode() {\n    if (!email.trim()) {\n      toast.error(\"Enter your email address first.\");\n      return;\n    }\n    setBusy(true);\n    try {\n      const result = await authClient.emailOtp.sendVerificationOtp({\n        email: email.trim(),\n        type: \"sign-in\"\n      });\n      if (result.error) throw new Error(result.error.message || \"Could not send a sign-in code.\");\n      setCodeSent(true);\n      toast.success(\"Your sign-in code is on its way.\");\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Could not send a sign-in code.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function verifyCode(event: React.FormEvent) {\n    event.preventDefault();\n    if (!/^\\d{6}$/.test(otp)) {\n      toast.error(\"Enter the six digit code from your email.\");\n      return;\n    }\n    setBusy(true);\n    try {\n      const result = await authClient.signIn.emailOtp({ email: email.trim(), otp: otp.trim() });\n      if (result.error) throw new Error(result.error.message || \"That code could not be verified.\");\n      await finishLogin();\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"That code could not be verified.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  return (\n    <SiteShell>\n      <section className=\"auth-page auth-v2\">\n        <div className=\"auth-v2-shell\">\n          <aside className=\"auth-v2-visual\">\n            <Link href=\"/\" className=\"auth-v2-brand\">\n              <img src=\"/studiospace-mark.svg\" alt=\"\" />\n              <span>studio<strong>space</strong><small>CREATIVE SPACES, SHARED</small></span>\n            </Link>\n            <div className=\"auth-v2-story\">\n              <span className=\"eyebrow\">GOOD TO SEE YOU AGAIN</span>\n              <h2>Your next idea is waiting for the <em>right space.</em></h2>\n              <p>Sign in to save studios, manage booking requests and keep your creative plans moving.</p>\n            </div>\n            <div className=\"auth-v2-proof\">\n              <span>Spaces worth discovering</span>\n              <span>Bookings made clearer</span>\n            </div>\n          </aside>\n\n          <div className=\"auth-v2-panel\">\n            <Link href=\"/\" className=\"back-link\"><ArrowLeft size={16} /> Back to StudioSpace</Link>\n            <span className=\"eyebrow\">MEMBER ACCESS</span>\n            <h1>Welcome back.</h1>\n            <p className=\"auth-v2-intro\">Sign in to pick up where your creative work left off.</p>\n\n            {otpEnabled && (\n              <div className=\"auth-v2-switch\" aria-label=\"Choose sign in method\">\n                <button type=\"button\" aria-pressed={mode === \"password\"} onClick={() => { setMode(\"password\"); setCodeSent(false); }}>Password</button>\n                <button type=\"button\" aria-pressed={mode === \"code\"} onClick={() => { setMode(\"code\"); setCodeSent(false); }}>Email code</button>\n              </div>\n            )}\n\n            {mode === \"password\" ? (\n              <form className=\"auth-v2-form\" onSubmit={loginWithPassword}>\n                <div className=\"auth-v2-field\">\n                  <label htmlFor=\"login-email\">Email address</label>\n                  <input className=\"auth-v2-input\" id=\"login-email\" type=\"email\" autoComplete=\"email\" required value={email} onChange={event => setEmail(event.target.value)} placeholder=\"you@example.com\" />\n                </div>\n                <div className=\"auth-v2-field\">\n                  <label htmlFor=\"login-password\">Password</label>\n                  <input className=\"auth-v2-input\" id=\"login-password\" type=\"password\" autoComplete=\"current-password\" required value={password} onChange={event => setPassword(event.target.value)} placeholder=\"Enter your password\" />\n                </div>\n                <button className=\"auth-v2-primary\" type=\"submit\" disabled={busy}>\n                  {busy ? \"Signing in...\" : \"Sign in\"} <ArrowRight size={17} />\n                </button>\n              </form>\n            ) : !codeSent ? (\n              <form className=\"auth-v2-form\" onSubmit={event => { event.preventDefault(); void sendCode(); }}>\n                <div className=\"auth-v2-field\">\n                  <label htmlFor=\"login-code-email\">Email address</label>\n                  <input className=\"auth-v2-input\" id=\"login-code-email\" type=\"email\" autoComplete=\"email\" required value={email} onChange={event => setEmail(event.target.value)} placeholder=\"you@example.com\" />\n                </div>\n                <button className=\"auth-v2-primary\" type=\"submit\" disabled={busy}>\n                  {busy ? \"Sending code...\" : \"Send sign in code\"} <Mail size={17} />\n                </button>\n              </form>\n            ) : (\n              <form className=\"auth-v2-form\" onSubmit={verifyCode}>\n                <div className=\"auth-v2-field\">\n                  <label htmlFor=\"login-otp\">Six digit code</label>\n                  <input className=\"auth-v2-input otp\" id=\"login-otp\" type=\"text\" inputMode=\"numeric\" autoComplete=\"one-time-code\" pattern=\"[0-9]{6}\" maxLength={6} required value={otp} onChange={event => setOtp(event.target.value.replace(/\\D/g, \"\").slice(0, 6))} placeholder=\"000000\" />\n                </div>\n                <button className=\"auth-v2-primary\" type=\"submit\" disabled={busy || otp.length !== 6}>\n                  {busy ? \"Checking code...\" : \"Verify and sign in\"} <ShieldCheck size={17} />\n                </button>\n                <button className=\"auth-v2-resend\" type=\"button\" disabled={busy} onClick={() => void sendCode()}>Send a new code</button>\n              </form>\n            )}\n\n            {!otpEnabled && (\n              <div className=\"auth-v2-note\"><KeyRound size={16} /> Email code sign in will appear once the verified sender is configured for StudioSpace.</div>\n            )}\n            <p className=\"auth-v2-bottom\">New to StudioSpace? <Link href=\"/register\">Create an account</Link></p>\n          </div>\n        </div>\n      </section>\n    </SiteShell>\n  );\n}\n");
writeFileSync("src/app/register/page.tsx", "\"use client\";\n\nimport Link from \"next/link\";\nimport { useState } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck, UserRound } from \"lucide-react\";\nimport { toast } from \"sonner\";\nimport { SiteShell } from \"@/components/site-shell\";\nimport { authClient, syncAuthCookie } from \"@/lib/auth-client\";\n\nexport default function RegisterPage() {\n  const router = useRouter();\n  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === \"true\";\n  const [name, setName] = useState(\"\");\n  const [email, setEmail] = useState(\"\");\n  const [image, setImage] = useState(\"\");\n  const [password, setPassword] = useState(\"\");\n  const [otp, setOtp] = useState(\"\");\n  const [step, setStep] = useState<\"details\" | \"verify\">(\"details\");\n  const [busy, setBusy] = useState(false);\n\n  const rules = {\n    length: password.length >= 8,\n    upper: /[A-Z]/.test(password),\n    lower: /[a-z]/.test(password),\n    number: /\\d/.test(password)\n  };\n  const passwordValid = Object.values(rules).every(Boolean);\n\n  async function createAccount(event: React.FormEvent) {\n    event.preventDefault();\n    if (!passwordValid) {\n      toast.error(\"Please meet each password requirement.\");\n      return;\n    }\n    setBusy(true);\n    try {\n      const result = await authClient.signUp.email({\n        name: name.trim(),\n        email: email.trim(),\n        password,\n        image: image.trim() || undefined\n      });\n      if (result.error) throw new Error(result.error.message || \"Could not create your account.\");\n\n      if (otpEnabled) {\n        setStep(\"verify\");\n        toast.success(\"A six digit verification code has been sent to your email.\");\n      } else {\n        await syncAuthCookie();\n        toast.success(\"Your account is ready. You can now sign in.\");\n        router.push(\"/login\");\n        router.refresh();\n      }\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Could not create your account.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function verifyEmail(event: React.FormEvent) {\n    event.preventDefault();\n    if (!/^\\d{6}$/.test(otp)) {\n      toast.error(\"Enter the six digit code from your email.\");\n      return;\n    }\n    setBusy(true);\n    try {\n      const verification = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp: otp.trim() });\n      if (verification.error) throw new Error(verification.error.message || \"That code could not be verified.\");\n      const login = await authClient.signIn.email({ email: email.trim(), password });\n      if (login.error) throw new Error(\"Your email is verified. Please sign in with your password.\");\n      await syncAuthCookie();\n      toast.success(\"Your email is verified. Welcome to StudioSpace.\");\n      router.push(\"/\");\n      router.refresh();\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Email verification could not be completed.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  async function resendCode() {\n    setBusy(true);\n    try {\n      const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: \"email-verification\" });\n      if (result.error) throw new Error(result.error.message || \"Could not send a new code.\");\n      toast.success(\"A new verification code has been sent.\");\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Could not send a new code.\");\n    } finally {\n      setBusy(false);\n    }\n  }\n\n  return (\n    <SiteShell>\n      <section className=\"auth-page auth-v2\">\n        <div className=\"auth-v2-shell\">\n          <aside className=\"auth-v2-visual\">\n            <Link href=\"/\" className=\"auth-v2-brand\">\n              <img src=\"/studiospace-mark.svg\" alt=\"\" />\n              <span>studio<strong>space</strong><small>CREATIVE SPACES, SHARED</small></span>\n            </Link>\n            <div className=\"auth-v2-story\">\n              <span className=\"eyebrow\">A PLACE FOR YOUR NEXT CHAPTER</span>\n              <h2>Make room for the work <em>you want to make.</em></h2>\n              <p>Join a community of creators and hosts who bring good ideas to life in the right spaces.</p>\n            </div>\n            <div className=\"auth-v2-proof\">\n              <span>Discover your next setting</span>\n              <span>Share a space of your own</span>\n            </div>\n          </aside>\n\n          <div className=\"auth-v2-panel\">\n            <Link href=\"/\" className=\"back-link\"><ArrowLeft size={16} /> Back to StudioSpace</Link>\n\n            {step === \"details\" ? (\n              <>\n                <span className=\"eyebrow\">JOIN THE COMMUNITY</span>\n                <h1>Create your account.</h1>\n                <p className=\"auth-v2-intro\">Set up your member profile to save studios and send booking requests.</p>\n                <form className=\"auth-v2-form\" onSubmit={createAccount}>\n                  <div className=\"auth-v2-field\">\n                    <label htmlFor=\"register-name\">Your name</label>\n                    <input className=\"auth-v2-input\" id=\"register-name\" autoComplete=\"name\" required value={name} onChange={event => setName(event.target.value)} placeholder=\"Your full name\" />\n                  </div>\n                  <div className=\"auth-v2-field\">\n                    <label htmlFor=\"register-email\">Email address</label>\n                    <input className=\"auth-v2-input\" id=\"register-email\" type=\"email\" autoComplete=\"email\" required value={email} onChange={event => setEmail(event.target.value)} placeholder=\"you@example.com\" />\n                  </div>\n                  <div className=\"auth-v2-field\">\n                    <label htmlFor=\"register-image\">Profile image URL <span>(optional)</span></label>\n                    <input className=\"auth-v2-input\" id=\"register-image\" type=\"url\" value={image} onChange={event => setImage(event.target.value)} placeholder=\"https://example.com/photo.jpg\" />\n                  </div>\n                  <div className=\"auth-v2-field\">\n                    <label htmlFor=\"register-password\">Create a password</label>\n                    <input className=\"auth-v2-input\" id=\"register-password\" type=\"password\" autoComplete=\"new-password\" required value={password} onChange={event => setPassword(event.target.value)} placeholder=\"At least 8 characters\" />\n                    <div className=\"auth-v2-password-rules\">\n                      <span className={rules.length ? \"valid\" : \"\"}>8 characters</span>\n                      <span className={rules.upper ? \"valid\" : \"\"}>Uppercase</span>\n                      <span className={rules.lower ? \"valid\" : \"\"}>Lowercase</span>\n                      <span className={rules.number ? \"valid\" : \"\"}>Number</span>\n                    </div>\n                  </div>\n                  <button className=\"auth-v2-primary\" type=\"submit\" disabled={busy || !passwordValid}>\n                    {busy ? \"Creating account...\" : \"Create account\"} <ArrowRight size={17} />\n                  </button>\n                </form>\n                {otpEnabled ? (\n                  <div className=\"auth-v2-note\"><ShieldCheck size={16} /> We will send a one time code to confirm that this email belongs to you.</div>\n                ) : (\n                  <div className=\"auth-v2-note\"><Mail size={16} /> Email verification codes will be enabled after the StudioSpace sender is configured.</div>\n                )}\n                <p className=\"auth-v2-bottom\">Already a member? <Link href=\"/login\">Sign in</Link></p>\n              </>\n            ) : (\n              <>\n                <span className=\"eyebrow\">ONE LAST STEP</span>\n                <h1>Check your inbox.</h1>\n                <p className=\"auth-v2-intro\">Enter the six digit code sent to <strong>{email}</strong>. The code is valid for five minutes.</p>\n                <form className=\"auth-v2-form\" onSubmit={verifyEmail}>\n                  <div className=\"auth-v2-field\">\n                    <label htmlFor=\"register-otp\">Email verification code</label>\n                    <input className=\"auth-v2-input otp\" id=\"register-otp\" type=\"text\" inputMode=\"numeric\" autoComplete=\"one-time-code\" pattern=\"[0-9]{6}\" maxLength={6} required value={otp} onChange={event => setOtp(event.target.value.replace(/\\D/g, \"\").slice(0, 6))} placeholder=\"000000\" />\n                  </div>\n                  <button className=\"auth-v2-primary\" type=\"submit\" disabled={busy || otp.length !== 6}>\n                    {busy ? \"Verifying...\" : \"Verify email and continue\"} <CheckCircle2 size={17} />\n                  </button>\n                  <button className=\"auth-v2-resend\" type=\"button\" disabled={busy} onClick={() => void resendCode()}>Send a new code</button>\n                </form>\n                <button className=\"auth-v2-secondary\" type=\"button\" onClick={() => { setStep(\"details\"); setOtp(\"\"); }}> <ArrowLeft size={16} /> Edit account details</button>\n              </>\n            )}\n          </div>\n        </div>\n      </section>\n    </SiteShell>\n  );\n}\n");
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + "\n/* StudioSpace account pages: a distinct editorial identity with clear, accessible forms. */\n.auth-page.auth-v2 {\n  display: block;\n  min-height: 0;\n  padding: clamp(36px, 6vw, 76px) 22px;\n  background:\n    radial-gradient(ellipse at 4% 8%, rgba(227,105,81,.13), transparent 30%),\n    radial-gradient(ellipse at 96% 18%, rgba(137,112,203,.12), transparent 32%),\n    #f2efe9;\n}\n.auth-v2-shell {\n  width: min(1120px, 100%);\n  min-height: 690px;\n  display: grid;\n  grid-template-columns: 1.02fr .98fr;\n  margin: 0 auto;\n  overflow: hidden;\n  border: 1px solid rgba(25,29,26,.1);\n  border-radius: 26px;\n  background: #fffefa;\n  box-shadow: 0 28px 90px rgba(31,34,29,.13);\n}\n.auth-v2-visual {\n  position: relative;\n  display: flex;\n  min-height: 690px;\n  flex-direction: column;\n  justify-content: space-between;\n  padding: clamp(30px, 4vw, 52px);\n  overflow: hidden;\n  isolation: isolate;\n  background:\n    linear-gradient(180deg,rgba(17,24,21,.4) 0%,rgba(17,24,21,.18) 30%,rgba(17,24,21,.86) 100%),\n    url(\"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1500&auto=format&fit=crop&q=85\") center/cover;\n  color: #fff;\n}\n.auth-v2-visual::before {\n  position: absolute;\n  z-index: -1;\n  inset: 0;\n  background:\n    radial-gradient(circle at 12% 22%,rgba(238,135,105,.45),transparent 29%),\n    radial-gradient(circle at 86% 20%,rgba(148,123,211,.34),transparent 30%);\n  content: \"\";\n  mix-blend-mode: screen;\n}\n.auth-v2-brand {\n  display: inline-flex;\n  width: max-content;\n  align-items: center;\n  gap: 12px;\n  color: #fff;\n  text-decoration: none;\n}\n.auth-v2-brand img { width: 46px; height: 46px; }\n.auth-v2-brand span { font-family: \"Manrope\",sans-serif; font-size: 1.18rem; font-weight: 800; letter-spacing: -.065em; }\n.auth-v2-brand span strong { color: #f5a18d; }\n.auth-v2-brand small {\n  display: block;\n  margin-top: 4px;\n  color: rgba(255,255,255,.7);\n  font-family: \"DM Sans\",sans-serif;\n  font-size: .52rem;\n  font-weight: 700;\n  letter-spacing: .16em;\n}\n.auth-v2-story { position: relative; z-index: 1; max-width: 520px; }\n.auth-v2-story .eyebrow { color: #ffb49c; }\n.auth-v2-story h2 {\n  margin: 18px 0;\n  color: #fff;\n  font-family: \"Playfair Display\",Georgia,serif;\n  font-size: clamp(2.8rem,4.6vw,4.6rem);\n  font-weight: 600;\n  letter-spacing: -.055em;\n  line-height: .99;\n}\n.auth-v2-story h2 em {\n  color: #ffb49c;\n  font-weight: 600;\n}\n.auth-v2-story p {\n  max-width: 420px;\n  color: rgba(255,255,255,.8);\n  font-size: .98rem;\n  line-height: 1.8;\n}\n.auth-v2-proof {\n  position: relative;\n  z-index: 1;\n  display: flex;\n  flex-wrap: wrap;\n  gap: 9px;\n}\n.auth-v2-proof span {\n  padding: 8px 12px;\n  border: 1px solid rgba(255,255,255,.22);\n  border-radius: 999px;\n  background: rgba(255,255,255,.09);\n  color: rgba(255,255,255,.88);\n  font-size: .7rem;\n  font-weight: 600;\n  backdrop-filter: blur(9px);\n}\n.auth-v2-panel {\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding: clamp(30px,4.5vw,58px);\n  background: #fffefa;\n}\n.auth-v2-panel .back-link {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  width: max-content;\n  margin-bottom: 30px;\n  color: #73776f;\n  font-size: .83rem;\n  font-weight: 600;\n  text-decoration: none;\n}\n.auth-v2-panel .back-link:hover { color: #d65355; }\n.auth-v2-panel .eyebrow { color: #c15142; }\n.auth-v2-panel h1 {\n  margin: 13px 0 10px;\n  color: #191d1a;\n  font-family: \"Manrope\",sans-serif;\n  font-size: clamp(2rem,3.3vw,2.8rem);\n  font-weight: 800;\n  letter-spacing: -.065em;\n  line-height: 1.08;\n}\n.auth-v2-intro {\n  margin: 0 0 25px;\n  color: #74786f;\n  font-size: .92rem;\n  line-height: 1.7;\n}\n.auth-v2-form { display: grid; gap: 16px; }\n.auth-v2-field { display: grid; gap: 7px; }\n.auth-v2-field label {\n  color: #30352f;\n  font-size: .79rem;\n  font-weight: 700;\n}\n.auth-v2-input {\n  width: 100%;\n  min-height: 52px;\n  padding: 0 15px;\n  border: 1px solid #e2dfd7;\n  border-radius: 12px;\n  outline: none;\n  background: #fbfaf7;\n  color: #191d1a;\n  font-size: .92rem;\n  transition: border-color .2s ease,box-shadow .2s ease,background .2s ease;\n}\n.auth-v2-input::placeholder { color: #a0a197; }\n.auth-v2-input:focus {\n  border-color: #d96c60;\n  background: #fff;\n  box-shadow: 0 0 0 4px rgba(217,108,96,.1);\n}\n.auth-v2-input.otp {\n  font-size: 1.45rem;\n  font-weight: 800;\n  letter-spacing: .42em;\n  text-align: center;\n}\n.auth-v2-primary {\n  display: inline-flex;\n  min-height: 53px;\n  align-items: center;\n  justify-content: center;\n  gap: 10px;\n  padding: 0 20px;\n  border: 0;\n  border-radius: 12px;\n  background: linear-gradient(105deg,#df684c 0%,#d65373 55%,#8869c5 100%);\n  color: #fff;\n  font-size: .9rem;\n  font-weight: 800;\n  box-shadow: 0 9px 22px rgba(204,87,99,.2);\n  cursor: pointer;\n  transition: transform .2s ease,box-shadow .2s ease,opacity .2s ease;\n}\n.auth-v2-primary:hover { transform: translateY(-2px); box-shadow: 0 13px 28px rgba(204,87,99,.28); }\n.auth-v2-primary:disabled { cursor: wait; opacity: .65; transform: none; }\n.auth-v2-secondary {\n  display: inline-flex;\n  min-height: 48px;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  padding: 0 16px;\n  border: 1px solid #e4e0d8;\n  border-radius: 12px;\n  background: #fffefa;\n  color: #343a33;\n  font-size: .85rem;\n  font-weight: 700;\n  text-decoration: none;\n  cursor: pointer;\n}\n.auth-v2-secondary:disabled { opacity: .55; cursor: not-allowed; }\n.auth-v2-switch {\n  display: flex;\n  gap: 5px;\n  margin-bottom: 21px;\n  padding: 5px;\n  border: 1px solid #ebe7df;\n  border-radius: 13px;\n  background: #f5f2ec;\n}\n.auth-v2-switch button {\n  flex: 1;\n  min-height: 40px;\n  border: 0;\n  border-radius: 9px;\n  background: transparent;\n  color: #74786f;\n  font-size: .79rem;\n  font-weight: 700;\n  cursor: pointer;\n}\n.auth-v2-switch button[aria-pressed=\"true\"] {\n  background: #fffefa;\n  color: #272d27;\n  box-shadow: 0 2px 8px rgba(31,34,29,.08);\n}\n.auth-v2-note {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n  margin-top: 17px;\n  padding: 12px 13px;\n  border: 1px solid #e7e3da;\n  border-radius: 11px;\n  background: #f7f5ef;\n  color: #73776f;\n  font-size: .75rem;\n  line-height: 1.6;\n}\n.auth-v2-note svg { flex: 0 0 auto; margin-top: 1px; color: #c45c4d; }\n.auth-v2-bottom {\n  margin: 22px 0 0;\n  color: #777a72;\n  font-size: .82rem;\n  text-align: center;\n}\n.auth-v2-bottom a { color: #bd5145; font-weight: 800; text-decoration: none; }\n.auth-v2-bottom a:hover { text-decoration: underline; text-underline-offset: 3px; }\n.auth-v2-resend {\n  border: 0;\n  background: transparent;\n  color: #bd5145;\n  font-size: .8rem;\n  font-weight: 800;\n  cursor: pointer;\n}\n.auth-v2-resend:disabled { opacity: .55; cursor: wait; }\n.auth-v2-password-rules {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 7px;\n}\n.auth-v2-password-rules span {\n  padding: 5px 8px;\n  border: 1px solid #e7e3da;\n  border-radius: 999px;\n  background: #f8f6f1;\n  color: #777a72;\n  font-size: .68rem;\n}\n.auth-v2-password-rules span.valid {\n  border-color: #bfdfca;\n  background: #edf7ef;\n  color: #32714a;\n}\n.dark .auth-page.auth-v2 { background: #151a17; }\n.dark .auth-v2-shell { border-color: rgba(255,255,255,.09); background: #202722; }\n.dark .auth-v2-panel { background: #202722; }\n.dark .auth-v2-panel h1 { color: #f4f0e8; }\n.dark .auth-v2-intro,.dark .auth-v2-panel .back-link { color: #b9beb4; }\n.dark .auth-v2-field label { color: #e6e4dc; }\n.dark .auth-v2-input { border-color: #414b43; background: #181f1b; color: #f4f0e8; }\n.dark .auth-v2-secondary,.dark .auth-v2-switch { border-color: #414b43; background: #181f1b; color: #f4f0e8; }\n.dark .auth-v2-switch button[aria-pressed=\"true\"] { background: #303b33; color: #fff; }\n.dark .auth-v2-note { border-color: #414b43; background: #181f1b; color: #c1c4bc; }\n.dark .auth-v2-password-rules span { border-color: #414b43; background: #181f1b; color: #c1c4bc; }\n@media (max-width: 860px) {\n  .auth-v2-shell { grid-template-columns: 1fr; max-width: 600px; }\n  .auth-v2-visual { min-height: 300px; gap: 48px; }\n  .auth-v2-story h2 { max-width: 12ch; font-size: 3rem; }\n}\n@media (max-width: 520px) {\n  .auth-page.auth-v2 { padding: 20px 12px; }\n  .auth-v2-shell { border-radius: 18px; }\n  .auth-v2-visual { min-height: 250px; padding: 24px; gap: 32px; }\n  .auth-v2-story h2 { margin: 12px 0; font-size: 2.45rem; }\n  .auth-v2-story p { margin-bottom: 0; font-size: .84rem; }\n  .auth-v2-proof { gap: 6px; }\n  .auth-v2-proof span { padding: 6px 9px; font-size: .64rem; }\n  .auth-v2-panel { padding: 27px 21px; }\n  .auth-v2-panel .back-link { margin-bottom: 23px; }\n}\n");

for (const titlePath of ["src/components/studio-card.tsx", "src/app/studios/[id]/page.tsx"]) {
  if (existsSync(titlePath)) {
    const original = readFileSync(titlePath, "utf8");
    const cleaned = original.replace(/\{studio\.title\}/g, '{studio.title.replace(/\\s*[—–-]\\s*Demo Listing$/i, "").trim()}');
    if (cleaned !== original) writeFileSync(titlePath, cleaned);
  }
}

console.log("StudioSpace custom login and registration screens with email OTP support applied.");



// StudioSpace phone OTP extension and final copy cleanup.
function patchGeneratedFile(filePath, replacements, label) {
  if (!existsSync(filePath)) {
    console.warn("Skipped " + label + ": " + filePath + " was not generated.");
    return;
  }
  let value = readFileSync(filePath, "utf8");
  for (const [before, after] of replacements) {
    if (value.includes(after)) continue;
    if (!value.includes(before)) {
      console.warn("Skipped " + label + ": expected source was not found in " + filePath);
      return;
    }
    value = value.replace(before, after);
  }
  writeFileSync(filePath, value);
}

patchGeneratedFile("src/lib/auth.ts", [
  [
    'import { emailOTP, jwt } from "better-auth/plugins";',
    'import { emailOTP, phoneNumber, jwt } from "better-auth/plugins";'
  ],
  [
    'export const auth = betterAuth({',
    [
      'async function studioSpaceTwilioRequest(action: "Verifications" | "VerificationCheck", fields: Record<string, string>) {',
      '  const accountSid = process.env.TWILIO_ACCOUNT_SID;',
      '  const authToken = process.env.TWILIO_AUTH_TOKEN;',
      '  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;',
      '  if (!accountSid || !authToken || !serviceSid) {',
      '    throw new Error("Phone verification is not configured. Add the Twilio Verify environment variables in Vercel.");',
      '  }',
      '  const authorization = Buffer.from(accountSid + ":" + authToken).toString("base64");',
      '  const response = await fetch("https://verify.twilio.com/v2/Services/" + serviceSid + "/" + action, {',
      '    method: "POST",',
      '    headers: { Authorization: "Basic " + authorization, "Content-Type": "application/x-www-form-urlencoded" },',
      '    body: new URLSearchParams(fields),',
      '    cache: "no-store"',
      '  });',
      '  if (!response.ok) {',
      '    console.error("StudioSpace SMS provider request failed with status", response.status);',
      '    throw new Error("SMS verification could not be completed. Please check the phone number and try again.");',
      '  }',
      '  return response.json() as Promise<{ status?: string }>; ',
      '}',
      '',
      'export const auth = betterAuth({'
    ].join("\n")
  ],
  [
    '    jwt({',
    [
      '    phoneNumber({',
      '      otpLength: 6,',
      '      expiresIn: 300,',
      '      allowedAttempts: 5,',
      '      requireVerification: true,',
      '      phoneNumberValidator: (value) => /^\\+[1-9]\\d{7,14}$/.test(value),',
      '      async sendOTP({ phoneNumber: destination }) {',
      '        await studioSpaceTwilioRequest("Verifications", { To: destination, Channel: "sms" });',
      '      },',
      '      async verifyOTP({ phoneNumber: destination, code }) {',
      '        const result = await studioSpaceTwilioRequest("VerificationCheck", { To: destination, Code: code });',
      '        return result.status === "approved";',
      '      }',
      '    }),',
      '    jwt({'
    ].join("\n")
  ]
], "Twilio phone verification");

patchGeneratedFile("src/lib/auth-client.ts", [
  [
    'import { emailOTPClient, jwtClient } from "better-auth/client/plugins";',
    'import { emailOTPClient, phoneNumberClient, jwtClient } from "better-auth/client/plugins";'
  ],
  [
    'plugins: [jwtClient(), emailOTPClient()]',
    'plugins: [jwtClient(), emailOTPClient(), phoneNumberClient()]'
  ]
], "phone verification client plugin");

patchGeneratedFile("src/app/login/login-client.tsx", [
  [
    'import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";',
    'import { ArrowLeft, ArrowRight, KeyRound, LockKeyhole, Mail, Phone, ShieldCheck } from "lucide-react";'
  ],
  [
    '  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === "true";',
    '  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === "true";\n  const phoneOtpEnabled = process.env.NEXT_PUBLIC_PHONE_OTP_ENABLED === "true";'
  ],
  [
    '  const [mode, setMode] = useState<"password" | "code">("password");\n  const [codeSent, setCodeSent] = useState(false);',
    '  const [mode, setMode] = useState<"password" | "code" | "phone">("password");\n  const [codeSent, setCodeSent] = useState(false);\n  const [phoneNumber, setPhoneNumber] = useState("");\n  const [phoneCode, setPhoneCode] = useState("");\n  const [phoneCodeSent, setPhoneCodeSent] = useState(false);'
  ],
  [
    '  return (\n    <SiteShell>',
    [
      '  async function sendPhoneCode() {',
      '    const destination = phoneNumber.trim();',
      '    if (!/^\\+[1-9]\\d{7,14}$/.test(destination)) {',
      '      toast.error("Use an international phone number, including the country code.");',
      '      return;',
      '    }',
      '    setBusy(true);',
      '    try {',
      '      const result = await authClient.phoneNumber.sendOtp({ phoneNumber: destination });',
      '      if (result.error) throw new Error(result.error.message || "Could not send a text message.");',
      '      setPhoneCodeSent(true);',
      '      toast.success("Your verification code has been sent.");',
      '    } catch (error) {',
      '      toast.error(error instanceof Error ? error.message : "Could not send a text message.");',
      '    } finally {',
      '      setBusy(false);',
      '    }',
      '  }',
      '',
      '  async function verifyPhoneCode(event: React.FormEvent) {',
      '    event.preventDefault();',
      '    if (!/^\\d{6}$/.test(phoneCode)) { toast.error("Enter the six digit code."); return; }',
      '    setBusy(true);',
      '    try {',
      '      const result = await authClient.phoneNumber.verify({ phoneNumber: phoneNumber.trim(), code: phoneCode.trim() });',
      '      if (result.error) throw new Error(result.error.message || "That code could not be verified.");',
      '      await finishLogin();',
      '    } catch (error) {',
      '      toast.error(error instanceof Error ? error.message : "That code could not be verified.");',
      '    } finally {',
      '      setBusy(false);',
      '    }',
      '  }',
      '',
      '  return (',
      '    <SiteShell>'
    ].join("\n")
  ],
  [
    '{otpEnabled && (\n              <div className="auth-v2-switch" aria-label="Choose sign in method">\n                <button type="button" aria-pressed={mode === "password"} onClick={() => { setMode("password"); setCodeSent(false); }}>Password</button>\n                <button type="button" aria-pressed={mode === "code"} onClick={() => { setMode("code"); setCodeSent(false); }}>Email code</button>\n              </div>\n            )}',
    '{(otpEnabled || phoneOtpEnabled) && (\n              <div className="auth-v2-switch" aria-label="Choose sign in method">\n                <button type="button" aria-pressed={mode === "password"} onClick={() => { setMode("password"); setCodeSent(false); setPhoneCodeSent(false); }}>Password</button>\n                {otpEnabled && <button type="button" aria-pressed={mode === "code"} onClick={() => { setMode("code"); setCodeSent(false); }}>Email code</button>}\n                {phoneOtpEnabled && <button type="button" aria-pressed={mode === "phone"} onClick={() => { setMode("phone"); setPhoneCodeSent(false); }}>Phone code</button>}\n              </div>\n            )}'
  ],
  [
    '            ) : !codeSent ? (',
    [
      '            ) : mode === "phone" ? (',
      '              !phoneCodeSent ? (',
      '                <form className="auth-v2-form" onSubmit={event => { event.preventDefault(); void sendPhoneCode(); }}>',
      '                  <div className="auth-v2-field">',
      '                    <label htmlFor="login-phone">Phone number</label>',
      '                    <input className="auth-v2-input" id="login-phone" type="tel" inputMode="tel" autoComplete="tel" pattern="\\\\+[1-9][0-9]{7,14}" required value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="+8801XXXXXXXXX" />',
      '                    <small className="muted">Include your country code, for example +880.</small>',
      '                  </div>',
      '                  <button className="auth-v2-primary" type="submit" disabled={busy}>',
      '                    {busy ? "Sending code..." : "Send text code"} <Phone size={17} />',
      '                  </button>',
      '                </form>',
      '              ) : (',
      '                <form className="auth-v2-form" onSubmit={verifyPhoneCode}>',
      '                  <div className="auth-v2-field">',
      '                    <label htmlFor="login-phone-code">Six digit code</label>',
      '                    <input className="auth-v2-input otp" id="login-phone-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={phoneCode} onChange={event => setPhoneCode(event.target.value.replace(/\\\\D/g, "").slice(0, 6))} placeholder="000000" />',
      '                  </div>',
      '                  <button className="auth-v2-primary" type="submit" disabled={busy || phoneCode.length !== 6}>',
      '                    {busy ? "Checking code..." : "Verify and sign in"} <ShieldCheck size={17} />',
      '                  </button>',
      '                  <button className="auth-v2-resend" type="button" disabled={busy} onClick={() => { setPhoneCodeSent(false); setPhoneCode(""); void sendPhoneCode(); }}>Send a new code</button>',
      '                </form>',
      '              )',
      '            ) : !codeSent ? ('
    ].join("\n")
  ],
  [
    '{!otpEnabled && (',
    '{!otpEnabled && !phoneOtpEnabled && ('
  ]
], "phone code login interface");

patchGeneratedFile("src/app/register/page.tsx", [
  [
    '  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === "true";',
    '  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP_ENABLED === "true";\n  const phoneOtpEnabled = process.env.NEXT_PUBLIC_PHONE_OTP_ENABLED === "true";'
  ],
  [
    '        router.push("/login");',
    '        router.push(phoneOtpEnabled ? "/phone-verify" : "/login");'
  ],
  [
    '      router.push("/");\n      router.refresh();',
    '      router.push(phoneOtpEnabled ? "/phone-verify" : "/");\n      router.refresh();'
  ]
], "registration phone verification handoff");

const phoneVerifyPage = [
'"use client";',
'import { useEffect, useState } from "react";',
'import { useRouter } from "next/navigation";',
'import { ArrowLeft, ArrowRight, Phone, ShieldCheck } from "lucide-react";',
'import { toast } from "sonner";',
'import Link from "next/link";',
'import { SiteShell } from "@/components/site-shell";',
'import { authClient, syncAuthCookie } from "@/lib/auth-client";',
'',
'export default function PhoneVerifyPage() {',
'  const router = useRouter();',
'  const { data: session, isPending } = authClient.useSession();',
'  const [phoneNumber, setPhoneNumber] = useState("");',
'  const [code, setCode] = useState("");',
'  const [sent, setSent] = useState(false);',
'  const [busy, setBusy] = useState(false);',
'',
'  useEffect(() => {',
'    if (!isPending && !session) router.replace("/login?callbackUrl=%2Fphone-verify");',
'  }, [isPending, session, router]);',
'',
'  async function sendCode(event: React.FormEvent) {',
'    event.preventDefault();',
'    const destination = phoneNumber.trim();',
'    if (!/^\\+[1-9]\\d{7,14}$/.test(destination)) {',
'      toast.error("Use an international phone number, including the country code.");',
'      return;',
'    }',
'    setBusy(true);',
'    try {',
'      const result = await authClient.phoneNumber.sendOtp({ phoneNumber: destination });',
'      if (result.error) throw new Error(result.error.message || "Could not send a text message.");',
'      setSent(true);',
'      toast.success("Your verification code has been sent.");',
'    } catch (error) {',
'      toast.error(error instanceof Error ? error.message : "Could not send a text message.");',
'    } finally { setBusy(false); }',
'  }',
'',
'  async function verifyCode(event: React.FormEvent) {',
'    event.preventDefault();',
'    if (!/^\\d{6}$/.test(code)) { toast.error("Enter the six digit code."); return; }',
'    setBusy(true);',
'    try {',
'      const result = await authClient.phoneNumber.verify({',
'        phoneNumber: phoneNumber.trim(),',
'        code: code.trim(),',
'        updatePhoneNumber: true,',
'        disableSession: true',
'      });',
'      if (result.error) throw new Error(result.error.message || "That code could not be verified.");',
'      await syncAuthCookie();',
'      toast.success("Your phone number is verified.");',
'      router.push("/");',
'      router.refresh();',
'    } catch (error) {',
'      toast.error(error instanceof Error ? error.message : "Phone verification could not be completed.");',
'    } finally { setBusy(false); }',
'  }',
'',
'  if (isPending || !session) return <SiteShell><main className="auth-page auth-v2"><div className="auth-v2-shell"><div className="auth-v2-panel">Checking your account…</div></div></main></SiteShell>;',
'',
'  return (',
'    <SiteShell>',
'      <section className="auth-page auth-v2">',
'        <div className="auth-v2-shell">',
'          <aside className="auth-v2-visual">',
'            <Link href="/" className="auth-v2-brand">',
'              <img src="/studiospace-mark.svg" alt="" />',
'              <span>studio<strong>space</strong><small>CREATIVE SPACES, SHARED</small></span>',
'            </Link>',
'            <div className="auth-v2-story">',
'              <span className="eyebrow">A MORE SECURE MEMBER PROFILE</span>',
'              <h2>Keep your number close to your <em>creative account.</em></h2>',
'              <p>Verify a mobile number to make phone code sign in available on your next visit.</p>',
'            </div>',
'            <div className="auth-v2-proof"><span>Private account access</span><span>Six digit SMS codes</span></div>',
'          </aside>',
'          <div className="auth-v2-panel">',
'            <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to StudioSpace</Link>',
'            <span className="eyebrow">PHONE VERIFICATION</span>',
'            <h1>Verify your number.</h1>',
'            <p className="auth-v2-intro">Enter your number with its country code. We will send a short lived code by text message.</p>',
'            {!sent ? (',
'              <form className="auth-v2-form" onSubmit={sendCode}>',
'                <div className="auth-v2-field">',
'                  <label htmlFor="verify-phone">Mobile number</label>',
'                  <input className="auth-v2-input" id="verify-phone" type="tel" inputMode="tel" autoComplete="tel" pattern="\\\\+[1-9][0-9]{7,14}" required value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="+8801XXXXXXXXX" />',
'                  <small className="muted">Use international format, for example +880.</small>',
'                </div>',
'                <button className="auth-v2-primary" type="submit" disabled={busy}>{busy ? "Sending code..." : "Send verification code"} <Phone size={17} /></button>',
'              </form>',
'            ) : (',
'              <form className="auth-v2-form" onSubmit={verifyCode}>',
'                <div className="auth-v2-field">',
'                  <label htmlFor="verify-phone-code">Six digit code</label>',
'                  <input className="auth-v2-input otp" id="verify-phone-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\\\\D/g, "").slice(0, 6))} placeholder="000000" />',
'                </div>',
'                <button className="auth-v2-primary" type="submit" disabled={busy || code.length !== 6}>{busy ? "Verifying..." : "Verify phone number"} <ShieldCheck size={17} /></button>',
'                <button className="auth-v2-resend" type="button" disabled={busy} onClick={() => { setSent(false); setCode(""); }}>Use a different number</button>',
'              </form>',
'            )}',
'            <button className="auth-v2-secondary" type="button" onClick={() => router.push("/")}>Skip for now <ArrowRight size={16} /></button>',
'          </div>',
'        </div>',
'      </section>',
'    </SiteShell>',
'  );',
'}'
].join("\n");

if (!existsSync("src/app/phone-verify")) mkdirSync("src/app/phone-verify", { recursive: true });
writeFileSync("src/app/phone-verify/page.tsx", phoneVerifyPage);

const copyFiles = [
  "src/app/page.tsx",
  "src/app/login/login-client.tsx",
  "src/app/register/page.tsx",
  "src/app/phone-verify/page.tsx",
  "src/app/add-studio/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/my-bookings/page.tsx",
  "src/app/my-listings/page.tsx",
  "src/app/saved/page.tsx",
  "src/app/studios/studios-client.tsx",
  "src/app/studios/[id]/page.tsx",
  "src/app/terms/page.tsx",
  "src/components/footer.tsx",
  "src/components/navbar.tsx",
  "src/components/studio-card.tsx",
  "src/components/booking-modal.tsx"
];

function cleanWebsiteCopy(value) {
  return value
    .replace(/(\d)\s*[–—−-]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[–—−]\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/([A-Za-z])-([A-Za-z])/g, "$1 $2")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1");
}

for (const filePath of copyFiles) {
  if (!existsSync(filePath)) continue;
  const source = readFileSync(filePath, "utf8");
  let cleaned = source
    .replace(/â/g, ", ")
    .replace(/â/g, " to ")
    .replace(/>([^<>]*?)</gs, (whole, text) => {
      if (/[{}]/.test(text)) return whole;
      return ">" + cleanWebsiteCopy(text) + "<";
    });
  if (cleaned !== source) writeFileSync(filePath, cleaned);
}

// Clean copy held in the homepage's data arrays as well as ordinary JSX text.
const homepagePath = "src/app/page.tsx";
if (existsSync(homepagePath)) {
  let homepage = readFileSync(homepagePath, "utf8");
  homepage = homepage
    .replace(/(kicker|title|copy|imageAlt):\s*"([^"]*)"/g, (_match, key, value) => key + ': "' + cleanWebsiteCopy(value) + '"')
    .replace(/(THE CURRENT COLLECTION|START WITH YOUR MEDIUM|A CLEARER WAY TO BOOK|A MARKETPLACE FOR MAKERS)\s*\/\s*0[1-4]\b/g, "$1")
    .replace(/Discover\s*\/\s*Book\s*\/\s*Make/g, "Discover, book and make")
    .replace(/<div className="ss-hero-index">\s*<strong>\{slide\.index\}<\/strong>\s*<span>StudioSpace collection<\/span>\s*<\/div>/g, "")
    .replace(/<span className="ss-step-number">\{step\.number\}<\/span>/g, "");
  writeFileSync(homepagePath, homepage);
}

console.log("StudioSpace website copy cleanup and decorative numbering removal applied.");
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + "\n.eyebrow::before,.ss-kicker::before{content:none!important;display:none!important;width:0!important;height:0!important}\n.eyebrow,.ss-kicker{gap:0!important}\nhtml{scroll-behavior:auto!important;overflow-x:clip}\nbody{min-width:320px;max-width:100%;overflow-x:clip}\nimg,video,canvas,svg{max-width:100%}\n.container,.ss-section-head,.ss-category-grid,.ss-steps-grid,.ss-about-grid,.footer-grid,.studio-grid{min-width:0}\n.ss-section-head>*,.ss-category-card,.ss-step,.studio-card,.footer-grid>*{min-width:0}\n@media(max-width:1100px){\n .nav-wrap{gap:14px}.main-nav{gap:clamp(10px,1.4vw,18px)}.nav-link{font-size:.8rem}.ss-section-head{column-gap:24px}\n}\n@media(max-width:860px){\n .container{width:calc(100% - 40px)}\n .ss-section-head{grid-template-columns:minmax(0,1fr);align-items:start;gap:14px}\n .ss-section-head .text-link{grid-column:1;grid-row:auto;align-self:start}\n .ss-category-grid{grid-template-columns:repeat(3,minmax(0,1fr))}\n .ss-steps-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}\n .ss-step{min-height:220px}\n .ss-about-grid{grid-template-columns:minmax(0,1fr);gap:30px}\n .ss-about-visual{min-height:clamp(260px,50vw,420px)}\n .ss-host-band-inner{align-items:flex-start;gap:20px}\n .footer-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:34px 24px}\n .studio-grid{grid-template-columns:repeat(2,minmax(0,1fr))}\n}\n@media(max-width:720px){\n .container{width:calc(100% - 32px)}\n .nav-wrap{position:relative;display:flex;min-height:68px;flex-wrap:nowrap;gap:8px}\n .nav-wrap>.brand{flex:0 1 auto;min-width:0}\n .nav-actions{display:flex;flex:0 0 auto;align-items:center;gap:7px;margin-left:auto}\n .nav-actions .auth-links{display:flex;align-items:center;gap:6px}\n .mobile-toggle{display:inline-flex!important;width:40px;height:40px;flex:0 0 40px;align-items:center;justify-content:center;border:1px solid var(--ss-line);border-radius:11px;background:var(--ss-white);color:var(--ss-ink)}\n .main-nav{position:absolute;z-index:100;top:calc(100% + 1px);right:0;left:0;display:none;flex-direction:column;align-items:stretch;gap:2px;padding:12px 18px 18px;border:1px solid var(--ss-line);border-top:0;border-radius:0 0 16px 16px;background:var(--ss-paper);box-shadow:var(--ss-shadow)}\n .main-nav.open{display:flex}\n .main-nav .nav-link{padding:11px 4px;font-size:.9rem}\n .ss-hero-panel{min-height:clamp(520px,80svh,650px)}\n .ss-hero-content{min-height:inherit;align-items:flex-end;padding:76px 22px 82px}\n .ss-hero-copy{width:100%}\n .ss-hero-copy h1{max-width:11ch;font-size:clamp(2.7rem,11vw,4.5rem);line-height:.98;overflow-wrap:normal}\n .ss-hero-copy>p:not(.ss-kicker){max-width:100%}\n .ss-section{padding:clamp(52px,9vw,72px) 0}\n .ss-section-head h2{font-size:clamp(2rem,7.8vw,2.7rem)}\n .ss-category-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}\n .ss-category-card{min-height:158px;padding:15px}\n .ss-steps-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}\n .ss-step{min-height:198px;padding:20px 16px!important;border:1px solid rgba(255,255,255,.15)!important;border-radius:16px}\n .ss-step+.ss-step{padding-left:16px}\n .ss-step h3{font-size:1.06rem}\n .ss-step p{font-size:.84rem}\n .studio-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n .studio-card .studio-card-body{padding:13px}\n .studio-card .studio-title{font-size:.98rem}\n .studio-card .studio-meta{font-size:.73rem}\n .filter-bar{width:100%}\n .search-field,.select-filter{min-width:0;width:100%}\n .ss-about-visual{min-height:300px}\n .ss-host-band-inner{flex-direction:column;align-items:flex-start}\n .site-footer{padding-top:46px}\n .footer-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:30px 18px}\n .page-hero{padding-block:50px 38px}\n .page-hero h1{font-size:clamp(2.45rem,9vw,3.4rem)}\n .modal-card{width:min(100% - 24px,560px);max-height:calc(100svh - 24px);overflow:auto}\n}\n@media(max-width:420px){\n .nav-wrap>.brand small{font-size:.43rem;letter-spacing:.11em}\n .nav-actions{gap:5px}\n .nav-actions .auth-links{gap:5px}\n .nav-actions .auth-links .btn{min-height:38px;padding:8px 9px;font-size:.7rem}\n .ss-hero-topline{font-size:.52rem;letter-spacing:.08em}\n .ss-hero-copy h1{font-size:clamp(2.45rem,10vw,3.3rem)}\n .ss-hero-actions .btn{width:100%;justify-content:center}\n .ss-category-grid,.ss-steps-grid,.studio-grid,.footer-grid{grid-template-columns:minmax(0,1fr)}\n .ss-category-card{min-height:138px}\n .ss-step{min-height:0;padding:22px!important}\n .studio-card .studio-image-wrap{aspect-ratio:1.55}\n .footer-grid{gap:26px}\n .auth-v2-panel{padding:24px 18px}\n}\n");
writeFileSync("src/components/scroll-restoration.tsx", "\"use client\";\n\nimport { useLayoutEffect } from \"react\";\n\nexport function ScrollRestoration() {\n  useLayoutEffect(() => {\n    const storageKey = () => \"studiospace:scroll:\" + window.location.pathname + window.location.search;\n    let pendingFrame = 0;\n\n    const saveNow = () => {\n      if (pendingFrame) {\n        cancelAnimationFrame(pendingFrame);\n        pendingFrame = 0;\n      }\n      try {\n        sessionStorage.setItem(storageKey(), String(window.scrollY));\n      } catch {}\n    };\n\n    const saveSoon = () => {\n      if (pendingFrame) return;\n      pendingFrame = requestAnimationFrame(() => {\n        pendingFrame = 0;\n        try {\n          sessionStorage.setItem(storageKey(), String(window.scrollY));\n        } catch {}\n      });\n    };\n\n    const navigation = performance.getEntriesByType(\"navigation\")[0] as PerformanceNavigationTiming | undefined;\n    if (navigation?.type === \"reload\") {\n      try {\n        const saved = sessionStorage.getItem(storageKey());\n        const savedY = saved === null ? null : Number(saved);\n        if (savedY !== null && Number.isFinite(savedY) && savedY > 0) {\n          let attempts = 0;\n          const restore = () => {\n            attempts += 1;\n            const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);\n            window.scrollTo(0, Math.min(savedY, maxY));\n            if (maxY < savedY && attempts < 14) requestAnimationFrame(restore);\n          };\n          requestAnimationFrame(() => requestAnimationFrame(restore));\n          window.addEventListener(\"load\", restore, { once: true });\n        }\n      } catch {}\n    }\n\n    window.addEventListener(\"scroll\", saveSoon, { passive: true });\n    window.addEventListener(\"pagehide\", saveNow);\n    window.addEventListener(\"beforeunload\", saveNow);\n    return () => {\n      window.removeEventListener(\"scroll\", saveSoon);\n      window.removeEventListener(\"pagehide\", saveNow);\n      window.removeEventListener(\"beforeunload\", saveNow);\n      saveNow();\n    };\n  }, []);\n\n  return null;\n}\n");
replaceOnce("src/components/providers.tsx",
  'import { AuthCookieSync } from "@/components/auth-cookie-sync";',
  'import { AuthCookieSync } from "@/components/auth-cookie-sync";\nimport { ScrollRestoration } from "@/components/scroll-restoration";',
  "import scroll restoration component");
replaceOnce("src/components/providers.tsx",
  '<><AuthCookieSync/>{children}<Toaster position="top-right" richColors closeButton /></>',
  '<><ScrollRestoration/><AuthCookieSync/>{children}<Toaster position="top-right" richColors closeButton /></>',
  "mount scroll restoration component");
console.log("StudioSpace kicker cleanup, responsive fixes and reload scroll restoration applied.");


 
// StudioSpace signature aperture motion system.
// Lightweight CSS motion: no canvas, WebGL, animation package or continuously running JS loop.
const studioSpaceMotionCss = String.raw`
/* Signature background: a quiet aperture / studio-light field, not a generic gradient. */
.home-refresh {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(ellipse at 6% 18%, rgba(223, 90, 67, .055), transparent 34%),
    radial-gradient(ellipse at 94% 61%, rgba(129, 151, 127, .075), transparent 35%);
}
.home-refresh::before {
  content: "";
  position: absolute;
  z-index: -1;
  top: 27%;
  right: -19%;
  width: clamp(390px, 62vw, 900px);
  aspect-ratio: 1;
  border-radius: 50%;
  pointer-events: none;
  opacity: .46;
  background:
    repeating-radial-gradient(circle at center,
      transparent 0 30px,
      rgba(25, 29, 26, .055) 31px 32px,
      transparent 33px 60px),
    conic-gradient(from 18deg,
      transparent 0 37%,
      rgba(223, 90, 67, .12) 37.5% 38.3%,
      transparent 39% 100%),
    radial-gradient(circle, rgba(223, 90, 67, .10), transparent 68%);
  animation: ss-aperture-turn 82s linear infinite;
}
.home-refresh::after {
  content: "";
  position: absolute;
  z-index: -1;
  top: 118%;
  left: -17%;
  width: clamp(340px, 48vw, 680px);
  aspect-ratio: 1.35;
  border-radius: 50%;
  pointer-events: none;
  opacity: .28;
  background:
    radial-gradient(ellipse at 42% 48%, rgba(132, 153, 129, .18), transparent 68%),
    repeating-linear-gradient(132deg,
      transparent 0 26px,
      rgba(25, 29, 26, .035) 27px 28px,
      transparent 29px 54px);
  animation: ss-field-drift 19s ease-in-out infinite alternate;
}
@keyframes ss-aperture-turn {
  to { transform: rotate(360deg); }
}
@keyframes ss-field-drift {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(18px, -14px, 0); }
}

/* A more tactile category surface: fine studio-grid + warm light pools. */
.ss-category-section {
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(ellipse at 12% 14%, rgba(223, 90, 67, .105), transparent 39%),
    radial-gradient(ellipse at 88% 84%, rgba(132, 153, 129, .15), transparent 42%),
    linear-gradient(132deg, #eae6dd 0%, #f2efe8 54%, #e6e9e1 100%) !important;
}
.ss-category-section::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  opacity: .44;
  background-image:
    linear-gradient(rgba(25, 29, 26, .035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(25, 29, 26, .035) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: linear-gradient(90deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
}
.ss-category-section::after {
  content: "";
  position: absolute;
  z-index: -1;
  top: 8%;
  right: 4%;
  width: clamp(190px, 27vw, 390px);
  aspect-ratio: 1;
  border: 1px solid rgba(25, 29, 26, .08);
  border-radius: 50%;
  pointer-events: none;
  opacity: .52;
  background:
    repeating-radial-gradient(circle,
      transparent 0 21px,
      rgba(25, 29, 26, .065) 22px 23px,
      transparent 24px 43px),
    conic-gradient(from 24deg,
      transparent 0 72%,
      rgba(223, 90, 67, .13) 73% 74%,
      transparent 75% 100%);
  animation: ss-aperture-turn 96s linear infinite reverse;
}

/* Slow cinematic movement on the hero photography and a visible, restrained lens motif. */
.ss-hero-panel {
  position: relative;
}
.ss-hero-image {
  transform: scale(1.045);
  transform-origin: 52% 48%;
  animation: ss-hero-photo-drift 15s ease-in-out infinite alternate;
  will-change: transform;
}
@keyframes ss-hero-photo-drift {
  from { transform: scale(1.045) translate3d(-.25%, 0, 0); }
  to { transform: scale(1.095) translate3d(.35%, -.25%, 0); }
}
.ss-hero-panel::after {
  content: "";
  position: absolute;
  z-index: 0;
  top: 9%;
  right: 5%;
  width: clamp(230px, 34vw, 500px);
  aspect-ratio: 1;
  border: 1px solid rgba(255, 255, 255, .20);
  border-radius: 50%;
  pointer-events: none;
  opacity: .52;
  background:
    repeating-radial-gradient(circle,
      transparent 0 28px,
      rgba(255, 255, 255, .12) 29px 30px,
      transparent 31px 56px),
    conic-gradient(from 12deg,
      transparent 0 76%,
      rgba(240, 160, 140, .34) 77% 78%,
      transparent 79% 100%);
  mask-image: radial-gradient(circle, #000 32%, transparent 73%);
  animation: ss-aperture-turn 74s linear infinite;
}
.ss-hero-content {
  position: relative;
  z-index: 1;
}
.swiper-slide-active .ss-hero-copy .ss-kicker {
  animation: ss-copy-rise .62s cubic-bezier(.2, .72, .2, 1) both;
}
.swiper-slide-active .ss-hero-copy h1 {
  animation: ss-copy-rise .72s .09s cubic-bezier(.2, .72, .2, 1) both;
}
.swiper-slide-active .ss-hero-copy > p:not(.ss-kicker) {
  animation: ss-copy-rise .72s .18s cubic-bezier(.2, .72, .2, 1) both;
}
.swiper-slide-active .ss-hero-actions {
  animation: ss-copy-rise .72s .27s cubic-bezier(.2, .72, .2, 1) both;
}
@keyframes ss-copy-rise {
  from { opacity: 0; transform: translate3d(0, 17px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

/* Cards and controls react with a small amount of physicality. */
.studio-card {
  transition:
    transform .34s cubic-bezier(.2, .72, .2, 1),
    box-shadow .34s ease,
    border-color .34s ease;
}
.studio-card:hover {
  transform: translate3d(0, -4px, 0);
  border-color: rgba(223, 90, 67, .22);
}
.studio-card .studio-image-wrap img {
  transition: transform .65s cubic-bezier(.2, .72, .2, 1);
}
.studio-card:hover .studio-image-wrap img {
  transform: scale(1.055);
}
.ss-category-card {
  transition:
    transform .32s cubic-bezier(.2, .72, .2, 1),
    box-shadow .32s ease,
    border-color .32s ease,
    background-color .32s ease;
}
.ss-category-card:hover {
  transform: translate3d(0, -4px, 0);
}
.ss-category-arrow {
  transition: transform .28s cubic-bezier(.2, .72, .2, 1);
}
.ss-category-card:hover .ss-category-arrow {
  transform: translate3d(3px, -3px, 0);
}
.ss-step {
  transition: transform .3s ease, border-color .3s ease;
}
.ss-step:hover {
  transform: translate3d(0, -3px, 0);
}
.nav-link::after {
  transition: transform .28s cubic-bezier(.2, .72, .2, 1);
}
.btn {
  transition:
    transform .24s ease,
    box-shadow .24s ease,
    background-color .24s ease,
    border-color .24s ease;
}
.btn:hover {
  transform: translate3d(0, -2px, 0);
}

/* Scroll reveals only activate after elements enter the viewport. */
.ss-reveal {
  opacity: 0;
  transform: translate3d(0, 18px, 0);
  transition:
    opacity .68s cubic-bezier(.2, .72, .2, 1) var(--ss-reveal-delay, 0ms),
    transform .68s cubic-bezier(.2, .72, .2, 1) var(--ss-reveal-delay, 0ms);
}
.ss-reveal.ss-in-view {
  opacity: 1;
  transform: translate3d(0, 0, 0);
  will-change: auto;
}

@media (max-width: 720px) {
  .home-refresh::before {
    top: 39%;
    right: -48%;
    width: 112vw;
    opacity: .34;
  }
  .home-refresh::after {
    top: 126%;
    left: -36%;
    width: 88vw;
    opacity: .19;
  }
  .ss-category-section::after {
    top: 3%;
    right: -14%;
    width: 48vw;
    opacity: .32;
  }
  .ss-hero-image {
    animation-duration: 19s;
  }
  .ss-hero-panel::after {
    top: 8%;
    right: -17%;
    width: 66vw;
    opacity: .32;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home-refresh::before,
  .home-refresh::after,
  .ss-category-section::after,
  .ss-hero-image,
  .ss-hero-panel::after {
    animation: none !important;
  }
  .ss-reveal,
  .ss-reveal.ss-in-view {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  .studio-card,
  .studio-card .studio-image-wrap img,
  .ss-category-card,
  .ss-category-arrow,
  .ss-step,
  .nav-link::after,
  .btn {
    transition: none !important;
  }
}
`;
writeFileSync(
  "src/app/brand-refresh.css",
  readFileSync("src/app/brand-refresh.css", "utf8") + "\n" + studioSpaceMotionCss
);

writeFileSync("src/components/scroll-motion.tsx", String.raw`"use client";

import { useEffect } from "react";

export function ScrollMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const selector = [
      ".ss-section-head",
      ".ss-category-card",
      ".ss-step",
      ".studio-card",
      ".ss-about-visual",
      ".ss-about-copy",
      ".ss-host-band-inner",
      ".ss-principles > *"
    ].join(",");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("ss-in-view");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -38px 0px" });

    const attach = (scope: ParentNode) => {
      const items = scope.querySelectorAll<HTMLElement>(selector);
      items.forEach((item, index) => {
        if (item.dataset.ssMotionReady === "true") return;
        item.dataset.ssMotionReady = "true";
        item.classList.add("ss-reveal");
        item.style.setProperty("--ss-reveal-delay", String(Math.min(index % 5, 4) * 65) + "ms");
        observer.observe(item);
      });
    };

    attach(document);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(selector)) attach(node.parentElement ?? document);
          else attach(node);
        });
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}
`);

replaceOnce(
  "src/components/providers.tsx",
  'import { ScrollRestoration } from "@/components/scroll-restoration";',
  'import { ScrollRestoration } from "@/components/scroll-restoration";\nimport { ScrollMotion } from "@/components/scroll-motion";',
  "import StudioSpace scroll motion observer"
);
replaceOnce(
  "src/components/providers.tsx",
  "<><ScrollRestoration/><AuthCookieSync/>{children}<Toaster position=\"top-right\" richColors closeButton /></>",
  "<><ScrollRestoration/><ScrollMotion/><AuthCookieSync/>{children}<Toaster position=\"top-right\" richColors closeButton /></>",
  "mount StudioSpace scroll motion observer"
);
console.log("StudioSpace signature aperture motion system, responsive ambient background and lightweight scroll reveals applied.");


// Prevent the StudioSpace ambient field from extending the page scroll area below the footer.
writeFileSync(
  "src/app/brand-refresh.css",
  readFileSync("src/app/brand-refresh.css", "utf8") +
    "\n/* Keep the lower ambient light field inside the homepage; never create scrollable space after the footer. */\n" +
    ".home-refresh::after { top: auto !important; bottom: 4% !important; }\n" +
    "@media (max-width: 720px) { .home-refresh::after { top: auto !important; bottom: 2% !important; } }\n"
);
console.log("StudioSpace homepage bottom overflow containment applied.");

// StudioSpace Google sign-in controls and full dark-theme contrast pass.
replaceOnce("src/app/login/login-client.tsx", "  async function finishLogin() {", "  async function continueWithGoogle() {\n    setBusy(true);\n    try {\n      const result = await authClient.signIn.social({\n        provider: \"google\",\n        callbackURL: callback,\n        errorCallbackURL: \"/login\"\n      });\n      if (result.error) throw new Error(result.error.message || \"Google sign in could not be started.\");\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Google sign in could not be started.\");\n      setBusy(false);\n    }\n  }\n\n  async function finishLogin() {", "add Google OAuth action to login");
replaceOnce("src/app/login/login-client.tsx", "<p className=\"auth-v2-intro\">Sign in to pick up where your creative work left off.</p>", "<p className=\"auth-v2-intro\">Sign in to pick up where your creative work left off.</p>\n\n            <button className=\"auth-v2-google\" type=\"button\" onClick={() => void continueWithGoogle()} disabled={busy}>\n              <svg className=\"auth-v2-google-mark\" viewBox=\"0 0 48 48\" aria-hidden=\"true\" focusable=\"false\">\n  <path fill=\"#4285F4\" d=\"M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.9 6.1-14.8z\"/>\n  <path fill=\"#34A853\" d=\"M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44z\"/>\n  <path fill=\"#FBBC05\" d=\"M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18z\"/>\n  <path fill=\"#EA4335\" d=\"M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12z\"/>\n</svg>\n              <span>{busy ? \"Connecting to Google...\" : \"Continue with Google\"}</span>\n            </button>\n            <div className=\"auth-v2-divider\" aria-hidden=\"true\"><span>OR CONTINUE WITH EMAIL</span></div>", "add Google sign in button to login UI");
replaceOnce("src/app/register/page.tsx", "  async function createAccount(event: React.FormEvent) {", "  async function continueWithGoogle() {\n    setBusy(true);\n    try {\n      const result = await authClient.signIn.social({\n        provider: \"google\",\n        callbackURL: \"/\",\n        newUserCallbackURL: \"/\",\n        errorCallbackURL: \"/register\"\n      });\n      if (result.error) throw new Error(result.error.message || \"Google sign in could not be started.\");\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Google sign in could not be started.\");\n      setBusy(false);\n    }\n  }\n\n  async function createAccount(event: React.FormEvent) {", "add Google OAuth action to registration");
replaceOnce("src/app/register/page.tsx", "<form className=\"auth-v2-form\" onSubmit={createAccount}>", "<button className=\"auth-v2-google\" type=\"button\" onClick={() => void continueWithGoogle()} disabled={busy}>\n                  <svg className=\"auth-v2-google-mark\" viewBox=\"0 0 48 48\" aria-hidden=\"true\" focusable=\"false\">\n  <path fill=\"#4285F4\" d=\"M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.9 6.1-14.8z\"/>\n  <path fill=\"#34A853\" d=\"M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44z\"/>\n  <path fill=\"#FBBC05\" d=\"M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18z\"/>\n  <path fill=\"#EA4335\" d=\"M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12z\"/>\n</svg>\n                  <span>{busy ? \"Connecting to Google...\" : \"Continue with Google\"}</span>\n                </button>\n                <div className=\"auth-v2-divider\" aria-hidden=\"true\"><span>OR CONTINUE WITH EMAIL</span></div>\n                <form className=\"auth-v2-form\" onSubmit={createAccount}>", "add Google sign in button to registration UI");
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + "\n" + "\n/* StudioSpace Google sign-in controls. */\n.auth-v2-google {\n  width: 100%;\n  min-height: 52px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 12px;\n  margin: 2px 0 0;\n  padding: 12px 18px;\n  border: 1px solid #dcded9;\n  border-radius: 11px;\n  background: #fffefa;\n  color: #202722;\n  font: inherit;\n  font-size: .9rem;\n  font-weight: 750;\n  cursor: pointer;\n  transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease, background .2s ease;\n}\n.auth-v2-google:hover:not(:disabled) {\n  transform: translateY(-1px);\n  border-color: #c7cec8;\n  background: #fff;\n  box-shadow: 0 7px 20px rgba(24, 32, 27, .08);\n}\n.auth-v2-google:focus-visible {\n  outline: 3px solid rgba(223, 90, 67, .45);\n  outline-offset: 3px;\n}\n.auth-v2-google:disabled {\n  cursor: wait;\n  opacity: .65;\n  transform: none;\n}\n.auth-v2-google-mark { width: 20px; height: 20px; flex: 0 0 20px; }\n.auth-v2-divider {\n  display: flex;\n  align-items: center;\n  gap: 13px;\n  margin: 20px 0;\n  color: #858c84;\n  font-size: .65rem;\n  font-weight: 800;\n  letter-spacing: .13em;\n  white-space: nowrap;\n}\n.auth-v2-divider::before,\n.auth-v2-divider::after {\n  content: \"\";\n  height: 1px;\n  flex: 1 1 auto;\n  background: #e2e5df;\n}\n\n/* Dark theme tokens cascade into the full app, including components that use brand variables. */\n.dark {\n  color-scheme: dark;\n  --ss-paper: #151b17;\n  --ss-paper-deep: #1d2721;\n  --ss-ink: #f4f1e9;\n  --ss-muted: #b7c1b8;\n  --ss-line: #3e4b42;\n  --ss-accent: #f0947d;\n  --ss-accent-dark: #e67e68;\n  --ss-sage: #293a30;\n  --ss-white: #202a24;\n  --ss-shadow: 0 18px 50px rgba(0, 0, 0, .32);\n}\n.dark body {\n  background: #141a16 !important;\n  color: #f2f0e8;\n}\n.dark .home-refresh,\n.dark .ss-featured,\n.dark .ss-about {\n  background-color: #151b17;\n  color: #f2f0e8;\n}\n.dark .ss-category-section {\n  border-color: rgba(255,255,255,.08);\n  background:\n    radial-gradient(ellipse at 10% 14%, rgba(225, 117, 91, .13), transparent 36%),\n    radial-gradient(ellipse at 90% 86%, rgba(132, 166, 139, .13), transparent 40%),\n    #1b241e !important;\n}\n.dark .ss-category-section::before {\n  opacity: .2;\n  background-image:\n    linear-gradient(rgba(236, 243, 235, .06) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(236, 243, 235, .06) 1px, transparent 1px);\n}\n.dark .ss-category-section::after { border-color: rgba(231,240,231,.12); opacity: .24; }\n.dark .ss-section-head h2,\n.dark .ss-about-copy h2,\n.dark .ss-host-band h2,\n.dark .ss-category-card strong,\n.dark .ss-principle strong {\n  color: #f4f1e9;\n}\n.dark .ss-section-head p,\n.dark .ss-about-copy > p,\n.dark .ss-principle small,\n.dark .ss-category-card small,\n.dark .ss-hero-foot,\n.dark .ss-hero-foot span,\n.dark .studio-card .studio-meta,\n.dark .studio-card p {\n  color: #b7c1b8;\n}\n.dark .ss-kicker,\n.dark .ss-section-head .ss-kicker,\n.dark .ss-about-copy .ss-kicker {\n  color: #f0a08d;\n}\n.dark .ss-category-card {\n  border-color: rgba(225,238,226,.13);\n  background: rgba(35, 47, 39, .94);\n  color: #f4f1e9;\n  box-shadow: 0 10px 28px rgba(0,0,0,.18);\n}\n.dark .ss-category-card:hover {\n  border-color: rgba(240,148,125,.48);\n  background: #29372e;\n}\n.dark .ss-category-arrow { color: #f09a83; }\n.dark .ss-step {\n  border-color: rgba(255,255,255,.16) !important;\n  background: linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.025));\n}\n.dark .ss-step h3 { color: #fff; }\n.dark .ss-step p { color: #c1cbc2; }\n.dark .ss-about-note {\n  border-color: rgba(255,255,255,.15);\n  background: rgba(25,33,28,.94);\n  color: #fff;\n}\n.dark .ss-about-note span { color: #d1d8d0; }\n.dark .ss-principle-icon {\n  border-color: rgba(255,255,255,.13);\n  background: #293a30;\n  color: #f2a08a;\n}\n.dark .ss-host-band {\n  border-color: rgba(255,255,255,.08);\n  background:\n    radial-gradient(ellipse at 85% 8%,rgba(180,127,218,.13),transparent 34%),\n    radial-gradient(ellipse at 12% 90%,rgba(235,112,101,.12),transparent 34%),\n    #302923 !important;\n}\n.dark .ss-host-band p { color: #d0d8d0; }\n.dark .ss-hero-topline span {\n  border-color: rgba(255,255,255,.13);\n  background: rgba(30,39,33,.88);\n  color: #d4ddd4;\n}\n.dark .ss-hero-topline span:last-child {\n  border-color: rgba(240,148,125,.3);\n  background: rgba(240,148,125,.1);\n  color: #ffb29c;\n}\n\n/* Listing, search and detail surfaces. */\n.dark .studio-card,\n.dark .filter-bar,\n.dark .search-field,\n.dark .select-filter,\n.dark .empty-state,\n.dark .profile-menu,\n.dark .modal-card {\n  border-color: #3c4b41;\n  background: #202a24;\n  color: #f4f1e9;\n}\n.dark .studio-card .studio-title,\n.dark .studio-card h2,\n.dark .studio-card h3,\n.dark .empty-state h3,\n.dark .modal-card h2,\n.dark .modal-card h3 {\n  color: #f4f1e9;\n}\n.dark .studio-card .studio-card-body,\n.dark .studio-card .studio-card-body p,\n.dark .studio-card .studio-location,\n.dark .studio-card .studio-meta,\n.dark .empty-state p {\n  color: #b9c4ba;\n}\n.dark .category-pill {\n  border-color: rgba(255,255,255,.24);\n  background: rgba(25,33,28,.91);\n  color: #f4f1e9;\n}\n.dark .save-button,\n.dark .icon-button,\n.dark .mobile-toggle {\n  border-color: #46564a;\n  background: #202a24;\n  color: #f4f1e9;\n}\n.dark .modal-backdrop { background: rgba(0,0,0,.78); }\n.dark .availability-note,\n.dark .price-breakdown,\n.dark .auth-v2-note {\n  border-color: #405046;\n  background: #18221c;\n  color: #c8d1c8;\n}\n.dark .form-stack label,\n.dark .modal-card label,\n.dark .auth-v2-field label { color: #e5e9e1; }\n\n/* All native form controls, including booking, filters and account forms. */\n.dark input:not([type=\"checkbox\"]):not([type=\"radio\"]),\n.dark textarea,\n.dark select,\n.dark .form-stack input,\n.dark .form-stack textarea,\n.dark .form-stack select,\n.dark .input-icon input,\n.dark .auth-v2-input {\n  border-color: #48584d !important;\n  background: #17211b !important;\n  color: #f4f1e9 !important;\n  color-scheme: dark;\n}\n.dark input::placeholder,\n.dark textarea::placeholder,\n.dark .auth-v2-input::placeholder {\n  color: #9eaa9f !important;\n  opacity: 1;\n}\n.dark select option {\n  background: #202a24;\n  color: #f4f1e9;\n}\n.dark input:focus,\n.dark textarea:focus,\n.dark select:focus,\n.dark .auth-v2-input:focus {\n  border-color: #e9957e !important;\n  outline: 3px solid rgba(233,149,126,.2);\n  outline-offset: 1px;\n}\n.dark input:disabled,\n.dark textarea:disabled,\n.dark select:disabled {\n  background: #202a24 !important;\n  color: #9eaa9f !important;\n}\n.dark .muted,\n.dark .text-muted,\n.dark .form-hint,\n.dark .helper-text {\n  color: #b2beb4 !important;\n}\n.dark .site-header.nav-glass {\n  background: rgba(20,27,22,.94);\n  border-bottom-color: rgba(255,255,255,.1);\n}\n.dark .main-nav {\n  border-color: #3b4940;\n  background: #18211c;\n}\n.dark .nav-link { color: #d2dcd2; }\n.dark .nav-link:hover,\n.dark .nav-link.active { color: #fff; }\n.dark .profile-menu a,\n.dark .profile-menu button { color: #e7ede6; }\n.dark .profile-menu a:hover,\n.dark .profile-menu button:hover { background: #2b392f; }\n.dark .site-footer {\n  border-color: rgba(255,255,255,.1);\n  background: #101612;\n}\n.dark .site-footer .footer-copy,\n.dark .site-footer p,\n.dark .site-footer small { color: #bec9bf; }\n.dark .site-footer a { color: #d3ddd3; }\n.dark .site-footer a:hover { color: #fff; }\n\n/* Login and registration contrast: no low-contrast grey labels or links. */\n.dark .auth-page.auth-v2 {\n  background:\n    radial-gradient(ellipse at 4% 8%, rgba(227,105,81,.1), transparent 30%),\n    radial-gradient(ellipse at 96% 18%, rgba(137,112,203,.1), transparent 32%),\n    #141a16;\n}\n.dark .auth-v2-shell {\n  border-color: rgba(255,255,255,.13);\n  background: #202a24;\n}\n.dark .auth-v2-panel { background: #202a24; }\n.dark .auth-v2-panel h1 { color: #f7f4ec; }\n.dark .auth-v2-intro,\n.dark .auth-v2-panel .back-link { color: #c4cec5; }\n.dark .auth-v2-field label { color: #edf0e9; }\n.dark .auth-v2-field label span { color: #b7c3b8; }\n.dark .auth-v2-bottom { color: #c1cbc2; }\n.dark .auth-v2-bottom a,\n.dark .auth-v2-resend { color: #ffa48e; }\n.dark .auth-v2-switch {\n  border-color: #405046;\n  background: #17211b;\n}\n.dark .auth-v2-switch button { color: #c4cec5; }\n.dark .auth-v2-switch button[aria-pressed=\"true\"] {\n  background: #344438;\n  color: #fff;\n  box-shadow: 0 2px 10px rgba(0,0,0,.25);\n}\n.dark .auth-v2-note {\n  border-color: #405046;\n  background: #18221c;\n  color: #ccd5cc;\n}\n.dark .auth-v2-password-rules span {\n  border-color: #405046;\n  background: #18221c;\n  color: #c4cec5;\n}\n.dark .auth-v2-password-rules span.valid {\n  border-color: #397a56;\n  background: #183324;\n  color: #a9e7bc;\n}\n.dark .auth-v2-google {\n  border-color: #f2f0e8;\n  background: #f2f0e8;\n  color: #1d251f;\n}\n.dark .auth-v2-google:hover:not(:disabled) {\n  border-color: #fff;\n  background: #fff;\n}\n.dark .auth-v2-divider { color: #aeb9af; }\n.dark .auth-v2-divider::before,\n.dark .auth-v2-divider::after { background: #435047; }\n.dark .auth-v2-secondary {\n  border-color: #48584d;\n  background: #17211b;\n  color: #f4f1e9;\n}\n.dark .auth-v2-primary { color: #fff; }\n.dark .auth-v2-resend:disabled { color: #829086; }\n.dark :focus-visible {\n  outline-color: #f0a18b;\n}\n@media (prefers-reduced-motion: reduce) {\n  .auth-v2-google { transition: none; }\n}\n");
console.log("StudioSpace Google sign-in controls and full dark-theme contrast pass applied.");

 
// StudioSpace interaction polish: reliable Home action, explicit details CTA,
// richer card motion, and consistent page-level motion beyond the homepage.

replaceOnce(
  "src/components/scroll-motion.tsx",
  '      ".ss-principles > *"',
  '      ".ss-principles > *",\n      ".page-hero .container",\n      ".filter-bar",\n      ".auth-v2-shell",\n      ".detail-gallery",\n      ".content-copy > *",\n      ".footer-grid > *"',
  "Extend scroll motion to all main website pages"
);
writeFileSync("src/components/studio-card.tsx", "\"use client\";\nimport Link from \"next/link\";\nimport { MapPin, Star, ArrowUpRight, Heart } from \"lucide-react\";\nimport { useState } from \"react\";\nimport type { MouseEvent } from \"react\";\nimport { Studio, categoryLabels, api } from \"@/lib/api\";\nimport { authClient } from \"@/lib/auth-client\";\nimport { useRouter } from \"next/navigation\";\nimport { toast } from \"sonner\";\n\nexport function StudioCard({ studio, onSave, saved = false }: { studio: Studio; onSave?: (id: string) => void; saved?: boolean }) {\n  const [liked, setLiked] = useState(saved);\n  const { data: session } = authClient.useSession();\n  const router = useRouter();\n  const detailsHref = \"/studios/\" + studio._id;\n  const title = studio.title.replace(/\\s*[—–-]\\s*Demo Listing$/i, \"\").trim();\n\n  async function toggle(event: MouseEvent<HTMLButtonElement>) {\n    event.preventDefault();\n    event.stopPropagation();\n    if (!session?.user) {\n      router.push(\"/login?callbackUrl=\" + encodeURIComponent(detailsHref));\n      return;\n    }\n    try {\n      const response = await api.toggleWishlist(studio._id);\n      const isSaved = response.data.includes(studio._id);\n      setLiked(isSaved);\n      onSave?.(studio._id);\n      toast.success(isSaved ? \"Saved to your wishlist\" : \"Removed from saved spaces\");\n    } catch (error) {\n      toast.error(error instanceof Error ? error.message : \"Could not update wishlist\");\n    }\n  }\n\n  return (\n    <article className=\"studio-card\">\n      <div className=\"studio-image-wrap\">\n        <Link href={detailsHref} className=\"studio-image-link\" aria-label={\"View details for \" + title}>\n          <img src={studio.imageUrl || \"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900\"} alt={title} loading=\"lazy\" decoding=\"async\" />\n          <span className=\"category-pill\">{categoryLabels[studio.category] || studio.category}</span>\n        </Link>\n        <button type=\"button\" className={liked ? \"save-button saved\" : \"save-button\"} aria-label={liked ? \"Remove saved studio\" : \"Save studio\"} aria-pressed={liked} onClick={toggle}>\n          <Heart size={18} fill={liked ? \"currentColor\" : \"none\"} />\n        </button>\n      </div>\n      <div className=\"studio-card-body\">\n        <div className=\"studio-card-topline\">\n          <span className=\"studio-card-category\">{categoryLabels[studio.category] || studio.category}</span>\n          {typeof studio.rating === \"number\" && studio.rating > 0 ? (\n            <span className=\"studio-card-rating\"><Star size={14} fill=\"currentColor\" /> {studio.rating.toFixed(1)}{studio.reviewCount ? \" (\" + studio.reviewCount + \")\" : \"\"}</span>\n          ) : null}\n        </div>\n        <Link href={detailsHref} className=\"studio-card-title\"><h3 className=\"studio-title\">{title}</h3></Link>\n        <p className=\"studio-card-location\"><MapPin size={15} /> <span>{studio.location}</span></p>\n        <div className=\"studio-card-footer\">\n          <div className=\"studio-card-price\"><strong>{\"$\" + Number(studio.hourlyRate || 0).toFixed(0)}</strong><span>/ hour</span></div>\n          <Link href={detailsHref} className=\"studio-view-details\" aria-label={\"View details for \" + title}>\n            <span>View Details</span><ArrowUpRight size={17} aria-hidden=\"true\" />\n          </Link>\n        </div>\n      </div>\n    </article>\n  );\n}\n");
writeFileSync(
  "src/app/brand-refresh.css",
  readFileSync("src/app/brand-refresh.css", "utf8") + "\n" + "\n/* A more distinctive studio card: readable hierarchy, explicit CTA and refined motion. */\n.studio-grid { align-items: stretch; perspective: 1200px; }\n.studio-card {\n  position: relative; display: flex; min-width: 0; flex-direction: column; overflow: hidden;\n  border: 1px solid rgba(34,43,35,.1); border-radius: 20px; background: var(--ss-white);\n  box-shadow: 0 9px 28px rgba(28,31,27,.055); isolation: isolate; transform: translateZ(0);\n  transition: transform .42s cubic-bezier(.2,.72,.2,1), box-shadow .42s cubic-bezier(.2,.72,.2,1), border-color .32s ease;\n}\n.studio-card::after { position: absolute; z-index: 3; inset: 0; border: 1px solid transparent; border-radius: inherit; content: \"\"; pointer-events: none; transition: border-color .35s ease; }\n.studio-image-wrap { flex: 0 0 auto; aspect-ratio: 1.48; background: #ddd9cf; }\n.studio-image-wrap > a, .studio-image-wrap .studio-image-link { position: relative; display: block; width: 100%; height: 100%; overflow: hidden; }\n.studio-image-wrap > a::after { position: absolute; inset: 48% 0 0; background: linear-gradient(180deg,transparent,rgba(18,23,19,.24)); content: \"\"; pointer-events: none; }\n.studio-image-wrap img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .75s cubic-bezier(.2,.72,.2,1),filter .45s ease; }\n.studio-card-body { display: flex; min-height: 222px; flex: 1 1 auto; flex-direction: column; padding: 19px 19px 18px; }\n.studio-card-topline { display: flex; min-height: 22px; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }\n.studio-card-category { color: var(--ss-accent-dark); font-size: .67rem; font-weight: 850; letter-spacing: .1em; line-height: 1.3; text-transform: uppercase; }\n.studio-card-rating { display: inline-flex; align-items: center; gap: 4px; color: #a66c2f; font-size: .76rem; font-weight: 800; white-space: nowrap; }\n.studio-card-title { display: block; width: fit-content; max-width: 100%; color: var(--ss-ink); text-decoration: none; }\n.studio-card-title h3 { margin: 0; color: inherit; font-size: clamp(1.02rem,1.2vw,1.22rem); font-weight: 800; letter-spacing: -.04em; line-height: 1.28; transition: color .25s ease; }\n.studio-card-location { display: flex; align-items: flex-start; gap: 7px; margin: 9px 0 17px; color: var(--ss-muted); font-size: .78rem; line-height: 1.5; }\n.studio-card-location svg { flex: 0 0 15px; margin-top: 2px; color: var(--ss-accent); }\n.studio-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 14px; border-top: 1px solid var(--ss-line); }\n.studio-card-price { display: inline-flex; align-items: baseline; gap: 5px; color: var(--ss-muted); font-size: .72rem; white-space: nowrap; }\n.studio-card-price strong { color: var(--ss-ink); font-family: \"Manrope\",sans-serif; font-size: 1.28rem; font-weight: 850; letter-spacing: -.055em; }\n.studio-view-details {\n  position: relative; display: inline-flex; min-height: 43px; flex: 0 0 auto; align-items: center; justify-content: center; gap: 10px;\n  overflow: hidden; padding: 0 14px; border: 1px solid #d85f49; border-radius: 11px;\n  background: linear-gradient(110deg,#df684c 0%,#d65358 100%); color: #fff !important;\n  box-shadow: 0 5px 15px rgba(202,83,66,.2); font-size: .76rem; font-weight: 850; letter-spacing: .01em; text-decoration: none;\n  transition: transform .28s cubic-bezier(.2,.72,.2,1),box-shadow .28s ease,filter .28s ease;\n}\n.studio-view-details::before { position: absolute; top: -20%; bottom: -20%; left: -65%; width: 42%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent); content: \"\"; transform: skewX(-22deg); }\n.studio-view-details span, .studio-view-details svg { position: relative; z-index: 1; }\n.studio-view-details svg { transition: transform .28s cubic-bezier(.2,.72,.2,1); }\n.studio-view-details:hover { transform: translateY(-2px); filter: saturate(1.08); box-shadow: 0 9px 22px rgba(202,83,66,.3); }\n.studio-view-details:hover::before { animation: ss-cta-shine .75s ease both; }\n.studio-view-details:hover svg { transform: translate3d(3px,-2px,0); }\n@keyframes ss-cta-shine { to { left: 135%; } }\n@media (hover:hover) and (pointer:fine) {\n  .studio-card:hover { z-index: 2; transform: perspective(1200px) translate3d(0,-8px,0) rotateX(.45deg); border-color: rgba(223,90,67,.38); box-shadow: 0 22px 48px rgba(35,39,33,.14),0 5px 18px rgba(223,90,67,.08); }\n  .studio-card:hover::after { border-color: rgba(223,90,67,.25); }\n  .studio-card:hover .studio-image-wrap img { transform: scale(1.075); filter: saturate(1.06); }\n  .studio-card:hover .studio-card-title h3 { color: var(--ss-accent-dark); }\n}\n.studio-card:focus-within { border-color: rgba(223,90,67,.55); box-shadow: 0 0 0 3px rgba(223,90,67,.1),0 14px 34px rgba(28,31,27,.1); }\n.save-button { z-index: 4; width: 42px; height: 42px; box-shadow: 0 5px 16px rgba(18,23,19,.16); transition: transform .25s ease,background .25s ease,color .25s ease; }\n.save-button:hover { transform: scale(1.08); background: #fff; }\n.save-button.saved { background: #fff1ec; color: #d65345; }\n.dark .studio-card { border-color: #3b4a40; background: #202a24; box-shadow: 0 10px 30px rgba(0,0,0,.2); }\n.dark .studio-card:hover { border-color: rgba(240,148,125,.58); box-shadow: 0 22px 48px rgba(0,0,0,.36),0 5px 18px rgba(240,148,125,.08); }\n.dark .studio-card-title, .dark .studio-card-title h3, .dark .studio-card-price strong { color: #f4f1e9; }\n.dark .studio-card-location { color: #b7c1b8; }\n.dark .studio-card-footer { border-top-color: #3e4b42; }\n.dark .studio-view-details { border-color: #e77a67; background: linear-gradient(110deg,#db7059 0%,#c95861 100%); color: #fff !important; }\n.ss-category-card { overflow: hidden; border-radius: 17px; box-shadow: 0 5px 16px rgba(28,31,27,.025); }\n.ss-category-icon { transition: transform .38s cubic-bezier(.2,.72,.2,1),background .3s ease,color .3s ease; }\n.ss-category-card:hover .ss-category-icon { transform: translate3d(0,-3px,0) rotate(-5deg); background: var(--ss-accent); color: #fff; }\n.ss-step { border-radius: 14px; }\n.ss-step:hover { border-color: rgba(240,148,125,.5); }\n.page-hero::before {\n  position: absolute; top: -38%; right: -9%; width: clamp(260px,42vw,560px); aspect-ratio: 1;\n  border: 1px solid rgba(223,90,67,.12); border-radius: 50%;\n  background: repeating-radial-gradient(circle,transparent 0 26px,rgba(223,90,67,.055) 27px 28px,transparent 29px 54px);\n  content: \"\"; pointer-events: none; animation: ss-page-orbit 30s ease-in-out infinite alternate;\n}\n@keyframes ss-page-orbit { from { transform: translate3d(0,0,0) rotate(0deg); } to { transform: translate3d(-24px,18px,0) rotate(8deg); } }\n.ss-about-visual img { animation: ss-about-drift 22s ease-in-out infinite alternate; }\n@keyframes ss-about-drift { from { transform: scale(1.015) translate3d(-.3%,0,0); } to { transform: scale(1.065) translate3d(.3%,-.4%,0); } }\n.btn:active, .studio-view-details:active { transform: translateY(0) scale(.98); }\n@media (max-width:720px) {\n  .studio-card-body { min-height: 210px; padding: 14px; }\n  .studio-card-footer { align-items: stretch; flex-direction: column; gap: 10px; }\n  .studio-view-details { width: 100%; min-height: 42px; }\n  .studio-card:hover { transform: none; }\n  .studio-image-wrap { aspect-ratio: 1.35; }\n  .ss-category-card { min-height: 154px; }\n  .page-hero::before { right: -28%; opacity: .65; }\n  .ss-about-visual img { animation-duration: 28s; }\n}\n@media (max-width:420px) {\n  .studio-card-body { min-height: 0; padding: 13px; }\n  .studio-card-footer { gap: 9px; }\n  .studio-card-price strong { font-size: 1.2rem; }\n  .studio-card-location { min-height: 34px; }\n}\n@media (prefers-reduced-motion:reduce) {\n  .studio-card,.studio-card::after,.studio-image-wrap img,.studio-view-details,.studio-view-details::before,\n  .studio-view-details svg,.save-button,.ss-category-card,.ss-category-icon,.ss-step,.ss-about-visual img,.page-hero::before,.btn {\n    animation: none !important; transition: none !important;\n  }\n  .studio-card:hover,.studio-view-details:hover { transform: none !important; }\n}\n"
);


writeFileSync(
  "src/app/brand-refresh.css",
  readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
/* Animated linear-gradient atmosphere across every route, without blocking controls. */
body { position: relative; isolation: isolate; }
body::before, body::after {
  position: fixed; inset: 0; z-index: -1; display: block; content: "";
  pointer-events: none;
}
body::before {
  background:
    linear-gradient(118deg, rgba(219,103,79,.075) 0%, transparent 34%, rgba(117,145,125,.075) 68%, transparent 100%),
    linear-gradient(28deg, transparent 12%, rgba(228,177,132,.07) 48%, transparent 82%),
    repeating-linear-gradient(135deg, transparent 0 72px, rgba(83,105,88,.025) 73px 74px, transparent 75px 146px);
  background-size: 180% 180%, 160% 160%, 220px 220px;
  animation: ss-linear-atmosphere 34s ease-in-out infinite alternate;
}
body::after {
  inset: -18%; opacity: .48;
  background:
    radial-gradient(ellipse at 18% 24%, rgba(223,105,79,.12), transparent 32%),
    radial-gradient(ellipse at 82% 68%, rgba(127,157,137,.13), transparent 34%),
    radial-gradient(ellipse at 56% 4%, rgba(229,190,151,.10), transparent 28%);
  filter: blur(28px);
  animation: ss-ambient-drift 26s ease-in-out infinite alternate;
}
@keyframes ss-linear-atmosphere {
  0% { background-position: 0% 20%, 100% 0%, 0 0; }
  50% { background-position: 70% 80%, 20% 100%, 70px 40px; }
  100% { background-position: 100% 30%, 0% 20%, 140px 80px; }
}
@keyframes ss-ambient-drift {
  0% { transform: translate3d(-1.5%, -1%, 0) rotate(-2deg) scale(1); }
  50% { transform: translate3d(1%, 1.5%, 0) rotate(1deg) scale(1.035); }
  100% { transform: translate3d(2%, -1%, 0) rotate(2deg) scale(1.06); }
}
.dark body::before {
  background:
    linear-gradient(118deg, rgba(219,103,79,.095) 0%, transparent 34%, rgba(117,145,125,.10) 68%, transparent 100%),
    linear-gradient(28deg, transparent 12%, rgba(228,177,132,.045) 48%, transparent 82%),
    repeating-linear-gradient(135deg, transparent 0 72px, rgba(190,210,192,.025) 73px 74px, transparent 75px 146px);
}
.dark body::after { opacity: .34; }
@media (max-width: 720px) {
  body::before { background-size: 220% 220%, 200% 200%, 180px 180px; animation-duration: 46s; }
  body::after { inset: -8%; filter: blur(34px); animation-duration: 38s; }
}
@media (prefers-reduced-motion: reduce) {
  body::before, body::after { animation: none !important; }
}
`
);


// Keep the footer legal line clean; no extra animated Home chip.
// Place the Google OAuth action after the email forms on both account pages.
replaceOnce("src/app/login/login-client.tsx", "<p className=\"auth-v2-intro\">Sign in to pick up where your creative work left off.</p>\n\n            <button className=\"auth-v2-google\" type=\"button\" onClick={() => void continueWithGoogle()} disabled={busy}>\n              <svg className=\"auth-v2-google-mark\" viewBox=\"0 0 48 48\" aria-hidden=\"true\" focusable=\"false\">\n  <path fill=\"#4285F4\" d=\"M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.9 6.1-14.8z\"/>\n  <path fill=\"#34A853\" d=\"M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44z\"/>\n  <path fill=\"#FBBC05\" d=\"M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18z\"/>\n  <path fill=\"#EA4335\" d=\"M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12z\"/>\n</svg>\n              <span>{busy ? \"Connecting to Google...\" : \"Continue with Google\"}</span>\n            </button>\n            <div className=\"auth-v2-divider\" aria-hidden=\"true\"><span>OR CONTINUE WITH EMAIL</span></div>", "<p className=\"auth-v2-intro auth-v2-intro-form-first\">Sign in to pick up where your creative work left off.</p>", "Move Google sign-in below the login form");
replaceOnce("src/app/login/login-client.tsx", "<p className=\"auth-v2-bottom\">New to StudioSpace?", "<div className=\"auth-v2-divider\" aria-hidden=\"true\"><span>OR CONTINUE WITH GOOGLE</span></div>\n<button className=\"auth-v2-google\" type=\"button\" onClick={() => void continueWithGoogle()} disabled={busy}>\n  <svg className=\"auth-v2-google-mark\" viewBox=\"0 0 48 48\" aria-hidden=\"true\" focusable=\"false\">\n  <path fill=\"#4285F4\" d=\"M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.9 6.1-14.8z\"/>\n  <path fill=\"#34A853\" d=\"M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44z\"/>\n  <path fill=\"#FBBC05\" d=\"M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18z\"/>\n  <path fill=\"#EA4335\" d=\"M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12z\"/>\n</svg>\n  <span>{busy ? \"Connecting to Google...\" : \"Continue with Google\"}</span>\n</button>\n<p className=\"auth-v2-bottom\">New to StudioSpace?", "Place Google sign-in below login form");
replaceOnce("src/app/register/page.tsx", "<button className=\"auth-v2-google\" type=\"button\" onClick={() => void continueWithGoogle()} disabled={busy}>\n                  <svg className=\"auth-v2-google-mark\" viewBox=\"0 0 48 48\" aria-hidden=\"true\" focusable=\"false\">\n  <path fill=\"#4285F4\" d=\"M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.9 6.1-14.8z\"/>\n  <path fill=\"#34A853\" d=\"M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44z\"/>\n  <path fill=\"#FBBC05\" d=\"M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18z\"/>\n  <path fill=\"#EA4335\" d=\"M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12z\"/>\n</svg>\n                  <span>{busy ? \"Connecting to Google...\" : \"Continue with Google\"}</span>\n                </button>\n                <div className=\"auth-v2-divider\" aria-hidden=\"true\"><span>OR CONTINUE WITH EMAIL</span></div>\n                <form className=\"auth-v2-form\" onSubmit={createAccount}>", "<form className=\"auth-v2-form auth-v2-form-first\" onSubmit={createAccount}>", "Move Google sign-in below the registration form");
replaceOnce("src/app/register/page.tsx", "<p className=\"auth-v2-bottom\">Already a member?", "<div className=\"auth-v2-divider\" aria-hidden=\"true\"><span>OR CONTINUE WITH GOOGLE</span></div>\n<button className=\"auth-v2-google\" type=\"button\" onClick={() => void continueWithGoogle()} disabled={busy}>\n  <svg className=\"auth-v2-google-mark\" viewBox=\"0 0 48 48\" aria-hidden=\"true\" focusable=\"false\">\n  <path fill=\"#4285F4\" d=\"M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.9 6.1-14.8z\"/>\n  <path fill=\"#34A853\" d=\"M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44z\"/>\n  <path fill=\"#FBBC05\" d=\"M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18z\"/>\n  <path fill=\"#EA4335\" d=\"M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12z\"/>\n</svg>\n  <span>{busy ? \"Connecting to Google...\" : \"Continue with Google\"}</span>\n</button>\n<p className=\"auth-v2-bottom\">Already a member?", "Place Google sign-in below registration form");

// Convert the header's two informational anchors into real, separately routed pages.
replaceOnce("src/components/navbar.tsx", "<Link className=\"nav-link\" href=\"/#how-it-works\" onClick={closeMenus}>How It Works</Link>", "<Link className={active(\"/how-it-works\")} href=\"/how-it-works\" onClick={closeMenus}>How It Works</Link>", "Route How It Works to its own page");
replaceOnce("src/components/navbar.tsx", "<Link className=\"nav-link\" href=\"/#about-us\" onClick={closeMenus}>About Us</Link>", "<Link className={active(\"/about-us\")} href=\"/about-us\" onClick={closeMenus}>About Us</Link>", "Route About Us to its own page");
if (!existsSync("src/app/how-it-works")) mkdirSync("src/app/how-it-works", { recursive: true });
writeFileSync("src/app/how-it-works/page.tsx", "\"use client\";\n\nimport Link from \"next/link\";\nimport { ArrowRight, Search, CalendarCheck, MessageCircle, Camera, ClipboardCheck } from \"lucide-react\";\nimport { SiteShell } from \"@/components/site-shell\";\n\nconst steps = [\n  { number: \"01\", title: \"Find your setting\", copy: \"Browse photo studios, sound stages, podcast rooms, music suites and creative workshops. Compare the details that matter before choosing.\", icon: Search },\n  { number: \"02\", title: \"Review the details\", copy: \"Check location, hourly rate, capacity, equipment, house rules and the host's availability information.\", icon: ClipboardCheck },\n  { number: \"03\", title: \"Send a booking request\", copy: \"Choose your date and time, review the estimate and send the request to the host. Your request stays pending until the host responds.\", icon: CalendarCheck },\n  { number: \"04\", title: \"Make something great\", copy: \"Once the booking is confirmed, coordinate any final access or equipment details with the host and get ready for your session.\", icon: Camera }\n];\n\nexport default function HowItWorksPage() {\n  return (\n    <SiteShell>\n      <section className=\"page-hero how-page-hero\">\n        <div className=\"container\">\n          <span className=\"eyebrow\">A CLEARER WAY TO BOOK</span>\n          <h1>From first search to <em>first take.</em></h1>\n          <p>Find the right creative space, understand the practical details and make a booking request with confidence.</p>\n          <div className=\"page-hero-actions\">\n            <Link href=\"/studios\" className=\"btn btn-dark\">Explore studios <ArrowRight size={17}/></Link>\n          </div>\n        </div>\n      </section>\n      <section className=\"section how-page-steps\">\n        <div className=\"container\">\n          <div className=\"ss-section-head\">\n            <span className=\"ss-kicker\">THE PROCESS</span>\n            <h2>Four considered steps. <em>One good session.</em></h2>\n            <p>Everything is designed to help creators and hosts agree on the details before a session begins.</p>\n          </div>\n          <div className=\"ss-steps-grid\">\n            {steps.map((step) => {\n              const Icon = step.icon;\n              return (\n                <article className=\"ss-step\" key={step.number}>\n                  <span className=\"ss-step-number\">{step.number}</span>\n                  <span className=\"ss-step-icon\"><Icon size={22}/></span>\n                  <h3>{step.title}</h3>\n                  <p>{step.copy}</p>\n                </article>\n              );\n            })}\n          </div>\n        </div>\n      </section>\n      <section className=\"section how-page-note\">\n        <div className=\"container how-page-note-inner\">\n          <div>\n            <span className=\"ss-kicker\">BEFORE YOU REQUEST</span>\n            <h2>Good details make a <em>better booking.</em></h2>\n            <p>Always check the listing's access instructions, equipment, capacity, deposits and house rules. A request is not confirmed until the host accepts it.</p>\n          </div>\n          <Link href=\"/studios\" className=\"btn btn-dark\">Find a space <ArrowRight size={17}/></Link>\n        </div>\n      </section>\n    </SiteShell>\n  );\n}\n");
if (!existsSync("src/app/about-us")) mkdirSync("src/app/about-us", { recursive: true });
writeFileSync("src/app/about-us/page.tsx", "\"use client\";\n\nimport Link from \"next/link\";\nimport { ArrowRight, Aperture, Users, Compass, Sparkles } from \"lucide-react\";\nimport { SiteShell } from \"@/components/site-shell\";\n\nconst values = [\n  { title: \"Clarity before commitment\", copy: \"Useful listing details, clear rates and understandable booking steps help both sides make informed decisions.\", icon: Compass },\n  { title: \"Built around creative work\", copy: \"Different disciplines need different environments. We bring a range of independent creative spaces into one place.\", icon: Aperture },\n  { title: \"A stronger creator-host connection\", copy: \"StudioSpace helps creators discover spaces and gives hosts a practical way to present and manage their listings.\", icon: Users }\n];\n\nexport default function AboutUsPage() {\n  return (\n    <SiteShell>\n      <section className=\"page-hero about-page-hero\">\n        <div className=\"container\">\n          <span className=\"eyebrow\">WHY STUDIOSPACE EXISTS</span>\n          <h1>Make room for <em>what comes next.</em></h1>\n          <p>StudioSpace connects independent creative spaces with the people who need the right setting to make their next idea real.</p>\n          <div className=\"page-hero-actions\">\n            <Link href=\"/studios\" className=\"btn btn-dark\">Discover spaces <ArrowRight size={17}/></Link>\n            <Link href=\"/register\" className=\"btn btn-ghost\">Become a host</Link>\n          </div>\n        </div>\n      </section>\n      <section className=\"section about-page-intro\">\n        <div className=\"container about-page-intro-grid\">\n          <div>\n            <span className=\"ss-kicker\">OUR POINT OF VIEW</span>\n            <h2>The right room can change <em>the whole idea.</em></h2>\n          </div>\n          <div>\n            <p>Finding a space for a shoot, recording session, rehearsal or workshop should feel straightforward. Creators need more than a photo: they need practical information they can plan around.</p>\n            <p>StudioSpace brings those details together, helping people compare creative environments and send clear requests while giving independent hosts a place to showcase their spaces.</p>\n          </div>\n        </div>\n      </section>\n      <section className=\"section about-page-values\">\n        <div className=\"container\">\n          <div className=\"ss-section-head\">\n            <span className=\"ss-kicker\">WHAT GUIDES US</span>\n            <h2>Useful by design. <em>Creative by nature.</em></h2>\n          </div>\n          <div className=\"about-values-grid\">\n            {values.map((value) => {\n              const Icon = value.icon;\n              return (\n                <article className=\"about-value-card\" key={value.title}>\n                  <span className=\"about-value-icon\"><Icon size={22}/></span>\n                  <h3>{value.title}</h3>\n                  <p>{value.copy}</p>\n                </article>\n              );\n            })}\n          </div>\n        </div>\n      </section>\n      <section className=\"section about-page-cta\">\n        <div className=\"container about-page-cta-inner\">\n          <div>\n            <span className=\"ss-kicker\">YOUR NEXT SESSION STARTS HERE</span>\n            <h2>Find the space that fits <em>your craft.</em></h2>\n          </div>\n          <Link href=\"/studios\" className=\"btn btn-dark\">Explore studios <ArrowRight size={17}/></Link>\n        </div>\n      </section>\n    </SiteShell>\n  );\n}\n");
writeFileSync("src/components/scroll-motion.tsx", "\"use client\";\n\nimport { useEffect } from \"react\";\nimport { usePathname } from \"next/navigation\";\n\nexport function ScrollMotion() {\n  const pathname = usePathname();\n\n  useEffect(() => {\n    const reduceMotion = window.matchMedia(\"(prefers-reduced-motion: reduce)\");\n    if (reduceMotion.matches || !(\"IntersectionObserver\" in window)) return;\n\n    const selector = [\n      \".site-header\",\n      \".site-header .brand\",\n      \".main-nav > *\",\n      \".nav-actions > *\",\n      \"main section\",\n      \".ss-hero\",\n      \".ss-hero-panel\",\n      \".ss-hero-copy\",\n      \".ss-hero-topline\",\n      \".ss-hero-foot\",\n      \".home-refresh > section\",\n      \".ss-category-section\",\n      \".ss-featured\",\n      \".ss-about\",\n      \".ss-host-band\",\n      \".page-hero .container\",\n      \".section > .container > *\",\n      \".ss-section-head\",\n      \".ss-category-card\",\n      \".ss-step\",\n      \".studio-card\",\n      \".filter-bar\",\n      \".auth-v2-shell\",\n      \".detail-gallery > *\",\n      \".content-copy > *\",\n      \".footer-grid > *\",\n      \".ss-about-visual\",\n      \".ss-about-copy\",\n      \".ss-host-band-inner\",\n      \".ss-principles > *\"\n    ].join(\",\");\n\n    const observer = new IntersectionObserver((entries) => {\n      entries.forEach((entry) => {\n        if (!entry.isIntersecting) return;\n        entry.target.classList.add(\"ss-in-view\");\n        observer.unobserve(entry.target);\n      });\n    }, { threshold: 0.04, rootMargin: \"0px 0px -5% 0px\" });\n\n    const attach = (scope: ParentNode) => {\n      scope.querySelectorAll(selector).forEach((node, index) => {\n        const item = node as HTMLElement;\n        if (item.dataset.ssMotionReady === \"true\") return;\n        item.dataset.ssMotionReady = \"true\";\n        item.classList.add(\"ss-reveal\");\n        item.style.setProperty(\"--ss-reveal-delay\", String(Math.min(index % 6, 5) * 75) + \"ms\");\n        observer.observe(item);\n      });\n    };\n\n    document.querySelectorAll<HTMLElement>(selector).forEach((item) => {\n      item.classList.remove(\"ss-reveal\", \"ss-in-view\");\n      delete item.dataset.ssMotionReady;\n      item.style.removeProperty(\"--ss-reveal-delay\");\n    });\n    attach(document);\n\n    const mutations = new MutationObserver((records) => {\n      records.forEach((record) => {\n        record.addedNodes.forEach((node) => {\n          if (!(node instanceof HTMLElement)) return;\n          if (node.matches(selector)) {\n            node.classList.remove(\"ss-reveal\", \"ss-in-view\");\n            delete node.dataset.ssMotionReady;\n            attach(node.parentElement ?? document);\n          } else {\n            attach(node);\n          }\n        });\n      });\n    });\n    mutations.observe(document.body, { childList: true, subtree: true });\n\n    return () => {\n      mutations.disconnect();\n      observer.disconnect();\n    };\n  }, [pathname]);\n\n  return null;\n}\n");
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + "\n" + "\n/* Distinct, saturated-but-soft linear gradient cards. */\n.studio-card {\n  background: linear-gradient(135deg, #fffefa 0%, #fff0e9 48%, #edf4ee 100%) !important;\n  border: 1px solid transparent !important;\n  background-clip: padding-box !important;\n  box-shadow: 0 12px 32px rgba(42, 48, 40, .09), inset 0 1px 0 rgba(255,255,255,.8) !important;\n}\n.studio-card::before {\n  position: absolute; z-index: 1; top: 0; left: 0; right: 0; height: 4px;\n  background: linear-gradient(90deg, #df5a43 0%, #e99b79 40%, #8ea995 72%, #667e70 100%);\n  background-size: 220% 100%; content: \"\"; pointer-events: none;\n  animation: ss-card-spectrum 7s ease-in-out infinite alternate;\n}\n.studio-card .studio-card-body { position: relative; z-index: 2; }\n.studio-card .studio-image-wrap { position: relative; z-index: 2; }\n@keyframes ss-card-spectrum { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }\n.dark .studio-card {\n  background: linear-gradient(135deg, #202a24 0%, #382b2a 48%, #26372f 100%) !important;\n  border-color: rgba(244,241,233,.12) !important;\n}\n\n/* A more visible, layered moving background that remains behind all controls. */\nhtml { background: #f3f0e9; }\nbody {\n  min-height: 100vh;\n  background-color: #f3f0e9 !important;\n  background-image:\n    linear-gradient(118deg, rgba(220,99,75,.105) 0%, rgba(255,250,243,.1) 32%, rgba(128,157,136,.13) 66%, rgba(241,222,204,.1) 100%),\n    linear-gradient(32deg, rgba(246,230,218,.55), transparent 46%, rgba(222,236,224,.58));\n  background-size: 260% 260%, 220% 220%;\n  background-attachment: fixed;\n  animation: ss-body-gradient 28s ease-in-out infinite alternate;\n}\n@keyframes ss-body-gradient {\n  0% { background-position: 0% 15%, 100% 80%; }\n  50% { background-position: 72% 88%, 20% 25%; }\n  100% { background-position: 100% 15%, 0% 90%; }\n}\n.dark body {\n  background-color: #111914 !important;\n  background-image:\n    linear-gradient(118deg, rgba(209,94,74,.16) 0%, rgba(31,41,34,.18) 34%, rgba(85,125,102,.2) 69%, rgba(91,65,83,.14) 100%),\n    linear-gradient(32deg, rgba(35,45,38,.8), transparent 48%, rgba(66,54,47,.7));\n}\n.page-hero {\n  background-image:\n    linear-gradient(115deg, rgba(255,251,245,.93), rgba(249,237,228,.9) 48%, rgba(232,241,232,.93));\n  background-size: 220% 220%;\n  animation: ss-page-hero-flow 24s ease-in-out infinite alternate;\n}\n@keyframes ss-page-hero-flow {\n  from { background-position: 0% 30%; }\n  to { background-position: 100% 70%; }\n}\n.dark .page-hero {\n  background-image: linear-gradient(115deg, rgba(24,34,27,.97), rgba(48,37,36,.96) 48%, rgba(27,48,37,.97));\n}\n\n/* Visible entrance motion for headers, navigation, section titles and controls. */\n.site-header { animation: ss-header-drop .8s cubic-bezier(.18,.7,.2,1) both; }\n.site-header .brand { animation: ss-brand-enter .9s .08s cubic-bezier(.18,.7,.2,1) both; }\n.main-nav > * { animation: ss-nav-enter .65s cubic-bezier(.18,.7,.2,1) both; }\n.main-nav > *:nth-child(2) { animation-delay: .08s; }\n.main-nav > *:nth-child(3) { animation-delay: .16s; }\n.main-nav > *:nth-child(4) { animation-delay: .24s; }\n.nav-actions > * { animation: ss-nav-enter .7s .18s cubic-bezier(.18,.7,.2,1) both; }\n@keyframes ss-header-drop { from { opacity: 0; transform: translateY(-18px); } to { opacity: 1; transform: translateY(0); } }\n@keyframes ss-brand-enter { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }\n@keyframes ss-nav-enter { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }\n\n.ss-reveal {\n  opacity: 0;\n  transform: translate3d(0, 30px, 0) scale(.99);\n  transition:\n    opacity .82s cubic-bezier(.2,.72,.2,1) var(--ss-reveal-delay, 0ms),\n    transform .82s cubic-bezier(.2,.72,.2,1) var(--ss-reveal-delay, 0ms);\n}\n.ss-reveal.ss-in-view { opacity: 1; transform: translate3d(0,0,0) scale(1); }\n.ss-section-head h2, .page-hero h1 {\n  background-image: linear-gradient(100deg, currentColor 0%, currentColor 62%, var(--ss-accent-dark) 100%);\n  background-clip: text; -webkit-background-clip: text;\n}\n.ss-section-head::after {\n  display: block; width: 68px; height: 3px; margin-top: 22px; border-radius: 99px;\n  background: linear-gradient(90deg, #df5a43, #e9a080, #8ea995);\n  content: \"\"; transform: scaleX(.25); transform-origin: left;\n  transition: transform .8s cubic-bezier(.2,.72,.2,1);\n}\n.ss-section-head.ss-in-view::after { transform: scaleX(1); }\n.ss-category-card, .ss-step, .about-value-card {\n  position: relative; overflow: hidden;\n  transition: transform .45s cubic-bezier(.2,.72,.2,1), box-shadow .45s ease, border-color .3s ease, background .3s ease;\n}\n.ss-category-card::after, .ss-step::after, .about-value-card::after {\n  position: absolute; inset: -80% auto -80% -45%; width: 32%;\n  background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent);\n  content: \"\"; pointer-events: none; transform: skewX(-20deg);\n}\n.ss-category-card:hover::after, .ss-step:hover::after, .about-value-card:hover::after { animation: ss-surface-shine .8s ease; }\n@keyframes ss-surface-shine { to { left: 135%; } }\n.ss-category-card:hover, .ss-step:hover, .about-value-card:hover {\n  transform: translateY(-7px);\n  box-shadow: 0 20px 42px rgba(31,42,33,.13);\n}\n.page-hero h1, .page-hero p, .page-hero .eyebrow, .page-hero .page-hero-actions {\n  animation: ss-hero-copy-in .85s cubic-bezier(.2,.72,.2,1) both;\n}\n.page-hero h1 { animation-delay: .08s; }\n.page-hero p { animation-delay: .17s; }\n.page-hero .page-hero-actions { animation-delay: .25s; }\n@keyframes ss-hero-copy-in { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }\n.btn, .nav-link, .studio-view-details, .auth-v2-google {\n  transition: transform .28s cubic-bezier(.2,.72,.2,1), box-shadow .28s ease, background .28s ease, border-color .28s ease;\n}\n.btn:hover, .auth-v2-google:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 26px rgba(38,47,39,.15); }\n\n/* New standalone information pages. */\n.how-page-note-inner, .about-page-cta-inner {\n  display: flex; align-items: center; justify-content: space-between; gap: 38px;\n  padding: clamp(28px,5vw,58px); border: 1px solid rgba(35,48,39,.1); border-radius: 24px;\n  background: linear-gradient(118deg, #fff6f0 0%, #f4eee8 48%, #edf4ee 100%);\n}\n.how-page-note-inner > div, .about-page-cta-inner > div { max-width: 720px; }\n.how-page-note h2, .about-page-cta h2 { margin: 12px 0 16px; font-size: clamp(2rem,4vw,3.2rem); }\n.how-page-note p { max-width: 650px; color: var(--ss-muted); }\n.about-page-intro-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(30px,7vw,100px); align-items: start; }\n.about-page-intro-grid h2 { margin-top: 16px; }\n.about-page-intro-grid > div:last-child { max-width: 700px; color: var(--ss-muted); }\n.about-values-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 20px; margin-top: 38px; }\n.about-value-card {\n  min-height: 250px; padding: 28px; border: 1px solid rgba(33,45,37,.1); border-radius: 20px;\n  background: linear-gradient(145deg,#fffefa,#fff2eb 54%,#eff4ee);\n}\n.about-value-icon { display: inline-grid; width: 48px; height: 48px; place-items: center; margin-bottom: 20px; border-radius: 14px; background: linear-gradient(135deg,#f4d9cf,#e4ece3); color: #b64d3d; }\n.about-value-card h3 { margin: 0 0 12px; font-size: 1.2rem; }\n.about-value-card p { margin: 0; color: var(--ss-muted); font-size: .92rem; }\n.dark .how-page-note-inner, .dark .about-page-cta-inner, .dark .about-value-card {\n  border-color: rgba(255,255,255,.12); background: linear-gradient(118deg,#282b26,#332a29 50%,#24362c);\n}\n.dark .about-page-intro-grid > div:last-child, .dark .about-value-card p, .dark .how-page-note p { color: #c3cdc3; }\n.dark .about-value-icon { background: linear-gradient(135deg,#59403b,#34473b); color: #ffad95; }\n\n@media(max-width: 760px) {\n  .about-page-intro-grid { grid-template-columns: 1fr; gap: 14px; }\n  .about-values-grid { grid-template-columns: 1fr; }\n  .how-page-note-inner, .about-page-cta-inner { align-items: flex-start; flex-direction: column; gap: 20px; }\n  .how-page-note-inner .btn, .about-page-cta-inner .btn { width: 100%; justify-content: center; }\n}\n@media(prefers-reduced-motion: reduce) {\n  body, .page-hero, .site-header, .site-header .brand, .main-nav > *, .nav-actions > *,\n  .studio-card::before, .ss-category-card, .ss-step, .about-value-card,\n  .page-hero h1, .page-hero p, .page-hero .eyebrow, .page-hero .page-hero-actions {\n    animation: none !important; transition: none !important;\n  }\n  .ss-reveal, .ss-reveal.ss-in-view { opacity: 1 !important; transform: none !important; }\n}\n");
console.log("StudioSpace page separation, below-form Google sign-in, linear card gradients and full-site motion applied.");

writeFileSync("src/components/scroll-motion.tsx", String.raw`"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const hoverSelector = [
  ".studio-card", ".ss-category-card", ".ss-step", ".about-value-card"
].join(",");

function hoverType(element: HTMLElement): "section" | "text" | "image" | "control" | "card" {
  if (element.matches("main section, .page-hero, .ss-hero-panel, .auth-v2-panel, .auth-v2-visual, .how-page-note-inner, .about-page-cta-inner")) return "section";
  if (element.matches("img, .ss-about-visual, .detail-gallery > *")) return "image";
  if (element.matches("article, .studio-card, .ss-category-card, .ss-step, .about-value-card, .filter-bar")) return "card";
  if (element.matches("a, button, input, select, textarea, .nav-actions > *")) return "control";
  return "text";
}

export function ScrollMotion() {
  const pathname = usePathname();
  const previousPathRef = useRef(pathname);
  const isClientNavigation = previousPathRef.current !== pathname;

  useEffect(() => {
    previousPathRef.current = pathname;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceChange = () => {
      document.body.classList.toggle("ss-motion-reduced", reduced.matches);
    };
    reduceChange();
    reduced.addEventListener?.("change", reduceChange);

    const revealSelector = [
      ".site-header", ".site-header .brand", ".main-nav > *", ".nav-actions > *",
      "main section", ".page-hero .container", ".section > .container > *",
      ".ss-hero", ".ss-hero-panel", ".ss-hero-copy", ".ss-hero-topline", ".ss-hero-foot",
      ".home-refresh > section", ".ss-category-section", ".ss-featured", ".ss-about", ".ss-host-band",
      ".ss-section-head", ".ss-category-card", ".ss-step", ".studio-card", ".filter-bar",
      ".auth-v2-shell", ".detail-gallery > *", ".content-copy > *", ".footer-grid > *",
      ".ss-about-visual", ".ss-about-copy", ".ss-host-band-inner", ".ss-principles > *",
      ".about-value-card", ".about-page-intro-grid > div", ".how-page-note-inner > div", ".about-page-cta-inner > div"
    ].join(",");

    let observer: IntersectionObserver | null = null;
    const showWithoutReveal = (item: HTMLElement) => {
      item.dataset.ssMotionReady = "true";
      item.classList.remove("ss-reveal");
      item.style.removeProperty("--ss-reveal-delay");
    };
    const attachReveal = (scope: ParentNode) => {
      // SPA route content must never start hidden behind an entrance observer.
      // Reveal animations are reserved for a full page load; client transitions
      // keep the newly mounted route immediately readable.
      if (isClientNavigation) {
        if (scope instanceof HTMLElement && (scope.matches(revealSelector) || scope.classList.contains("ss-reveal"))) {
          showWithoutReveal(scope);
        }
        scope.querySelectorAll<HTMLElement>(revealSelector + ", .ss-reveal").forEach(showWithoutReveal);
        return;
      }
      if (reduced.matches || !("IntersectionObserver" in window) || !observer) return;
      if (scope instanceof HTMLElement && scope.matches(revealSelector)) {
        if (scope.dataset.ssMotionReady !== "true") {
          scope.dataset.ssMotionReady = "true";
          scope.classList.add("ss-reveal");
          scope.style.setProperty("--ss-reveal-delay", "0ms");
          observer.observe(scope);
        }
      }
      scope.querySelectorAll(revealSelector).forEach((node, index) => {
        const item = node as HTMLElement;
        if (item.dataset.ssMotionReady === "true") return;
        item.dataset.ssMotionReady = "true";
        item.classList.add("ss-reveal");
        item.style.setProperty("--ss-reveal-delay", String(Math.min(index % 6, 5) * 65) + "ms");
        observer?.observe(item);
      });
    };

    if (isClientNavigation) {
      attachReveal(document);
    } else if (!reduced.matches && "IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("ss-in-view");
          observer?.unobserve(entry.target);
        });
      }, { threshold: 0.035, rootMargin: "0px 0px -3% 0px" });
      attachReveal(document);
    }

    const onMutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) attachReveal(node);
      }));
    });
    onMutations.observe(document.body, { childList: true, subtree: true });

    // No full-screen cursor-following glow: it caused expensive compositing
    // across the entire page on every pointer movement.
    let activeTarget: HTMLElement | null = null;
    const clearActive = () => {
      if (!activeTarget) return;
      activeTarget.classList.remove("ss-pointer-active", "ss-pointer-section", "ss-pointer-text", "ss-pointer-image", "ss-pointer-control", "ss-pointer-card");
      activeTarget.style.removeProperty("--ss-tilt-x");
      activeTarget.style.removeProperty("--ss-tilt-y");
      activeTarget.style.removeProperty("--ss-hover-x");
      activeTarget.style.removeProperty("--ss-hover-y");
      activeTarget = null;
    };

    const onPointerOver = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType === "touch") return;
      const source = event.target;
      if (!(source instanceof Element)) return;
      const card = source.closest<HTMLElement>(".studio-card");
      const next = card ?? source.closest<HTMLElement>(hoverSelector);
      if (next === activeTarget) return;
      clearActive();
      if (!next) return;
      activeTarget = next;
      next.classList.add("ss-pointer-active", "ss-pointer-" + hoverType(next));
    };

    // Coalesce high-frequency pointer events to one visual update per frame.
    // Only a card currently under the pointer is measured or transformed.
    let pointerFrame = 0;
    let latestPointerX = 0;
    let latestPointerY = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType === "touch" || reduced.matches || !activeTarget) return;
      latestPointerX = event.clientX;
      latestPointerY = event.clientY;
      if (pointerFrame) return;
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const target = activeTarget;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((latestPointerX - rect.left) / Math.max(rect.width, 1)) * 100));
        const y = Math.max(0, Math.min(100, ((latestPointerY - rect.top) / Math.max(rect.height, 1)) * 100));
        const isStudioCard = target.matches(".studio-card");
        const tiltX = ((x - 50) / 50) * (isStudioCard ? 6.2 : 4.4);
        const tiltY = ((50 - y) / 50) * (isStudioCard ? 4.8 : 3.5);
        target.style.setProperty("--ss-hover-x", x.toFixed(1) + "%");
        target.style.setProperty("--ss-hover-y", y.toFixed(1) + "%");
        target.style.setProperty("--ss-tilt-x", tiltX.toFixed(2) + "deg");
        target.style.setProperty("--ss-tilt-y", tiltY.toFixed(2) + "deg");
      });
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!activeTarget) return;
      const next = event.relatedTarget;
      if (next instanceof Node && activeTarget.contains(next)) return;
      const source = event.target;
      if (source instanceof Node && activeTarget.contains(source)) {
        clearActive();
      }
    };

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });

    const onPointerModeChange = () => {
      if (!finePointer.matches) {
        clearActive();
        document.body.classList.remove("ss-pointer-live");
      }
    };
    finePointer.addEventListener?.("change", onPointerModeChange);

    return () => {
      onMutations.disconnect();
      observer?.disconnect();
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      finePointer.removeEventListener?.("change", onPointerModeChange);
      reduced.removeEventListener?.("change", reduceChange);
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      clearActive();
    };
  }, [pathname]);

  return null;
}
`);
let pointerProvider = readFileSync("src/components/providers.tsx", "utf8");
if (!pointerProvider.includes('import { ScrollMotion } from "@/components/scroll-motion";')) {
  pointerProvider = pointerProvider.replace('import { ScrollRestoration } from "@/components/scroll-restoration";', 'import { ScrollRestoration } from "@/components/scroll-restoration";\nimport { ScrollMotion } from "@/components/scroll-motion";');
}
if (!pointerProvider.includes("<ScrollMotion/>")) {
  pointerProvider = pointerProvider.replace("<><ScrollRestoration/>", "<><ScrollRestoration/><ScrollMotion/>");
}
if (!pointerProvider.includes("<ScrollMotion/>")) throw new Error("Could not mount full-site pointer motion component.");
writeFileSync("src/components/providers.tsx", pointerProvider);
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
/* Full-site cursor interaction: the pointer should visibly affect every major surface. */
body { isolation: isolate; }
body > div, body > main, .site-header, body main, .site-footer { position: relative; z-index: 1; }
.site-header { z-index: 80; }
.ss-cursor-aura {
  position: fixed; top: 0; left: 0; z-index: 0; width: 340px; height: 340px;
  margin: -170px 0 0 -170px; border-radius: 50%; pointer-events: none;
  opacity: 0; background: radial-gradient(circle, rgba(224,100,76,.16) 0%, rgba(228,170,139,.10) 34%, rgba(137,166,145,.075) 54%, transparent 72%);
  filter: blur(5px); mix-blend-mode: multiply;
  transition: opacity .28s ease;
  will-change: transform;
}
body.ss-pointer-live .ss-cursor-aura { opacity: 1; }
.dark .ss-cursor-aura {
  background: radial-gradient(circle, rgba(235,115,91,.2) 0%, rgba(178,139,193,.12) 38%, rgba(116,166,132,.11) 58%, transparent 74%);
  mix-blend-mode: screen;
}
.ss-pointer-active {
  --ss-hover-x: 50%; --ss-hover-y: 50%;
  transition:
    translate .34s cubic-bezier(.2,.72,.2,1),
    scale .34s cubic-bezier(.2,.72,.2,1),
    color .28s ease,
    filter .34s ease,
    box-shadow .34s ease,
    border-color .34s ease,
    text-shadow .34s ease;
}
.ss-pointer-section.ss-pointer-active {
  translate: 0 -3px;
  box-shadow: inset 0 0 0 1px rgba(220,99,75,.16), 0 15px 42px rgba(54,63,53,.055);
}
.ss-pointer-text.ss-pointer-active {
  translate: 3px 0;
  color: var(--ss-accent-dark);
  text-shadow: 0 5px 22px rgba(220,99,75,.12);
}
.ss-pointer-control.ss-pointer-active {
  translate: 0 -3px;
  scale: 1.025;
  filter: saturate(1.14);
}
.ss-pointer-card.ss-pointer-active {
  translate: 0 -6px;
  scale: 1.012;
  box-shadow: 0 25px 58px rgba(38,49,39,.16), 0 0 0 1px rgba(223,90,67,.18);
  border-color: rgba(223,90,67,.32) !important;
}
.ss-pointer-image { overflow: hidden; }
img.ss-pointer-image.ss-pointer-active,
img.ss-pointer-image.ss-pointer-active,
.ss-pointer-image.ss-pointer-active img,
.ss-pointer-image.ss-pointer-active > img {
  transform: scale(1.055);
  filter: saturate(1.15) contrast(1.035);
}
.ss-about-visual.ss-pointer-active { scale: 1.018; filter: saturate(1.12) brightness(1.035); }
.ss-about-visual.ss-pointer-active { scale: 1.018; filter: saturate(1.12) brightness(1.035); }
.ss-pointer-image.ss-pointer-active {
  box-shadow: 0 0 0 2px rgba(223,90,67,.25), 0 18px 40px rgba(32,42,34,.14);
}
.ss-pointer-active::selection { background: var(--ss-accent); color: white; }
.main-nav a.ss-pointer-active,
.footer-grid a.ss-pointer-active {
  color: var(--ss-accent-dark);
  text-shadow: 0 4px 18px rgba(223,90,67,.16);
}
.ss-section-head.ss-pointer-active h2,
.page-hero h1.ss-pointer-active,
main section h2.ss-pointer-active,
main section h3.ss-pointer-active {
  background-image: linear-gradient(100deg, currentColor 0%, #df5a43 48%, #819c88 100%);
  background-size: 200% auto;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ss-heading-glint 1.1s ease both;
}
@keyframes ss-heading-glint {
  from { background-position: 100% center; }
  to { background-position: 0% center; }
}
main section img.ss-pointer-active,
main section .ss-pointer-image.ss-pointer-active img {
  transition: transform .65s cubic-bezier(.2,.72,.2,1), filter .4s ease;
}
main section button.ss-pointer-active,
main section a.ss-pointer-active,
.site-header a.ss-pointer-active,
.site-header button.ss-pointer-active {
  box-shadow: 0 9px 24px rgba(43,52,43,.13);
}
.ss-pointer-active .studio-view-details,
.ss-pointer-active .ss-category-arrow {
  transform: translateX(4px);
}
@media (hover: hover) and (pointer: fine) {
  main section, .site-header, .site-footer, .studio-card, .ss-category-card, .ss-step,
  .about-value-card, .auth-v2-panel, .auth-v2-visual, .content-copy > * {
    cursor: default;
  }
}
@media (max-width: 720px) {
  .ss-cursor-aura { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  .ss-cursor-aura { display: none !important; }
  .ss-pointer-active { translate: none !important; scale: none !important; filter: none !important; transition: none !important; }
  .ss-pointer-section.ss-pointer-active, .ss-pointer-card.ss-pointer-active { box-shadow: none !important; }
  .ss-pointer-image.ss-pointer-active img { transform: none !important; }
}
`);
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`

/* Reliable brand link hit-area and a visible card-hover fallback. */
.site-header .brand {
  position: relative;
  z-index: 1002;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  pointer-events: auto;
  text-decoration: none;
}
.site-header .brand:focus-visible {
  outline: 3px solid rgba(223, 90, 67, .65);
  outline-offset: 5px;
  border-radius: 8px;
}
.studio-card {
  transform-style: preserve-3d;
  transform-origin: center center;
  transition:
    transform .48s cubic-bezier(.18,.72,.2,1),
    box-shadow .48s cubic-bezier(.18,.72,.2,1),
    border-color .38s ease;
}
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .studio-card:hover {
    transform:
      perspective(1100px)
      rotateX(var(--ss-tilt-y, 0deg))
      rotateY(var(--ss-tilt-x, 0deg))
      translate3d(0,-9px,0)
      scale(1.018) !important;
    box-shadow:
      0 28px 58px rgba(24,31,25,.19),
      0 8px 22px rgba(210,92,69,.12) !important;
    border-color: rgba(223,112,88,.58) !important;
  }
  .studio-card:hover .studio-image-wrap img {
    transform: scale(1.08) !important;
    filter: saturate(1.1) contrast(1.03);
  }
  .studio-card:hover .studio-card-title h3 {
    color: var(--ss-accent-dark);
  }
  .studio-card:hover .studio-view-details {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(202,83,66,.3);
  }
  .studio-card:hover .studio-view-details svg {
    transform: translate3d(4px,-2px,0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .studio-card { transition: none !important; }
}

/* Studio cards get a deliberate pointer-led tilt; navigation stays still and readable. */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .studio-card.ss-pointer-card.ss-pointer-active {
    translate: none !important;
    scale: none !important;
    transform:
      perspective(1080px)
      rotateX(var(--ss-tilt-y, 0deg))
      rotateY(var(--ss-tilt-x, 0deg))
      translate3d(0, -9px, 0)
      scale(1.014) !important;
    transform-style: preserve-3d;
    box-shadow:
      0 28px 58px rgba(24, 31, 25, .19),
      0 8px 22px rgba(210, 92, 69, .11) !important;
    border-color: rgba(223, 112, 88, .52) !important;
  }
  .studio-card.ss-pointer-card.ss-pointer-active::after {
    background: radial-gradient(
      circle at var(--ss-hover-x, 50%) var(--ss-hover-y, 50%),
      rgba(255,255,255,.16),
      transparent 48%
    );
    border-color: rgba(223, 112, 88, .3);
  }
  .studio-card.ss-pointer-card.ss-pointer-active .studio-image-wrap img {
    transform: scale(1.075);
    filter: saturate(1.09) contrast(1.025);
  }
  .studio-card.ss-pointer-card.ss-pointer-active .studio-view-details svg {
    transform: translate3d(3px,-2px,0);
  }
  .studio-card.ss-pointer-card.ss-pointer-active .studio-card-title h3 {
    color: var(--ss-accent-dark);
  }
}

/* Keep the site navigation visible while scrolling on every route. */
.site-header {
  position: fixed !important;
  top: 0 !important;
  right: 0 !important;
  left: 0 !important;
  width: 100% !important;
  z-index: 1000 !important;
}
body {
  padding-top: 78px !important;
}
html { scroll-padding-top: 92px; }

/* The previous Home chip/hover effect is intentionally removed. Home is a plain nav link. */
.main-nav a[href="/"].ss-pointer-active {
  translate: none !important;
  scale: none !important;
  text-shadow: none !important;
  box-shadow: none !important;
}

/* Dark-mode buttons must have explicit foreground/background pairs. */
.dark .btn-dark,
.dark .nav-actions .btn-dark,
.dark button.btn-dark {
  border-color: #ef987f !important;
  background: #ef987f !important;
  color: #172019 !important;
}
.dark .btn-dark:hover,
.dark .nav-actions .btn-dark:hover,
.dark button.btn-dark:hover {
  border-color: #ffb29c !important;
  background: #ffb29c !important;
  color: #172019 !important;
}
.dark .btn-ghost,
.dark a.btn-ghost,
.dark button.btn-ghost {
  border-color: rgba(231, 238, 230, .3);
  background: rgba(255,255,255,.045);
  color: #f1f4ee !important;
}
.dark .btn-ghost:hover,
.dark a.btn-ghost:hover,
.dark button.btn-ghost:hover {
  border-color: rgba(240, 152, 127, .72);
  background: rgba(240, 152, 127, .12);
  color: #fff !important;
}
.dark .btn-outline,
.dark a.btn-outline,
.dark button.btn-outline {
  border-color: #738277 !important;
  background: #253229 !important;
  color: #f3f5ef !important;
}
.dark .btn-outline:hover,
.dark a.btn-outline:hover,
.dark button.btn-outline:hover {
  border-color: #f09a82 !important;
  background: #34463a !important;
  color: #fff !important;
}
.dark .btn-light,
.dark a.btn-light,
.dark button.btn-light {
  border-color: #f1eee6 !important;
  background: #f1eee6 !important;
  color: #1a211b !important;
}
.dark .btn-light:hover,
.dark a.btn-light:hover,
.dark button.btn-light:hover {
  border-color: #fff !important;
  background: #fff !important;
  color: #141a15 !important;
}
.dark .studio-view-details {
  border-color: #f19a82 !important;
  background: linear-gradient(110deg, #e98168 0%, #cf5964 100%) !important;
  color: #fff !important;
  text-shadow: 0 1px 1px rgba(0,0,0,.16);
}
.dark .profile-trigger,
.dark .mobile-toggle,
.dark .icon-button,
.dark .save-button {
  border-color: #65766a !important;
  background: #29372e !important;
  color: #f5f4ed !important;
}
.dark .save-button.saved {
  border-color: #f19a82 !important;
  background: #4a2c2a !important;
  color: #ffad98 !important;
}
.dark .nav-actions .nav-link,
.dark .main-nav .nav-link {
  color: #e0e7df !important;
}
.dark .nav-actions .nav-link:hover,
.dark .main-nav .nav-link:hover,
.dark .main-nav .nav-link.active {
  color: #fff !important;
}
@media (max-width: 760px) {
  body { padding-top: 78px !important; }
}
@media (prefers-reduced-motion: reduce) {
  .studio-card.ss-pointer-card.ss-pointer-active {
    transform: none !important;
  }
}
`);

writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
/* Final interaction pass: make card depth noticeable and preserve dark-mode control contrast. */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  .studio-card.ss-pointer-card.ss-pointer-active {
    transform:
      perspective(1080px)
      rotateX(var(--ss-tilt-y, 0deg))
      rotateY(var(--ss-tilt-x, 0deg))
      translate3d(0, -12px, 0)
      scale(1.024) !important;
    box-shadow:
      0 32px 68px rgba(24,31,25,.22),
      0 10px 28px rgba(210,92,69,.15) !important;
    border-color: rgba(231,112,88,.72) !important;
  }
  .studio-card.ss-pointer-card.ss-pointer-active .studio-image-wrap img {
    transform: scale(1.095) !important;
    filter: saturate(1.13) contrast(1.035);
  }
  .ss-category-card.ss-pointer-card.ss-pointer-active,
  .ss-step.ss-pointer-card.ss-pointer-active,
  .about-value-card.ss-pointer-card.ss-pointer-active {
    transform:
      perspective(980px)
      rotateX(var(--ss-tilt-y, 0deg))
      rotateY(var(--ss-tilt-x, 0deg))
      translate3d(0,-8px,0)
      scale(1.018) !important;
    box-shadow: 0 24px 50px rgba(31,42,33,.17), 0 0 0 1px rgba(223,90,67,.2) !important;
    border-color: rgba(223,90,67,.42) !important;
  }
}
.dark .site-header .icon-button,
.dark .site-header .icon-button:hover,
.dark .site-header .icon-button:focus-visible,
.dark .site-header .icon-button:active {
  color: #fff !important;
  border-color: #819487 !important;
  background: #2d3b32 !important;
  opacity: 1 !important;
}
.dark .site-header .icon-button:hover,
.dark .site-header .icon-button:focus-visible {
  color: #fff !important;
  border-color: #ffb29c !important;
  background: #405546 !important;
  box-shadow: 0 0 0 3px rgba(240,152,127,.2), 0 8px 20px rgba(0,0,0,.2) !important;
}
.dark .site-header .icon-button svg {
  color: #fff !important;
  stroke: currentColor !important;
}
.dark .site-header .nav-actions .btn-ghost,
.dark .site-header .nav-actions .btn-ghost:hover {
  color: #f6f6ef !important;
}
.dark .site-header .nav-actions .btn-dark,
.dark .site-header .nav-actions .btn-dark:hover {
  color: #172019 !important;
}
@media (prefers-reduced-motion: reduce) {
  .studio-card.ss-pointer-card.ss-pointer-active,
  .ss-category-card.ss-pointer-card.ss-pointer-active,
  .ss-step.ss-pointer-card.ss-pointer-active,
  .about-value-card.ss-pointer-card.ss-pointer-active {
    transform: none !important;
  }
}
`);

writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
/* Reduced-motion users still get clear, non-moving hover/focus feedback. */
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: reduce) {
  .studio-card:hover.ss-pointer-active.ss-pointer-card,
  .studio-card:focus-within {
    transform: none !important;
    border-color: rgba(223,90,67,.8) !important;
    box-shadow: 0 0 0 2px rgba(223,90,67,.2), 0 14px 34px rgba(28,31,27,.16) !important;
  }
  .studio-card:hover .studio-card-title h3,
  .studio-card:focus-within .studio-card-title h3 {
    color: var(--ss-accent-dark) !important;
  }
  .ss-category-card:hover.ss-pointer-active.ss-pointer-card,
  .ss-category-card:focus-visible,
  .ss-step:hover.ss-pointer-active.ss-pointer-card,
  .about-value-card:hover.ss-pointer-active.ss-pointer-card {
    transform: none !important;
    border-color: rgba(223,90,67,.72) !important;
    box-shadow: 0 0 0 2px rgba(223,90,67,.18), 0 12px 28px rgba(31,42,33,.12) !important;
  }
  .dark .studio-card:hover.ss-pointer-active.ss-pointer-card,
  .dark .studio-card:focus-within,
  .dark .ss-category-card:hover.ss-pointer-active.ss-pointer-card,
  .dark .ss-category-card:focus-visible,
  .dark .ss-step:hover.ss-pointer-active.ss-pointer-card,
  .dark .about-value-card:hover.ss-pointer-active.ss-pointer-card {
    border-color: rgba(255,178,156,.88) !important;
    box-shadow: 0 0 0 2px rgba(255,178,156,.22), 0 14px 32px rgba(0,0,0,.28) !important;
  }
}
`);

console.log("StudioSpace full-site cursor spotlight, hover interactions and interactive element motion applied.");

writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
/* Theme normalization: legacy app tokens now follow the StudioSpace design tokens. */
html:not(.dark) {
  color-scheme: light;
  --bg: var(--ss-paper);
  --surface: var(--ss-white);
  --text: var(--ss-ink);
  --muted: #5f665f;
  --line: var(--ss-line);
  --accent: var(--ss-accent-dark);
  --accent-soft: #f5e6dd;
  --forest: #203c35;
  --shadow: var(--ss-shadow);
  --foreground: var(--ss-ink);
  --card: var(--ss-white);
  --border: var(--ss-line);
}
html.dark {
  color-scheme: dark;
  --bg: var(--ss-paper);
  --surface: var(--ss-white);
  --text: var(--ss-ink);
  --muted: #c2cbc2;
  --line: var(--ss-line);
  --accent: #f3a08a;
  --accent-soft: #3b2d26;
  --forest: #293a30;
  --shadow: var(--ss-shadow);
  --foreground: var(--ss-ink);
  --card: var(--ss-white);
  --border: var(--ss-line);
}

/* Footer is deliberately a dark anchor in both themes. Its children must not
   inherit the page's light/dark body text tokens. */
.site-footer,
html.dark .site-footer {
  background: #101612 !important;
  border-top-color: rgba(255,255,255,.12) !important;
  color: #f4f1e9 !important;
}
.site-footer :where(h1,h2,h3,h4,h5,strong,b),
html.dark .site-footer :where(h1,h2,h3,h4,h5,strong,b) {
  color: #f4f1e9 !important;
}
.site-footer :where(p,small,span,li,dt,dd,address,.muted,.text-muted,.footer-copy,.footer-bottom),
html.dark .site-footer :where(p,small,span,li,dt,dd,address,.muted,.text-muted,.footer-copy,.footer-bottom) {
  color: #c2ccc3 !important;
}
.site-footer a,
html.dark .site-footer a,
.site-footer .footer-grid > div > a:not(.brand),
html.dark .site-footer .footer-grid > div > a:not(.brand) {
  color: #e2e9e2 !important;
}
.site-footer a:hover,
html.dark .site-footer a:hover {
  color: #ffffff !important;
}
.site-footer .brand,
.site-footer .brand > span,
html.dark .site-footer .brand,
html.dark .site-footer .brand > span {
  color: #f4f1e9 !important;
}
.site-footer .brand .brand-accent,
html.dark .site-footer .brand .brand-accent {
  color: #ffad98 !important;
}
.site-footer .brand small,
html.dark .site-footer .brand small {
  color: #c2ccc3 !important;
}
.site-footer .socials a,
html.dark .site-footer .socials a {
  color: #f4f1e9 !important;
  border-color: rgba(255,255,255,.32) !important;
}
.site-footer .footer-bottom,
.site-footer .footer-bottom span,
html.dark .site-footer .footer-bottom,
html.dark .site-footer .footer-bottom span {
  color: #c2ccc3 !important;
}

/* Form helper copy remains readable on the light auth panel. */
html:not(.dark) .auth-v2-intro,
html:not(.dark) .auth-v2-bottom {
  color: #5f665f !important;
}
html:not(.dark) .auth-v2-note {
  color: #5f665f !important;
}
html:not(.dark) .auth-v2-divider {
  color: #626a62 !important;
}
html:not(.dark) .auth-v2-password-rules span {
  color: #62695f !important;
}
html.dark .auth-v2-panel .eyebrow,
html.dark .auth-v2-panel .ss-kicker {
  color: #ffad98 !important;
}
html.dark .auth-v2-intro,
html.dark .auth-v2-note,
html.dark .auth-v2-divider,
html.dark .auth-v2-bottom,
html.dark .auth-v2-password-rules span {
  color: #c2cbc2 !important;
}
html.dark .auth-v2-password-rules span.valid {
  color: #a9e7bc !important;
}

/* Legal copy used to inherit near-black text while its dark page surface changed. */
html:not(.dark) .content-copy h2 {
  color: #191d1a !important;
}
html:not(.dark) .content-copy p,
html:not(.dark) .content-copy li {
  color: #4f5750 !important;
}
html:not(.dark) .content-copy a {
  color: #a83f30 !important;
}
html.dark .content-copy h2,
html.dark .content-copy h3,
html.dark .content-copy h4 {
  color: #f4f1e9 !important;
}
html.dark .content-copy p,
html.dark .content-copy li {
  color: #c2cbc2 !important;
}
html.dark .content-copy a {
  color: #ffad98 !important;
}

/* Keep accent labels and primary actions legible in either color scheme. */
html.dark .eyebrow,
html.dark .ss-kicker,
html.dark .auth-v2-panel .eyebrow {
  color: #ffad98 !important;
}
html:not(.dark) .btn-dark,
html:not(.dark) .btn-dark:hover {
  color: #ffffff !important;
}
html.dark .btn-dark,
html.dark .btn-dark:hover {
  color: #ffffff !important;
}
html:not(.dark) .btn-light,
html:not(.dark) .btn-light:hover {
  color: #172019 !important;
}
html.dark .btn-light,
html.dark .btn-light:hover {
  color: #172019 !important;
}
`);

console.log("StudioSpace Home navigation, highlighted View Details CTA, premium card interactions and site-wide motion pass applied.");

// Apply a single semantic palette to both theme modes across all routes.
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
/* StudioSpace unified light/dark theme pass v2 */
html:not(.dark) {
  color-scheme: light; --ss-paper:#f4f1eb; --ss-paper-deep:#eae6dd; --ss-ink:#191d1a;
  --ss-muted:#626a62; --ss-line:#dedbd2; --ss-accent:#df5a43; --ss-accent-dark:#a83f30;
  --ss-sage:#dfe6dc; --ss-white:#fffefa; --ss-shadow:0 18px 50px rgba(28,31,27,.08);
  --bg:var(--ss-paper); --surface:var(--ss-white); --text:var(--ss-ink); --muted:var(--ss-muted);
  --line:var(--ss-line); --accent:var(--ss-accent-dark); --accent-soft:#f5e6dd;
  --forest:#203c35; --foreground:var(--ss-ink); --card:var(--ss-white); --border:var(--ss-line);
}
html.dark {
  color-scheme: dark; --ss-paper:#151a16; --ss-paper-deep:#1d251f; --ss-ink:#f3f1e9;
  --ss-muted:#b7c1b7; --ss-line:#3a473e; --ss-accent:#f19a82; --ss-accent-dark:#ffad98;
  --ss-sage:#34463a; --ss-white:#222b24; --ss-shadow:0 20px 52px rgba(0,0,0,.28);
  --bg:var(--ss-paper); --surface:var(--ss-white); --text:var(--ss-ink); --muted:var(--ss-muted);
  --line:var(--ss-line); --accent:var(--ss-accent); --accent-soft:#3b2d26;
  --forest:#293a30; --foreground:var(--ss-ink); --card:var(--ss-white); --border:var(--ss-line);
}
html,body{background:var(--ss-paper);color:var(--ss-ink)}
body{transition:background-color .22s ease,color .22s ease}
h1,h2,h3,h4,h5,h6{color:var(--ss-ink)}
.muted,.text-muted,.studio-meta,.studio-card .studio-meta{color:var(--ss-muted)}
html.dark body{background:var(--ss-paper)!important;color:var(--ss-ink)!important}
html.dark .site-header{background:rgba(21,26,22,.9)!important;border-bottom-color:rgba(235,241,232,.12)!important}
html.dark .site-header .brand,html.dark .site-header .brand>span,html.dark .site-header .nav-link,html.dark .site-header .nav-actions .nav-link{color:#f3f1e9!important}
html.dark .site-header .nav-link:hover,html.dark .site-header .nav-link.active{color:#ffad98!important}
html.dark .page-hero,html.dark .ss-featured,html.dark .ss-about,html.dark .auth-page{background:var(--ss-paper)!important}
html.dark .page-hero{border-bottom-color:var(--ss-line)!important}
html.dark .page-hero h1,html.dark .page-hero h2,html.dark .ss-section-head h2,html.dark .ss-about-copy h2,html.dark .ss-section-head h3{color:var(--ss-ink)!important}
html.dark .page-hero p,html.dark .ss-section-head p,html.dark .ss-about-copy>p,html.dark .ss-principle small{color:var(--ss-muted)!important}
html.dark .ss-category-section{background:#1b231d!important}
html.dark .ss-category-card,html.dark .studio-card,html.dark .about-value-card,html.dark .filter-bar,html.dark .auth-card,html.dark .auth-v2-panel,html.dark .modal-card,html.dark .profile-menu,html.dark .profile-trigger,html.dark .mobile-toggle,html.dark .empty-state{background:var(--ss-white)!important;border-color:var(--ss-line)!important;color:var(--ss-ink)!important}
html.dark .ss-category-card strong,html.dark .ss-category-card h3,html.dark .studio-card h2,html.dark .studio-card h3,html.dark .studio-card-title h3,html.dark .about-value-card h3,html.dark .auth-card h1,html.dark .auth-card h2,html.dark .auth-v2-panel h1,html.dark .auth-v2-panel h2,html.dark .modal-card h2,html.dark .empty-state h3{color:var(--ss-ink)!important}
html.dark .ss-category-card small,html.dark .studio-card p,html.dark .studio-card .studio-meta,html.dark .about-value-card p,html.dark .empty-state p{color:var(--ss-muted)!important}
html.dark .search-field,html.dark .select-filter{color:var(--ss-muted)!important}
html.dark .search-field input,html.dark .select-filter select,html.dark .form-stack input,html.dark .form-stack textarea,html.dark .form-stack select,html.dark .input-icon input,html.dark input,html.dark textarea,html.dark select{background:#18211b!important;color:#f3f1e9!important;border-color:#46564a!important;caret-color:#ffad98}
html.dark input::placeholder,html.dark textarea::placeholder{color:#a6b2a7!important;opacity:1}
html.dark .form-stack label{color:#e9eee7!important}
html.dark .filter-bar{box-shadow:0 8px 24px rgba(0,0,0,.18)!important}
html.dark .select-filter{border-left-color:var(--ss-line)!important}
html.dark .availability-note,html.dark .price-breakdown{background:#18211b!important;border-color:var(--ss-line)!important;color:var(--ss-muted)!important}
html.dark .btn-dark,html.dark .btn-dark:hover,html.dark .btn-full.btn-dark{background:#e98269!important;border-color:#e98269!important;color:#171b17!important}
html.dark .btn-outline,html.dark .btn-outline:hover{background:#29372e!important;border-color:#728477!important;color:#f3f1e9!important}
html.dark .btn-ghost,html.dark .btn-ghost:hover{background:rgba(255,255,255,.045)!important;border-color:#526256!important;color:#f3f1e9!important}
html.dark .btn-light,html.dark .btn-light:hover{background:#f3f0e8!important;border-color:#f3f0e8!important;color:#191d1a!important}
html.dark .studio-view-details{background:linear-gradient(110deg,#e98269 0%,#cf5964 100%)!important;border-color:#e98269!important;color:#fff!important}
html.dark .profile-menu a,html.dark .profile-menu button{color:#f3f1e9!important}
html.dark .profile-menu a:hover,html.dark .profile-menu button:hover{background:#34463a!important}
html.dark .page-hero .eyebrow,html.dark .eyebrow,html.dark .ss-kicker{color:#ffad98!important}
html.dark .ss-host-band{background:#302923!important;color:#f3f1e9!important}
html.dark .ss-host-band h2{color:#f3f1e9!important}
html.dark .ss-host-band p{color:#c7c4b9!important}
html.dark .ss-host-band .ss-kicker{color:#ffad98!important}
html.dark .how-page-note-inner,html.dark .about-page-cta-inner{background:linear-gradient(118deg,#252c26 0%,#302827 50%,#233329 100%)!important;border-color:var(--ss-line)!important}
html.dark .about-page-intro-grid>div:last-child,html.dark .how-page-note p,html.dark .about-page-cta p{color:var(--ss-muted)!important}
html.dark .content-copy h2,html.dark .content-copy h3,html.dark .content-copy h4{color:#f3f1e9!important}
html.dark .content-copy p,html.dark .content-copy li{color:#c2cbc2!important}
html.dark .content-copy a{color:#ffad98!important}
html.dark .not-found{color:#f3f1e9!important}
html.dark .not-found p{color:var(--ss-muted)!important}
html.dark .site-footer{background:#101612!important;color:#f4f1e9!important}
html.dark .site-footer :where(h1,h2,h3,h4,h5,strong,b){color:#f4f1e9!important}
html.dark .site-footer :where(p,small,span,li,dt,dd,address,.muted,.footer-copy,.footer-bottom){color:#c2ccc3!important}
html.dark .site-footer a{color:#e2e9e2!important}
html.dark .site-footer a:hover{color:#fff!important}
html.dark .site-footer .brand-accent{color:#ffad98!important}
html.dark .status-pending{background:#473a24;color:#ffd58b}
html.dark .status-confirmed{background:#1e4934;color:#a9e7bc}
html.dark .status-cancelled{background:#4a2929;color:#ffb0a8}
html.dark hr{border-color:var(--ss-line)}
html:not(.dark) .btn-dark,html:not(.dark) .btn-dark:hover{color:#fff!important}
html:not(.dark) .btn-light,html:not(.dark) .btn-light:hover{color:#191d1a!important}
@media(prefers-reduced-motion:reduce){body{transition:none!important}}
`);
console.log("StudioSpace unified light/dark theme tokens and component contrast applied.");

// Always present the Google account chooser instead of silently reusing an active Google session.
replaceOnce("src/lib/auth.ts",
  'google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }',
  'google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, prompt: "select_account", requireEmailVerification: true }',
  "always show Google account chooser");

 
// Assign roles only from a server-side allowlist. User sign-up data cannot set this claim.
replaceOnce("src/lib/auth.ts",
  'const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";',
  'const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";\nconst adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));',
  "server-controlled admin email allowlist");
replaceOnce("src/lib/auth.ts",
  'name: user.name,',
  'name: user.name,\n          role: adminEmails.has(user.email.toLowerCase()) && user.emailVerified === true ? "admin" : "user",',
  "sign server-assigned authorization role");


// Generate the separate administrator console. Its data endpoints enforce authorization again on the API server.
mkdirSync("src/app/admin", { recursive: true });
writeFileSync("src/app/admin/page.tsx", "\"use client\";\n\nimport { useEffect, useState } from \"react\";\nimport { useRouter } from \"next/navigation\";\nimport { SiteShell } from \"@/components/site-shell\";\nimport { authClient } from \"@/lib/auth-client\";\n\ntype Overview = { users: number; studios: number; bookings: number; pendingBookings: number; confirmedBookings: number };\ntype Member = { _id: string; name?: string; email?: string; createdAt?: string; emailVerified?: boolean };\ntype Studio = { _id: string; title: string; category: string; ownerName?: string; ownerEmail?: string; location?: string };\ntype Booking = { _id: string; studioTitle: string; customerName?: string; customerEmail?: string; date: string; startTime: string; endTime: string; status: string; totalAmount?: number };\n\nasync function readAdmin<T>(path: string): Promise<T> {\n  const response = await fetch(\"/api/server/admin/\" + path, { credentials: \"same-origin\", cache: \"no-store\" });\n  const payload = await response.json().catch(() => ({}));\n  if (!response.ok) {\n    const error = new Error(payload.message || \"Unable to load administrator data.\") as Error & { status?: number };\n    error.status = response.status;\n    throw error;\n  }\n  return payload as T;\n}\n\nconst cardStyle: React.CSSProperties = { background: \"var(--surface, #fff)\", border: \"1px solid var(--line, #ddd)\", borderRadius: 16, padding: 20, minWidth: 0 };\nconst tableStyle: React.CSSProperties = { width: \"100%\", borderCollapse: \"collapse\", textAlign: \"left\", fontSize: 14 };\nconst cellStyle: React.CSSProperties = { padding: \"12px 10px\", borderBottom: \"1px solid var(--line, #ddd)\", verticalAlign: \"top\" };\n\nexport default function AdminPage() {\n  const router = useRouter();\n  const { data: session, isPending } = authClient.useSession();\n  const [overview, setOverview] = useState<Overview | null>(null);\n  const [users, setUsers] = useState<Member[]>([]);\n  const [studios, setStudios] = useState<Studio[]>([]);\n  const [bookings, setBookings] = useState<Booking[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState(\"\");\n\n  useEffect(() => {\n    if (!isPending && !session) router.replace(\"/login?callbackUrl=%2Fadmin\");\n  }, [isPending, session, router]);\n\n  useEffect(() => {\n    if (isPending || !session) return;\n    let active = true;\n    (async () => {\n      try {\n        await readAdmin<{ data: { role: string } }>(\"me\");\n        const [stats, memberResult, studioResult, bookingResult] = await Promise.all([\n          readAdmin<{ data: Overview }>(\"overview\"),\n          readAdmin<{ data: Member[] }>(\"users\"),\n          readAdmin<{ data: Studio[] }>(\"studios\"),\n          readAdmin<{ data: Booking[] }>(\"bookings\"),\n        ]);\n        if (!active) return;\n        setOverview(stats.data);\n        setUsers(memberResult.data || []);\n        setStudios(studioResult.data || []);\n        setBookings(bookingResult.data || []);\n      } catch (err) {\n        if (!active) return;\n        const status = (err as Error & { status?: number }).status;\n        if (status === 401) {\n          setError(\"Your administrator session is not active. Please sign in again.\");\n          router.replace(\"/login?callbackUrl=%2Fadmin\");\n        } else if (status === 403) {\n          setError(\"This account does not have administrator access.\");\n          router.replace(\"/dashboard\");\n        } else {\n          setError(err instanceof Error ? err.message : \"Could not load the admin console.\");\n        }\n      } finally {\n        if (active) setLoading(false);\n      }\n    })();\n    return () => { active = false; };\n  }, [isPending, session, router]);\n\n  return <SiteShell>\n    <section className=\"page-hero\"><div className=\"container\">\n      <span className=\"eyebrow\">RESTRICTED MANAGEMENT AREA</span>\n      <h1>Admin <em>console.</em></h1>\n      <p>Platform operations and account oversight for approved administrators only.</p>\n    </div></section>\n    <section className=\"container section\">\n      {loading ? <p role=\"status\">Verifying administrator access and loading platform data…</p> : error ? <p role=\"alert\">{error}</p> : <>\n        <div style={{ display: \"grid\", gridTemplateColumns: \"repeat(auto-fit,minmax(160px,1fr))\", gap: 14, marginBottom: 28 }}>\n          {[\n            [\"Registered users\", overview?.users ?? 0],\n            [\"Studio listings\", overview?.studios ?? 0],\n            [\"All bookings\", overview?.bookings ?? 0],\n            [\"Pending requests\", overview?.pendingBookings ?? 0],\n            [\"Confirmed bookings\", overview?.confirmedBookings ?? 0],\n          ].map(([label, value]) => <div key={String(label)} style={cardStyle}><small style={{ color: \"var(--muted)\" }}>{label}</small><div style={{ fontSize: 30, fontWeight: 700, marginTop: 8 }}>{value}</div></div>)}\n        </div>\n        <div style={{ display: \"grid\", gap: 22 }}>\n          <section style={cardStyle}><h2>Recent members</h2><div style={{ overflowX: \"auto\" }}><table style={tableStyle}><thead><tr><th style={cellStyle}>Name</th><th style={cellStyle}>Email</th><th style={cellStyle}>Joined</th><th style={cellStyle}>Email status</th></tr></thead><tbody>\n            {users.map((member) => <tr key={member._id}><td style={cellStyle}>{member.name || \"—\"}</td><td style={cellStyle}>{member.email || \"—\"}</td><td style={cellStyle}>{member.createdAt ? new Date(member.createdAt).toLocaleDateString() : \"—\"}</td><td style={cellStyle}>{member.emailVerified ? \"Verified\" : \"Not verified\"}</td></tr>)}\n            {!users.length && <tr><td style={cellStyle} colSpan={4}>No members found.</td></tr>}\n          </tbody></table></div></section>\n          <section style={cardStyle}><h2>Studio listings</h2><div style={{ overflowX: \"auto\" }}><table style={tableStyle}><thead><tr><th style={cellStyle}>Studio</th><th style={cellStyle}>Category</th><th style={cellStyle}>Host</th><th style={cellStyle}>Location</th></tr></thead><tbody>\n            {studios.map((studio) => <tr key={studio._id}><td style={cellStyle}>{studio.title}</td><td style={cellStyle}>{studio.category}</td><td style={cellStyle}>{studio.ownerName || studio.ownerEmail || \"—\"}</td><td style={cellStyle}>{studio.location || \"—\"}</td></tr>)}\n            {!studios.length && <tr><td style={cellStyle} colSpan={4}>No studio listings found.</td></tr>}\n          </tbody></table></div></section>\n          <section style={cardStyle}><h2>Booking activity</h2><div style={{ overflowX: \"auto\" }}><table style={tableStyle}><thead><tr><th style={cellStyle}>Studio</th><th style={cellStyle}>Creator</th><th style={cellStyle}>Date & time</th><th style={cellStyle}>Status</th><th style={cellStyle}>Total</th></tr></thead><tbody>\n            {bookings.map((booking) => <tr key={booking._id}><td style={cellStyle}>{booking.studioTitle}</td><td style={cellStyle}>{booking.customerName || booking.customerEmail || \"—\"}</td><td style={cellStyle}>{booking.date} · {booking.startTime}–{booking.endTime}</td><td style={cellStyle}>{booking.status}</td><td style={cellStyle}>{typeof booking.totalAmount === \"number\" ? \"$\" + booking.totalAmount.toFixed(2) : \"—\"}</td></tr>)}\n            {!bookings.length && <tr><td style={cellStyle} colSpan={5}>No bookings found.</td></tr>}\n          </tbody></table></div></section>\n        </div>\n      </>}\n    </section>\n  </SiteShell>;\n}\n");


// Enforce one shared password for the two allowlisted admin emails, regardless of
// any older password stored on their account. Non-admin member passwords are unchanged.
replaceOnce("src/lib/auth.ts",
  'import { betterAuth } from "better-auth";',
  'import { betterAuth } from "better-auth";\nimport { APIError, createAuthMiddleware } from "better-auth/api";',
  "admin password policy imports");
replaceOnce("src/lib/auth.ts",
  'const adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));',
  'const adminEmails = new Set((process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));\nconst adminLoginPassword = process.env.ADMIN_LOGIN_PASSWORD || "";',
  "server-only admin login password");
replaceOnce("src/lib/auth.ts",
  'role: adminEmails.has(user.email.toLowerCase()) && user.emailVerified === true ? "admin" : "user",',
  'role: adminEmails.has(user.email.toLowerCase()) && user.adminPasswordVerified === true ? "admin" : "user",\n          twoFactorEnabled: user.twoFactorEnabled === true,',
  "require admin password authentication for role claim");
replaceOnce("src/lib/auth.ts",
  'export const auth = betterAuth({',
  `export const auth = betterAuth({
  user: {
    additionalFields: {
      adminPasswordVerified: { type: "boolean", required: false, defaultValue: false, input: false }
    }
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-in/email" && ctx.path !== "/sign-up/email") return;
      const email = typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";
      if (!adminEmails.has(email)) return;
      const suppliedPassword = typeof ctx.body?.password === "string" ? ctx.body.password : "";
      if (!adminLoginPassword || suppliedPassword !== adminLoginPassword) {
        throw new APIError("UNAUTHORIZED", { message: "Invalid email or password." });
      }
      if (ctx.path === "/sign-in/email") {
        const found = await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
        const user = found?.user;
        if (!user) throw new APIError("UNAUTHORIZED", { message: "Invalid email or password." });
        const accounts = found.accounts || await ctx.context.internalAdapter.findAccounts(user.id);
        const credentialAccount = accounts.find((account) => account.providerId === "credential");
        const passwordHash = await ctx.context.password.hash(adminLoginPassword);
        if (credentialAccount) {
          await ctx.context.internalAdapter.updatePassword(user.id, passwordHash);
        } else {
          await ctx.context.internalAdapter.createAccount({
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: passwordHash
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const session = ctx.context.newSession;
      const user = session?.user;
      const email = typeof user?.email === "string" ? user.email.toLowerCase() : "";
      if (!user || !adminEmails.has(email)) return;
      if (ctx.path === "/sign-in/email") {
        await ctx.context.internalAdapter.updateUser(user.id, { adminPasswordVerified: true });
      } else if (ctx.path.startsWith("/callback/")) {
        // OAuth can still be used by ordinary members, but it must never grant admin-console access.
        await ctx.context.internalAdapter.updateUser(user.id, { adminPasswordVerified: false });
      }
    })
  },`,
  "enforce admin credentials and mark email-password sessions");

// Put the admin console at the site root for admin sessions. The public marketplace homepage
// remains the root experience for visitors and ordinary members.
const marketplacePagePath = "src/app/marketplace-home.tsx";
if (!existsSync(marketplacePagePath)) {
  writeFileSync(marketplacePagePath, readFileSync("src/app/page.tsx", "utf8"));
}
writeFileSync("src/components/root-role-gate.tsx", `"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import AdminConsole from "@/components/admin-console";

export default function RootRoleGate({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      setIsAdmin(false);
      setChecked(true);
      return;
    }
    let active = true;
    fetch("/api/server/admin/me", { credentials: "same-origin", cache: "no-store" })
      .then((response) => {
        if (active) setIsAdmin(response.ok);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      })
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => { active = false; };
  }, [isPending, session?.user?.id]);

  if (isPending || (session && !checked)) {
    return <main className="container section" aria-live="polite"><p>Loading StudioSpace…</p></main>;
  }
  return isAdmin ? <AdminConsole /> : <>{children}</>;
}
`);
writeFileSync("src/app/page.tsx", `import RootRoleGate from "@/components/root-role-gate";
import MarketplaceHome from "./marketplace-home";

export default function Home() {
  return <RootRoleGate><MarketplaceHome /></RootRoleGate>;
}
`);
const adminConsoleSource = readFileSync("src/app/admin/page.tsx", "utf8")
  .replaceAll('/login?callbackUrl=%2Fadmin', '/login?callbackUrl=%2F')
  .replaceAll('router.replace("/dashboard")', 'router.replace("/")');
writeFileSync("src/components/admin-console.tsx", adminConsoleSource);
writeFileSync("src/app/admin/page.tsx", `import { redirect } from "next/navigation";
export default function AdminRoute() {
  redirect("/");
}
`);


// Dedicated administrator sign-in portal at /as. This route has its own visual
// language and only allows the two explicitly approved admin identities to proceed.
mkdirSync("src/app/as", { recursive: true });
writeFileSync("src/app/as/page.tsx", `"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Fingerprint, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { authClient, syncAuthCookie } from "@/lib/auth-client";
import "./portal.css";

const allowedAdminEmails = new Set([
  "sam.scaleup.as777@gmail.com",
  "annikamuni2006@gmail.com"
]);

export default function AdminSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!allowedAdminEmails.has(normalizedEmail)) {
      setError("This identity is not on the administrator access list.");
      return;
    }
    if (!password) {
      setError("Enter the administrator password to continue.");
      return;
    }

    setBusy(true);
    try {
      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password
      });
      if (result.error) throw new Error("The email or administrator password is incorrect.");

      await syncAuthCookie();
      const check = await fetch("/api/server/admin/me", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store"
      });
      if (!check.ok) {
        await fetch("/api/auth/cookie", { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
        throw new Error("The account could not be verified for administrator access.");
      }

      toast.success("Administrator access verified.");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Administrator sign-in failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="as-portal">
      <div className="as-portal-grain" aria-hidden="true" />
      <header className="as-portal-top">
        <Link href="/" className="as-portal-brand" aria-label="Return to StudioSpace">
          <span className="as-portal-brand-mark">S<span>/</span></span>
          <span className="as-portal-brand-name">STUDIOSPACE <small>CONTROL ROOM</small></span>
        </Link>
        <Link href="/" className="as-portal-exit"><ArrowLeft size={15} /> Back to marketplace</Link>
      </header>

      <section className="as-portal-layout">
        <div className="as-portal-intro">
          <div className="as-portal-kicker"><span className="as-live-dot" /> RESTRICTED ENVIRONMENT <span className="as-portal-kicker-line" /></div>
          <div className="as-portal-display">
            <span className="as-portal-index">STUDIO / ADMIN / 01</span>
            <h1>Behind the<br /><em>creative space.</em></h1>
            <p>The operational side of StudioSpace. A private workspace for the people entrusted to manage the platform.</p>
          </div>
          <div className="as-portal-footnote">
            <span className="as-portal-footnote-icon"><Fingerprint size={19} /></span>
            <span><strong>Identity verified. Access controlled.</strong><small>Every session is checked against the administrator access policy.</small></span>
          </div>
        </div>

        <div className="as-portal-login-wrap">
          <div className="as-portal-login-card">
            <div className="as-portal-card-top">
              <span className="as-portal-shield"><ShieldCheck size={21} /></span>
              <span className="as-portal-classification">ADMINISTRATOR ACCESS <i>PRIVATE</i></span>
            </div>
            <h2>Sign in to control.</h2>
            <p className="as-portal-card-copy">Use one of the two authorized administrator accounts and the designated admin password.</p>

            <form onSubmit={signIn} className="as-portal-form">
              <label htmlFor="as-admin-email">AUTHORIZED EMAIL</label>
              <div className="as-portal-input-wrap">
                <Fingerprint size={17} />
                <input
                  id="as-admin-email"
                  type="email"
                  autoComplete="username"
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@studiospace.com"
                />
              </div>

              <label htmlFor="as-admin-password">ADMINISTRATOR PASSWORD</label>
              <div className="as-portal-input-wrap">
                <KeyRound size={17} />
                <input
                  id="as-admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter secure password"
                />
              </div>

              {error && <p className="as-portal-error" role="alert">{error}</p>}

              <button className="as-portal-submit" type="submit" disabled={busy}>
                <span>{busy ? "VERIFYING CREDENTIALS…" : "ENTER CONTROL ROOM"}</span>
                {busy ? <span className="as-portal-spinner" /> : <ArrowUpRight size={18} />}
              </button>
            </form>

            <div className="as-portal-security-note"><LockKeyhole size={14} /><span>Encrypted session · Restricted to approved identities</span></div>
          </div>
          <div className="as-portal-card-caption"><span>STUDIOSPACE / PRIVATE ACCESS</span><span>NO PUBLIC REGISTRATION</span></div>
        </div>
      </section>

      <footer className="as-portal-footer">
        <span>© {new Date().getFullYear()} StudioSpace</span>
        <span>CONTROLLED ACCESS ONLY</span>
        <span>SECURITY LEVEL <b>ADMIN</b></span>
      </footer>
    </main>
  );
}
`);

writeFileSync("src/app/as/portal.css", `
.as-portal {
  --as-night: #101713;
  --as-panel: #18211b;
  --as-line: rgba(231,239,226,.12);
  --as-muted: #9aa79a;
  --as-soft: #d7dfd3;
  --as-lime: #c5e59c;
  --as-coral: #f1a18a;
  position: relative;
  min-height: 100svh;
  overflow: hidden;
  padding: 0 clamp(22px,5.5vw,88px);
  background:
    radial-gradient(ellipse at 16% 42%,rgba(112,143,101,.16),transparent 34%),
    radial-gradient(ellipse at 90% 85%,rgba(190,119,92,.12),transparent 32%),
    var(--as-night);
  color: #f4f2e9;
  font-family: var(--font-body,"DM Sans",sans-serif);
}
.as-portal::before {
  position:absolute;inset:0;pointer-events:none;content:"";
  background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);
  background-size:72px 72px;
  mask-image:linear-gradient(90deg,transparent,black 18%,black 85%,transparent);
}
.as-portal-grain { position:absolute;inset:0;pointer-events:none;opacity:.1;z-index:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E");}
.as-portal-top,.as-portal-layout,.as-portal-footer { position:relative;z-index:1; }
.as-portal-top { min-height:92px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--as-line); }
.as-portal-brand { display:flex;align-items:center;gap:12px;color:#f5f2e9;text-decoration:none; }
.as-portal-brand-mark { width:37px;height:37px;display:grid;place-items:center;border:1px solid rgba(197,229,156,.65);border-radius:11px;color:var(--as-lime);font-family:Georgia,serif;font-size:22px;font-weight:700; }
.as-portal-brand-mark span { color:var(--as-coral); }
.as-portal-brand-name { font-size:11px;font-weight:800;letter-spacing:.15em; }
.as-portal-brand-name small { display:block;margin-top:5px;color:var(--as-muted);font-size:8px;letter-spacing:.22em; }
.as-portal-exit { display:inline-flex;align-items:center;gap:8px;color:#b8c2b5;font-size:12px;text-decoration:none;transition:color .2s; }
.as-portal-exit:hover { color:var(--as-lime); }
.as-portal-layout { width:min(1180px,100%);min-height:calc(100svh - 158px);display:grid;grid-template-columns:1fr minmax(360px,470px);align-items:center;gap:clamp(44px,9vw,140px);margin:0 auto;padding:60px 0 76px; }
.as-portal-intro { display:flex;min-height:480px;flex-direction:column;justify-content:space-between;padding:20px 0; }
.as-portal-kicker { display:flex;align-items:center;gap:10px;color:#c8d1c5;font-size:9px;font-weight:800;letter-spacing:.2em; }
.as-live-dot { width:7px;height:7px;border-radius:50%;background:var(--as-lime);box-shadow:0 0 0 5px rgba(197,229,156,.09),0 0 18px rgba(197,229,156,.65); }
.as-portal-kicker-line { width:46px;height:1px;margin-left:4px;background:linear-gradient(90deg,var(--as-lime),transparent); }
.as-portal-display { max-width:650px;margin:55px 0; }
.as-portal-index { color:#7d8c7d;font-size:9px;font-weight:800;letter-spacing:.22em; }
.as-portal-display h1 { margin:22px 0 24px;color:#f3f0e6;font-family:"Playfair Display",Georgia,serif;font-size:clamp(3.8rem,7vw,6.7rem);font-weight:500;letter-spacing:-.065em;line-height:.91; }
.as-portal-display h1 em { color:var(--as-lime);font-weight:500; }
.as-portal-display p { max-width:420px;color:#aab5a8;font-size:14px;line-height:1.9; }
.as-portal-footnote { display:flex;align-items:center;gap:13px;padding-top:20px;border-top:1px solid var(--as-line); }
.as-portal-footnote-icon { width:39px;height:39px;display:grid;place-items:center;border:1px solid rgba(197,229,156,.25);border-radius:12px;color:var(--as-lime); }
.as-portal-footnote strong,.as-portal-footnote small { display:block; }
.as-portal-footnote strong { color:#e5e9df;font-size:11px; }
.as-portal-footnote small { margin-top:5px;color:#849184;font-size:10px; }
.as-portal-login-wrap { width:100%; }
.as-portal-login-card { padding:clamp(26px,4vw,42px);border:1px solid rgba(228,237,222,.13);border-radius:20px;background:linear-gradient(145deg,rgba(34,46,37,.96),rgba(21,30,24,.96));box-shadow:0 30px 90px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.045); }
.as-portal-card-top { display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:34px; }
.as-portal-shield { width:43px;height:43px;display:grid;place-items:center;border:1px solid rgba(197,229,156,.3);border-radius:13px;background:rgba(197,229,156,.07);color:var(--as-lime); }
.as-portal-classification { display:flex;align-items:center;gap:9px;color:#9eaa9d;font-size:8px;font-weight:800;letter-spacing:.15em; }
.as-portal-classification i { padding:5px 7px;border:1px solid rgba(241,161,138,.35);border-radius:5px;color:var(--as-coral);font-size:7px;font-style:normal;letter-spacing:.1em; }
.as-portal-login-card h2 { margin:0;color:#f4f1e9;font-family:"Playfair Display",Georgia,serif;font-size:clamp(2rem,4vw,2.7rem);font-weight:500;letter-spacing:-.045em; }
.as-portal-card-copy { margin:12px 0 29px;color:#98a598;font-size:12px;line-height:1.8; }
.as-portal-form { display:grid;gap:10px; }
.as-portal-form label { margin-top:7px;color:#bbc6b8;font-size:8px;font-weight:800;letter-spacing:.16em; }
.as-portal-input-wrap { min-height:52px;display:flex;align-items:center;gap:12px;padding:0 15px;border:1px solid rgba(224,235,218,.13);border-radius:10px;background:rgba(8,14,10,.34);color:#819080;transition:border-color .2s,box-shadow .2s; }
.as-portal-input-wrap:focus-within { border-color:rgba(197,229,156,.66);box-shadow:0 0 0 3px rgba(197,229,156,.08); }
.as-portal-input-wrap input { width:100%;min-width:0;border:0;outline:0;background:transparent;color:#f4f2e9;font-size:12px; }
.as-portal-input-wrap input::placeholder { color:#68776a; }
.as-portal-error { margin:4px 0;padding:11px 13px;border:1px solid rgba(241,133,124,.28);border-radius:9px;background:rgba(143,53,49,.12);color:#ffb2a8;font-size:11px;line-height:1.6; }
.as-portal-submit { min-height:54px;display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:13px;padding:0 18px;border:0;border-radius:10px;background:var(--as-lime);color:#172018;font-size:9px;font-weight:900;letter-spacing:.16em;cursor:pointer;transition:transform .2s,background .2s,box-shadow .2s; }
.as-portal-submit:hover { transform:translateY(-2px);background:#d6edb8;box-shadow:0 12px 26px rgba(197,229,156,.13); }
.as-portal-submit:disabled { opacity:.65;cursor:wait;transform:none; }
.as-portal-spinner { width:15px;height:15px;border:2px solid rgba(23,32,24,.25);border-top-color:#172018;border-radius:50%;animation:as-portal-spin .7s linear infinite; }
@keyframes as-portal-spin { to { transform:rotate(360deg); } }
.as-portal-security-note { display:flex;align-items:center;gap:8px;margin-top:22px;padding-top:17px;border-top:1px solid var(--as-line);color:#839083;font-size:9px; }
.as-portal-security-note svg { color:var(--as-lime); }
.as-portal-card-caption { display:flex;justify-content:space-between;gap:12px;margin-top:13px;color:#6f7e70;font-size:7px;font-weight:800;letter-spacing:.14em; }
.as-portal-footer { min-height:66px;display:flex;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid var(--as-line);color:#768377;font-size:8px;font-weight:700;letter-spacing:.14em; }
.as-portal-footer b { color:var(--as-lime);font-weight:800; }
@media(max-width:900px) {
  .as-portal-layout { grid-template-columns:1fr minmax(330px,430px);gap:36px; }
  .as-portal-display h1 { font-size:clamp(3.2rem,6vw,5rem); }
}
@media(max-width:700px) {
  .as-portal { padding:0 19px; }
  .as-portal-top { min-height:76px; }
  .as-portal-layout { min-height:auto;grid-template-columns:1fr;gap:35px;padding:50px 0 45px; }
  .as-portal-intro { min-height:auto;padding:0; }
  .as-portal-display { margin:35px 0 25px; }
  .as-portal-display h1 { margin:15px 0;font-size:clamp(3.3rem,13vw,5.1rem); }
  .as-portal-display p { max-width:500px;font-size:12px; }
  .as-portal-footnote { display:none; }
  .as-portal-login-card { padding:25px 22px; }
  .as-portal-footer { flex-wrap:wrap;padding:15px 0;font-size:7px; }
}
@media(max-width:420px) {
  .as-portal-top { align-items:flex-start;padding:18px 0;gap:10px; }
  .as-portal-exit { margin-top:8px;font-size:10px; }
  .as-portal-classification { font-size:7px; }
  .as-portal-card-caption { font-size:6px; }
}
@media(prefers-reduced-motion:reduce) {
  .as-portal *, .as-portal *::before, .as-portal *::after { animation-duration:.01ms!important;transition-duration:.01ms!important; }
}
`);

// StudioSpace mandatory security foundation: TOTP 2FA.
replaceOnce("src/lib/auth.ts", 'adminPasswordVerified: { type: "boolean", required: false, defaultValue: false, input: false }', 'adminPasswordVerified: { type: "boolean", required: false, defaultValue: false, input: false },\n      adminAccessDisabled: { type: "boolean", required: false, defaultValue: false, input: false }', "add admin-managed account suspension flag");

// StudioSpace CAPTCHA enforcement and challenge endpoints.
replaceOnce("src/lib/auth.ts","      if (ctx.path !== \"/sign-in/email\" && ctx.path !== \"/sign-up/email\") return;","      if (ctx.path === \"/sign-in/email-otp\" || ctx.path === \"/sign-in/social\" || ctx.path.startsWith(\"/callback/\")) {\n        throw new APIError(\"FORBIDDEN\", { message: \"For account security, use your password and authenticator verification to sign in.\" });\n      }\n      if (ctx.path === \"/sign-in/email\") {\n        const loginEmail = typeof ctx.body?.email === \"string\" ? ctx.body.email.trim().toLowerCase() : \"\";\n        if (loginEmail) {\n          const attemptKey = createHash(\"sha256\").update(loginEmail).digest(\"hex\");\n          const now = new Date();\n          const attemptsCollection = db.collection(\"loginAttempts\");\n          const prior = await attemptsCollection.findOne({ _id: attemptKey });\n          const attemptCount = prior && prior.expiresAt instanceof Date && prior.expiresAt > now ? Number(prior.count || 0) : 0;\n          if (attemptCount >= 2) {\n            const cookieHeader = ctx.request.headers.get(\"cookie\") || \"\";\n            const cookie = cookieHeader.split(\";\").map((item) => item.trim()).find((item) => item.startsWith(\"ss_login_captcha=\"));\n            const token = cookie ? cookie.slice(\"ss_login_captcha=\".length) : \"\";\n            const [challengeId, signature] = token.split(\".\");\n            const secret = process.env.BETTER_AUTH_SECRET || \"\";\n            const expected = challengeId && secret ? createHmac(\"sha256\", secret).update(challengeId + \".\" + loginEmail).digest(\"hex\") : \"\";\n            const suppliedBuffer = Buffer.from(signature || \"\");\n            const expectedBuffer = Buffer.from(expected);\n            const signatureValid = Boolean(expected) && suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);\n            if (!signatureValid) throw new APIError(\"UNAUTHORIZED\", { message: \"CAPTCHA_REQUIRED\" });\n            const consumed = await db.collection(\"loginCaptchas\").updateOne(\n              { _id: challengeId, email: loginEmail, verified: true, usedAt: null, expiresAt: { $gt: now } },\n              { $set: { usedAt: now } }\n            );\n            if (consumed.modifiedCount !== 1) throw new APIError(\"UNAUTHORIZED\", { message: \"CAPTCHA_REQUIRED\" });\n          }\n          await attemptsCollection.updateOne(\n            { _id: attemptKey },\n            { $set: { count: attemptCount + 1, expiresAt: new Date(now.getTime() + 15 * 60 * 1000), updatedAt: now } },\n            { upsert: true }\n          );\n        }\n      }\n      if (ctx.path !== \"/sign-in/email\" && ctx.path !== \"/sign-up/email\") return;","CAPTCHA required after two failed password attempts and block bypass sign-in methods");
replaceOnce("src/lib/auth.ts","      const session = ctx.context.newSession;\n      const user = session?.user;","      const session = ctx.context.newSession;\n      const user = session?.user;\n      if (user?.email && (ctx.path === \"/sign-in/email\" || ctx.path === \"/two-factor/verify-totp\" || ctx.path === \"/two-factor/verify-backup-code\")) {\n        const attemptKey = createHash(\"sha256\").update(user.email.trim().toLowerCase()).digest(\"hex\");\n        await db.collection(\"loginAttempts\").deleteOne({ _id: attemptKey });\n      }","reset failed login counter after successful TOTP");
mkdirSync("src/app/api/security/captcha/verify",{recursive:true});
writeFileSync("src/app/api/security/captcha/route.ts","import { NextRequest,NextResponse } from \"next/server\";\nimport { createHash,randomBytes,randomInt } from \"node:crypto\";\nimport { db } from \"@/lib/mongodb\";\nexport const runtime=\"nodejs\";\nconst alphabet=\"ABCDEFGHJKLMNPQRSTUVWXYZ23456789\";\nfunction makeAnswer(){return Array.from({length:6},()=>alphabet[randomInt(0,alphabet.length)]).join(\"\")}\nfunction svgFor(answer:string){\n const chars=answer.split(\"\").map((ch,i)=>{const x=34+i*39;const y=randomInt(38,58);const r=randomInt(-18,19);return '<text x=\"'+x+'\" y=\"'+y+'\" transform=\"rotate('+r+' '+x+' '+y+')\" fill=\"#17211b\" font-size=\"27\" font-family=\"Arial,sans-serif\" font-weight=\"700\">'+ch+'</text>'}).join(\"\");\n const lines=Array.from({length:8},()=>'<path d=\"M'+randomInt(0,260)+' '+randomInt(0,84)+' Q '+randomInt(30,220)+' '+randomInt(0,84)+' '+randomInt(0,260)+' '+randomInt(0,84)+'\" stroke=\"#b9a99b\" stroke-width=\"1.2\" fill=\"none\" opacity=\".65\"/>').join(\"\");\n const dots=Array.from({length:35},()=>'<circle cx=\"'+randomInt(0,260)+'\" cy=\"'+randomInt(0,84)+'\" r=\"'+(Math.random()*1.6+.4).toFixed(1)+'\" fill=\"#b35a4a\" opacity=\".5\"/>').join(\"\");\n return '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"260\" height=\"84\" viewBox=\"0 0 260 84\"><rect width=\"260\" height=\"84\" rx=\"12\" fill=\"#f1ece4\"/>'+lines+dots+chars+'</svg>';\n}\nexport async function POST(request:NextRequest){\n try{\n  const body=await request.json();const email=typeof body.email===\"string\"?body.email.trim().toLowerCase():\"\";\n  if(!/^[^\\\\s@]+@[^\\\\s@]+\\\\.[^\\\\s@]+$/.test(email))return NextResponse.json({message:\"Enter a valid email first.\"},{status:400});\n  const id=randomBytes(18).toString(\"hex\");const answer=makeAnswer();const now=new Date();\n  await db.collection(\"loginCaptchas\").insertOne({_id:id,email,answerHash:createHash(\"sha256\").update(answer).digest(\"hex\"),verified:false,usedAt:null,attempts:0,createdAt:now,expiresAt:new Date(now.getTime()+180000)});\n  await db.collection(\"loginCaptchas\").createIndex({expiresAt:1},{expireAfterSeconds:0}).catch(()=>undefined);\n  const image=\"data:image/svg+xml;charset=utf-8,\"+encodeURIComponent(svgFor(answer));\n  return NextResponse.json({id,image,expiresInSeconds:180},{headers:{\"Cache-Control\":\"no-store, max-age=0\"}});\n }catch{return NextResponse.json({message:\"Could not create a security challenge. Please retry.\"},{status:500})}\n}");
writeFileSync("src/app/api/security/captcha/verify/route.ts","import { NextRequest,NextResponse } from \"next/server\";\nimport { createHash,createHmac,timingSafeEqual } from \"node:crypto\";\nimport { db } from \"@/lib/mongodb\";\nexport const runtime=\"nodejs\";\nexport async function POST(request:NextRequest){\n try{\n  const body=await request.json();const id=typeof body.id===\"string\"?body.id:\"\";const answer=typeof body.answer===\"string\"?body.answer.trim().toUpperCase():\"\";const email=typeof body.email===\"string\"?body.email.trim().toLowerCase():\"\";\n  if(!/^[a-f0-9]{36}$/.test(id)||!email||!answer||answer.length>8)return NextResponse.json({message:\"Complete the CAPTCHA challenge.\"},{status:400});\n  const now=new Date();const col=db.collection(\"loginCaptchas\");const item=await col.findOne({_id:id,email,verified:false,expiresAt:{$gt:now}});\n  if(!item||Number(item.attempts||0)>=5)return NextResponse.json({message:\"This CAPTCHA has expired. Request a new one.\"},{status:400});\n  const submitted=createHash(\"sha256\").update(answer).digest();const expected=Buffer.from(String(item.answerHash||\"\"),\"hex\");const matches=expected.length===submitted.length&&timingSafeEqual(expected,submitted);\n  if(!matches){await col.updateOne({_id:id,email,verified:false},{$inc:{attempts:1}});return NextResponse.json({message:\"That CAPTCHA answer is incorrect. A new challenge is required.\"},{status:400})}\n  const used=await col.updateOne({_id:id,email,verified:false,usedAt:null,expiresAt:{$gt:now}},{$set:{verified:true,verifiedAt:now}});\n  if(used.modifiedCount!==1)return NextResponse.json({message:\"This CAPTCHA has already been used.\"},{status:400});\n  const secret=process.env.BETTER_AUTH_SECRET;if(!secret)return NextResponse.json({message:\"Security configuration is unavailable.\"},{status:503});\n  const signature=createHmac(\"sha256\",secret).update(id+\".\"+email).digest(\"hex\");const response=NextResponse.json({verified:true});\n  response.cookies.set(\"ss_login_captcha\",id+\".\"+signature,{httpOnly:true,secure:process.env.NODE_ENV===\"production\",sameSite:\"strict\",path:\"/\",maxAge:180});\n  response.headers.set(\"Cache-Control\",\"no-store, max-age=0\");return response;\n }catch{return NextResponse.json({message:\"CAPTCHA verification could not be completed.\"},{status:500})}\n}");

// StudioSpace mandatory enrollment, second-factor challenge, and admin monitoring UI.
mkdirSync("src/app/security/setup",{recursive:true}); mkdirSync("src/app/two-factor",{recursive:true});
writeFileSync("src/app/security/setup/page.tsx","\"use client\";\nimport {useEffect,useMemo,useState} from \"react\";\nimport {useRouter,useSearchParams} from \"next/navigation\";\nimport QRCode from \"react-qr-code\";\nimport {authClient,syncAuthCookie} from \"@/lib/auth-client\";\nimport {SiteShell} from \"@/components/site-shell\";\nfunction safeCallback(value:string|null){if(!value||!value.startsWith(\"/\")||value.startsWith(\"//\")||value.includes(\"\\\\\"))return \"/\";try{const u=new URL(value,\"https://studiospace.invalid\");return u.origin===\"https://studiospace.invalid\"?u.pathname+u.search+u.hash:\"/\"}catch{return \"/\"}}\nexport default function SecuritySetupPage(){\n const router=useRouter();const search=useSearchParams();const callback=useMemo(()=>safeCallback(search.get(\"callbackUrl\")),[search]);const {data:session,isPending}=authClient.useSession();\n const [password,setPassword]=useState(\"\");const [uri,setUri]=useState(\"\");const [code,setCode]=useState(\"\");const [backupCodes,setBackupCodes]=useState<string[]>([]);const [loading,setLoading]=useState(false);const [complete,setComplete]=useState(false);const [error,setError]=useState(\"\");\n useEffect(()=>{if(!isPending&&!session)router.replace(\"/login?callbackUrl=\"+encodeURIComponent(\"/security/setup?callbackUrl=\"+encodeURIComponent(callback)));if(!isPending&&session?.user&&(session.user as {twoFactorEnabled?:boolean}).twoFactorEnabled===true)setComplete(true)},[isPending,session,router,callback]);\n async function beginSetup(event:React.FormEvent){event.preventDefault();setLoading(true);setError(\"\");try{const result=await authClient.twoFactor.enable({password:password||undefined,method:\"totp\",issuer:\"StudioSpace\"});if(result.error)throw new Error(result.error.message||\"Could not start authenticator setup.\");const totpData=result.data as {method?:string;totpURI?:string;backupCodes?:string[]}|undefined;if(!totpData?.totpURI)throw new Error(\"The authenticator setup did not return a QR code.\");setUri(totpData.totpURI);setBackupCodes(totpData.backupCodes||[])}catch(e){setError(e instanceof Error?e.message:\"Could not start setup.\")}finally{setLoading(false)}}\n async function verifySetup(event:React.FormEvent){event.preventDefault();if(!/^[0-9]{6}$/.test(code)){setError(\"Enter the current six-digit authenticator code.\");return}setLoading(true);setError(\"\");try{const result=await authClient.twoFactor.verifyTotp({code,trustDevice:false});if(result.error)throw new Error(result.error.message||\"That authenticator code was not accepted.\");await syncAuthCookie();setComplete(true)}catch(e){setError(e instanceof Error?e.message:\"Verification failed.\")}finally{setLoading(false)}}\n if(isPending||!session)return <SiteShell><main className=\"container section\"><p>Checking your account…</p></main></SiteShell>;\n return <SiteShell><main className=\"container section\" style={{maxWidth:760,minHeight:\"72vh\"}}>\n <span className=\"eyebrow\">ACCOUNT SECURITY · REQUIRED</span><h1 style={{fontFamily:\"Georgia,serif\",fontSize:\"clamp(2.4rem,6vw,4rem)\",fontWeight:500,letterSpacing:\"-.05em\"}}>Protect your <em>account.</em></h1><p style={{maxWidth:620,lineHeight:1.8,color:\"var(--muted)\"}}>StudioSpace requires a current authenticator code after your password. Use Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP app. Save your one-time recovery codes privately.</p>\n {complete?<section style={{border:\"1px solid var(--line)\",borderRadius:18,padding:28,background:\"var(--surface)\"}}><h2>Two-factor authentication is active.</h2><p>Your next sign-in will require your password and a current authenticator code.</p><button className=\"btn btn-dark\" onClick={()=>router.replace(callback)}>Continue to StudioSpace</button></section>:!uri?<form onSubmit={beginSetup} style={{display:\"grid\",gap:14,maxWidth:480,border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><h2>Step 1 · Confirm your password</h2><label htmlFor=\"totp-password\">Account password</label><input id=\"totp-password\" className=\"auth-v2-input\" type=\"password\" autoComplete=\"current-password\" value={password} onChange={e=>setPassword(e.target.value)} placeholder=\"Enter your current password\"/>{error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button className=\"btn btn-dark\" type=\"submit\" disabled={loading}>{loading?\"Preparing secure setup…\":\"Create authenticator setup\"}</button></form>:<div style={{display:\"grid\",gap:22}}>\n <section style={{border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><h2>Step 2 · Scan this QR code</h2><p>Scan it inside your authenticator app. Do not share this QR or setup key.</p><div style={{width:220,maxWidth:\"100%\",padding:12,background:\"#fff\",borderRadius:12}}><QRCode value={uri} size={196} style={{height:\"auto\",maxWidth:\"100%\",width:\"100%\"}}/></div><details style={{marginTop:16}}><summary>Can’t scan? Show setup key</summary><code style={{display:\"block\",overflowWrap:\"anywhere\",padding:12}}>{decodeURIComponent(uri.split(\"secret=\")[1]?.split(\"&\")[0]||\"\")}</code></details></section>\n {backupCodes.length>0&&<section style={{border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><h2>Save your recovery codes</h2><p>Each code can be used once if you lose your authenticator. Store them offline before continuing.</p><div style={{display:\"grid\",gridTemplateColumns:\"repeat(auto-fit,minmax(130px,1fr))\",gap:8}}>{backupCodes.map((item,index)=><code key={index} style={{padding:9,background:\"var(--background)\",borderRadius:7}}>{item}</code>)}</div><button type=\"button\" className=\"btn btn-outline\" style={{marginTop:14}} onClick={()=>navigator.clipboard.writeText(backupCodes.join(\"\\n\"))}>Copy recovery codes</button></section>}\n <form onSubmit={verifySetup} style={{display:\"grid\",gap:12,maxWidth:480,border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><h2>Step 3 · Verify your authenticator</h2><label htmlFor=\"totp-code\">Six-digit code</label><input id=\"totp-code\" className=\"auth-v2-input otp\" inputMode=\"numeric\" autoComplete=\"one-time-code\" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\\D/g,\"\").slice(0,6))} placeholder=\"000000\"/>{error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button className=\"btn btn-dark\" type=\"submit\" disabled={loading||code.length!==6}>{loading?\"Verifying…\":\"Verify and activate 2FA\"}</button></form>\n </div>}\n </main></SiteShell>;\n}");
writeFileSync("src/app/two-factor/page.tsx","\"use client\";\nimport {useMemo,useState} from \"react\";\nimport {useRouter,useSearchParams} from \"next/navigation\";\nimport {authClient,syncAuthCookie} from \"@/lib/auth-client\";\nimport {SiteShell} from \"@/components/site-shell\";\nfunction safeCallback(value:string|null){if(!value||!value.startsWith(\"/\")||value.startsWith(\"//\")||value.includes(\"\\\\\"))return \"/\";try{const u=new URL(value,\"https://studiospace.invalid\");return u.origin===\"https://studiospace.invalid\"?u.pathname+u.search+u.hash:\"/\"}catch{return \"/\"}}\nexport default function TwoFactorPage(){\n const router=useRouter();const search=useSearchParams();const callback=useMemo(()=>safeCallback(search.get(\"callbackUrl\")),[search]);const [code,setCode]=useState(\"\");const [backup,setBackup]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState(\"\");\n async function verify(event:React.FormEvent){event.preventDefault();if(!code.trim()){setError(\"Enter your authenticator code.\");return}setBusy(true);setError(\"\");try{const result=backup?await authClient.twoFactor.verifyBackupCode({code:code.trim(),trustDevice:false}):await authClient.twoFactor.verifyTotp({code:code.trim(),trustDevice:false});if(result.error)throw new Error(result.error.message||\"The verification code was not accepted.\");await syncAuthCookie();router.replace(callback);router.refresh()}catch(e){setError(e instanceof Error?e.message:\"Verification failed.\")}finally{setBusy(false)}}\n return <SiteShell><main className=\"container section\" style={{maxWidth:520,minHeight:\"72vh\"}}><span className=\"eyebrow\">SECOND FACTOR REQUIRED</span><h1 style={{fontFamily:\"Georgia,serif\",fontSize:\"clamp(2.5rem,6vw,3.8rem)\",fontWeight:500,letterSpacing:\"-.05em\"}}>Verify it’s <em>you.</em></h1><p style={{lineHeight:1.8,color:\"var(--muted)\"}}>Enter the current code from your authenticator app. Your session is not completed until this check succeeds.</p><form onSubmit={verify} style={{display:\"grid\",gap:14,border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><label htmlFor=\"two-factor-code\">{backup?\"One-time recovery code\":\"Six-digit authenticator code\"}</label><input id=\"two-factor-code\" className=\"auth-v2-input otp\" autoFocus autoComplete=\"one-time-code\" value={code} onChange={e=>setCode(e.target.value)} placeholder={backup?\"Enter an unused backup code\":\"000000\"}/>{error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button type=\"submit\" className=\"btn btn-dark\" disabled={busy||!code.trim()}>{busy?\"Verifying…\":\"Verify and continue\"}</button><button type=\"button\" className=\"btn btn-outline\" onClick={()=>{setBackup(v=>!v);setCode(\"\");setError(\"\")}}>{backup?\"Use authenticator app\":\"Use a backup code instead\"}</button></form></main></SiteShell>;\n}");
writeFileSync("src/components/security-gate.tsx","\"use client\";\nimport {useEffect} from \"react\";\nimport {usePathname,useRouter} from \"next/navigation\";\nimport {authClient} from \"@/lib/auth-client\";\nexport function SecurityGate(){\n const {data:session,isPending}=authClient.useSession();const pathname=usePathname();const router=useRouter();\n useEffect(()=>{\n if(isPending||!session)return;\n const publicPaths=[\"/login\",\"/register\",\"/as\",\"/two-factor\",\"/security/setup\",\"/forgot-password\",\"/reset-password\"];\n if(publicPaths.some(path=>pathname===path||pathname.startsWith(path+\"/\")))return;\n const enabled=(session.user as {twoFactorEnabled?:boolean}).twoFactorEnabled===true;\n if(!enabled){const current=pathname+(typeof window!==\"undefined\"?window.location.search:\"\");router.replace(\"/security/setup?callbackUrl=\"+encodeURIComponent(current))}\n },[isPending,session,pathname,router]);return null;\n}");
replaceOnce("src/components/providers.tsx",'import { AuthCookieSync } from "@/components/auth-cookie-sync";','import { AuthCookieSync } from "@/components/auth-cookie-sync";\nimport { SecurityGate } from "@/components/security-gate";', "import global 2FA gate");
let providerSource = readFileSync("src/components/providers.tsx", "utf8");
if (!providerSource.includes("<SecurityGate")) { providerSource = providerSource.replace("<AuthCookieSync/>", "<AuthCookieSync/><SecurityGate/>"); }
writeFileSync("src/components/providers.tsx", providerSource);
replaceOnce("package.json",'"next": "16.4.3",','"next": "16.4.3",\n    "react-qr-code": "^2.0.18",', "install local QR code generation");
writeFileSync("src/components/admin-console.tsx","\"use client\";\nimport {useCallback,useEffect,useState} from \"react\";\nimport {SiteShell} from \"@/components/site-shell\";\nimport {authClient} from \"@/lib/auth-client\";\ntype Stats={users:number;studios:number;bookings:number;pendingBookings:number;confirmedBookings:number;suspendedUsers:number;twoFactorUsers:number;adminActionsLast7Days:number};\ntype Member={_id:string;id?:string;name?:string;email?:string;createdAt?:string;emailVerified?:boolean;twoFactorEnabled?:boolean;adminAccessDisabled?:boolean};\ntype Studio={_id:string;title:string;category:string;ownerName?:string;ownerEmail?:string;location?:string;hourlyRate?:number};\ntype Booking={_id:string;studioTitle:string;customerName?:string;customerEmail?:string;date:string;startTime:string;endTime:string;status:string;totalAmount?:number};\ntype Audit={_id:string;actorEmail:string;action:string;targetType:string;targetId:string;createdAt:string};\nasync function adminCall<T>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(\"/api/server/admin/\"+path,{...init,credentials:\"same-origin\",cache:\"no-store\",headers:{\"Content-Type\":\"application/json\",...(init?.headers||{})}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||\"Administrator request failed.\");return body as T}\nconst panel:React.CSSProperties={border:\"1px solid var(--line)\",borderRadius:16,padding:20,background:\"var(--surface)\",minWidth:0};\nconst table:React.CSSProperties={width:\"100%\",borderCollapse:\"collapse\",textAlign:\"left\",fontSize:13};\nconst cell:React.CSSProperties={padding:\"12px 9px\",borderBottom:\"1px solid var(--line)\",verticalAlign:\"top\"};\nconst action:React.CSSProperties={border:\"1px solid var(--line)\",borderRadius:8,padding:\"7px 10px\",background:\"transparent\",cursor:\"pointer\",fontSize:12,marginRight:6,marginBottom:4};\nexport default function AdminConsole(){\n const {data:session,isPending}=authClient.useSession();const [stats,setStats]=useState<Stats|null>(null);const [users,setUsers]=useState<Member[]>([]);const [studios,setStudios]=useState<Studio[]>([]);const [bookings,setBookings]=useState<Booking[]>([]);const [audit,setAudit]=useState<Audit[]>([]);const [busy,setBusy]=useState(true);const [error,setError]=useState(\"\");const [notice,setNotice]=useState(\"\");\n const refresh=useCallback(async()=>{setBusy(true);setError(\"\");try{const [a,b,c,d,e]=await Promise.all([adminCall<{data:Stats}>(\"overview\"),adminCall<{data:Member[]}>(\"users\"),adminCall<{data:Studio[]}>(\"studios\"),adminCall<{data:Booking[]}>(\"bookings\"),adminCall<{data:Audit[]}>(\"audit\")]);setStats(a.data);setUsers(b.data||[]);setStudios(c.data||[]);setBookings(d.data||[]);setAudit(e.data||[])}catch(e){setError(e instanceof Error?e.message:\"Could not load platform data.\")}finally{setBusy(false)}},[]);\n useEffect(()=>{if(!isPending&&!session)window.location.replace(\"/as\");else if(session)void refresh()},[isPending,session,refresh]);\n async function updateUser(u:Member,patch:{name?:string;suspended?:boolean}){try{await adminCall(\"users/\"+encodeURIComponent(u._id||u.id||\"\"),{method:\"PATCH\",body:JSON.stringify(patch)});setNotice(\"Member account updated.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"User update failed.\")}}\n async function editUser(u:Member){const name=window.prompt(\"Update member name:\",u.name||\"\");if(name!==null)await updateUser(u,{name:name.trim()})}\n async function editStudio(s:Studio){const title=window.prompt(\"Update studio title:\",s.title);if(title===null||!title.trim())return;try{await adminCall(\"studios/\"+s._id,{method:\"PATCH\",body:JSON.stringify({title:title.trim()})});setNotice(\"Studio updated.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Studio update failed.\")}}\n async function deleteStudio(s:Studio){if(!window.confirm(\"Permanently delete this studio listing?\"))return;try{await adminCall(\"studios/\"+s._id,{method:\"DELETE\"});setNotice(\"Studio deleted.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Studio delete failed.\")}}\n async function updateBooking(b:Booking,status:string){try{await adminCall(\"bookings/\"+b._id+\"/status\",{method:\"PATCH\",body:JSON.stringify({status})});setNotice(\"Booking status updated.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Booking update failed.\")}}\n async function deleteBooking(b:Booking){if(!window.confirm(\"Permanently delete this booking record?\"))return;try{await adminCall(\"bookings/\"+b._id,{method:\"DELETE\"});setNotice(\"Booking deleted.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Booking delete failed.\")}}\n if(isPending)return <SiteShell><main className=\"container section\"><p>Verifying administrator session…</p></main></SiteShell>;\n return <SiteShell><main className=\"container section\" style={{paddingTop:38}}>\n <div style={{display:\"flex\",justifyContent:\"space-between\",alignItems:\"end\",gap:14,flexWrap:\"wrap\",marginBottom:26}}><div><span className=\"eyebrow\">RESTRICTED PLATFORM OPERATIONS</span><h1 style={{fontFamily:\"Georgia,serif\",fontWeight:500,letterSpacing:\"-.05em\",fontSize:\"clamp(2.5rem,6vw,4.2rem)\",margin:\"8px 0\"}}>Admin <em>control room.</em></h1><p style={{color:\"var(--muted)\"}}>Full marketplace oversight · {session?.user?.email}</p></div><button className=\"btn btn-outline\" onClick={()=>void refresh()} disabled={busy}>{busy?\"Refreshing…\":\"Refresh all data\"}</button></div>\n {error&&<p role=\"alert\" style={{padding:13,borderRadius:10,background:\"#fff0ee\",color:\"#9b2c20\"}}>{error}</p>}{notice&&<p role=\"status\" style={{padding:13,borderRadius:10,border:\"1px solid var(--line)\"}}>{notice}</p>}\n {busy&&!stats?<p>Loading platform data…</p>:<>\n <div style={{display:\"grid\",gridTemplateColumns:\"repeat(auto-fit,minmax(145px,1fr))\",gap:12,marginBottom:26}}>{[[\"All users\",stats?.users],[\"Studio listings\",stats?.studios],[\"All bookings\",stats?.bookings],[\"Pending\",stats?.pendingBookings],[\"Confirmed\",stats?.confirmedBookings],[\"2FA protected\",stats?.twoFactorUsers],[\"Suspended\",stats?.suspendedUsers],[\"Admin actions · 7d\",stats?.adminActionsLast7Days]].map(([label,value])=><div key={String(label)} style={panel}><small style={{color:\"var(--muted)\"}}>{label}</small><div style={{fontSize:28,fontWeight:750,marginTop:8}}>{value??\"—\"}</div></div>)}</div>\n <div style={{display:\"grid\",gap:18}}>\n <section style={panel}><h2>Member accounts ({users.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"Member\",\"Email\",\"Joined\",\"Email verified\",\"2FA\",\"Account\",\"Actions\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{users.map(u=><tr key={u._id||u.id}><td style={cell}>{u.name||\"—\"}</td><td style={cell}>{u.email||\"—\"}</td><td style={cell}>{u.createdAt?new Date(u.createdAt).toLocaleDateString():\"—\"}</td><td style={cell}>{u.emailVerified?\"Yes\":\"No\"}</td><td style={cell}>{u.twoFactorEnabled?\"Enabled\":\"Setup required\"}</td><td style={cell}>{u.adminAccessDisabled?\"Suspended\":\"Active\"}</td><td style={cell}><button style={action} onClick={()=>void editUser(u)}>Edit name</button><button style={action} onClick={()=>void updateUser(u,{suspended:!u.adminAccessDisabled})}>{u.adminAccessDisabled?\"Restore\":\"Suspend\"}</button></td></tr>)}{!users.length&&<tr><td style={cell} colSpan={7}>No accounts found.</td></tr>}</tbody></table></div></section>\n <section style={panel}><h2>Studio moderation ({studios.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"Studio\",\"Category\",\"Host\",\"Location\",\"Rate\",\"Actions\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{studios.map(s=><tr key={s._id}><td style={cell}>{s.title}</td><td style={cell}>{s.category}</td><td style={cell}>{s.ownerName||s.ownerEmail||\"—\"}</td><td style={cell}>{s.location||\"—\"}</td><td style={cell}>{typeof s.hourlyRate===\"number\"?\"$\"+s.hourlyRate+\"/hr\":\"—\"}</td><td style={cell}><button style={action} onClick={()=>void editStudio(s)}>Edit title</button><button style={action} onClick={()=>void deleteStudio(s)}>Remove</button></td></tr>)}{!studios.length&&<tr><td style={cell} colSpan={6}>No studios.</td></tr>}</tbody></table></div></section>\n <section style={panel}><h2>Booking oversight ({bookings.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"Studio\",\"Creator\",\"Date & time\",\"Status\",\"Total\",\"Actions\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{bookings.map(b=><tr key={b._id}><td style={cell}>{b.studioTitle}</td><td style={cell}>{b.customerName||b.customerEmail||\"—\"}</td><td style={cell}>{b.date} · {b.startTime}–{b.endTime}</td><td style={cell}><select aria-label={\"Booking status \"+b._id} value={b.status} onChange={e=>void updateBooking(b,e.target.value)} style={{maxWidth:135,padding:7,borderRadius:7,border:\"1px solid var(--line)\",background:\"var(--surface)\"}}>{[\"Pending\",\"Confirmed\",\"Cancelled\",\"Completed\"].map(x=><option key={x}>{x}</option>)}</select></td><td style={cell}>{typeof b.totalAmount===\"number\"?\"$\"+b.totalAmount.toFixed(2):\"—\"}</td><td style={cell}><button style={action} onClick={()=>void deleteBooking(b)}>Delete</button></td></tr>)}{!bookings.length&&<tr><td style={cell} colSpan={6}>No bookings.</td></tr>}</tbody></table></div></section>\n <section style={panel}><h2>Administrator audit trail ({audit.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"When\",\"Administrator\",\"Action\",\"Target\",\"Reference\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{audit.map(a=><tr key={a._id}><td style={cell}>{a.createdAt?new Date(a.createdAt).toLocaleString():\"—\"}</td><td style={cell}>{a.actorEmail}</td><td style={cell}>{a.action}</td><td style={cell}>{a.targetType}</td><td style={cell}>{a.targetId}</td></tr>)}{!audit.length&&<tr><td style={cell} colSpan={5}>No administrative changes recorded.</td></tr>}</tbody></table></div></section>\n </div></>}\n </main></SiteShell>;\n}");



// StudioSpace production hardening: persistent Better Auth rate limits and corrected challenge validator.
replaceOnce("src/lib/auth.ts",'twoFactor({ issuer: "StudioSpace", allowPasswordless: true, backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" } })\n  ],\n  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },','twoFactor({ issuer: "StudioSpace", allowPasswordless: true, backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" } })\n  ],\n  rateLimit: { enabled: true, window: 60, max: 60, storage: "database", customRules: { "/sign-in/email": { window: 60, max: 8 } } },\n  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },',"persist auth rate limits in MongoDB and tighten sign-in endpoint");
writeFileSync("src/app/api/security/captcha/route.ts","import {NextRequest,NextResponse} from \"next/server\";\nimport {createHash,randomBytes,randomInt} from \"node:crypto\";\nimport {db} from \"@/lib/mongodb\";\nexport const runtime=\"nodejs\";\nconst alphabet=\"ABCDEFGHJKLMNPQRSTUVWXYZ23456789\";\nfunction makeAnswer(){return Array.from({length:6},()=>alphabet[randomInt(0,alphabet.length)]).join(\"\")}\nfunction svgFor(answer:string){\n const chars=answer.split(\"\").map((ch,i)=>{const x=34+i*39;const y=randomInt(38,58);const rotate=randomInt(-18,19);return '<text x=\"'+x+'\" y=\"'+y+'\" transform=\"rotate('+rotate+' '+x+' '+y+')\" fill=\"#17211b\" font-size=\"27\" font-family=\"Arial,sans-serif\" font-weight=\"700\">'+ch+'</text>'}).join(\"\");\n const lines=Array.from({length:8},()=>'<path d=\"M'+randomInt(0,260)+' '+randomInt(0,84)+' Q '+randomInt(30,220)+' '+randomInt(0,84)+' '+randomInt(0,260)+' '+randomInt(0,84)+'\" stroke=\"#b9a99b\" stroke-width=\"1.2\" fill=\"none\" opacity=\".65\"/>').join(\"\");\n const dots=Array.from({length:35},()=>'<circle cx=\"'+randomInt(0,260)+'\" cy=\"'+randomInt(0,84)+'\" r=\"'+(Math.random()*1.6+.4).toFixed(1)+'\" fill=\"#b35a4a\" opacity=\".5\"/>').join(\"\");\n return '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"260\" height=\"84\" viewBox=\"0 0 260 84\"><rect width=\"260\" height=\"84\" rx=\"12\" fill=\"#f1ece4\"/>'+lines+dots+chars+'</svg>';\n}\nexport async function POST(request:NextRequest){\n try{\n  const body=await request.json();const email=typeof body.email===\"string\"?body.email.trim().toLowerCase():\"\";\n  if(!email.includes(\"@\")||!email.includes(\".\"))return NextResponse.json({message:\"Enter a valid email first.\"},{status:400});\n  const id=randomBytes(18).toString(\"hex\");const answer=makeAnswer();const now=new Date();\n  await db.collection(\"loginCaptchas\").insertOne({_id:id,email,answerHash:createHash(\"sha256\").update(answer).digest(\"hex\"),verified:false,usedAt:null,attempts:0,createdAt:now,expiresAt:new Date(now.getTime()+180000)});\n  const image=\"data:image/svg+xml;charset=utf-8,\"+encodeURIComponent(svgFor(answer));\n  return NextResponse.json({id,image,expiresInSeconds:180},{headers:{\"Cache-Control\":\"no-store, max-age=0\"}});\n }catch{return NextResponse.json({message:\"Could not create a security challenge. Please retry.\"},{status:500})}\n}");

// StudioSpace UI rewrite: reliable password + CAPTCHA + TOTP routing and role-based management screens.
writeFileSync("src/app/login/login-client.tsx","\"use client\";\nimport {useMemo,useState} from \"react\";\nimport Link from \"next/link\";\nimport {useRouter,useSearchParams} from \"next/navigation\";\nimport {ArrowLeft,ArrowRight,ShieldCheck} from \"lucide-react\";\nimport {toast} from \"sonner\";\nimport {SiteShell} from \"@/components/site-shell\";\nimport {authClient,syncAuthCookie} from \"@/lib/auth-client\";\nfunction safeCallback(value:string|null){if(!value||!value.startsWith(\"/\")||value.startsWith(\"//\")||value.includes(\"\\\\\"))return \"/\";try{const u=new URL(value,\"https://studiospace.invalid\");return u.origin===\"https://studiospace.invalid\"?u.pathname+u.search+u.hash:\"/\"}catch{return \"/\"}}\nexport default function LoginPage(){\n const router=useRouter();const search=useSearchParams();const callback=useMemo(()=>safeCallback(search.get(\"callbackUrl\")),[search]);\n const [email,setEmail]=useState(\"\");const [password,setPassword]=useState(\"\");const [captchaId,setCaptchaId]=useState(\"\");const [captchaImage,setCaptchaImage]=useState(\"\");const [captchaAnswer,setCaptchaAnswer]=useState(\"\");const [busy,setBusy]=useState(false);const [error,setError]=useState(\"\");\n async function loadCaptcha(){const r=await fetch(\"/api/security/captcha\",{method:\"POST\",credentials:\"same-origin\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({email:email.trim()})});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.message||\"Could not load CAPTCHA.\");setCaptchaId(p.id);setCaptchaImage(p.image);setCaptchaAnswer(\"\")}\n async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError(\"\");try{\n  if(captchaId){const v=await fetch(\"/api/security/captcha/verify\",{method:\"POST\",credentials:\"same-origin\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({id:captchaId,email:email.trim(),answer:captchaAnswer})});const p=await v.json().catch(()=>({}));if(!v.ok){await loadCaptcha();throw new Error(p.message||\"Complete the new CAPTCHA challenge.\")}}\n  const result=await authClient.signIn.email({email:email.trim(),password});\n  if(result.error){if((result.error.message||\"\").includes(\"CAPTCHA_REQUIRED\")){await loadCaptcha();return}throw new Error(result.error.message||\"Unable to sign in.\")}\n  if((result.data as {twoFactorRedirect?:boolean}|null)?.twoFactorRedirect)return;\n  const current=await authClient.getSession();\n  if((current.data?.user as {twoFactorEnabled?:boolean}|undefined)?.twoFactorEnabled!==true){router.replace(\"/security/setup?callbackUrl=\"+encodeURIComponent(callback));return}\n  await syncAuthCookie();toast.success(\"Welcome back.\");router.replace(callback);router.refresh();\n }catch(e){setError(e instanceof Error?e.message:\"Unable to sign in.\");toast.error(e instanceof Error?e.message:\"Unable to sign in.\")}finally{setBusy(false)}}\n return <SiteShell><section className=\"auth-page auth-v2\"><div className=\"auth-v2-shell\">\n  <aside className=\"auth-v2-visual\"><Link href=\"/\" className=\"auth-v2-brand\"><img src=\"/studiospace-mark.svg\" alt=\"\"/><span>studio<strong>space</strong><small>CREATIVE SPACES, SHARED</small></span></Link><div className=\"auth-v2-story\"><span className=\"eyebrow\">GOOD TO SEE YOU AGAIN</span><h2>Your next idea is waiting for the <em>right space.</em></h2><p>Sign in to save studios, manage booking requests and keep your creative plans moving.</p></div><div className=\"auth-v2-proof\"><span>Spaces worth discovering</span><span>Bookings made clearer</span></div></aside>\n  <div className=\"auth-v2-panel\"><Link href=\"/\" className=\"back-link\"><ArrowLeft size={16}/> Back to StudioSpace</Link><span className=\"eyebrow\">MEMBER ACCESS</span><h1>Welcome back.</h1><p className=\"auth-v2-intro\">Sign in with your password, then verify using your authenticator app.</p>\n   <form className=\"auth-v2-form\" onSubmit={submit}>\n    <div className=\"auth-v2-field\"><label htmlFor=\"login-email\">Email address</label><input className=\"auth-v2-input\" id=\"login-email\" type=\"email\" autoComplete=\"username\" required value={email} onChange={e=>setEmail(e.target.value)} placeholder=\"you@example.com\"/></div>\n    <div className=\"auth-v2-field\"><label htmlFor=\"login-password\">Password</label><input className=\"auth-v2-input\" id=\"login-password\" type=\"password\" autoComplete=\"current-password\" required value={password} onChange={e=>setPassword(e.target.value)} placeholder=\"Enter your password\"/></div>\n    {captchaId&&<div className=\"auth-v2-field\" style={{padding:14,border:\"1px solid var(--line)\",borderRadius:12,background:\"var(--surface)\"}}><label>SECURITY CHECK · UNIQUE CAPTCHA</label><img src={captchaImage} alt=\"Unique CAPTCHA challenge\" width={260} height={84} style={{display:\"block\",maxWidth:\"100%\",borderRadius:10,margin:\"8px 0\"}}/><input className=\"auth-v2-input\" aria-label=\"CAPTCHA answer\" value={captchaAnswer} onChange={e=>setCaptchaAnswer(e.target.value.toUpperCase().slice(0,6))} autoComplete=\"off\" spellCheck={false} placeholder=\"Enter the 6 characters\"/><button type=\"button\" className=\"auth-v2-resend\" onClick={()=>void loadCaptcha()}>Generate a different CAPTCHA</button></div>}\n    {error&&<p role=\"alert\" style={{color:\"#a6382d\",fontSize:13}}>{error}</p>}\n    <button className=\"auth-v2-primary\" type=\"submit\" disabled={busy}>{busy?\"Verifying…\":\"Sign in\"} <ArrowRight size={17}/></button>\n   </form>\n   <div className=\"auth-v2-note\"><ShieldCheck size={16}/> Two-factor verification is required for every account.</div>\n   <p className=\"auth-v2-bottom\">New to StudioSpace? <Link href=\"/register\">Create an account</Link></p>\n  </div>\n </div></section></SiteShell>;\n}");
writeFileSync("src/app/as/page.tsx","\"use client\";\nimport {FormEvent,useState} from \"react\";\nimport Link from \"next/link\";\nimport {useRouter} from \"next/navigation\";\nimport {ArrowLeft,ArrowUpRight,Fingerprint,KeyRound,LockKeyhole,ShieldCheck} from \"lucide-react\";\nimport {toast} from \"sonner\";\nimport {authClient,syncAuthCookie} from \"@/lib/auth-client\";\nimport \"./portal.css\";\nconst allowedAdminEmails=new Set([\"sam.scaleup.as777@gmail.com\",\"annikamuni2006@gmail.com\"]);\nexport default function AdminSignInPage(){\n const router=useRouter();const [email,setEmail]=useState(\"\");const [password,setPassword]=useState(\"\");const [busy,setBusy]=useState(false);const [error,setError]=useState(\"\");const [captchaId,setCaptchaId]=useState(\"\");const [captchaImage,setCaptchaImage]=useState(\"\");const [captchaAnswer,setCaptchaAnswer]=useState(\"\");\n async function loadCaptcha(){const r=await fetch(\"/api/security/captcha\",{method:\"POST\",credentials:\"same-origin\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({email:email.trim()})});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p.message||\"Could not load CAPTCHA.\");setCaptchaId(p.id);setCaptchaImage(p.image);setCaptchaAnswer(\"\")}\n async function signIn(event:FormEvent<HTMLFormElement>){event.preventDefault();setError(\"\");const normalizedEmail=email.trim().toLowerCase();if(!allowedAdminEmails.has(normalizedEmail)){setError(\"This identity is not on the administrator access list.\");return}if(!password){setError(\"Enter the administrator password to continue.\");return}setBusy(true);\n try{\n  if(captchaId){const v=await fetch(\"/api/security/captcha/verify\",{method:\"POST\",credentials:\"same-origin\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({id:captchaId,email:normalizedEmail,answer:captchaAnswer})});const p=await v.json().catch(()=>({}));if(!v.ok){await loadCaptcha();throw new Error(p.message||\"Complete the new CAPTCHA challenge.\")}}\n  const result=await authClient.signIn.email({email:normalizedEmail,password});\n  if(result.error){if((result.error.message||\"\").includes(\"CAPTCHA_REQUIRED\")){await loadCaptcha();return}throw new Error(\"The email or administrator password is incorrect.\")}\n  if((result.data as {twoFactorRedirect?:boolean}|null)?.twoFactorRedirect)return;\n  const current=await authClient.getSession();\n  if((current.data?.user as {twoFactorEnabled?:boolean}|undefined)?.twoFactorEnabled!==true){router.replace(\"/security/setup?callbackUrl=%2F\");return}\n  await syncAuthCookie();\n  const check=await fetch(\"/api/server/admin/me\",{method:\"GET\",credentials:\"same-origin\",cache:\"no-store\"});\n  if(!check.ok){await fetch(\"/api/auth/cookie\",{method:\"DELETE\",credentials:\"same-origin\"}).catch(()=>undefined);throw new Error(\"This account could not be verified for administrator access.\")}\n  setCaptchaId(\"\");setCaptchaImage(\"\");setCaptchaAnswer(\"\");toast.success(\"Administrator access verified.\");router.replace(\"/\");router.refresh();\n }catch(e){const message=e instanceof Error?e.message:\"Administrator sign-in failed.\";setError(message);toast.error(message)}finally{setBusy(false)}\n }\n return <main className=\"as-portal\"><div className=\"as-portal-grain\" aria-hidden=\"true\"/><header className=\"as-portal-top\"><Link href=\"/\" className=\"as-portal-brand\" aria-label=\"Return to StudioSpace\"><span className=\"as-portal-brand-mark\">S<span>/</span></span><span className=\"as-portal-brand-name\">STUDIOSPACE <small>CONTROL ROOM</small></span></Link><Link href=\"/\" className=\"as-portal-exit\"><ArrowLeft size={15}/> Back to marketplace</Link></header>\n <section className=\"as-portal-layout\"><div className=\"as-portal-intro\"><div className=\"as-portal-kicker\"><span className=\"as-live-dot\"/> RESTRICTED ENVIRONMENT <span className=\"as-portal-kicker-line\"/></div><div className=\"as-portal-display\"><span className=\"as-portal-index\">STUDIO / ADMIN / 01</span><h1>Behind the<br/><em>creative space.</em></h1><p>The operational side of StudioSpace. A private workspace for the people entrusted to manage the platform.</p></div><div className=\"as-portal-footnote\"><span className=\"as-portal-footnote-icon\"><Fingerprint size={19}/></span><span><strong>Identity verified. Access controlled.</strong><small>Every session is checked against the administrator access policy.</small></span></div></div>\n <div className=\"as-portal-login-wrap\"><div className=\"as-portal-login-card\"><div className=\"as-portal-card-top\"><span className=\"as-portal-shield\"><ShieldCheck size={21}/></span><span className=\"as-portal-classification\">ADMINISTRATOR ACCESS <i>PRIVATE</i></span></div><h2>Sign in to control.</h2><p className=\"as-portal-card-copy\">Use one of the two authorized administrator accounts and the designated admin password. Authenticator verification is also required.</p>\n <form onSubmit={signIn} className=\"as-portal-form\"><label htmlFor=\"as-admin-email\">AUTHORIZED EMAIL</label><div className=\"as-portal-input-wrap\"><Fingerprint size={17}/><input id=\"as-admin-email\" type=\"email\" autoComplete=\"username\" spellCheck={false} required value={email} onChange={e=>setEmail(e.target.value)} placeholder=\"admin@studiospace.com\"/></div>\n <label htmlFor=\"as-admin-password\">ADMINISTRATOR PASSWORD</label><div className=\"as-portal-input-wrap\"><KeyRound size={17}/><input id=\"as-admin-password\" type=\"password\" autoComplete=\"current-password\" required value={password} onChange={e=>setPassword(e.target.value)} placeholder=\"Enter secure password\"/></div>\n {captchaId&&<div className=\"as-portal-captcha\"><label>SECURITY CHECK · UNIQUE CAPTCHA</label><img src={captchaImage} width={260} height={84} alt=\"Unique CAPTCHA challenge\"/><input aria-label=\"CAPTCHA answer\" value={captchaAnswer} onChange={e=>setCaptchaAnswer(e.target.value.toUpperCase().slice(0,6))} autoComplete=\"off\" spellCheck={false} placeholder=\"Enter 6 characters\"/><button type=\"button\" onClick={()=>void loadCaptcha()}>New challenge</button></div>}\n {error&&<p className=\"as-portal-error\" role=\"alert\">{error}</p>}\n <button className=\"as-portal-submit\" type=\"submit\" disabled={busy}><span>{busy?\"VERIFYING CREDENTIALS…\":\"ENTER CONTROL ROOM\"}</span>{busy?<span className=\"as-portal-spinner\"/>:<ArrowUpRight size={18}/>}</button></form>\n <div className=\"as-portal-security-note\"><LockKeyhole size={14}/><span>Encrypted session · Restricted to approved identities</span></div></div><div className=\"as-portal-card-caption\"><span>STUDIOSPACE / PRIVATE ACCESS</span><span>NO PUBLIC REGISTRATION</span></div></div>\n </section><footer className=\"as-portal-footer\"><span>© {new Date().getFullYear()} StudioSpace</span><span>CONTROLLED ACCESS ONLY</span><span>SECURITY LEVEL <b>ADMIN</b></span></footer></main>;\n}");
writeFileSync("src/components/admin-console.tsx","\"use client\";\nimport {useCallback,useEffect,useState} from \"react\";\nimport {SiteShell} from \"@/components/site-shell\";\nimport {authClient} from \"@/lib/auth-client\";\ntype Stats={users:number;studios:number;bookings:number;pendingBookings:number;confirmedBookings:number;suspendedUsers:number;twoFactorUsers:number;adminActionsLast7Days:number};\ntype Member={_id:string;id?:string;name?:string;email?:string;createdAt?:string;emailVerified?:boolean;twoFactorEnabled?:boolean;adminAccessDisabled?:boolean};\ntype Studio={_id:string;title:string;category:string;ownerName?:string;ownerEmail?:string;location?:string;hourlyRate?:number};\ntype Booking={_id:string;studioTitle:string;customerName?:string;customerEmail?:string;date:string;startTime:string;endTime:string;status:string;totalAmount?:number};\ntype Audit={_id:string;actorEmail:string;action:string;targetType:string;targetId:string;createdAt:string};\nasync function adminCall<T>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(\"/api/server/admin/\"+path,{...init,credentials:\"same-origin\",cache:\"no-store\",headers:{\"Content-Type\":\"application/json\",...(init?.headers||{})}});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||\"Administrator request failed.\");return body as T}\nconst panel:React.CSSProperties={border:\"1px solid var(--line)\",borderRadius:16,padding:20,background:\"var(--surface)\",minWidth:0};\nconst table:React.CSSProperties={width:\"100%\",borderCollapse:\"collapse\",textAlign:\"left\",fontSize:13};\nconst cell:React.CSSProperties={padding:\"12px 9px\",borderBottom:\"1px solid var(--line)\",verticalAlign:\"top\"};\nconst action:React.CSSProperties={border:\"1px solid var(--line)\",borderRadius:8,padding:\"7px 10px\",background:\"transparent\",cursor:\"pointer\",fontSize:12,marginRight:6,marginBottom:4};\nexport default function AdminConsole(){\n const {data:session,isPending}=authClient.useSession();const [stats,setStats]=useState<Stats|null>(null);const [users,setUsers]=useState<Member[]>([]);const [studios,setStudios]=useState<Studio[]>([]);const [bookings,setBookings]=useState<Booking[]>([]);const [audit,setAudit]=useState<Audit[]>([]);const [busy,setBusy]=useState(true);const [error,setError]=useState(\"\");const [notice,setNotice]=useState(\"\");\n const refresh=useCallback(async()=>{setBusy(true);setError(\"\");try{const [a,b,c,d,e]=await Promise.all([adminCall<{data:Stats}>(\"overview\"),adminCall<{data:Member[]}>(\"users\"),adminCall<{data:Studio[]}>(\"studios\"),adminCall<{data:Booking[]}>(\"bookings\"),adminCall<{data:Audit[]}>(\"audit\")]);setStats(a.data);setUsers(b.data||[]);setStudios(c.data||[]);setBookings(d.data||[]);setAudit(e.data||[])}catch(e){setError(e instanceof Error?e.message:\"Could not load platform data.\")}finally{setBusy(false)}},[]);\n useEffect(()=>{if(!isPending&&!session)window.location.replace(\"/as\");else if(session)void refresh()},[isPending,session,refresh]);\n async function updateUser(u:Member,patch:{name?:string;suspended?:boolean}){try{await adminCall(\"users/\"+encodeURIComponent(u.email||\"\"),{method:\"PATCH\",body:JSON.stringify(patch)});setNotice(\"Member account updated.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"User update failed.\")}}\n async function editUser(u:Member){const name=window.prompt(\"Update member name:\",u.name||\"\");if(name!==null)await updateUser(u,{name:name.trim()})}\n async function editStudio(s:Studio){const title=window.prompt(\"Update studio title:\",s.title);if(title===null||!title.trim())return;try{await adminCall(\"studios/\"+s._id,{method:\"PATCH\",body:JSON.stringify({title:title.trim()})});setNotice(\"Studio updated.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Studio update failed.\")}}\n async function deleteStudio(s:Studio){if(!window.confirm(\"Permanently delete this studio listing?\"))return;try{await adminCall(\"studios/\"+s._id,{method:\"DELETE\"});setNotice(\"Studio deleted.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Studio delete failed.\")}}\n async function updateBooking(b:Booking,status:string){try{await adminCall(\"bookings/\"+b._id+\"/status\",{method:\"PATCH\",body:JSON.stringify({status})});setNotice(\"Booking status updated.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Booking update failed.\")}}\n async function deleteBooking(b:Booking){if(!window.confirm(\"Permanently delete this booking record?\"))return;try{await adminCall(\"bookings/\"+b._id,{method:\"DELETE\"});setNotice(\"Booking deleted.\");await refresh()}catch(e){setError(e instanceof Error?e.message:\"Booking delete failed.\")}}\n if(isPending)return <SiteShell><main className=\"container section\"><p>Verifying administrator session…</p></main></SiteShell>;\n return <SiteShell><main className=\"container section\" style={{paddingTop:38}}>\n <div style={{display:\"flex\",justifyContent:\"space-between\",alignItems:\"end\",gap:14,flexWrap:\"wrap\",marginBottom:26}}><div><span className=\"eyebrow\">RESTRICTED PLATFORM OPERATIONS</span><h1 style={{fontFamily:\"Georgia,serif\",fontWeight:500,letterSpacing:\"-.05em\",fontSize:\"clamp(2.5rem,6vw,4.2rem)\",margin:\"8px 0\"}}>Admin <em>control room.</em></h1><p style={{color:\"var(--muted)\"}}>Full marketplace oversight · {session?.user?.email}</p></div><button className=\"btn btn-outline\" onClick={()=>void refresh()} disabled={busy}>{busy?\"Refreshing…\":\"Refresh all data\"}</button></div>\n {error&&<p role=\"alert\" style={{padding:13,borderRadius:10,background:\"#fff0ee\",color:\"#9b2c20\"}}>{error}</p>}{notice&&<p role=\"status\" style={{padding:13,borderRadius:10,border:\"1px solid var(--line)\"}}>{notice}</p>}\n {busy&&!stats?<p>Loading platform data…</p>:<><div style={{display:\"grid\",gridTemplateColumns:\"repeat(auto-fit,minmax(145px,1fr))\",gap:12,marginBottom:26}}>{[[\"All users\",stats?.users],[\"Studio listings\",stats?.studios],[\"All bookings\",stats?.bookings],[\"Pending\",stats?.pendingBookings],[\"Confirmed\",stats?.confirmedBookings],[\"2FA protected\",stats?.twoFactorUsers],[\"Suspended\",stats?.suspendedUsers],[\"Admin actions · 7d\",stats?.adminActionsLast7Days]].map(([label,value])=><div key={String(label)} style={panel}><small style={{color:\"var(--muted)\"}}>{label}</small><div style={{fontSize:28,fontWeight:750,marginTop:8}}>{value??\"—\"}</div></div>)}</div>\n <div style={{display:\"grid\",gap:18}}>\n <section style={panel}><h2>Member accounts ({users.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"Member\",\"Email\",\"Joined\",\"Email verified\",\"2FA\",\"Account\",\"Actions\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{users.map(u=><tr key={u._id||u.id}><td style={cell}>{u.name||\"—\"}</td><td style={cell}>{u.email||\"—\"}</td><td style={cell}>{u.createdAt?new Date(u.createdAt).toLocaleDateString():\"—\"}</td><td style={cell}>{u.emailVerified?\"Yes\":\"No\"}</td><td style={cell}>{u.twoFactorEnabled?\"Enabled\":\"Setup required\"}</td><td style={cell}>{u.adminAccessDisabled?\"Suspended\":\"Active\"}</td><td style={cell}><button style={action} onClick={()=>void editUser(u)}>Edit name</button><button style={action} onClick={()=>void updateUser(u,{suspended:!u.adminAccessDisabled})}>{u.adminAccessDisabled?\"Restore\":\"Suspend\"}</button></td></tr>)}{!users.length&&<tr><td style={cell} colSpan={7}>No accounts found.</td></tr>}</tbody></table></div></section>\n <section style={panel}><h2>Studio moderation ({studios.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"Studio\",\"Category\",\"Host\",\"Location\",\"Rate\",\"Actions\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{studios.map(s=><tr key={s._id}><td style={cell}>{s.title}</td><td style={cell}>{s.category}</td><td style={cell}>{s.ownerName||s.ownerEmail||\"—\"}</td><td style={cell}>{s.location||\"—\"}</td><td style={cell}>{typeof s.hourlyRate===\"number\"?\"$\"+s.hourlyRate+\"/hr\":\"—\"}</td><td style={cell}><button style={action} onClick={()=>void editStudio(s)}>Edit title</button><button style={action} onClick={()=>void deleteStudio(s)}>Remove</button></td></tr>)}{!studios.length&&<tr><td style={cell} colSpan={6}>No studios.</td></tr>}</tbody></table></div></section>\n <section style={panel}><h2>Booking oversight ({bookings.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"Studio\",\"Creator\",\"Date & time\",\"Status\",\"Total\",\"Actions\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{bookings.map(b=><tr key={b._id}><td style={cell}>{b.studioTitle}</td><td style={cell}>{b.customerName||b.customerEmail||\"—\"}</td><td style={cell}>{b.date} · {b.startTime}–{b.endTime}</td><td style={cell}><select aria-label={\"Booking status \"+b._id} value={b.status} onChange={e=>void updateBooking(b,e.target.value)} style={{maxWidth:135,padding:7,borderRadius:7,border:\"1px solid var(--line)\",background:\"var(--surface)\"}}>{[\"Pending\",\"Confirmed\",\"Cancelled\",\"Completed\"].map(x=><option key={x}>{x}</option>)}</select></td><td style={cell}>{typeof b.totalAmount===\"number\"?\"$\"+b.totalAmount.toFixed(2):\"—\"}</td><td style={cell}><button style={action} onClick={()=>void deleteBooking(b)}>Delete</button></td></tr>)}{!bookings.length&&<tr><td style={cell} colSpan={6}>No bookings.</td></tr>}</tbody></table></div></section>\n <section style={panel}><h2>Administrator audit trail ({audit.length})</h2><div style={{overflowX:\"auto\"}}><table style={table}><thead><tr>{[\"When\",\"Administrator\",\"Action\",\"Target\",\"Reference\"].map(x=><th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>{audit.map(a=><tr key={a._id}><td style={cell}>{a.createdAt?new Date(a.createdAt).toLocaleString():\"—\"}</td><td style={cell}>{a.actorEmail}</td><td style={cell}>{a.action}</td><td style={cell}>{a.targetType}</td><td style={cell}>{a.targetId}</td></tr>)}{!audit.length&&<tr><td style={cell} colSpan={5}>No administrative changes recorded.</td></tr>}</tbody></table></div></section>\n </div></>}\n </main></SiteShell>;\n}");
writeFileSync("src/app/as/portal.css",readFileSync("src/app/as/portal.css","utf8")+"\n.as-portal-captcha{display:grid;gap:9px;margin-top:10px;padding:13px;border:1px solid rgba(197,229,156,.22);border-radius:10px;background:rgba(8,14,10,.28)}.as-portal-captcha label{color:#bbc6b8;font-size:8px;font-weight:800;letter-spacing:.14em}.as-portal-captcha img{max-width:100%;border-radius:7px}.as-portal-captcha input{min-height:43px;padding:0 12px;border:1px solid rgba(224,235,218,.17);border-radius:8px;background:rgba(8,14,10,.34);color:#f4f2e9;letter-spacing:.18em;text-transform:uppercase}.as-portal-captcha button{justify-self:start;border:0;background:transparent;color:var(--as-lime);font-size:10px;cursor:pointer}");

// StudioSpace crypto dependency for challenge verification.
replaceOnce("src/lib/auth.ts",'import { emailOTP, jwt, twoFactor } from "better-auth/plugins";','import { emailOTP, jwt, twoFactor } from "better-auth/plugins";\nimport { createHash, createHmac, timingSafeEqual } from "node:crypto";',"import cryptographic helpers for CAPTCHA enforcement");

// StudioSpace TypeScript hardening: Mongo challenge collections and TOTP result typing.
const generatedAuthPath = "src/lib/auth.ts";
let generatedAuth = readFileSync(generatedAuthPath, "utf8");
generatedAuth = generatedAuth
  .replaceAll('db.collection("loginAttempts")', 'db.collection<any>("loginAttempts")')
  .replaceAll('db.collection("loginCaptchas")', 'db.collection<any>("loginCaptchas")')
  .replace('ctx.request.headers.get("cookie")', 'ctx.request?.headers.get("cookie")');
writeFileSync(generatedAuthPath, generatedAuth);

const generatedCaptchaPath = "src/app/api/security/captcha/route.ts";
let generatedCaptcha = readFileSync(generatedCaptchaPath, "utf8");
generatedCaptcha = generatedCaptcha.replace('db.collection("loginCaptchas")', 'db.collection<any>("loginCaptchas")');
writeFileSync(generatedCaptchaPath, generatedCaptcha);

// TOTP result is already narrowed in each generated setup page above; no post-write patch needed.


replaceOnce("src/lib/auth-client.ts",
  'import { emailOTPClient, jwtClient, twoFactorClient } from "better-auth/client/plugins";',
  'import { emailOTPClient, jwtClient, phoneNumberClient, twoFactorClient } from "better-auth/client/plugins";',
  "restore phone verification client plugin alongside 2FA");
replaceOnce("src/lib/auth-client.ts",
  'plugins: [jwtClient(), emailOTPClient(), twoFactorClient({ twoFactorPage: "/two-factor" })]',
  'plugins: [jwtClient(), emailOTPClient(), phoneNumberClient(), twoFactorClient({ twoFactorPage: "/two-factor" })]',
  "keep the phone verification and TOTP client plugins enabled");

// StudioSpace login polish: keep callbacks and issue a fresh CAPTCHA for every retry.
replaceOnce("src/app/two-factor/page.tsx",
  'search.get("callbackUrl")',
  'search.get("callbackUrl")||search.get("callbackURL")',
  "preserve the original destination from Better Auth MFA callback");

replaceOnce("src/app/login/login-client.tsx",
  'if(!v.ok){await loadCaptcha();throw new Error(p.message||"Complete the new CAPTCHA challenge.")}}\n  const result=await authClient.signIn.email',
  'if(!v.ok){await loadCaptcha();throw new Error(p.message||"Complete the new CAPTCHA challenge.")}setCaptchaId("");setCaptchaImage("");setCaptchaAnswer("");}\n  const result=await authClient.signIn.email',
  "clear each one-time login challenge after successful CAPTCHA verification");

replaceOnce("src/app/as/page.tsx",
  'if(!v.ok){await loadCaptcha();throw new Error(p.message||"Complete the new CAPTCHA challenge.")}}\n  const result=await authClient.signIn.email',
  'if(!v.ok){await loadCaptcha();throw new Error(p.message||"Complete the new CAPTCHA challenge.")}setCaptchaId("");setCaptchaImage("");setCaptchaAnswer("");}\n  const result=await authClient.signIn.email',
  "clear each one-time admin login challenge after successful CAPTCHA verification");


// Cursor performance hardening: no global glow or page-wide pointer transforms.
writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
.ss-cursor-aura { display: none !important; }
@media (hover: hover) and (pointer: fine) {
  .ss-pointer-section, .ss-pointer-text, .ss-pointer-image, .ss-pointer-control { translate: none !important; scale: none !important; filter: none !important; box-shadow: none !important; text-shadow: none !important; }
}
`);
console.log("Cursor effects limited to cards and frame-synced.");



// Accessible show/hide controls for password inputs on Admin, Login and Register.
// The reveal control only changes the local input type; it never writes passwords to page text or logs.
replaceOnce("src/app/login/login-client.tsx",
  'import {ArrowLeft,ArrowRight,ShieldCheck} from "lucide-react";',
  'import {ArrowLeft,ArrowRight,Eye,EyeOff,ShieldCheck} from "lucide-react";',
  "add accessible password visibility icons to member login");
replaceOnce("src/app/login/login-client.tsx",
  'const [email,setEmail]=useState("");const [password,setPassword]=useState("");',
  'const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [showPassword,setShowPassword]=useState(false);',
  "add member login password visibility state");
replaceOnce("src/app/login/login-client.tsx",
  '<input className="auth-v2-input" id="login-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/>',
  '<div className="auth-v2-password-wrap"><input className="auth-v2-input" id="login-password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password"/><button className="auth-v2-password-toggle" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>',
  "add show hide toggle to member login password");

replaceOnce("src/app/register/page.tsx",
  'import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck, UserRound } from "lucide-react";',
  'import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Mail, ShieldCheck, UserRound } from "lucide-react";',
  "add accessible password visibility icons to registration");
replaceOnce("src/app/register/page.tsx",
  '  const [password, setPassword] = useState("");',
  '  const [password, setPassword] = useState("");\n  const [showPassword, setShowPassword] = useState(false);',
  "add registration password visibility state");
replaceOnce("src/app/register/page.tsx",
  '<input className="auth-v2-input" id="register-password" type="password" autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" />',
  '<div className="auth-v2-password-wrap"><input className="auth-v2-input" id="register-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" /><button className="auth-v2-password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>',
  "add show hide toggle to registration password");

replaceOnce("src/app/as/page.tsx",
  'import {ArrowLeft,ArrowUpRight,Fingerprint,KeyRound,LockKeyhole,ShieldCheck} from "lucide-react";',
  'import {ArrowLeft,ArrowUpRight,Eye,EyeOff,Fingerprint,KeyRound,LockKeyhole,ShieldCheck} from "lucide-react";',
  "add accessible password visibility icons to admin portal");
replaceOnce("src/app/as/page.tsx",
  'const [email,setEmail]=useState("");const [password,setPassword]=useState("");',
  'const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [showPassword,setShowPassword]=useState(false);',
  "add admin password visibility state");
replaceOnce("src/app/as/page.tsx",
  '<label htmlFor="as-admin-password">ADMINISTRATOR PASSWORD</label><div className="as-portal-input-wrap"><KeyRound size={17}/><input id="as-admin-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter secure password"/></div>',
  '<label htmlFor="as-admin-password">ADMINISTRATOR PASSWORD</label><div className="as-portal-input-wrap"><KeyRound size={17}/><input id="as-admin-password" type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter secure password"/><button className="as-portal-password-toggle" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>',
  "add show hide toggle to admin password");

writeFileSync("src/app/brand-refresh.css", readFileSync("src/app/brand-refresh.css", "utf8") + String.raw`
/* Password visibility controls for member login and registration. */
.auth-v2-password-wrap { position: relative; width: 100%; display: flex; align-items: center; }
.auth-v2-password-wrap .auth-v2-input { padding-right: 52px; }
.auth-v2-password-toggle {
  position: absolute; top: 50%; right: 8px; width: 36px; height: 36px;
  display: grid; place-items: center; transform: translateY(-50%);
  border: 0; border-radius: 9px; background: transparent; color: #73776f;
  cursor: pointer; transition: color .18s ease, background .18s ease;
}
.auth-v2-password-toggle:hover { color: var(--ss-accent-dark); background: rgba(223,90,67,.08); }
.auth-v2-password-toggle:focus-visible { outline: 2px solid var(--ss-accent); outline-offset: 1px; }
.dark .auth-v2-password-toggle { color: #c1c4bc; }
.dark .auth-v2-password-toggle:hover { color: #f1a18a; background: rgba(241,161,138,.1); }
`);
writeFileSync("src/app/as/portal.css", readFileSync("src/app/as/portal.css", "utf8") + `
.as-portal-password-toggle {
  flex: 0 0 34px; width: 34px; height: 36px; display: inline-grid;
  place-items: center; margin-left: 2px; padding: 0; border: 0; border-radius: 8px;
  background: transparent; color: #aab7a8; cursor: pointer;
  transition: color .18s ease, background .18s ease;
}
.as-portal-password-toggle:hover { color: var(--as-lime); background: rgba(197,229,156,.09); }
.as-portal-password-toggle:focus-visible { outline: 2px solid var(--as-lime); outline-offset: 2px; }
.as-portal-input-wrap input { flex: 1; width: auto; }
`);
console.log("Accessible password show/hide toggles added to Admin, Login and Register.");



// StudioSpace flexible MFA, Google OAuth and verified password recovery.
replaceOnce("src/lib/auth.ts",
  'adminAccessDisabled: { type: "boolean", required: false, defaultValue: false, input: false }',
  'adminAccessDisabled: { type: "boolean", required: false, defaultValue: false, input: false },\n      securityMethodChoice: { type: "string", required: false, defaultValue: "none", input: false }',
  "persist the member MFA method preference");
replaceOnce("src/lib/auth.ts",
  'requireEmailVerification: emailOtpEnabled',
  'requireEmailVerification: emailOtpEnabled,\n    revokeSessionsOnPasswordReset: true',
  "revoke sessions after verified password reset");
replaceOnce("src/lib/auth.ts",
  '      overrideDefaultEmailVerification: true,',
  '      overrideDefaultEmailVerification: true,\n      changeEmail: { enabled: true, verifyCurrentEmail: true },',
  "require current-email OTP verification before changing account email");
replaceOnce("src/lib/auth.ts",
  'twoFactor({ issuer: "StudioSpace", allowPasswordless: true, backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" } })',
  'twoFactor({ issuer: "StudioSpace", allowPasswordless: true, otpOptions: { period: 5, storeOTP: "hashed", async sendOTP({ user, otp }) { await sendStudioSpaceCode({ email: user.email, otp, type: "two-factor" }); } }, backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: "encrypted" } })',
  "configure email one-time codes as a supported second factor");
replaceOnce("src/lib/auth.ts",
  'name: user.name,\n          role: adminEmails.has(user.email.toLowerCase()) && user.adminPasswordVerified === true ? "admin" : "user",\n          twoFactorEnabled: user.twoFactorEnabled === true,',
  'name: user.name,\n          role: adminEmails.has(user.email.toLowerCase()) && user.adminPasswordVerified === true ? "admin" : "user",\n          twoFactorEnabled: user.twoFactorEnabled === true,\n          securityMethodChoice: user.securityMethodChoice || "none",',
  "include MFA method choice in the signed JWT claims");
replaceOnce("src/lib/auth.ts",
  '      if (ctx.path === "/sign-in/email-otp" || ctx.path === "/sign-in/social" || ctx.path.startsWith("/callback/")) {\n        throw new APIError("FORBIDDEN", { message: "For account security, use your password and authenticator verification to sign in." });\n      }',
  '      if (ctx.path === "/sign-in/email-otp") {\n        throw new APIError("FORBIDDEN", { message: "Use your password and a configured second factor to sign in." });\n      }',
  "allow Google OAuth while keeping passwordless email login from bypassing MFA");
replaceOnce("src/lib/auth.ts",
  '      const email = typeof user?.email === "string" ? user.email.toLowerCase() : "";\n      if (!user || !adminEmails.has(email)) return;',
  '      const email = typeof user?.email === "string" ? user.email.toLowerCase() : "";\n      if (ctx.path.startsWith("/callback/") && user?.twoFactorEnabled === true && session?.session?.token) {\n        await ctx.context.internalAdapter.deleteSession(session.session.token);\n        throw new APIError("FORBIDDEN", { message: "This account already uses two-factor security. Sign in with your password and complete verification." });\n      }\n      if (!user || !adminEmails.has(email)) return;',
  "prevent Google OAuth from bypassing an already enrolled second factor");
replaceOnce("src/lib/auth.ts",
  '  const heading = type === "email-verification"\n    ? "Confirm your email address"\n    : type === "sign-in"\n      ? "Your sign-in code"\n      : "Reset your StudioSpace password";',
  '  const heading = type === "email-verification"\n    ? "Confirm your email address"\n    : type === "sign-in"\n      ? "Your sign-in code"\n      : type === "two-factor"\n        ? "Your StudioSpace verification code"\n        : "Reset your StudioSpace password";',
  "add a dedicated email second-factor message");
replaceOnce("src/lib/auth.ts",
  '  const explanation = type === "email-verification"\n    ? "Enter this code to verify your email and finish creating your StudioSpace account."\n    : type === "sign-in"\n      ? "Enter this code on the StudioSpace sign-in page to access your account."\n      : "Enter this code to continue resetting your StudioSpace password.";',
  '  const explanation = type === "email-verification"\n    ? "Enter this code to verify your email and finish creating your StudioSpace account."\n    : type === "sign-in"\n      ? "Enter this code on the StudioSpace sign-in page to access your account."\n      : type === "two-factor"\n        ? "Enter this code to confirm your identity and complete sign-in."\n        : "Enter this code to continue resetting your StudioSpace password."; ',
  "explain the email second-factor code");
replaceOnce("src/lib/auth-client.ts",
  'plugins: [jwtClient(), emailOTPClient(), phoneNumberClient(), twoFactorClient({ twoFactorPage: "/two-factor" })]',
  'plugins: [jwtClient(), emailOTPClient(), phoneNumberClient(), twoFactorClient({ onTwoFactorRedirect({ twoFactorMethods }) { window.sessionStorage.setItem("ss_2fa_methods", JSON.stringify(twoFactorMethods)); window.location.assign("/two-factor"); } })]',
  "route sign-in challenges with their actually enabled methods");
replaceOnce("src/components/security-gate.tsx",
  'const publicPaths=["/login","/register","/as","/two-factor","/security/setup","/forgot-password","/reset-password"];',
  'const publicPaths=["/login","/register","/as","/two-factor","/security/setup","/forgot-password","/reset-password","/oauth-complete"];',
  "allow the Google sign-in completion route");

replaceOnce("src/app/login/login-client.tsx",
  ' async function loadCaptcha(){',
  ' async function continueWithGoogle(){setBusy(true);setError("");try{const result=await authClient.signIn.social({provider:"google",callbackURL:"/oauth-complete",errorCallbackURL:"/login?error=google_requires_mfa"});if(result.error)throw new Error(result.error.message||"Google sign in could not be started.")}catch(e){setError(e instanceof Error?e.message:"Google sign in could not be started.");setBusy(false)}}\n async function loadCaptcha(){',
  "restore the Google sign-in action");
replaceOnce("src/app/login/login-client.tsx",
  '   <div className="auth-v2-note"><ShieldCheck size={16}/> Two-factor verification is required for every account.</div>',
  '   <div className="auth-v2-divider" aria-hidden="true"><span>OR CONTINUE WITH GOOGLE</span></div>\n   <button className="auth-v2-google" type="button" onClick={()=>void continueWithGoogle()} disabled={busy}><svg className="auth-v2-google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.7-.4-4H24v7.6h11a9.4 9.4 0 0 1-4.1 6.2v5h6.6c3.9-3.6 6.1-8.9 6.1-14.8z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44z"/><path fill="#FBBC05" d="M12.6 27.8a12 12 0 0 1 0-7.6V15H5.8a20 20 0 0 0 0 18z"/><path fill="#EA4335" d="M24 12c3 0 5.6 1 7.7 3.1l5.8-5.8C34 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15l6.8 5.2C14.2 15.6 18.7 12 24 12z"/></svg><span>Continue with Google</span></button>\n   <p className="auth-v2-bottom"><Link href="/forgot-password">Forgot password?</Link></p>\n   <div className="auth-v2-note"><ShieldCheck size={16}/> Sign in with a password, then use your selected verification method.</div>',
  "show Google sign-in and verified password recovery on the member login screen");

// Accessible password visibility controls were added earlier; these route files use their own controlled fields.
mkdirSync("src/app/api/security/methods",{recursive:true});
writeFileSync("src/app/api/security/methods/route.ts", "import {NextResponse} from \"next/server\";\nimport {auth} from \"@/lib/auth\";\nimport {db} from \"@/lib/mongodb\";\nexport const runtime=\"nodejs\";\nexport async function GET(request:Request){\n try{\n  const session=await auth.api.getSession({headers:request.headers});\n  if(!session?.user)return NextResponse.json({message:\"Sign in to manage account security.\"},{status:401});\n  const record=await db.collection(\"user\").findOne({email:session.user.email.toLowerCase()},{projection:{securityMethodChoice:1,twoFactorEnabled:1}});\n  let methods:string[]=[];\n  if(record?.securityMethodChoice===\"both\")methods=[\"totp\",\"otp\"];\n  else if(record?.securityMethodChoice===\"totp\")methods=[\"totp\"];\n  else if(record?.securityMethodChoice===\"otp\")methods=[\"otp\"];\n  else if(record?.twoFactorEnabled===true){\n   const factor=await db.collection(\"twoFactor\").findOne({userId:session.user.id},{projection:{secret:1,verified:1}});\n   methods=factor?.secret?[\"totp\"]:[\"otp\"];\n  }\n  return NextResponse.json({enabled:record?.twoFactorEnabled===true,methods},{headers:{\"Cache-Control\":\"no-store\"}});\n }catch{return NextResponse.json({message:\"Could not load account security settings.\"},{status:500})}\n}\nexport async function POST(request:Request){\n try{\n  const session=await auth.api.getSession({headers:request.headers});\n  if(!session?.user)return NextResponse.json({message:\"Sign in to update account security.\"},{status:401});\n  const body=await request.json();\n  const choice=body?.choice;\n  if(choice!==\"totp\"&&choice!==\"otp\"&&choice!==\"both\")return NextResponse.json({message:\"Choose an available verification method.\"},{status:400});\n  const methods=choice===\"both\"?[\"totp\",\"otp\"]:[choice];\n  await db.collection(\"user\").updateOne({email:session.user.email.toLowerCase()},{$set:{securityMethodChoice:choice,updatedAt:new Date()}});\n  return NextResponse.json({success:true,methods},{headers:{\"Cache-Control\":\"no-store\"}});\n }catch{return NextResponse.json({message:\"Could not save your account security settings.\"},{status:500})}\n}");
mkdirSync("src/app/forgot-password",{recursive:true});
writeFileSync("src/app/forgot-password/page.tsx", "\"use client\";\nimport Link from \"next/link\";\nimport {useState} from \"react\";\nimport {useRouter} from \"next/navigation\";\nimport {ArrowLeft,Mail,ShieldCheck} from \"lucide-react\";\nimport {authClient} from \"@/lib/auth-client\";\nimport {SiteShell} from \"@/components/site-shell\";\nexport default function ForgotPasswordPage(){\n const router=useRouter();const [email,setEmail]=useState(\"\");const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [error,setError]=useState(\"\");\n async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);setError(\"\");try{const result=await authClient.emailOtp.requestPasswordReset({email:email.trim().toLowerCase()});if(result.error)throw new Error(result.error.message||\"Could not request a reset code.\");setSent(true)}catch(e){setError(e instanceof Error?e.message:\"Could not request a reset code.\")}finally{setBusy(false)}}\n return <SiteShell><main className=\"container section\" style={{maxWidth:540,minHeight:\"70vh\"}}><Link href=\"/login\" className=\"back-link\"><ArrowLeft size={16}/> Back to sign in</Link><span className=\"eyebrow\">ACCOUNT RECOVERY</span><h1 style={{fontFamily:\"Georgia,serif\",fontWeight:500,letterSpacing:\"-.05em\"}}>Forgot your <em>password?</em></h1><p style={{color:\"var(--muted)\",lineHeight:1.8}}>We will send a one-time verification code to the email address on your account. Your password will not change until that code is verified.</p>{sent?<section style={{padding:24,border:\"1px solid var(--line)\",borderRadius:16,background:\"var(--surface)\"}}><h2>Check your inbox</h2><p>If that email belongs to a StudioSpace account, a verification code has been sent. Enter it on the password reset screen.</p><button className=\"btn btn-dark\" onClick={()=>router.push(\"/reset-password?email=\"+encodeURIComponent(email.trim().toLowerCase()))}>Enter verification code</button></section>:<form onSubmit={submit} style={{display:\"grid\",gap:14,padding:24,border:\"1px solid var(--line)\",borderRadius:16,background:\"var(--surface)\"}}><label htmlFor=\"forgot-email\">Email address</label><input id=\"forgot-email\" className=\"auth-v2-input\" type=\"email\" required autoComplete=\"email\" value={email} onChange={e=>setEmail(e.target.value)} placeholder=\"you@example.com\"/>{error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button className=\"btn btn-dark\" type=\"submit\" disabled={busy}>{busy?\"Sending verification…\":\"Send verification code\"} <Mail size={16}/></button></form>}<p style={{marginTop:20,fontSize:13,color:\"var(--muted)\"}}><ShieldCheck size={15} style={{verticalAlign:\"middle\"}}/> Only a valid email code can authorize a password reset.</p></main></SiteShell>;\n}");
mkdirSync("src/app/reset-password",{recursive:true});
writeFileSync("src/app/reset-password/page.tsx", "\"use client\";\nimport Link from \"next/link\";\nimport {useMemo,useState} from \"react\";\nimport {useRouter,useSearchParams} from \"next/navigation\";\nimport {ArrowLeft,ShieldCheck} from \"lucide-react\";\nimport {authClient} from \"@/lib/auth-client\";\nimport {SiteShell} from \"@/components/site-shell\";\nexport default function ResetPasswordPage(){\n const router=useRouter();const search=useSearchParams();const initialEmail=useMemo(()=>search.get(\"email\")||\"\",[search]);const [email,setEmail]=useState(initialEmail);const [otp,setOtp]=useState(\"\");const [password,setPassword]=useState(\"\");const [confirm,setConfirm]=useState(\"\");const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState(\"\");const [done,setDone]=useState(false);\n async function submit(event:React.FormEvent){event.preventDefault();setError(\"\");if(password.length<8){setError(\"Use at least eight characters for your new password.\");return}if(password!==confirm){setError(\"The new passwords do not match.\");return}if(!/^[0-9]{6}$/.test(otp)){setError(\"Enter the six-digit code sent to your email.\");return}setBusy(true);try{const result=await authClient.emailOtp.resetPassword({email:email.trim().toLowerCase(),otp:otp.trim(),password});if(result.error)throw new Error(result.error.message||\"The verification code was not accepted.\");setDone(true)}catch(e){setError(e instanceof Error?e.message:\"Password reset could not be completed.\")}finally{setBusy(false)}}\n return <SiteShell><main className=\"container section\" style={{maxWidth:560,minHeight:\"70vh\"}}><Link href=\"/login\" className=\"back-link\"><ArrowLeft size={16}/> Back to sign in</Link><span className=\"eyebrow\">VERIFIED PASSWORD RESET</span><h1 style={{fontFamily:\"Georgia,serif\",fontWeight:500,letterSpacing:\"-.05em\"}}>Set a new <em>password.</em></h1>{done?<section style={{padding:24,border:\"1px solid var(--line)\",borderRadius:16,background:\"var(--surface)\"}}><h2>Password updated</h2><p>Your verification code was accepted and the password has been changed. Existing sessions have been revoked. Sign in again with your new password.</p><button className=\"btn btn-dark\" onClick={()=>router.replace(\"/login\")}>Return to sign in</button></section>:<form onSubmit={submit} style={{display:\"grid\",gap:14,padding:24,border:\"1px solid var(--line)\",borderRadius:16,background:\"var(--surface)\"}}><label htmlFor=\"reset-email\">Account email</label><input id=\"reset-email\" className=\"auth-v2-input\" type=\"email\" autoComplete=\"email\" required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor=\"reset-otp\">Six-digit email verification code</label><input id=\"reset-otp\" className=\"auth-v2-input otp\" inputMode=\"numeric\" autoComplete=\"one-time-code\" maxLength={6} required value={otp} onChange={e=>setOtp(e.target.value.replace(/\\D/g,\"\").slice(0,6))} placeholder=\"000000\"/><label htmlFor=\"reset-new-password\">New password</label><div className=\"auth-v2-password-wrap\"><input id=\"reset-new-password\" className=\"auth-v2-input\" type={show?\"text\":\"password\"} autoComplete=\"new-password\" required value={password} onChange={e=>setPassword(e.target.value)} placeholder=\"At least 8 characters\"/><button className=\"auth-v2-password-toggle\" type=\"button\" aria-label={show?\"Hide password\":\"Show password\"} onClick={()=>setShow(v=>!v)}>{show?\"Hide\":\"Show\"}</button></div><label htmlFor=\"reset-confirm-password\">Confirm new password</label><input id=\"reset-confirm-password\" className=\"auth-v2-input\" type=\"password\" autoComplete=\"new-password\" required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder=\"Re-enter your new password\"/>{error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button className=\"btn btn-dark\" type=\"submit\" disabled={busy}>{busy?\"Verifying and updating…\":\"Verify code and update password\"}</button></form>}<p style={{marginTop:18,color:\"var(--muted)\",fontSize:13}}><ShieldCheck size={15} style={{verticalAlign:\"middle\"}}/> No password change is made until the email code is accepted.</p></main></SiteShell>;\n}");
mkdirSync("src/app/oauth-complete",{recursive:true});
writeFileSync("src/app/oauth-complete/page.tsx", "\"use client\";\nimport {useEffect} from \"react\";\nimport {useRouter} from \"next/navigation\";\nimport {authClient} from \"@/lib/auth-client\";\nimport {SiteShell} from \"@/components/site-shell\";\nexport default function OAuthCompletePage(){\n const router=useRouter();const {data:session,isPending}=authClient.useSession();\n useEffect(()=>{if(isPending)return;if(!session){router.replace(\"/login?error=google_requires_mfa\");return}const enabled=(session.user as {twoFactorEnabled?:boolean}).twoFactorEnabled===true;if(enabled){void authClient.signOut().finally(()=>router.replace(\"/login?error=google_requires_mfa\"));return}router.replace(\"/security/setup?callbackUrl=%2F\")},[isPending,session,router]);\n return <SiteShell><main className=\"container section\"><p role=\"status\">Completing secure sign-in and checking your account protection…</p></main></SiteShell>;\n}");
writeFileSync("src/app/security/setup/page.tsx", "\"use client\";\nimport {useEffect,useMemo,useState} from \"react\";\nimport {useRouter,useSearchParams} from \"next/navigation\";\nimport QRCode from \"react-qr-code\";\nimport {authClient,syncAuthCookie} from \"@/lib/auth-client\";\nimport {SiteShell} from \"@/components/site-shell\";\n\ntype MethodChoice = \"totp\" | \"otp\" | \"both\";\nfunction safeCallback(value:string|null){if(!value||!value.startsWith(\"/\")||value.startsWith(\"//\")||value.includes(\"\\\\\"))return \"/\";try{const u=new URL(value,\"https://studiospace.invalid\");return u.origin===\"https://studiospace.invalid\"?u.pathname+u.search+u.hash:\"/\"}catch{return \"/\"}}\nexport default function SecuritySetupPage(){\n const router=useRouter();const search=useSearchParams();const callback=useMemo(()=>safeCallback(search.get(\"callbackUrl\")),[search]);const {data:session,isPending}=authClient.useSession();\n const [password,setPassword]=useState(\"\");const [choice,setChoice]=useState<MethodChoice>(\"totp\");const [activeMethods,setActiveMethods]=useState<string[]>([]);const [uri,setUri]=useState(\"\");const [code,setCode]=useState(\"\");const [backupCodes,setBackupCodes]=useState<string[]>([]);const [loading,setLoading]=useState(false);const [complete,setComplete]=useState(false);const [error,setError]=useState(\"\");const [loaded,setLoaded]=useState(false);\n useEffect(()=>{if(!isPending&&!session){router.replace(\"/login?callbackUrl=\"+encodeURIComponent(\"/security/setup?callbackUrl=\"+encodeURIComponent(callback)));return}if(!session)return;let live=true;fetch(\"/api/security/methods\",{credentials:\"same-origin\",cache:\"no-store\"}).then(r=>r.json().then(v=>({r,v}))).then(({r,v})=>{if(!live)return;if(r.ok){const methods=Array.isArray(v.methods)?v.methods.filter((x:string)=>x===\"totp\"||x===\"otp\"):[];setActiveMethods(methods);if(methods.length)setComplete(true)}else setError(v.message||\"Could not load security settings.\")}).catch(()=>{if(live)setError(\"Could not load security settings.\")}).finally(()=>{if(live)setLoaded(true)});return()=>{live=false}},[isPending,session,router,callback]);\n async function saveMethods(methods:string[]){const choiceValue=methods.includes(\"totp\")&&methods.includes(\"otp\")?\"both\":methods.includes(\"otp\")?\"otp\":\"totp\";const response=await fetch(\"/api/security/methods\",{method:\"POST\",credentials:\"same-origin\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({choice:choiceValue})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.message||\"Could not save your security preferences.\");setActiveMethods(methods)}\n async function beginSetup(event:React.FormEvent){event.preventDefault();setLoading(true);setError(\"\");try{\n  const needTotp=(choice===\"totp\"||choice===\"both\")&&!activeMethods.includes(\"totp\");\n  const needOtp=(choice===\"otp\"||choice===\"both\")&&!activeMethods.includes(\"otp\");\n  if(!needTotp&&!needOtp){setComplete(true);return}\n  if(needTotp){const result=await authClient.twoFactor.enable({password:password||undefined,method:\"totp\",issuer:\"StudioSpace\"});if(result.error)throw new Error(result.error.message||\"Could not prepare authenticator setup.\");const totpData=result.data as {method?:string;totpURI?:string;backupCodes?:string[]}|undefined;if(!totpData?.totpURI)throw new Error(\"The authenticator setup did not return a QR code.\");setUri(totpData.totpURI);setBackupCodes(totpData.backupCodes||[]);return}\n  if(needOtp){const result=await authClient.twoFactor.enable({password:password||undefined,method:\"otp\"});if(result.error)throw new Error(result.error.message||\"Could not enable email verification.\");const methods=choice===\"both\"?[\"totp\",\"otp\"]:[\"otp\"];await syncAuthCookie();await saveMethods(methods);setComplete(true)}\n }catch(e){setError(e instanceof Error?e.message:\"Could not start security setup.\")}finally{setLoading(false)}}\n async function verifySetup(event:React.FormEvent){event.preventDefault();if(!/^[0-9]{6}$/.test(code)){setError(\"Enter the current six-digit authenticator code.\");return}setLoading(true);setError(\"\");try{const result=await authClient.twoFactor.verifyTotp({code,trustDevice:false});if(result.error)throw new Error(result.error.message||\"That authenticator code was not accepted.\");let methods=[\"totp\"];if(choice===\"both\"){const otpResult=await authClient.twoFactor.enable({password:password||undefined,method:\"otp\"});if(otpResult.error)throw new Error(otpResult.error.message||\"Authenticator is active, but email verification could not be added. Open security settings to finish adding it.\");methods=[\"totp\",\"otp\"]}await syncAuthCookie();await saveMethods(methods);setActiveMethods(methods);setUri(\"\");setComplete(true)}catch(e){setError(e instanceof Error?e.message:\"Verification failed.\")}finally{setLoading(false)}}\n if(isPending||!session||!loaded)return <SiteShell><main className=\"container section\"><p>Checking your account security…</p></main></SiteShell>;\n return <SiteShell><main className=\"container section\" style={{maxWidth:800,minHeight:\"72vh\"}}>\n  <span className=\"eyebrow\">ACCOUNT SECURITY</span><h1 style={{fontFamily:\"Georgia,serif\",fontSize:\"clamp(2.4rem,6vw,4rem)\",fontWeight:500,letterSpacing:\"-.05em\"}}>Choose how to <em>verify.</em></h1><p style={{maxWidth:650,lineHeight:1.8,color:\"var(--muted)\"}}>Use an authenticator app, an email verification code, or both. You can add a second method later. Security changes require your current password; Google-only accounts are confirmed through their active Google session.</p>\n  {complete&&!uri?<section style={{border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\",marginBottom:20}}><h2>Your account has an active second factor.</h2><p>Enabled methods: <strong>{activeMethods.includes(\"totp\")?\"Authenticator app\":\"\"}{activeMethods.includes(\"totp\")&&activeMethods.includes(\"otp\")?\" + \":\"\"}{activeMethods.includes(\"otp\")?\"Email verification code\":\"\"}</strong></p><p>You can add another method below. Existing methods stay enabled unless you replace them through a verified security change.</p><button className=\"btn btn-dark\" onClick={()=>router.replace(callback)}>Continue to StudioSpace</button></section>:null}\n  {!uri&&(!complete||!activeMethods.includes(\"totp\")||!activeMethods.includes(\"otp\"))?<form onSubmit={beginSetup} style={{display:\"grid\",gap:16,maxWidth:560,border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}>\n   <h2>{complete?\"Add another verification method\":\"Select your security setup\"}</h2>\n   <label style={{display:\"flex\",gap:12,alignItems:\"flex-start\",padding:14,border:\"1px solid var(--line)\",borderRadius:12}}><input type=\"radio\" name=\"mfa-choice\" checked={choice===\"totp\"} onChange={()=>setChoice(\"totp\")}/><span><strong>Authenticator app</strong><br/><small>Google Authenticator, Microsoft Authenticator, 1Password or another TOTP app.</small></span></label>\n   <label style={{display:\"flex\",gap:12,alignItems:\"flex-start\",padding:14,border:\"1px solid var(--line)\",borderRadius:12}}><input type=\"radio\" name=\"mfa-choice\" checked={choice===\"otp\"} onChange={()=>setChoice(\"otp\")}/><span><strong>Email verification code</strong><br/><small>Receive a one-time code in your verified email inbox.</small></span></label>\n   <label style={{display:\"flex\",gap:12,alignItems:\"flex-start\",padding:14,border:\"1px solid var(--line)\",borderRadius:12}}><input type=\"radio\" name=\"mfa-choice\" checked={choice===\"both\"} onChange={()=>setChoice(\"both\")}/><span><strong>Both methods</strong><br/><small>Keep both options available at sign-in and choose either verification method.</small></span></label>\n   <label htmlFor=\"security-current-password\">Current account password {session.user?.name?\"(required for password accounts)\":\"(required for password accounts)\"}</label><input id=\"security-current-password\" className=\"auth-v2-input\" type=\"password\" autoComplete=\"current-password\" value={password} onChange={e=>setPassword(e.target.value)} placeholder=\"Enter your current password if you use one\"/>\n   {error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button className=\"btn btn-dark\" type=\"submit\" disabled={loading}>{loading?\"Preparing secure setup…\":complete?\"Add selected method\":\"Continue with selected method\"}</button>\n  </form>:null}\n  {uri?<div style={{display:\"grid\",gap:20}}>\n   <section style={{border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><h2>Scan the authenticator QR code</h2><p>Scan it in your authenticator app. Do not share this QR code or setup key.</p><div style={{width:220,maxWidth:\"100%\",padding:12,background:\"#fff\",borderRadius:12}}><QRCode value={uri} size={196} style={{height:\"auto\",maxWidth:\"100%\",width:\"100%\"}}/></div><details style={{marginTop:16}}><summary>Can’t scan? Show setup key</summary><code style={{display:\"block\",overflowWrap:\"anywhere\",padding:12}}>{decodeURIComponent(uri.split(\"secret=\")[1]?.split(\"&\")[0]||\"\")}</code></details></section>\n   {backupCodes.length>0?<section style={{border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><h2>Save your recovery codes</h2><p>Each code can be used once. Keep them somewhere private and offline.</p><div style={{display:\"grid\",gridTemplateColumns:\"repeat(auto-fit,minmax(130px,1fr))\",gap:8}}>{backupCodes.map((item,index)=><code key={index} style={{padding:9,background:\"var(--background)\",borderRadius:7}}>{item}</code>)}</div><button type=\"button\" className=\"btn btn-outline\" style={{marginTop:14}} onClick={()=>navigator.clipboard.writeText(backupCodes.join(\"\\n\"))}>Copy recovery codes</button></section>:null}\n   <form onSubmit={verifySetup} style={{display:\"grid\",gap:12,maxWidth:480,border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><h2>Verify your authenticator</h2><label htmlFor=\"totp-code\">Six-digit code from your app</label><input id=\"totp-code\" className=\"auth-v2-input otp\" inputMode=\"numeric\" autoComplete=\"one-time-code\" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\\D/g,\"\").slice(0,6))} placeholder=\"000000\"/>{error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button className=\"btn btn-dark\" type=\"submit\" disabled={loading||code.length!==6}>{loading?\"Verifying…\":\"Verify and activate\"}</button></form>\n  </div>:null}\n  <p style={{marginTop:20,color:\"var(--muted)\",fontSize:13}}>Forgot your password? <a href=\"/forgot-password\">Reset it using an email verification code</a>.</p>\n </main></SiteShell>;\n}");
writeFileSync("src/app/two-factor/page.tsx", "\"use client\";\nimport {useEffect,useMemo,useState} from \"react\";\nimport {useRouter,useSearchParams} from \"next/navigation\";\nimport {authClient,syncAuthCookie} from \"@/lib/auth-client\";\nimport {SiteShell} from \"@/components/site-shell\";\nfunction safeCallback(value:string|null){if(!value||!value.startsWith(\"/\")||value.startsWith(\"//\")||value.includes(\"\\\\\"))return \"/\";try{const u=new URL(value,\"https://studiospace.invalid\");return u.origin===\"https://studiospace.invalid\"?u.pathname+u.search+u.hash:\"/\"}catch{return \"/\"}}\nexport default function TwoFactorPage(){\n const router=useRouter();const search=useSearchParams();const callback=useMemo(()=>safeCallback(search.get(\"callbackUrl\")||search.get(\"callbackURL\")),[search]);const [methods,setMethods]=useState<string[]>([]);const [method,setMethod]=useState<\"totp\"|\"otp\"|\"backup\">(\"totp\");const [code,setCode]=useState(\"\");const [sent,setSent]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState(\"\");\n useEffect(()=>{try{const saved=sessionStorage.getItem(\"ss_2fa_methods\");const parsed=saved?JSON.parse(saved):[];const available=Array.isArray(parsed)?parsed.filter((x:string)=>x===\"totp\"||x===\"otp\"):[];setMethods(available);setMethod(available.includes(\"totp\")?\"totp\":available.includes(\"otp\")?\"otp\":\"totp\")}catch{setMethods([\"totp\"])}},[]);\n async function sendOtp(){setBusy(true);setError(\"\");try{const result=await authClient.twoFactor.sendOtp({trustDevice:false});if(result.error)throw new Error(result.error.message||\"Could not send an email verification code.\");setSent(true)}catch(e){setError(e instanceof Error?e.message:\"Could not send the email code.\")}finally{setBusy(false)}}\n async function verify(event:React.FormEvent){event.preventDefault();if(!code.trim()){setError(\"Enter your verification code.\");return}setBusy(true);setError(\"\");try{const result=method===\"backup\"?await authClient.twoFactor.verifyBackupCode({code:code.trim(),trustDevice:false}):method===\"otp\"?await authClient.twoFactor.verifyOtp({code:code.trim(),trustDevice:false}):await authClient.twoFactor.verifyTotp({code:code.trim(),trustDevice:false});if(result.error)throw new Error(result.error.message||\"The verification code was not accepted.\");sessionStorage.removeItem(\"ss_2fa_methods\");await syncAuthCookie();router.replace(callback);router.refresh()}catch(e){setError(e instanceof Error?e.message:\"Verification failed.\")}finally{setBusy(false)}}\n const hasTotp=methods.includes(\"totp\");const hasOtp=methods.includes(\"otp\");\n return <SiteShell><main className=\"container section\" style={{maxWidth:560,minHeight:\"72vh\"}}><span className=\"eyebrow\">SECOND FACTOR REQUIRED</span><h1 style={{fontFamily:\"Georgia,serif\",fontSize:\"clamp(2.5rem,6vw,3.8rem)\",fontWeight:500,letterSpacing:\"-.05em\"}}>Verify it’s <em>you.</em></h1><p style={{lineHeight:1.8,color:\"var(--muted)\"}}>Your password was accepted. Complete one of the verification methods enabled for your account before continuing.</p>\n <div style={{display:\"flex\",flexWrap:\"wrap\",gap:8,marginBottom:16}}>{hasTotp?<button className={method===\"totp\"?\"btn btn-dark\":\"btn btn-outline\"} type=\"button\" onClick={()=>{setMethod(\"totp\");setCode(\"\");setError(\"\")}}>Authenticator app</button>:null}{hasOtp?<button className={method===\"otp\"?\"btn btn-dark\":\"btn btn-outline\"} type=\"button\" onClick={()=>{setMethod(\"otp\");setCode(\"\");setError(\"\");setSent(false)}}>Email code</button>:null}<button className={method===\"backup\"?\"btn btn-dark\":\"btn btn-outline\"} type=\"button\" onClick={()=>{setMethod(\"backup\");setCode(\"\");setError(\"\")}}>Recovery code</button></div>\n <form onSubmit={verify} style={{display:\"grid\",gap:14,border:\"1px solid var(--line)\",borderRadius:18,padding:26,background:\"var(--surface)\"}}><label htmlFor=\"two-factor-code\">{method===\"backup\"?\"One-time recovery code\":method===\"otp\"?\"Six-digit email verification code\":\"Six-digit authenticator code\"}</label>{method===\"otp\"&&!sent?<button className=\"btn btn-outline\" type=\"button\" onClick={()=>void sendOtp()} disabled={busy}>{busy?\"Sending…\":\"Send code to my email\"}</button>:null}<input id=\"two-factor-code\" className=\"auth-v2-input otp\" autoFocus autoComplete=\"one-time-code\" inputMode={method===\"backup\"?\"text\":\"numeric\"} value={code} onChange={e=>setCode(method===\"backup\"?e.target.value.toUpperCase():e.target.value.replace(/\\D/g,\"\").slice(0,6))} placeholder={method===\"backup\"?\"Enter an unused recovery code\":\"000000\"}/>{error&&<p role=\"alert\" style={{color:\"#b42318\"}}>{error}</p>}<button type=\"submit\" className=\"btn btn-dark\" disabled={busy||!code.trim()}>{busy?\"Verifying…\":\"Verify and continue\"}</button>{method===\"otp\"&&sent?<button type=\"button\" className=\"auth-v2-resend\" onClick={()=>void sendOtp()} disabled={busy}>Send a new email code</button>:null}</form>\n </main></SiteShell>;\n}");

console.log("StudioSpace flexible MFA, Google OAuth and verified password recovery applied.");





// Do not expose email OTP as an option until its actual delivery provider is configured.
replaceOnce("src/lib/auth.ts",
  '      if (ctx.path === "/sign-in/email-otp") {',
  '      if (ctx.path === "/two-factor/enable" && ctx.body?.method === "otp" && (!process.env.RESEND_API_KEY || !process.env.AUTH_FROM_EMAIL)) { throw new APIError("SERVICE_UNAVAILABLE", { message: "Email verification is unavailable until the StudioSpace email sender is configured." }); }\n      if (ctx.path === "/sign-in/email-otp") {',
  "block email MFA enrollment without a working sender");
replaceOnce("src/app/api/security/methods/route.ts",
  'return NextResponse.json({enabled:record?.twoFactorEnabled===true,methods},{headers:{"Cache-Control":"no-store"}});',
  'return NextResponse.json({enabled:record?.twoFactorEnabled===true,methods,emailOtpAvailable:Boolean(process.env.RESEND_API_KEY && process.env.AUTH_FROM_EMAIL)},{headers:{"Cache-Control":"no-store"}});',
  "report whether email verification delivery is configured");
replaceOnce("src/app/api/security/methods/route.ts",
  'if(choice!=="totp"&&choice!=="otp"&&choice!=="both")return NextResponse.json({message:"Choose an available verification method."},{status:400});\n  const methods=choice==="both"?["totp","otp"]:[choice];',
  'if(choice!=="totp"&&choice!=="otp"&&choice!=="both")return NextResponse.json({message:"Choose an available verification method."},{status:400});\n  if((choice==="otp"||choice==="both")&&(!process.env.RESEND_API_KEY||!process.env.AUTH_FROM_EMAIL))return NextResponse.json({message:"Email verification is not configured yet. Use the authenticator app option."},{status:503});\n  const methods=choice==="both"?["totp","otp"]:[choice];',
  "reject email MFA preference when mail delivery is not configured");
replaceOnce("src/app/security/setup/page.tsx",
  'const [error,setError]=useState("");const [loaded,setLoaded]=useState(false);',
  'const [error,setError]=useState("");const [loaded,setLoaded]=useState(false);const [emailOtpAvailable,setEmailOtpAvailable]=useState(false);',
  "track whether email MFA is available");
replaceOnce("src/app/security/setup/page.tsx",
  'setActiveMethods(methods);if(methods.length)setComplete(true)',
  'setActiveMethods(methods);setEmailOtpAvailable(v.emailOtpAvailable===true);if(methods.length)setComplete(true)',
  "load available verification methods");
replaceOnce("src/app/security/setup/page.tsx",
  'try{\n  const needTotp=(choice==="totp"||choice==="both")&&!activeMethods.includes("totp");',
  'try{\n  if((choice==="otp"||choice==="both")&&!emailOtpAvailable)throw new Error("Email verification is not configured yet. Please use an authenticator app.");\n  const needTotp=(choice==="totp"||choice==="both")&&!activeMethods.includes("totp");',
  "prevent users selecting a non-deliverable email factor");
replaceOnce("src/app/security/setup/page.tsx",
  'if(choice==="both"){const otpResult=await authClient.twoFactor.enable({password:password||undefined,method:"otp"});if(otpResult.error)throw new Error(otpResult.error.message||"Authenticator is active, but email verification could not be added. Open security settings to finish adding it.");methods=["totp","otp"]}',
  'if(choice==="both"){if(!activeMethods.includes("otp")){const otpResult=await authClient.twoFactor.enable({password:password||undefined,method:"otp"});if(otpResult.error)throw new Error(otpResult.error.message||"Authenticator is active, but email verification could not be added. Open security settings to finish adding it.")}methods=["totp","otp"]}',
  "avoid enabling an already active email factor twice");
replaceOnce("src/app/security/setup/page.tsx",
  '<label style={{display:"flex",gap:12,alignItems:"flex-start",padding:14,border:"1px solid var(--line)",borderRadius:12}}><input type="radio" name="mfa-choice" checked={choice==="otp"} onChange={()=>setChoice("otp")}/><span><strong>Email verification code</strong><br/><small>Receive a one-time code in your verified email inbox.</small></span></label>',
  '<label style={{display:"flex",gap:12,alignItems:"flex-start",padding:14,border:"1px solid var(--line)",borderRadius:12,opacity:emailOtpAvailable?1:.55}}><input type="radio" name="mfa-choice" checked={choice==="otp"} disabled={!emailOtpAvailable} onChange={()=>setChoice("otp")}/><span><strong>Email verification code</strong><br/><small>{emailOtpAvailable?"Receive a one-time code in your verified email inbox.":"Unavailable until the StudioSpace email sender is configured."}</small></span></label>',
  "disable email MFA option until Resend is configured");
replaceOnce("src/app/security/setup/page.tsx",
  '<label style={{display:"flex",gap:12,alignItems:"flex-start",padding:14,border:"1px solid var(--line)",borderRadius:12}}><input type="radio" name="mfa-choice" checked={choice==="both"} onChange={()=>setChoice("both")}/><span><strong>Both methods</strong><br/><small>Keep both options available at sign-in and choose either verification method.</small></span></label>',
  '<label style={{display:"flex",gap:12,alignItems:"flex-start",padding:14,border:"1px solid var(--line)",borderRadius:12,opacity:emailOtpAvailable?1:.55}}><input type="radio" name="mfa-choice" checked={choice==="both"} disabled={!emailOtpAvailable} onChange={()=>setChoice("both")}/><span><strong>Both methods</strong><br/><small>{emailOtpAvailable?"Keep both options available at sign-in and choose either verification method.":"Available after the StudioSpace email sender is configured."}</small></span></label>',
  "disable combined MFA option until email delivery is configured");
console.log("Email MFA is gated on Resend configuration; setup UI reflects availability.");




// Mark allowlisted admin identity as password-verified before MFA challenge creation.
// The two-factor plugin intentionally clears newSession during a pending challenge.
replaceOnce("src/lib/auth.ts",
  '        if (credentialAccount) {\n          await ctx.context.internalAdapter.updatePassword(user.id, passwordHash);\n        } else {\n          await ctx.context.internalAdapter.createAccount({\n            userId: user.id,\n            accountId: user.id,\n            providerId: "credential",\n            password: passwordHash\n          });\n        }\n      }\n    }),',
  '        if (credentialAccount) {\n          await ctx.context.internalAdapter.updatePassword(user.id, passwordHash);\n        } else {\n          await ctx.context.internalAdapter.createAccount({\n            userId: user.id,\n            accountId: user.id,\n            providerId: "credential",\n            password: passwordHash\n          });\n        }\n        await ctx.context.internalAdapter.updateUser(user.id, { adminPasswordVerified: true });\n      }\n    }),',
  "preserve admin identity across two-factor challenge");
console.log("Admin password verification marker now persists before MFA challenge.");


// Production authentication hardening: stable OAuth state, safe Google linking,
// accurate email-delivery readiness, and an explicit OAuth completion route.
replaceOnce("src/lib/auth.ts",
  '  trustedOrigins: [baseURL, "http://localhost:3000"],',
  '  trustedOrigins: [baseURL, "http://localhost:3000"],\n  account: {\n    storeStateStrategy: "cookie",\n    accountLinking: {\n      enabled: true,\n      trustedProviders: ["google"],\n      allowDifferentEmails: false,\n    },\n  },',
  "harden Google OAuth state and same-email account linking");
// Google email verification is already required in the earlier provider configuration patch.

replaceOnce("src/components/security-gate.tsx",
  '"/forgot-password","/reset-password"]',
  '"/forgot-password","/reset-password","/oauth-complete"]',
  "allow the OAuth completion page through the security gate");

replaceOnce("src/app/login/login-client.tsx",
  'authClient.signIn.social({provider:"google",callbackURL:"/oauth-complete",errorCallbackURL:"/login?error=google_requires_mfa"})',
  'authClient.signIn.social({provider:"google",callbackURL:"/oauth-complete",errorCallbackURL:"/login?error=google_requires_mfa",additionalParams:{prompt:"select_account"}})',
  "prompt Google account selection on sign in");
replaceOnce("src/app/register/page.tsx",
  'provider: "google",\n        callbackURL: "/",\n        newUserCallbackURL: "/",\n        errorCallbackURL: "/register"',
  'provider: "google",\n        callbackURL: "/oauth-complete",\n        newUserCallbackURL: "/oauth-complete",\n        errorCallbackURL: "/register?error=google_sign_in_failed",\n        additionalParams: { prompt: "select_account" }',
  "send Google registrations through the secure account setup flow");

replaceOnce("src/app/login/login-client.tsx",
  '<p className="auth-v2-intro">Sign in with your password, then verify using your authenticator app.</p>',
  '<p className="auth-v2-intro">Sign in to pick up where your creative work left off.</p>\n            {search.get("error") === "google_requires_mfa" && <p role="alert" className="auth-v2-note">This account already has two-factor protection enabled. To keep it secure, sign in with your email and password, then complete the authenticator check. Google sign-in cannot complete this existing 2FA challenge yet.</p>}',
  "explain the secure Google fallback for accounts with existing 2FA");

// Expose readiness booleans only; never expose credential values.
mkdirSync("src/app/api/auth/readiness", { recursive: true });
writeFileSync("src/app/api/auth/readiness/route.ts", [
  'import { NextResponse } from "next/server";',
  'export const runtime = "nodejs";',
  'export async function GET() {',
  '  const emailOtpAvailable = Boolean(process.env.RESEND_API_KEY && process.env.AUTH_FROM_EMAIL);',
  '  const googleAvailable = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);',
  '  return NextResponse.json({ emailOtpAvailable, googleAvailable }, { headers: { "Cache-Control": "no-store" } });',
  '}',
].join("\n"));

replaceOnce("src/app/forgot-password/page.tsx",
  'import {useState} from "react";',
  'import {useEffect,useState} from "react";',
  "load email delivery readiness on forgot password");
replaceOnce("src/app/forgot-password/page.tsx",
  'const router=useRouter();const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [error,setError]=useState("");',
  'const router=useRouter();const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [sent,setSent]=useState(false);const [error,setError]=useState("");const [emailOtpAvailable,setEmailOtpAvailable]=useState(false);const [checkingEmailOtp,setCheckingEmailOtp]=useState(true);useEffect(()=>{let active=true;fetch("/api/auth/readiness",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(v=>{if(active)setEmailOtpAvailable(v.emailOtpAvailable===true)}).catch(()=>{if(active)setEmailOtpAvailable(false)}).finally(()=>{if(active)setCheckingEmailOtp(false)});return()=>{active=false}},[]);',
  "check email delivery before requesting password reset");
replaceOnce("src/app/forgot-password/page.tsx",
  'async function submit(event:React.FormEvent){event.preventDefault();setBusy(true);',
  'async function submit(event:React.FormEvent){event.preventDefault();if(!emailOtpAvailable){setError("Email verification is unavailable because the StudioSpace email sender is not configured. No code has been sent.");return}setBusy(true);',
  "block password-reset requests while email delivery is unavailable");
replaceOnce("src/app/forgot-password/page.tsx",
  '<button className="btn btn-dark" type="submit" disabled={busy}>',
  '<button className="btn btn-dark" type="submit" disabled={busy||checkingEmailOtp||!emailOtpAvailable}>',
  "disable unavailable password reset delivery");
replaceOnce("src/app/forgot-password/page.tsx",
  '<p style={{color:"var(--muted)",lineHeight:1.8}}>We will send a one-time verification code to the email address on your account. Your password will not change until that code is verified.</p>',
  '<p style={{color:"var(--muted)",lineHeight:1.8}}>We will send a one-time verification code to the email address on your account. Your password will not change until that code is verified.</p>{!checkingEmailOtp&&!emailOtpAvailable&&<p role="alert" style={{color:"#b42318"}}>Email verification is currently unavailable. The email sender is not configured, so no code can be delivered yet.</p>}',
  "show the real email delivery status on password recovery");

replaceOnce("src/app/reset-password/page.tsx",
  'import {useMemo,useState} from "react";',
  'import {useEffect,useMemo,useState} from "react";',
  "load email readiness on reset password");
replaceOnce("src/app/reset-password/page.tsx",
  'const router=useRouter();const search=useSearchParams();const initialEmail=useMemo(()=>search.get("email")||"",[search]);const [email,setEmail]=useState(initialEmail);const [otp,setOtp]=useState("");const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [done,setDone]=useState(false);',
  'const router=useRouter();const search=useSearchParams();const initialEmail=useMemo(()=>search.get("email")||"",[search]);const [email,setEmail]=useState(initialEmail);const [otp,setOtp]=useState("");const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");const [show,setShow]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [done,setDone]=useState(false);const [emailOtpAvailable,setEmailOtpAvailable]=useState(false);const [checkingEmailOtp,setCheckingEmailOtp]=useState(true);useEffect(()=>{let active=true;fetch("/api/auth/readiness",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(v=>{if(active)setEmailOtpAvailable(v.emailOtpAvailable===true)}).catch(()=>{if(active)setEmailOtpAvailable(false)}).finally(()=>{if(active)setCheckingEmailOtp(false)});return()=>{active=false}},[]);',
  "check email delivery before accepting password reset");
replaceOnce("src/app/reset-password/page.tsx",
  'async function submit(event:React.FormEvent){event.preventDefault();setError("");',
  'async function submit(event:React.FormEvent){event.preventDefault();setError("");if(!emailOtpAvailable){setError("Email verification is unavailable because the StudioSpace email sender is not configured.");return}',
  "block verification attempts when email sender is missing");
replaceOnce("src/app/reset-password/page.tsx",
  '<button className="btn btn-dark" type="submit" disabled={busy}>',
  '<button className="btn btn-dark" type="submit" disabled={busy||checkingEmailOtp||!emailOtpAvailable}>',
  "disable reset submission while delivery is unavailable");
replaceOnce("src/app/reset-password/page.tsx",
  '<h1 style={{fontFamily:"Georgia,serif",fontWeight:500,letterSpacing:"-.05em"}}>Set a new <em>password.</em></h1>',
  '<h1 style={{fontFamily:"Georgia,serif",fontWeight:500,letterSpacing:"-.05em"}}>Set a new <em>password.</em></h1>{!checkingEmailOtp&&!emailOtpAvailable&&<p role="alert" style={{color:"#b42318"}}>Email verification is currently unavailable. The email sender is not configured, so a valid code cannot be checked.</p>}',
  "show reset email readiness to users");
