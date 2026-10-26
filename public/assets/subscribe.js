// Subscribe form behaviour. No network calls are made from this file.
// When Kit is configured, the browser submits the form natively to Kit (form action set at build time).
// When it is not configured, we block the submit and say so plainly: no fake success.
const form = document.getElementById('subscribe-form');
if (form) {
  const msg = document.getElementById('subscribe-msg');
  const show = (text, kind) => { msg.hidden = false; msg.className = 'msg ' + kind; msg.textContent = text; };
  form.addEventListener('submit', (e) => {
    if (form.dataset.configured !== 'true') {
      e.preventDefault();
      show('Sign-up isn\u2019t connected yet, so nothing was sent. Please check back soon.', 'error');
      return;
    }
    const email = form.elements['email_address'];
    if (!email.checkValidity()) { e.preventDefault(); show('Please enter a valid email address.', 'error'); email.focus(); return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending\u2026';
    show('Sending you to the confirmation step\u2026', 'ok');
  });
}
