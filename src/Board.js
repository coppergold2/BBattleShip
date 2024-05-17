import React, { useState, useEffect } from 'react';

const Board = ({ className, handleCellClick, turn, obCellClass, pbCellClass, activeShip, isFlipped, handleShipPlacement, handleShipReplacement }) => {
  const [shipLocHover, setShipLocHover] = useState(null);

  const ships = {
    'carrier': 5, //length of ship 
    'battleship': 4,
    'cruiser': 3,
    'submarine': 3,
    'destroyer': 2
  };

  const handleShipHover = (location) => {
    const row = Math.floor(location / 10);
    const col = location % 10;
    const shipSize = ships[activeShip];
    const isValidLocation = (loc) => loc >= 0 && loc < 100;
    const isLocationOccupied = (loc) => pbCellClass[loc].shipName != null;
    let result = {}
    if (isFlipped) {
      if (row + shipSize <= 10) {
        for (let i = 0; i < shipSize; i++) {
          const loc = row * 10 + col + i * 10;
          if (!isValidLocation(loc) || isLocationOccupied(loc)) {
            result = null;
            break;
          }
          result[loc] = activeShip;
        }
      }
    }
    else {
      if (col + shipSize <= 10) {
        for (let i = 0; i < shipSize; i++) {
          const loc = row * 10 + col + i;
          if (!isValidLocation(loc) || isLocationOccupied(loc)) {
            result = null;
            break;
          }
          result[loc] = activeShip;
        }
      }
    }
    if (result != null && Object.keys(result).length != 0) {
      setShipLocHover(result);
    }

  }

  const cellClassName = () => {
    const classNameArr = new Array(100).fill("");
    if (className === "player-board" && pbCellClass !== null) {
      pbCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName; // Assuming you meant to set it to the element, otherwise adjust as needed
          if(turn == null){
            classNameArr[index] += " grab";
          }
        } else {
          classNameArr[index] = "cell";
        }
        if (element.ohit === true) {
          classNameArr[index] += " boom";
        }
        else if (element.omiss === true) {
          classNameArr[index] += " miss";
        }
      });
    }
    else if (className === "opponent-board" && pbCellClass !== null) {
      obCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName; // Assuming you meant to set it to the element, otherwise adjust as needed
        } else {
          classNameArr[index] = "cell";
        }
        if (element.shipName === null && element.hit === true) {
          classNameArr[index] += " boom";
        }
        else if (element.miss === true) {
          classNameArr[index] += " miss"
        }
        if (element.shipName == null && element.hit == false && element.miss == false) {
          classNameArr[index] += " grab"
        }
      })
    }
    return classNameArr;
  };

  const renderCells = () => {
    const cells = [];
    const cellClassNames = cellClassName()
    for (let i = 0; i < 100; i++) {
      cells.push(
        <div
          key={i}
          className={`${cellClassNames[i]} ${(turn == null && activeShip != null && className === 'player-board' && shipLocHover != null && shipLocHover[i] != null) ? shipLocHover[i] : ''}`}
          onClick={turn && className === 'opponent-board' ? () => handleCellClick(i) :
            turn == null && activeShip != null && className === 'player-board' && shipLocHover != null ? () => { handleShipPlacement(shipLocHover); setShipLocHover(null) } :
              turn == null && className == 'player-board' && shipLocHover == null && pbCellClass[i].shipName != null ? () => { handleShipReplacement(pbCellClass[i].shipName) } : null}
          onMouseEnter={turn == null && activeShip != null && className === 'player-board' ? () => { handleShipHover(i) } : null}
          onMouseLeave={turn == null && activeShip != null && className === 'player-board' ? () => { setShipLocHover(null) } : null}
          style={{
            cursor: (activeShip && className === 'player-board' && turn == null) && 'pointer'
          }}
        ></div>
      );
    }
    return cells;
  };

  return (
    <div className={`board ${className}`}>{renderCells()}</div>
  );
};

export default Board;