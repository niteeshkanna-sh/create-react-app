import { Link } from 'react-router-dom';
import { PageHeader } from './PageHeader';

/**
 * TODO for the owner: the copy below is deliberately generic. It states only
 * what the booking flow actually does, because inventing a founding year, a
 * fleet size or customer numbers would put claims on the site that are not
 * true. Replace each paragraph with the real story.
 */
export function About() {
  return (
    <>
      <PageHeader
        title="About us"
        intro="Nitesha Cars rents cars for self-drive hire, by the day, the week or the month."
      />

      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="space-y-5 leading-relaxed text-ink-dim">
          <p>
            We hire cars to people who would rather drive themselves — for a
            weekend away, a family trip, or a month between vehicles.
          </p>
          <p>
            Rates are quoted per day and come down for longer hires. Each car
            carries a daily KM allowance, a rate for anything beyond it, and a
            refundable deposit. Those three numbers are listed against every
            car, so the price you agree is the price you pay.
          </p>
          <p>
            To hire, you need a valid driving licence and a government photo ID.
            The deposit is returned once the car comes back, less any extra-KM
            charges or damage.
          </p>
        </div>

        <div className="mt-10 rounded-[14px] border border-line bg-white p-6 shadow-[0_10px_30px_rgba(16,24,40,0.08)]">
          <h2 className="text-lg font-semibold text-navy">Questions before you book?</h2>
          <p className="mt-2 text-ink-dim">
            Call{' '}
            <a href="tel:+916374942976" className="font-medium text-navy hover:text-gold-deep">
              +91 63749 42976
            </a>{' '}
            or{' '}
            <Link to="/contact" className="font-medium text-navy hover:text-gold-deep">
              send an enquiry
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
