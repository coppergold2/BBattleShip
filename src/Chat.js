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
      <div className="chat-header">Chat</div>
      <div className="chat-messages">
        {messages.map((msg, index) => {
          let owner = '';
          if (msg['player'] != null) {
            owner = 'player';
          } else if (msg['opponent'] != null) {
            owner = 'opponent';
          }
          return (
            <div key={index} className={`chat-message chat-message-${owner}`}>
              {msg[owner]}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {multiPlayer && (
        <div className="chat-input-container">
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
            placeholder="Type here"
            className="chat-input"
          />
          <button onClick={sendMessage} className="chat-button">Send</button>
        </div>
      )}
    </div>
  );
};

export default Chat;