import React from 'react';


const Board = ({
  className, turn, obCellClass, pbCellClass, activeShip, shipLocHover, hoveredCell,
  handleCellClick, handleShipPlacement, handleShipReplacement,
  handleShipHover, handleShipHoverOut, handleCellHover, handleCellHoverOut
}) => {

  const getCellsClassName = () => {
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
        console.log(element.possHitLocation)
        if (turn != null && element.ohit === false && element.omiss === false && element.possHitLocation === true){
          classNameArr[index] += " possHit"
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
        if (element.hit === true) {
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
    const cellClassNames = getCellsClassName();
    for (let i = 0; i < 10; i++) {
      rows.push(<div key={`row-header-${i}`} className="row-header">{i + 1}</div>);
      for (let j = 0; j < 10; j++) {
        const index = i * 10 + j;
        rows.push(
          <div
            key={index}
            className={`${cellClassNames[index]} ${(turn == null && activeShip != null && className === 'player-board' && shipLocHover != null && shipLocHover[index] != null) ? shipLocHover[index] + ' hover' : ''} ${(className === 'opponent-board' && turn && hoveredCell === index) ? 'hittable' : ''}`}            
            onClick={
              turn && className === 'opponent-board' ? () => {handleCellClick(index); handleCellHoverOut()} :
              turn == null  && activeShip != null && className === 'player-board' && shipLocHover != null ? () => { handleShipPlacement(shipLocHover) } :
              turn == null && className === 'player-board' && shipLocHover == null && pbCellClass[index].shipName != null ? () => { handleShipReplacement(pbCellClass[index].shipName) } : null
            }
            onMouseEnter={() => {
              if (className === 'opponent-board' && (cellClassNames[index] == "cell grab" || cellClassNames[index] == "cell")) {
                handleCellHover(index);
              } else if (turn == null && activeShip != null && className === 'player-board') {
                handleShipHover(index)
              }
            }}
            onMouseLeave={() => {
              if (turn == true && className === 'opponent-board' && cellClassNames[index] == "cell grab") {
                handleCellHoverOut();
              } else if (turn == null && activeShip != null && className === 'player-board') {
                handleShipHoverOut();
              }
            }}    
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