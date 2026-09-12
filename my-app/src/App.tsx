import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useSeo } from './lib/useSeo';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Cars } from './pages/Cars';
import { Bikes } from './pages/Bikes';
import { WeddingCars } from './pages/WeddingCars';
import { TouristVehicles } from './pages/TouristVehicles';
import { Nri } from './pages/Nri';
import { Tariff } from './pages/Tariff';
import { Blog } from './pages/Blog';
import { Contact } from './pages/Contact';
import { NotFound } from './pages/NotFound';

/**
 * A browser restores scroll position on navigation, which on a client-side
 * router means a new page can open halfway down. Reset on every path change,
 * but leave hash links alone so #anchors still work.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
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
          <Route path="/nri" element={<Nri />} />
          <Route path="/tariff" element={<Tariff />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
