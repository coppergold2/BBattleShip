import React from 'react';

const Board = ({ className }) => {
  const handleDrop = (event, i) => {
    // Handle the drop event here
    console.log(`Dropped on cell ${i}`);
  };

  const cells = Array.from({ length: 100 }, (_, i) => (
    <div
      key={i}
      className="cell"
      onDrop={(event) => handleDrop(event, i)}
      onDragOver={(event) => event.preventDefault()} // Necessary to allow drops
    ></div>
  ));

  return (
    <div>
      <div className={`board ${className}`}>{cells}</div>
    </div>
  );
};

export default Board;