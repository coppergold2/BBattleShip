import React, { useEffect, useRef } from 'react';
const Chat = ({ messages, input, sendMessage, handleInputChange, multiPlayer }) => {
    const messagesEndRef = useRef(null);
    // Function to scroll to the bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => {
        scrollToBottom();
      }, [messages]);
    return (
        <div>
            Chat
            <div style={{ border: '1px solid black', height: '300px', overflowY: 'scroll' }}>
                {messages.map((msg, index) => (
                    <div key={index}>{msg}</div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
            {multiPlayer && (
                <div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                sendMessage();
                            }
                        }}
                    />
                    <button onClick={sendMessage}>Send</button>
                </div>
            )}
        </div>
    );
};

export default Chat;