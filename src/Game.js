import React from 'react';
import Board from './Board';
import ShipOptions from './ShipOption';
import './App.css'
import Buttons from './Buttons'
import Chat from './Chat'
import Command from './Command'
const Game = ({
  userName,
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
  hoveredCell,
  stats,
  handleRandomPlacement,
  handleCellClick,
  handleShipPlacement,
  handleFlipBoat,
  handleShipHoverOut,
  handleShipReplacement,
  handleShipOptionClick,
  handleShipHover,
  sendMessage,
  handleInputChange,
  handleCellHover,
  handleCellHoverOut,
  handleHomeClick }) => {

  return (
    <>
      <button className="home-button" onClick={handleHomeClick}>
        Home
      </button>
      <div className= "game-container">
        <div className={start == false ? 'boards_before' : 'boards'}>
          <Board className="player-board"
            turn={turn}
            pbCellClass={pbCellClass}
            activeShip={activeShip}
            isFlipped={isFlipped}
            shipLocHover={shipLocHover}
            handleShipPlacement={handleShipPlacement}
            handleShipReplacement={handleShipReplacement}
            handleShipHoverOut={handleShipHoverOut}
            handleShipHover={handleShipHover}
            stats = {stats} />
          {start && <Board className="opponent-board" handleCellClick={handleCellClick} turn={turn} obCellClass={obCellClass} hoveredCell={hoveredCell} handleCellHover={handleCellHover} handleCellHoverOut={handleCellHoverOut} stats = {stats}/>}
        </div>
        {start == false && <Command handleInputChange = {handleInputChange} input = {input} sendMessage = {sendMessage}/>}  
        {start && <Chat messages={messages} input={input} sendMessage={sendMessage} handleInputChange={handleInputChange} multiPlayer={multiPlayer} userName = {userName} />}
      </div>
      {start == false &&
        (<><ShipOptions isFlipped={isFlipped} activeShip={activeShip} placedShips={placedShips} handleShipOptionClick={handleShipOptionClick} />
          <Buttons start={start} socket={socket} handleRandomPlacement={handleRandomPlacement} handleFlipBoat={handleFlipBoat} isFlipped={isFlipped} /></>)}
    </>
  );
};

export default Game;