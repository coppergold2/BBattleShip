import React from 'react';

const Board = ({ className, shipLoc}) => {
  const handleDrop = (event, i) => {
    // Handle the drop event here
    console.log(`Dropped on cell ${i}`);
  };
  let cells = Array.from({ length: 100 }, (_, i) => (
    <div
      key={i}
      className="cell"
      onDrop={(event) => handleDrop(event, i)}
      onDragOver={(event) => event.preventDefault()} // Necessary to allow drops
    ></div>
  ));
  if (shipLoc != null){
   cells = cells.map((cell, i) => {
    let classes = "cell";
    for (let ship in shipLoc) {
      if (shipLoc.hasOwnProperty(ship)) {
        if (shipLoc[ship].includes(i)) {
          classes += ` ${ship}`;
        }
      }
    }
  
    return React.cloneElement(cell, { className: classes });
  });  
} 

  return (
    <div>
      <div className={`board ${className}`}>{cells}</div>
    </div>
  );
};

export default Board;