import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Handle the result when the user returns from Google's sign-in page
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) setUser(result.user);
      })
      .catch((e) => {
        console.error('Redirect sign-in failed:', e);
        setAuthError(e.code + ': ' + e.message);
      });

    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  async function signInWithGoogle() {
    setAuthError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      console.error('Sign-in failed:', e);
      setAuthError(e.code + ': ' + e.message);
    }
  }

  async function signOutUser() {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
  }

  return { user, authError, signInWithGoogle, signOut: signOutUser };
}
