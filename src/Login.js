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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '80vh',
      textAlign: 'center'
    }}>
      <h2 style={{ color: "yellow", marginBottom: '45px' }}>
        NOTE: Feel free to use any fake email to register, or log in if you already have an account.
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            name="email"
            id="email"
            value={form.email}
            onChange={handleFormChange}
            placeholder="Enter your email"
            style={{ marginBottom: '5px', padding: '5px' }}
            required
          />
        </div>
        {register && (
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              name="username"
              id="username"
              value={form.username}
              onChange={handleFormChange}
              placeholder="Enter your username"
              style={{ marginBottom: '5px', padding: '5px' }}
              required
            />
          </div>
        )}
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            name="password"
            id="password"
            value={form.password}
            onChange={handleFormChange}
            placeholder="Enter your password"
            style={{ marginBottom: '5px', padding: '5px' }}
            required
          />
        </div>
        <button type="submit" style={{ marginBottom: '5px' }}>
          {register ? 'Register' : 'Login'}
        </button>
      </form>
      {register ? (
        <button onClick={handleBackClick}>Back to Login</button>
      ) : (
        <button onClick={handleNewUserClick}>New User</button>
      )}
    </div>
  );
};

export default Login;