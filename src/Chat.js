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
    <div className="chat-container">
      Chat
      <div style={{ border: '1px solid #FFFFFF', height: '250px', overflowY: 'scroll', padding: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {multiPlayer && (
        <div>
          <textarea
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // Prevents the addition of a new line when pressing 'Enter'
                sendMessage();
              }
            }}
            className="chat-input"
          />
          <button onClick={sendMessage} className="chat-button">Send</button>
        </div>
      )}
    </div>
  );
};

export default Chat;