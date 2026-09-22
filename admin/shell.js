/**
 * The navigation drawer and the reminders bell.
 *
 * Kept out of admin.js because every admin page has the shell and only
 * dashboard.php has admin.js. The row of pills the drawer replaced needed no
 * script at all, which is why it stayed: it could show two of its six
 * destinations on a phone and the other four were reachable only by dragging.
 *
 * The bell is here for the same reason. A reminder that only exists on the
 * dashboard is one you do not see while you are doing anything else, which is
 * most of the time.
 */
(function () {
  'use strict';

  var side   = document.getElementById('nsSide');
  var scrim  = document.getElementById('nsScrim');
  var burger = document.getElementById('nsBurger');
  var close  = document.getElementById('nsClose');

  if (side && burger) setUpDrawer();

  function setUpDrawer() {

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

  }  // end of the drawer

  // ------------------------------------------------------------ the bell --
  //
  // What needs doing, in the bar, on every page. The same list the dashboard
  // shows under "Needs attention" -- built from one endpoint so the two can
  // never tell different stories about what is owed.

  var bell  = document.getElementById('nsBell');
  var panel = document.getElementById('nsBellPanel');
  var list  = document.getElementById('nsBellList');
  var count = document.getElementById('nsBellCount');
  var sub   = document.getElementById('nsBellSub');

  if (!bell || !panel) return;

  var FLAGS = { overdue: 'Overdue', soon: 'Soon', new: 'New' };

  // Reminder text is built from customer and vehicle names, which are typed by
  // strangers on a public form. It is escaped rather than trusted, the same
  // way the dashboard escapes it.
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function openPanel(open) {
    panel.hidden = !open;
    bell.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  bell.addEventListener('click', function (ev) {
    ev.stopPropagation();
    openPanel(panel.hidden);
  });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest('.ns-bell-wrap')) openPanel(false);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !panel.hidden) { openPanel(false); bell.focus(); }
  });

  function drawBell(alerts) {
    // A public entry point now that the dashboard feeds it, so it does not
    // assume it was handed a list.
    alerts = Array.isArray(alerts) ? alerts : [];

    // The number is what is late or due, not the whole list. A new enquiry is
    // worth showing when the panel is open and is not something running late,
    // and counting it would put the bell permanently on.
    var pressing = alerts.filter(function (a) { return a.level !== 'new'; }).length;
    count.textContent = pressing || '';
    count.hidden = pressing === 0;
    bell.classList.toggle('is-lit', pressing > 0);

    if (!alerts.length) {
      sub.textContent = 'Nothing needs chasing';
      list.innerHTML = '<li class="ns-bell-empty">Nothing due, nothing overdue, '
        + 'no deposits left to return.</li>';
      return;
    }
    sub.textContent = pressing
      ? pressing + (pressing === 1 ? ' thing needs doing' : ' things need doing')
      : 'Nothing overdue';

    list.innerHTML = alerts.map(function (a) {
      var id = a.booking_id ? ' data-booking="' + a.booking_id + '"'
             : a.vehicle_id ? ' data-vehicle="' + a.vehicle_id + '"'
             : a.enquiry_id ? ' data-enquiry="' + a.enquiry_id + '"' : '';
      return '<li><button type="button" class="ns-bell-row is-' + esc(a.level) + '"' + id + '>'
        + '<span class="ns-bell-flag">' + (FLAGS[a.level] || '') + '</span>'
        + '<span class="ns-bell-subject">' + esc(a.subject) + '</span>'
        + '<span class="ns-bell-msg">' + esc(a.message) + '</span>'
        + '</button></li>';
    }).join('');
  }

  // Clicking a reminder goes to the thing it is about. On the dashboard that
  // is a modal opening in place; anywhere else there is no modal to open, so
  // it navigates there and the dashboard opens it on arrival.
  list.addEventListener('click', function (ev) {
    var row = ev.target.closest('.ns-bell-row');
    if (!row) return;
    openPanel(false);
    var d = row.dataset;
    if (d.booking && window.openBookingDetail) window.openBookingDetail(Number(d.booking));
    else if (d.enquiry && window.openEnquiry) window.openEnquiry(Number(d.enquiry));
    else if (d.vehicle && window.openCarById) window.openCarById(Number(d.vehicle));
    else if (d.booking) window.location.href = 'dashboard.php?booking=' + d.booking + '#bookings';
    else if (d.enquiry) window.location.href = 'dashboard.php?enquiry=' + d.enquiry + '#inquiries';
    else if (d.vehicle) window.location.href = 'dashboard.php?vehicle=' + d.vehicle + '#cars';
  });

  // The dashboard fetches this list for its own "Needs attention" panel and
  // hands it over here, so the bell and the panel cannot disagree and the
  // endpoint -- which prices every open booking -- is called once, not twice.
  window.nsDrawBell = drawBell;

  if (!document.getElementById('alertsPanel')) {
    fetch('api/alerts.php', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) drawBell(data.alerts || []); })
      .catch(function () {
        // Quiet on purpose. A red error in the bar reads as the panel being
        // broken, when all that failed is a list of things to chase.
        sub.textContent = 'Could not load reminders';
        list.innerHTML = '';
      });
  }
}());
