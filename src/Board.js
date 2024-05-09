import React, { useState, useEffect } from 'react';

const Board = ({ className, handleCellClick, turn, obCellClass, pbCellClass }) => {
  const handleDrop = (event, i) => {
    // Handle the drop event here
    console.log(`Dropped on cell ${i}`);
  };
 
  const cellClassName = () => {
    const classNameArr = new Array(100).fill("");
    if (className === "player-board" && pbCellClass !== null) {
      pbCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName; // Assuming you meant to set it to the element, otherwise adjust as needed
        } else {
          classNameArr[index] = "cell";
        }
        if (element.ohit === true){
          classNameArr[index] += " boom";
        }
        else if (element.omiss === true){
          classNameArr[index] += " miss";
        }
      });
    }
    else if(className === "opponent-board" && pbCellClass !== null){
      obCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName; // Assuming you meant to set it to the element, otherwise adjust as needed
        } else {
          classNameArr[index] = "cell";
        }
        if (element.shipName === null && element.hit === true){      
          classNameArr[index] += " boom";          
        }
        else if(element.miss === true){
          classNameArr[index] += " miss"     // figure out how this work.
        }
      })
    }
    return classNameArr;
  }; 
  
  // const updateClassName = () => {
  //   const cellClassName = [];
  //   for (let i = 0; i < 100; i++){
  //     if (shipLoc != null) {
  //             Object.entries(shipLoc).forEach(([ship, locations]) => {
  //               if (locations.includes(i)) { // use classname to check for player and opponent board.
  //                 cellClassName[i] = ` ${ship}`;
  //               }
  //             });
  //       }
  //     if ()
  //   }
  // }
  const renderCells = () => {
    const cells = [];
    const cellClassNames = cellClassName()
    for (let i = 0; i < 100; i++) {
      cells.push(
        <div
          key={i}
          className= {cellClassNames[i]}
          onDrop={(event) => handleDrop(event, i)}
          onDragOver={(event) => event.preventDefault()}
          onClick={turn && className === 'opponent-board' ? () => handleCellClick(i) : null}
        ></div>
      );
    }
    return cells;
  };
  // useEffect(() => {
  //   const newCells = cells.map((cell, index) => {
  //     let classes = cell.props.className;
  //     let onClick = null;

  //     // Update onClick based on turn
  //     if (turn) {
  //       onClick = () => handleCellClick && handleCellClick(index);
  //     }

  //     // Update classes based on shipLoc
  //     if (shipLoc) {
  //       Object.entries(shipLoc).forEach(([ship, locations]) => {
  //         if (locations.includes(index)) {
  //           classes += ` ${ship}`;
  //         }
  //       });
  //     }
  //     // Update classes based on hitPos
  //     if (hitPos !== null && hitPos === index) {
  //       classes += ' boom';
  //     }

  //     // Update classes based on missPos
  //     if (missPos !== null && missPos === index) {
  //       classes += ' miss';
  //     }
  //     // Update classes based on ohitPos
  //     if (ohitPos !== null && ohitPos === index) {
  //       classes += ' boom';
  //     }

  //     // Update classes based on omissPos
  //     if (omissPos !== null && omissPos === index) {
  //       classes += ' miss';
  //     }
  //     if (destroyShip != null && destroyShip[1].includes(index)){
  //       classes += ` ${destroyShip[0]}`
  //     }
  //     return React.cloneElement(cell, { className: classes, onClick });
  //   } );

  //   setCells(newCells);
  // }, [turn, shipLoc, hitPos, missPos, ohitPos, omissPos, destroyShip]);

  return (
    <div>
      <div className={`board ${className}`}>{renderCells()}</div>
    </div>
  );
};

export default Board;