let invitationToken = new URLSearchParams(location.hash.slice(1)).get('token') || '';
if (invitationToken) history.replaceState(null, '', `${location.pathname}${location.search}`);
const newForm = document.getElementById('newAccountForm');
const existingBox = document.getElementById('existingAccount');
const errorBox = document.getElementById('inviteError');
const acceptButton = document.getElementById('acceptButton');

if (!invitationToken || invitationToken.length < 32) {
  errorBox.textContent = 'This invitation link is missing or invalid. Ask the inviter for a new link.';
  acceptButton.disabled = true;
}

async function postAccept(payload) {
  const response = await fetch('/api/invitations/accept', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: invitationToken, ...payload }) });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && data?.error?.code === 'SIGN_IN_REQUIRED') {
      newForm.hidden = true;
      existingBox.hidden = false;
    }
    throw new Error(data?.error?.message || 'Unable to accept this invitation.');
  }
  location.replace('/admin.html');
}

newForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  const formData = new FormData(newForm);
  const name = String(formData.get('name') || '').trim();
  const password = String(formData.get('password') || '');
  if (password.length < 14 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    errorBox.textContent = 'Use at least 14 characters with uppercase, lowercase, a number, and a symbol.';
    return;
  }
  acceptButton.disabled = true;
  try { await postAccept({ name, password }); }
  catch (error) { errorBox.textContent = error.message; }
  finally { acceptButton.disabled = false; }
});

document.getElementById('existingAccountForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const existingError = document.getElementById('existingError');
  existingError.textContent = '';
  const form = event.currentTarget;
  const email = document.getElementById('existingEmail').value.trim();
  const password = document.getElementById('existingPassword').value;
  try {
    const login = await fetch('/api/auth/login', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const loginData = await login.json().catch(() => null);
    if (!login.ok) throw new Error(loginData?.error?.message || 'Unable to sign in.');
    await postAccept({});
  } catch (error) { existingError.textContent = error.message; }
});

async function acceptForCurrentSession() {
  if (!invitationToken || invitationToken.length < 32) return;
  try {
    const session = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
    if (!session.ok) return;
    const sessionData = await session.json();
    try { await postAccept({}); }
    catch (error) {
      if (/different account|sign in/i.test(error.message)) {
        newForm.hidden = true;
        existingBox.hidden = false;
        document.getElementById('existingEmail').value = sessionData.user?.email || '';
        document.getElementById('existingError').textContent = 'You are signed in to a different account. Sign in with the invited email.';
      } else errorBox.textContent = error.message;
    }
  } catch { /* Keep invitation setup usable when the account has no active session. */ }
}
acceptForCurrentSession();
