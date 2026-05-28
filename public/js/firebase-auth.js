import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';

const firebaseConfig = window.firebaseAuthConfig || {};
const authPage = window.firebaseAuthPage || 'login';
const messageBox = document.getElementById('auth-client-message');
const registerForm = document.getElementById('firebase-register-form');
const roleSelect = document.getElementById('role');
const googleButton = document.querySelector('[data-google-auth]');

// Storage keys removed — popup flow returns the result immediately,
// so there is no cross-page state to persist.

const setMessage = (message, type = 'error') => {
  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;
  messageBox.className = `client-auth-message ${type}`;
  messageBox.hidden = false;
};

const clearMessage = () => {
  if (!messageBox) {
    return;
  }

  messageBox.textContent = '';
  messageBox.className = 'client-auth-message';
  messageBox.hidden = true;
};

const mapFirebaseError = (error) => {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in popup was closed. Please try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/cancelled-popup-request':
      return 'Google sign-in was interrupted. Please try again.';
    default:
      return error.message || 'Google sign-in failed. Please try again.';
  }
};

const setBusyState = (isBusy) => {
  if (googleButton) {
    googleButton.disabled = isBusy;
  }
};

// Button is always enabled — the click handler shows a clear message
// if no role is selected, rather than silently disabling the button.

const validateClientConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    setMessage('Google sign-in is not configured yet. Add the Firebase web app keys to your environment variables.');
    setBusyState(true);
    return false;
  }

  return true;
};

if (googleButton && !validateClientConfig()) {
  throw new Error('Firebase client configuration is incomplete.');
}

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const postTokenToBackend = async (endpoint, payload) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Authentication could not be completed.');
  }

  window.location.assign(data.redirectUrl || '/profile');
};

// No redirect-result handler needed — signInWithPopup returns the
// credential in the same page context so everything stays synchronous.

const handleGoogleAuth = async () => {
  clearMessage();

  const role = authPage === 'register' ? roleSelect?.value : '';

  if (authPage === 'register' && !role) {
    setMessage('Please select your role before continuing with Google.');
    roleSelect?.focus();
    return;
  }

  try {
    setBusyState(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Use popup instead of redirect — works on localhost & without 3rd-party cookies
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken(true);

    const endpoint = authPage === 'register' ? '/auth/register' : '/auth/login';
    const payload = authPage === 'register' ? { idToken, role } : { idToken };

    await postTokenToBackend(endpoint, payload);
  } catch (error) {
    setBusyState(false);
    setMessage(mapFirebaseError(error));
  }
};

// No need to manage button disabled state — click handler validates role

if (googleButton) {
  googleButton.addEventListener('click', handleGoogleAuth);
}
