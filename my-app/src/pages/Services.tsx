import { Services as ServiceGrid } from '../components/Services';
import { PageHeader } from './PageHeader';

/**
 * Everything we hire, on one page.
 *
 * The footer lists five and sends the rest here, because a footer column that
 * runs to nine entries stops being a summary. The grid itself is the same
 * component the home page uses, reading the same list from the panel -- adding
 * a service there puts it on the home page, on this page and in the footer at
 * once, rather than in three places that drift.
 */
export function Services() {
  return (
    <>
      <PageHeader
        photo="services-hero"
        scene="/cars"
        title="What we hire"
        imageAlt="Self-drive cars, bikes and tourist vehicles for hire across Kanyakumari district"
        intro="Cars you drive yourself, bikes by the day, vehicles with a driver, and cars for a wedding. Everything below is hired out across Kanyakumari district."
      />
      <ServiceGrid showHeading={false} />
    </>
  );
}
