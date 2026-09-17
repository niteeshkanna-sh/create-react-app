import { Enquiry } from '../components/Enquiry';
import { AreasServed } from '../components/AreasServed';
import { PageHeader } from './PageHeader';

export function Contact() {
  return (
    <>
      <PageHeader
        photo="contact-hero"
        imageAlt="The NiteSha Cars and Bikes office in Nagercoil, Kanyakumari district"
        scene="coast"
        title="Contact"
        intro="Call us, write to us, or send the form below. Only your name and phone number are needed to start."
      />

      <section className="mx-auto max-w-6xl px-5 pt-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <a
            href="tel:+916374942976"
            className="rounded-[14px] border border-line bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)] transition hover:border-navy/40"
          >
            <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Phone
            </p>
            <p className="mt-1.5 text-xl font-semibold text-navy">+91 63749 42976</p>
            <p className="mt-1 text-sm text-ink-dim">Tap to call</p>
          </a>

          <a
            href="mailto:niteshacars045@gmail.com"
            className="rounded-[14px] border border-line bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)] transition hover:border-navy/40"
          >
            <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
              Email
            </p>
            <p className="mt-1.5 text-lg font-semibold break-all text-navy">
              niteshacars045@gmail.com
            </p>
            <p className="mt-1 text-sm text-ink-dim">We reply the same day</p>
          </a>
        </div>
      </section>

      <Enquiry />
      <AreasServed />
    </>
  );
}
