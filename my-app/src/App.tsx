import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSeo } from './lib/useSeo';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingActions } from './components/FloatingActions';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Cars } from './pages/Cars';
import { Bikes } from './pages/Bikes';
import { WeddingCars } from './pages/WeddingCars';
import { TouristVehicles } from './pages/TouristVehicles';
import { Nri } from './pages/Nri';
import { Monthly } from './pages/Monthly';
import { Tariff } from './pages/Tariff';
import { Blog } from './pages/Blog';
import { Contact } from './pages/Contact';
import { Places } from './pages/Places';
import { Services } from './pages/Services';
import { NotFound } from './pages/NotFound';

/**
 * A browser restores scroll position on navigation, which on a client-side
 * router means a new page can open halfway down. Reset on every path change.
 *
 * A #hash is honoured by the browser only on a real page load, so a link like
 * /contact#enquire used to land at the top of Contact rather than on the form
 * it named. <main> is keyed on the path and remounts, so the target does not
 * exist yet when this runs -- hence waiting for the frame it paints in.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const frame = requestAnimationFrame(() => {
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

function App() {
  useSeo();
  const { pathname } = useLocation();

  return (
    <>
      <ScrollToTop />
      <Header />
      {/* Keyed on the path so React remounts on navigation and the entrance
          animation replays; without the key the DOM is reused and nothing
          animates. */}
      <main key={pathname} data-page="">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/bikes" element={<Bikes />} />
          <Route path="/wedding-cars" element={<WeddingCars />} />
          <Route path="/tourist-vehicles" element={<TouristVehicles />} />
          <Route path="/monthly" element={<Monthly />} />
          <Route path="/nri" element={<Nri />} />
          <Route path="/tariff" element={<Tariff />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/places" element={<Places />} />
          <Route path="/services" element={<Services />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <FloatingActions />
    </>
  );
}

export default App;
