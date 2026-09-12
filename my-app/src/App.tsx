import { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Fleet } from './components/Fleet';
import { HowItWorks } from './components/HowItWorks';
import { Enquiry } from './components/Enquiry';
import { Footer } from './components/Footer';

function App() {
  // Clicking "Enquire" on a car preselects it in the form below, so the
  // choice is not lost on the way down the page.
  const [selectedCar, setSelectedCar] = useState('');

  function enquireAbout(car: string) {
    setSelectedCar(car);
    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Fleet onEnquire={enquireAbout} />
        <HowItWorks />
        <Enquiry selectedCar={selectedCar} onCarChange={setSelectedCar} />
      </main>
      <Footer />
    </>
  );
}

export default App;
