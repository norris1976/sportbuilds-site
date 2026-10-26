// Subscribe form. Progressive enhancement:
//  - Without JavaScript the browser POSTs the form straight to Kit (the form's action).
//  - With JavaScript we send the same fields to Kit with fetch() and show the answer in the page.
// Nothing is sent until the visitor presses the button, and nothing but first name + email is sent.
const form = document.getElementById('subscribe-form');
if (form) {
  const msg = document.getElementById('subscribe-msg');
  const button = form.querySelector('button[type=submit]');
  const label = button.textContent;
  const show = (text, kind, withFallback) => {
    msg.hidden = false; msg.className = 'msg ' + kind; msg.textContent = text;
    if (withFallback && form.dataset.fallbackUrl) {
      msg.append(' ');
      const a = document.createElement('a'); a.href = form.dataset.fallbackUrl; a.rel = 'noopener'; a.textContent = 'Use Kit\u2019s own sign-up page instead.';
      msg.append(a);
    }
  };

  const kitBody = () => {
    const fd = new FormData(form);
    fd.append('host', location.href); fd.append('ckjs_version', '6');   // same non-personal fields Kit's own embed sends
    return fd;
  };

  form.addEventListener('submit', async (e) => {
    if (form.dataset.configured !== 'true') {
      e.preventDefault();
      show('Sign-up isn\u2019t connected yet, so nothing was sent. Please check back soon.', 'error');
      return;
    }
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }   // browser validation: nothing is sent
    button.disabled = true; button.textContent = 'Sending\u2026'; msg.hidden = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: kitBody(),                                            // first name + email, plus Kit's non-personal page metadata
        headers: { Accept: 'application/json', 'X-CKJS-Version': '6' }, // the same headers Kit's own embed sends
      });
      const data = res.ok ? await res.json() : null;
      if (data && data.status === 'quarantined') {
        // Kit holds this sign-up until the person completes its own security check (reCAPTCHA) on a Kit page.
        // The subscription is NOT confirmed yet, so never say "check your inbox" here.
        form.classList.add('done');
        const url = typeof data.url === 'string' && data.url.startsWith('https://app.kit.com/') ? data.url : form.dataset.fallbackUrl;
        msg.hidden = false; msg.className = 'msg ok'; msg.textContent = 'One more step: Kit needs a quick security check before it can send your confirmation email. ';
        if (url) { const a = document.createElement('a'); a.href = url; a.rel = 'noopener'; a.textContent = 'Complete the security check'; msg.append(a); }
        return;
      }
      if (data && data.status === 'success') {
        form.classList.add('done');                                 // hides the fields, consent line and button
        show('Check your inbox to confirm your subscription.', 'ok');
        return;
      }
      const m = data?.errors?.messages;
      show(Array.isArray(m) && m.length ? m.join(' ') : 'Sorry, that didn\u2019t go through. Please check your details and try again.', 'error');
    } catch {
      // Network error, or the answer could not be read. The sign-up may or may not have been received.
      show('We couldn\u2019t confirm your sign-up. If no confirmation email arrives in a few minutes, please try again.', 'error', true);
    }
    button.disabled = false; button.textContent = label;
  });
}
