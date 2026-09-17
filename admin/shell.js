/**
 * The navigation drawer, and nothing else.
 *
 * Kept out of admin.js because every admin page has the drawer and only
 * dashboard.php has admin.js. The row of pills this replaced needed no script
 * at all, which is why it stayed: it could show two of its six destinations on
 * a phone and the other four were reachable only by dragging.
 */
(function () {
  'use strict';

  var side   = document.getElementById('nsSide');
  var scrim  = document.getElementById('nsScrim');
  var burger = document.getElementById('nsBurger');
  var close  = document.getElementById('nsClose');

  if (!side || !burger) return;

  function setOpen(open) {
    document.body.classList.toggle('ns-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (scrim) scrim.hidden = !open;
    // Moving focus is the difference between a drawer and a decoration for
    // anyone not using a mouse.
    if (open && close) close.focus();
    else if (!open) burger.focus();
  }

  burger.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('ns-open'));
  });
  if (close) close.addEventListener('click', function () { setOpen(false); });
  if (scrim) scrim.addEventListener('click', function () { setOpen(false); });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && document.body.classList.contains('ns-open')) setOpen(false);
  });

  // Choosing somewhere to go closes the drawer. On the dashboard the buttons
  // switch a panel without a page load, so nothing else would.
  side.addEventListener('click', function (ev) {
    if (ev.target.closest('.ns-item')) setOpen(false);
  });

  // A link from another page arrives as dashboard.php#bookings. The dashboard
  // opens the Dashboard panel by default, so without this the link would land
  // on the right page and the wrong panel.
  //
  // On DOMContentLoaded rather than now: this file is included before admin.js,
  // which is what binds the buttons, so clicking one at this point would do
  // nothing. Not window.load either -- admin.js can put an alert up while it
  // is still waiting, and a blocking dialog swallowed the click.
  document.addEventListener('DOMContentLoaded', function () {
    var wanted = (window.location.hash || '').replace('#', '').replace(/[^a-z]/g, '');
    if (!wanted) return;
    var entry = side.querySelector('.admin-tab[data-tab="' + wanted + '"]');
    if (entry) entry.click();
  });
}());
