import React from "react"

const Buttons = ({ start, isFlipped, handleRandomPlacement, handleFlipBoat, handleStartClick }) => {
    return (
        !start && (
            <div className='button-container'>
                 <button className='random-button' onClick={() => { handleRandomPlacement() }}>Place Randomly</button>
                 <button className='flip-button' onClick={handleFlipBoat}>
                    {isFlipped ? 'Flip to Horizontal' : 'Flip to Vertical'}
                </button>
               
                {/* <button className='random-rest-button' onClick= */}
                <button className='start-button' onClick={() => { handleStartClick() }}>Start Game</button>
            </div>
        )
    )
}

export default Buttons