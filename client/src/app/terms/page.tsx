import Link from "next/link";
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
