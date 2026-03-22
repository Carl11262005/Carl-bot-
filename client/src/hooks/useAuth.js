import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';

export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    // Handle the result when the user returns from Google's sign-in page
    getRedirectResult(auth).catch((e) => console.error('Redirect sign-in failed:', e));

    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  async function signInWithGoogle() {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e) {
      console.error('Sign-in failed:', e);
    }
  }

  async function signOutUser() {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
  }

  return { user, signInWithGoogle, signOut: signOutUser };
}
