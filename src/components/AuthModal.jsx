import React, { useState } from 'react';
import { api } from '../api.js';

export default function AuthModal({ onClose, onGuest, onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const r = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password, name);
      onAuth(r.token, r.user);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal auth" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <header>
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <button type="button" onClick={onClose}>✕</button>
        </header>
        {err && <p className="error">{err}</p>}
        {mode === 'register' && (
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        )}
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="switch">
          {mode === 'login'
            ? <>No account? <a onClick={() => setMode('register')}>Register</a></>
            : <>Have an account? <a onClick={() => setMode('login')}>Sign in</a></>}
        </p>
        <button type="button" className="ghost" onClick={onGuest}>Continue as guest</button>
      </form>
    </div>
  );
}
