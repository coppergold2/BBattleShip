import React from 'react';


const Board = ({
  className, turn, obCellClass, pbCellClass, activeShip, shipLocHover,
  handleCellClick, handleShipPlacement, handleShipReplacement,
  handleShipHover, handleHoverOut
}) => {

  const cellClassName = () => {
    const classNameArr = new Array(100).fill("");
    if (className === "player-board" && pbCellClass !== null) {
      pbCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName;
          if (turn == null) {
            classNameArr[index] += " grab";
          }
        } else {
          classNameArr[index] = "cell";
        }
        if (element.ohit === true) {
          classNameArr[index] += " boom";
        } else if (element.omiss === true) {
          classNameArr[index] += " miss";
        }
      });
    } else if (className === "opponent-board" && pbCellClass !== null) {
      obCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName;
        } else {
          classNameArr[index] = "cell";
          if (element.unHitShip != null) {
            classNameArr[index] += " " + element.unHitShip + " loser"
          }
        }
        if (element.shipName === null && element.hit === true) {
          classNameArr[index] += " boom";
        } else if (element.miss === true) {
          classNameArr[index] += " miss";
        }
        if (element.shipName === null && element.hit === false && element.miss === false && turn == true) {
          classNameArr[index] += " grab";
        }
      });
    }
    return classNameArr;
  };

  const renderColumnHeaders = () => {
    let headers = [];
    headers.push(<div key="corner" className="corner"></div>); // Add empty corner
    for (let i = 1; i <= 10; i++) {
      headers.push(<div key={`col-${i}`} className="column-header">{i}</div>);
    }
    return headers;
  };

  const renderRows = () => {
    let rows = [];
    const cellClassNames = cellClassName();
    for (let i = 0; i < 10; i++) {
      rows.push(<div key={`row-header-${i}`} className="row-header">{i + 1}</div>);
      for (let j = 0; j < 10; j++) {
        const index = i * 10 + j;
        rows.push(
          <div
            key={index}
            className={`${cellClassNames[index]} ${(turn == null && activeShip != null && className === 'player-board' && shipLocHover != null && shipLocHover[index] != null) ? shipLocHover[index] + ' hover' : ''}`}
            onClick={
              turn && className === 'opponent-board' ? () => handleCellClick(index) :
              turn == null && activeShip != null && className === 'player-board' && shipLocHover != null ? () => { handleShipPlacement(shipLocHover) } :
              turn == null && className === 'player-board' && shipLocHover == null && pbCellClass[index].shipName != null ? () => { handleShipReplacement(pbCellClass[index].shipName) } : null
            }
            onMouseEnter={turn == null && activeShip != null && className === 'player-board' ? () => { handleShipHover(index) } : null}
            onMouseLeave={turn == null && activeShip != null && className === 'player-board' ? () => { handleHoverOut() } : null}
            style={{
              cursor: (activeShip && className === 'player-board' && turn == null) && 'pointer'
            }}
          ></div>
        );
      }
    }
    return rows;
  };

  return (
    <div className="boards">
      <div className={`board ${className}`}>
        {renderColumnHeaders()}
        {renderRows()}
      </div>
    </div>
  );
};

export default Board;