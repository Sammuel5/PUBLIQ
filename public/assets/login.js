const form = document.getElementById('loginForm');
const errorBox = document.getElementById('loginError');
const submitButton = document.getElementById('loginSubmit');

async function existingSession() {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (response.ok) location.replace('/admin.html');
  } catch { /* Keep the sign-in page usable when offline. */ }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  if (!email || !password) {
    errorBox.textContent = 'Enter your email address and password.';
    return;
  }
  submitButton.disabled = true;
  submitButton.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Signing in</span>';
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Unable to sign in. Try again.');
    location.replace('/admin.html');
  } catch (error) {
    errorBox.textContent = error.message === 'Failed to fetch' ? 'You appear to be offline. Sign-in requires a network connection.' : error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<span>Sign in</span><span aria-hidden="true">→</span>';
  }
});

existingSession();
