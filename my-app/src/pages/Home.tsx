import { Link } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { HowItWorks } from '../components/HowItWorks';
import { OpenRoad } from '../components/OpenRoad';
import { AreasServed } from '../components/AreasServed';
import { Services } from '../components/Services';
import { Highlights } from '../components/Highlights';
import { WhyUs } from '../components/WhyUs';

export function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Highlights />
      <WhyUs />
      <HowItWorks />
      <OpenRoad />
      <AreasServed />

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="rounded-[14px] border border-line bg-white p-8 text-center shadow-[0_10px_30px_rgba(16,24,40,0.08)] sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            Need a car for your dates?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-ink-dim">
            Tell us when and what you need. We will confirm what is free and
            what it costs.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="rounded-xl bg-navy px-6 py-3 font-semibold text-white transition hover:bg-navy/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Send an enquiry
            </Link>
            <Link
              to="/cars"
              className="rounded-xl border border-line px-6 py-3 font-semibold text-ink-dim transition hover:border-navy/40 hover:text-navy"
            >
              See our cars
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
