import React from 'react';

function ShipOption({ length }) {
  return (
    <div className="ship-option" data-length={length}></div>
  );
}

function ShipOptions() {
  return (
    <div className="ship-options">
      <ShipOption length={5} />
      <ShipOption length={4} />
      <ShipOption length={3} />
      <ShipOption length={3} />
      <ShipOption length={2} />
    </div>
  );
}

export default ShipOptions;
