// Login.js
import React from "react";

const Login = ({ handleFormChange, handleLogin, handleRegister, handleNewUserClick, form, register, setRegister }) => {
  const handleBackClick = () => {
    setRegister(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (register) {
      handleRegister(form.username, form.email, form.password);
    } else {
      handleLogin(form.email, form.password);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      textAlign: 'center'
    }}>
      <form onSubmit={handleSubmit}>
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