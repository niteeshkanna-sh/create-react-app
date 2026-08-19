// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Default booking dates: pickup = today, dropoff = tomorrow
(function setDefaultDates() {
  const pickupDate = document.getElementById('pickupDate');
  const dropoffDate = document.getElementById('dropoffDate');
  if (!pickupDate || !dropoffDate) return;

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const toISODate = (d) => d.toISOString().split('T')[0];

  pickupDate.min = toISODate(today);
  dropoffDate.min = toISODate(today);
  pickupDate.value = toISODate(today);
  dropoffDate.value = toISODate(tomorrow);

  pickupDate.addEventListener('change', () => {
    dropoffDate.min = pickupDate.value;
    if (dropoffDate.value < pickupDate.value) {
      dropoffDate.value = pickupDate.value;
    }
  });
})();

// Booking form (front-end only demo)
const bookingForm = document.getElementById('bookingForm');
bookingForm.addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
});

// FAQ accordion
document.querySelectorAll('.faq-item').forEach((item) => {
  const question = item.querySelector('.faq-q');
  question.addEventListener('click', () => {
    const isOpen = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach((el) => el.classList.remove('active'));
    if (!isOpen) item.classList.add('active');
  });
});

// Contact form (front-end only demo)
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  formNote.textContent = "Thanks! We'll call you shortly to confirm your booking.";
  contactForm.reset();
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();
