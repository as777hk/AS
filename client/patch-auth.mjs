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
writeFileSync("src/lib/auth.ts", "import { betterAuth } from \"better-auth\";\nimport { mongodbAdapter } from \"@better-auth/mongo-adapter\";\nimport { emailOTP, jwt } from \"better-auth/plugins\";\nimport { db } from \"@/lib/mongodb\";\n\nconst baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || \"http://localhost:3000\";\nconst emailOtpEnabled = Boolean(process.env.RESEND_API_KEY && process.env.AUTH_FROM_EMAIL);\n\nasync function sendStudioSpaceCode({ email, otp, type }: { email: string; otp: string; type: string }) {\n  const apiKey = process.env.RESEND_API_KEY;\n  const from = process.env.AUTH_FROM_EMAIL;\n  if (!apiKey || !from) {\n    throw new Error(\"Email code delivery is not configured. Add RESEND_API_KEY and AUTH_FROM_EMAIL in Vercel.\");\n  }\n\n  const heading = type === \"email-verification\"\n    ? \"Confirm your email address\"\n    : type === \"sign-in\"\n      ? \"Your sign-in code\"\n      : \"Reset your StudioSpace password\";\n  const explanation = type === \"email-verification\"\n    ? \"Enter this code to verify your email and finish creating your StudioSpace account.\"\n    : type === \"sign-in\"\n      ? \"Enter this code on the StudioSpace sign-in page to access your account.\"\n      : \"Enter this code to continue resetting your StudioSpace password.\";\n\n  const html = [\n    '<div style=\"margin:0;padding:36px 16px;background:#f4f1eb;font-family:Arial,sans-serif;color:#191d1a\">',\n    '<div style=\"max-width:520px;margin:0 auto;padding:34px;background:#fffefa;border:1px solid #e2ded5;border-radius:18px\">',\n    '<p style=\"margin:0 0 22px;color:#c15142;font-size:12px;font-weight:700;letter-spacing:2px\">STUDIOSPACE ACCOUNT SECURITY</p>',\n    '<h1 style=\"margin:0 0 12px;font-size:26px;line-height:1.2\">' + heading + '</h1>',\n    '<p style=\"margin:0;color:#686d66;font-size:15px;line-height:1.7\">' + explanation + '</p>',\n    '<div style=\"margin:28px 0;padding:19px 12px;border-radius:12px;background:#f3eee7;text-align:center;color:#191d1a;font-size:34px;font-weight:800;letter-spacing:10px\">' + otp + '</div>',\n    '<p style=\"margin:0;color:#777a72;font-size:13px;line-height:1.6\">This code expires in five minutes. If you did not request it, you can ignore this message.</p>',\n    '<p style=\"margin:28px 0 0;color:#777a72;font-size:12px\">StudioSpace, Creative spaces shared.</p>',\n    '</div></div>'\n  ].join(\"\");\n\n  const response = await fetch(\"https://api.resend.com/emails\", {\n    method: \"POST\",\n    headers: { Authorization: \"Bearer \" + apiKey, \"Content-Type\": \"application/json\" },\n    body: JSON.stringify({\n      from,\n      to: [email],\n      subject: heading + \" | StudioSpace\",\n      html,\n      text: heading + \". \" + explanation + \" Your code is \" + otp + \". It expires in five minutes.\"\n    }),\n    cache: \"no-store\"\n  });\n\n  if (!response.ok) {\n    const detail = await response.text().catch(() => \"\");\n    console.error(\"StudioSpace email delivery failed:\", response.status, detail.slice(0, 240));\n    throw new Error(\"We could not send the email code. Please try again shortly.\");\n  }\n}\n\nexport const auth = betterAuth({\n  baseURL,\n  secret: process.env.BETTER_AUTH_SECRET || \"development-only-secret-change-before-deploy-32chars\",\n  database: mongodbAdapter(db),\n  trustedOrigins: [baseURL, \"http://localhost:3000\"],\n  emailAndPassword: {\n    enabled: true,\n    minPasswordLength: 8,\n    requireEmailVerification: emailOtpEnabled\n  },\n  socialProviders: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {\n    google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }\n  } : {},\n  plugins: [\n    emailOTP({\n      overrideDefaultEmailVerification: true,\n      sendVerificationOnSignUp: emailOtpEnabled,\n      disableSignUp: true,\n      otpLength: 6,\n      expiresIn: 300,\n      allowedAttempts: 5,\n      storeOTP: \"hashed\",\n      async sendVerificationOTP({ email, otp, type }) {\n        await sendStudioSpaceCode({ email, otp, type });\n      }\n    }),\n    jwt({\n      jwt: {\n        definePayload: ({ user }) => ({\n          id: user.id,\n          email: user.email.toLowerCase(),\n          name: user.name,\n        }),\n      },\n    })\n  ],\n  advanced: { useSecureCookies: process.env.NODE_ENV === \"production\" },\n});\n");
writeFileSync("src/lib/auth-client.ts", "\"use client\";\nimport { createAuthClient } from \"better-auth/react\";\nimport { emailOTPClient, jwtClient } from \"better-auth/client/plugins\";\n\nexport const authClient = createAuthClient({\n  plugins: [jwtClient(), emailOTPClient()]\n});\n\nexport async function syncAuthCookie() {\n  const { data, error } = await authClient.token();\n  if (error || !data?.token) throw new Error(error?.message || \"Could not create secure API session.\");\n  const response = await fetch(\"/api/auth/cookie\", {\n    method: \"POST\",\n    headers: { \"Content-Type\": \"application/json\" },\n    body: JSON.stringify({ token: data.token })\n  });\n  if (!response.ok) throw new Error(\"Could not establish the secure API session.\");\n}\n");
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
