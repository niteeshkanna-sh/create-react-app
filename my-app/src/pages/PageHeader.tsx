interface PageHeaderProps {
  title: string;
  intro?: string;
}

/** The navy band every inner page opens with. */
export function PageHeader({ title, intro }: PageHeaderProps) {
  return (
    <section className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {intro ? (
          <p className="mt-4 max-w-2xl leading-relaxed text-white/70">{intro}</p>
        ) : null}
      </div>
      <div className="gold-rule" />
    </section>
  );
}
