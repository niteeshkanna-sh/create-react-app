import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-navy text-white/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-base font-bold text-gold"
            >
              N
            </span>
            <span className="text-lg font-semibold text-white">Nitesha Cars</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            Self-drive car rental. Daily, weekly and monthly hires with
            transparent rates.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Get in touch
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href="tel:+916374942976" className="transition hover:text-gold">
                +91 63749 42976
              </a>
            </li>
            <li>
              <a href="mailto:niteshacars045@gmail.com" className="transition hover:text-gold">
                niteshacars045@gmail.com
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-white uppercase">
            Pages
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/cars" className="transition hover:text-gold">
                Our fleet
              </Link>
            </li>
            <li>
              <a href="#how" className="transition hover:text-gold">
                How it works
              </a>
            </li>
            <li>
              <Link to="/contact" className="transition hover:text-gold">
                Enquire
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm">
          &copy; {new Date().getFullYear()} Nitesha Cars. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
