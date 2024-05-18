import React from 'react';

function ShipOptions({ isFlipped, activeShip, placedShips, handleShipOptionClick }) {
  return (
    <div className={'ship-options'}>
      {!placedShips.includes('carrier') && (<div className={`ship-option carrier ${activeShip === 'carrier' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={5} onClick={() => handleShipOptionClick('carrier')}></div>)}
      {!placedShips.includes('battleship') && (<div className={`ship-option battleship ${activeShip === 'battleship' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={4} onClick={() => handleShipOptionClick('battleship')}></div>)}
      {!placedShips.includes('cruiser') && (<div className={`ship-option cruiser ${activeShip === 'cruiser' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={3} onClick={() => handleShipOptionClick('cruiser')}></div>)}
      {!placedShips.includes('submarine') && (<div className={`ship-option submarine ${activeShip === 'submarine' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={3} onClick={() => handleShipOptionClick('submarine')}></div>)}
      {!placedShips.includes('destroyer') && (<div className={`ship-option destroyer ${activeShip === 'destroyer' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={2} onClick={() => handleShipOptionClick('destroyer')}></div>)}
    </div>
  );
};

export default ShipOptions;
