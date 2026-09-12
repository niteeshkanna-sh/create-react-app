const steps = [
  {
    n: '01',
    title: 'Pick your car',
    body: 'Browse the fleet and choose what suits the trip — a hatchback for the city, an SUV for the highway.',
  },
  {
    n: '02',
    title: 'Send an enquiry',
    body: "Tell us your dates. We'll call back to confirm the car is free and agree the rate.",
  },
  {
    n: '03',
    title: 'Collect and drive',
    body: 'Bring a valid licence and ID. Pay the deposit, take the keys, and the car is yours.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          How it works
        </h2>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <li key={s.n}>
              <p className="text-sm font-bold tracking-widest text-gold">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold text-navy">{s.title}</h3>
              <p className="mt-1.5 leading-relaxed text-ink-dim">{s.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 rounded-[14px] border border-line bg-sand p-5 text-sm leading-relaxed text-ink-dim">
          <strong className="font-semibold text-navy">Deposits are refundable.</strong>{' '}
          It is returned after the car comes back, less any extra-KM charges or
          damage. KM limits and extra-KM rates are listed on every car above, so
          there is nothing to discover later.
        </p>
      </div>
    </section>
  );
}
