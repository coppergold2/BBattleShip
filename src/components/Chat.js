import React, { useEffect, useRef } from 'react';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

const Chat = ({ messages, input, sendMessage, handleInputChange, multiPlayer, userName }) => {
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
          const key = Object.keys(msg).find((field) => field !== 'sentAt');
          const value = msg[key];
          const owner = key === 'admin' ? 'admin' : msg[userName] != null ? 'player' : 'opponent';
          const sentAt = msg.sentAt && new Date(msg.sentAt);
          const formattedTime = sentAt && !Number.isNaN(sentAt.getTime())
            ? timeFormatter.format(sentAt)
            : null;

          return (
            <div key={index} className={`chat-message chat-message-${owner}`}>
              <strong>{key === 'admin' ? 'Admin' : key}:</strong>{' '}
              <span className="chat-message-content">{value}</span>
              {formattedTime && (
                <time className="chat-message-time" dateTime={msg.sentAt}>
                  {formattedTime}
                </time>
              )}
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
