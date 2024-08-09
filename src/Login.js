import React from "react";

const Login = ({ handleFormChange, sendMessage, handleNewUserClick, form, register, setRegister }) => {
    const handleBackClick = () => {
        setRegister(false);
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
                    />
                </div>
            )}
            <div style={{ marginBottom: '10px' }}>
                <label htmlFor="email">Email:</label>
                <input
                    type="text"
                    name="email"
                    id="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="Enter your email"
                    style={{ marginBottom: '5px', padding: '5px' }}
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
                />
            </div>
            {!register && (
                <button onClick={() => sendMessage('login')} style={{ marginBottom: '5px' }}>Login</button>
            )}
            {register ? (
                <>
                    <button onClick={() => sendMessage('new')} style={{ marginBottom: '5px' }}>Submit</button>
                    <button onClick={handleBackClick}>Back to Login</button>
                </>
            ) : (
                <button onClick={handleNewUserClick}>New User</button>
            )}
        </div>
    );
};

export default Login;