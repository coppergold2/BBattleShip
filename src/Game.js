import React from 'react';
import Board from './Board';
import ShipOptions from './ShipOption';
import './App.css'
import Buttons from './Buttons'
import Chat from './Chat'
const Game = ({ 
  socket, 
  multiPlayer,
  start, 
  turn, 
  activeShip, 
  pbCellClass, 
  obCellClass, 
  isFlipped,
  placedShips,
  shipLocHover,
  messages,
  input, 
  handleRandomPlacement, 
  handleCellClick, 
  handleShipPlacement, 
  flipBoat, 
  handleHoverOut, 
  handleShipReplacement, 
  handleShipOptionClick, 
  handleShipHover,
  sendMessage,
  handleInputChange}) => {

  return (
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
        {start == false && 
        (<><ShipOptions isFlipped={isFlipped} activeShip={activeShip} placedShips={placedShips} handleShipOptionClick = {handleShipOptionClick} />
        <Buttons start = {start} socket={socket} handleRandomPlacement = {handleRandomPlacement} flipBoat = {flipBoat} isFlipped = {isFlipped}/></>)}
        {start && <Chat messages={messages} input={input} sendMessage={sendMessage} handleInputChange={handleInputChange} multiPlayer = {multiPlayer}/>}
    </>
  );
};

export default Game;