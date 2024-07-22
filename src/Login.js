import React from "react";

const Login = ({ handleInputChange, sendMessage, handleNewUserClick, input, register, setRegister }) => {
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
            <input
                type="text"
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={register ? "Enter your username" : "Enter your ID"}
                style={{ marginBottom: '10px', padding: '5px' }}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(register ? 'new' : 'login')}
            />
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