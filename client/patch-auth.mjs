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

const authPath = "src/lib/auth.ts";
const authSource = readFileSync(authPath, "utf8");
const authPatched = authSource.replace(/\\s*sessionCookieCache:\\s*true,\\s*/g, "\\n    ");
writeFileSync(authPath, authPatched);
if (authPatched.includes("sessionCookieCache: true")) {
  throw new Error("Better Auth JWT sessionCookieCache setting was not removed.");
}

patchFile("src/app/register/page.tsx", [
  ['router.push("/");router.refresh()', 'router.push("/login");router.refresh()', "registration success redirect"],
]);

patchFile("src/components/footer.tsx", [
  [
    '<Link href="/studios?category=Photo%20Studio">Photo studios</Link><Link href="/studios?category=Podcast%20Room">Podcast rooms</Link><Link href="/studios?category=Music%20Suite">Music suites</Link>',
    '<Link href="/studios?category=Photo%20Studio">Photo studios</Link><Link href="/studios?category=Sound%20Stage">Sound stages</Link><Link href="/studios?category=Podcast%20Room">Podcast rooms</Link><Link href="/studios?category=Music%20Suite">Music suites</Link><Link href="/studios?category=Art%20Workshop">Art workshops</Link>',
    "complete footer categories",
  ],
  [
    '<span>Made for the makers.</span>',
    '<span><Link href="/terms">Terms of Use</Link> · Made for the makers.</span>',
    "footer Terms link",
  ],
]);

patchFile("src/app/not-found.tsx", [
  [
    '<main className="not-found"><span className="eyebrow">404 · LOST IN THE STUDIO</span>',
    '<main className="not-found"><svg aria-hidden="true" viewBox="0 0 240 150" width="220" height="138" className="not-found-art"><rect x="38" y="16" width="164" height="108" rx="12" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M70 93 103 58l23 23 19-18 27 30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="86" cy="43" r="8" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M18 133h204" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg><span className="eyebrow">404 · LOST IN THE STUDIO</span>',
    "404 illustration",
  ],
]);

const homePath = "src/app/page.tsx";
const homeSource = readFileSync(homePath, "utf8");
const fromSupport = "StudioSpace brings independent hosts and ambitious creators together with clear listing details, transparent booking requests and practical guidance. We explain expectations up front rather than promising insurance or 24/7 services the platform does not provide.";
const toSupport = "StudioSpace keeps host identity, listing details, booking records, deposits and equipment information visible before a creator sends a request. Hosts remain responsible for appropriate property and equipment coverage, while booking information stays accessible online at any time.";
if (homeSource.includes(fromSupport)) {
  writeFileSync(homePath, homeSource.replace(fromSupport, toSupport));
}

const termsPath = "src/app/terms/page.tsx";
if (!existsSync(termsPath)) {
  mkdirSync("src/app/terms", { recursive: true });
  writeFileSync(termsPath, `import Link from "next/link";
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
          <p>StudioSpace helps independent hosts list creative spaces and helps creators discover spaces and send booking requests. A request is not confirmed until the host accepts it in the platform.</p>
          <h2>2. Accurate listings</h2>
          <p>Hosts are responsible for accurate descriptions, rates, deposits, capacity, access instructions, equipment details and current availability. Creators should review the listing and ask the host about any important requirement before booking.</p>
          <h2>3. Safety and responsibility</h2>
          <p>Hosts must provide safe access and explain relevant house rules and equipment instructions. Hosts and creators are responsible for agreeing on appropriate care, permitted use, damage reporting and any insurance or liability arrangements that apply to their session.</p>
          <h2>4. Bookings and cancellations</h2>
          <p>Booking totals are estimates based on the displayed hourly rate and security deposit. A pending request may be cancelled by its creator. Confirmed sessions are subject to the agreed time window and the host's cancellation terms.</p>
          <h2>5. Account use</h2>
          <p>Users must provide accurate account information, protect their sign-in credentials and use the platform respectfully. Hosts may manage only their own studio listings and booking requests.</p>
          <h2>6. Contact and updates</h2>
          <p>These terms describe the current assignment marketplace experience and may be updated as platform features evolve. Review listing details and booking status before travelling to a studio.</p>
          <p><Link href="/studios" className="text-link">Explore available studios</Link></p>
        </div>
      </section>
    </SiteShell>
  );
}
`);
}
console.log("StudioSpace build-time source patches applied.");
