import React, { useState, useEffect } from 'react';

const Board = ({ className, shipLoc, handleCellClick, hitPos, missPos, turn, ohitPos, omissPos, destroyShip }) => {
  const handleDrop = (event, i) => {
    // Handle the drop event here
    console.log(`Dropped on cell ${i}`);
  };
  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < 100; i++) {
      cells.push(
        <div
          key={i}
          className="cell"
          onDrop={(event) => handleDrop(event, i)}
          onDragOver={(event) => event.preventDefault()}
        ></div>
      );
    }
    return cells;
  };
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
      // Update classes based on ohitPos
      if (ohitPos !== null && ohitPos === index) {
        classes += ' boom';
      }

      // Update classes based on omissPos
      if (omissPos !== null && omissPos === index) {
        classes += ' miss';
      }
      if (destroyShip != null && destroyShip[1].includes(index)){
        classes += ` ${destroyShip[0]}`
      }
      return React.cloneElement(cell, { className: classes, onClick });
    } );

    setCells(newCells);
  }, [turn, shipLoc, hitPos, missPos, ohitPos, omissPos, destroyShip]);

  return (
    <div>
      <div className={`board ${className}`}>{renderCells()}</div>
    </div>
  );
};

export default Board;