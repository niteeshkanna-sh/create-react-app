/**
 * Removing an item from a repeated list on the content page.
 *
 * A section is posted whole, and an item with every box empty is dropped when
 * it is saved. So the bin empties the boxes: it does exactly what the hint used
 * to ask people to do by hand, and the semantics are unchanged.
 *
 * Which also means it is not gone until Save is pressed. The row says so rather
 * than letting someone close the page believing it was.
 */
(function () {
  'use strict';

  document.addEventListener('click', function (ev) {
    var button = ev.target.closest('.c-row-del');
    if (!button) return;

    var row = button.closest('.c-row');
    if (!row) return;

    var fields = row.querySelectorAll('input, textarea');
    var hadContent = [].some.call(fields, function (f) { return f.value.trim() !== ''; });
    if (hadContent && !confirm('Remove this item? It goes when you save the section.')) return;

    [].forEach.call(fields, function (f) { f.value = ''; });
    row.classList.add('is-cleared');

    var note = row.querySelector('.c-row-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'c-hint c-row-note';
      row.appendChild(note);
    }
    note.textContent = 'Emptied — it is removed when you save this section.';

    // Focus the save button, so the step that actually removes it is the next
    // thing under the hand rather than something to go looking for.
    var save = row.closest('form')?.querySelector('[value="save"]');
    if (save) save.focus();
  });
}());
