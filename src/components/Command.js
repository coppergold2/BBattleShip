import React from "react";

const Command = ({ handleInputChange, input, sendMessage }) => {

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage('command');
    }
  };

  return (
    <div className="command-section">
      <input className="command-input-box"
        type="text"
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Enter command"
      />
      <button onClick={() => sendMessage('command')}>Send</button>
    </div>
  );
};

export default Command;