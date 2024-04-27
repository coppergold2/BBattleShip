import React from 'react';

function ShipOptions({ isFlipped }) {
  return (
    <div className={`ship-options ${isFlipped ? 'flipped' : ''}`}>
      <div className="ship-option carrier" data-length={5}></div>
      <div className="ship-option battleship" data-length={4}></div>
      <div className="ship-option cruiser" data-length={3}></div>
      <div className="ship-option submarine" data-length={3}></div>
      <div className="ship-option destroyer" data-length={2}></div>
    </div>
  );
}

export default ShipOptions;
