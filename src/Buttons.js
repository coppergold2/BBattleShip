import React from "react"

const Buttons = () => {
    return(
    <div className='button-container'>
          <button className='flip-button' onClick={flipBoat}>
            {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
          </button>
          <button className='random-button' onClick={() => { handleRandomPlacement(); setActiveShip(null) }}>Place Randomly</button>
          <button className='start-button' onClick={() => { socket.emit("start"); }}>Start Game</button>
    </div>
    )
}

export default Buttons