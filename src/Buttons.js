import React from "react"

const Buttons = ({ start, socket, handleRandomPlacement, flipBoat, isFlipped }) => {
    return (
        !start && (
            <div className='button-container'>
                <button className='flip-button' onClick={flipBoat}>
                    {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
                </button>
                <button className='random-button' onClick={() => { handleRandomPlacement() }}>Place Randomly</button>
                {/* <button className='random-rest-button' onClick= */}
                <button className='start-button' onClick={() => { socket.emit("start"); }}>Start Game</button>
            </div>
        )
    )
}

export default Buttons