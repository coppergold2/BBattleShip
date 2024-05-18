import React from 'react';
import Board from './Board';
import ShipOptions from './ShipOption';
import './App.css'
import Buttons from './Buttons'
const Game = ({ 
  socket, 
  start, 
  turn, 
  activeShip, 
  pbCellClass, 
  obCellClass, 
  isFlipped,
  placedShips,
  shipLocHover, 
  handleRandomPlacement, 
  handleCellClick, 
  handleShipPlacement, 
  flipBoat, 
  handleHoverOut, 
  handleShipReplacement, 
  handleShipOptionClick, 
  handleShipHover}) => {

  return (
    <>
      <>
        <div className='boards'>
          <Board className="player-board" 
          turn = {turn} 
          pbCellClass={pbCellClass} 
          activeShip={activeShip} 
          isFlipped={isFlipped} 
          shipLocHover={shipLocHover}
          handleShipPlacement={handleShipPlacement} 
          handleShipReplacement = {handleShipReplacement}
          handleHoverOut = {handleHoverOut}
          handleShipHover = {handleShipHover}/>
          {start && <Board className="opponent-board" handleCellClick={handleCellClick} turn={turn} obCellClass={obCellClass} />}
        </div>
        <ShipOptions isFlipped={isFlipped} activeShip={activeShip} placedShips={placedShips} handleShipOptionClick = {handleShipOptionClick} />
        <Buttons start = {start} socket={socket} handleRandomPlacement = {handleRandomPlacement} flipBoat = {flipBoat} isFlipped = {isFlipped}/>
      </>
    </>
  );
};

export default Game;