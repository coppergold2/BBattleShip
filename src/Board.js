import React, {useState, useEffect} from 'react';

const Board = ({ className, shipLoc, handleCellClick, hitPos, setShipLoc }) => {
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
      onClick={() => { if (handleCellClick) handleCellClick(i); }}
    ></div>
)));
// Update ship classes when shipLoc changes
useEffect(() => {
  if (shipLoc != null) {
    const newCells = cells.map((cell, i) => {
      let classes = cell.props.className;
      for (let ship in shipLoc) {
        if (shipLoc.hasOwnProperty(ship)) {
          if (shipLoc[ship].includes(i)) {
            classes += ` ${ship}`;
          }
        }
      }
      return React.cloneElement(cell, { className: classes });
    });
    setCells(newCells);
  }
}, [shipLoc]);

// Update 'boom' class when hitPos changes
useEffect(() => {
  if (hitPos != null) {
    const newCells = [...cells];
    const classes = newCells[hitPos].props.className + ' boom';
    newCells[hitPos] = React.cloneElement(newCells[hitPos], { className: classes });
    setCells(newCells);
  }
}, [hitPos]);
  return (
    <div>
      <div className={`board ${className}`}>{cells}</div>
    </div>
  );
};

export default Board;