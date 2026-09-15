import { Fleet } from '../components/Fleet';
import { PageHeader } from './PageHeader';

export function Cars() {
  return (
    <>
      <PageHeader
        photo="cars-hero"
        scene="/cars"
        title="Our cars"
        intro="Hatchbacks, sedans, SUVs and 7 seater vehicles for self-drive hire. Every car lists its KM limit, extra-KM rate and deposit, so there is nothing to discover later."
      />
      <Fleet />
    </>
  );
}
