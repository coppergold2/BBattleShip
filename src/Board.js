import React, {useState, useEffect} from 'react';

const Board = ({ className, shipLoc, handleCellClick, hitPos, missPos, turn }) => {
  const handleDrop = (event, i) => {
    // Handle the drop event here
    console.log(`Dropped on cell ${i}`);
  };
  const [cells, setCells] = useState(Array.from({ length: 100 }, (_, i) => (
    <div
      key={i}
      className="cell"
      onDrop={(event) => handleDrop(event, i)}
      onDragOver={(event) => event.preventDefault()} // Necessary to allow drops
    ></div>
)));
useEffect(() => {
  const newCells = cells.map((cell, index) => {
    let classes = cell.props.className;
    let onClick = null;

    // Update onClick based on turn
    if (turn) {
      onClick = () => handleCellClick && handleCellClick(index);
    }

    // Update classes based on shipLoc
    if (shipLoc) {
      Object.entries(shipLoc).forEach(([ship, locations]) => {
        if (locations.includes(index)) {
          classes += ` ${ship}`;
        }
      });
    }

    // Update classes based on hitPos
    if (hitPos !== null && hitPos === index) {
      classes += ' boom';
    }

    // Update classes based on missPos
    if (missPos !== null && missPos === index) {
      classes += ' miss';
    }

    return React.cloneElement(cell, { className: classes, onClick });
  });

  setCells(newCells);
}, [turn, shipLoc, hitPos, missPos, handleCellClick]);





  return (
    <div>
      <div className={`board ${className}`}>{cells}</div>
    </div>
  );
};

export default Board;