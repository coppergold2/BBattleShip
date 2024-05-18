import React from 'react';

const Board = ({ className, turn, obCellClass, pbCellClass, activeShip, shipLocHover, handleCellClick, handleShipPlacement, handleShipReplacement, handleShipHover, handleHoverOut }) => {

  const cellClassName = () => {
    const classNameArr = new Array(100).fill("");
    if (className === "player-board" && pbCellClass !== null) {
      pbCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName; // Assuming you meant to set it to the element, otherwise adjust as needed
          if (turn == null) {
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
          className={`${cellClassNames[i]} ${(turn == null && activeShip != null && className === 'player-board' && shipLocHover != null && shipLocHover[i] != null) ? shipLocHover[i] + ' hover' : ''}`}
          onClick={turn && className === 'opponent-board' ? () => handleCellClick(i) :
            turn == null && activeShip != null && className === 'player-board' && shipLocHover != null ? () => { handleShipPlacement(shipLocHover) } :
              turn == null && className == 'player-board' && shipLocHover == null && pbCellClass[i].shipName != null ? () => { handleShipReplacement(pbCellClass[i].shipName) } : null}
          onMouseEnter={turn == null && activeShip != null && className === 'player-board' ? () => { handleShipHover(i) } : null}
          onMouseLeave={turn == null && activeShip != null && className === 'player-board' ? () => { handleHoverOut() } : null}
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