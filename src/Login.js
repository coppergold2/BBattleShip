import React from "react";

const Login = ({ handleInputChange, handleLoginClick, handleNewUserClick, input }) => {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            textAlign: 'center'
        }}>
            <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Enter your ID"
                style={{ marginBottom: '10px', padding: '5px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleLoginClick()}
            />
            <button onClick={handleLoginClick} style={{ marginBottom: '5px' }}>Login</button>
            <button onClick={handleNewUserClick}>New User</button>
        </div>
    )
}

export default Login;