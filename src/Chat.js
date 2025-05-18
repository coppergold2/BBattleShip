import React, { useEffect, useRef } from 'react';

const Chat = ({ messages, input, sendMessage, handleInputChange, multiPlayer }) => {
  const chatMessagesRef = useRef(null);

  const scrollToBottom = () => {
    const container = chatMessagesRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom(); // Always scroll on new message
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-header">Chat</div>
      <div className="chat-messages" ref={chatMessagesRef}>
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
      </div>
      {multiPlayer && (
        <div className="chat-input-container">
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage('message');
              }
            }}
            placeholder="Type here"
            className="chat-input"
          />
          <button onClick={() => sendMessage('message')} className="chat-button">Send</button>
        </div>
      )}
    </div>
  );
};

export default Chat;
