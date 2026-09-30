// Login.js
import React from "react";

const Login = ({ handleFormChange, handleLogin, handleRegister, handleNewUserClick, form, register, handleBackClick }) => {


  const handleSubmit = (e) => {
    e.preventDefault();
    if (register) {
      if (form.username.trim() && form.email.trim()) {
        handleRegister(form.username.trim(), form.email.trim(), form.password);
      }
    } else {
      if (form.email.trim()) {
        handleLogin(form.email.trim(), form.password);
      }
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2 className="auth-form-title">{register ? 'Create account' : 'Welcome back'}</h2>
        <p className="auth-form-subtitle">{register ? 'Join the fleet' : 'Sign in to continue'}</p>
        <p className="auth-note">
          <strong>NOTE:</strong> Feel free to use any fake email to register, or log in if you already have an account.
        </p>

        <div className="auth-fields">
        {register && (
            <label className="auth-field" htmlFor="username">
              <span>Username</span>
            <input
              type="text"
              name="username"
              id="username"
              value={form.username}
              onChange={handleFormChange}
                placeholder="Choose a username"
                autoComplete="username"
              required
            />
            </label>
        )}
          <label className="auth-field" htmlFor="email">
            <span>Email address</span>
            <input
              type="email"
              name="email"
              id="email"
              value={form.email}
              onChange={handleFormChange}
              placeholder="name@example.com"
              autoComplete="email"
              required
            />
          </label>
          <label className="auth-field" htmlFor="password">
            <span>Password</span>
          <input
            type="password"
            name="password"
            id="password"
            value={form.password}
            onChange={handleFormChange}
              placeholder="Enter your password"
              autoComplete={register ? 'new-password' : 'current-password'}
            required
          />
          </label>
        </div>
        <button className="auth-submit" type="submit">
          {register ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <div className="auth-switch">
        <span>{register ? 'Already have an account?' : 'New to Battleship?'}</span>
        {register ? (
          <button className="auth-secondary" type="button" onClick={handleBackClick}>Sign in</button>
        ) : (
          <button className="auth-secondary" type="button" onClick={handleNewUserClick}>Create account</button>
        )}
      </div>
    </main>
  );
};

export default Login;