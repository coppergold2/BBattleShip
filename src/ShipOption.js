import React from 'react';

function ShipOptions({ isFlipped, setActiveShip, activeShip }) {
  const handleDragStart = (e, ship) => {
    setActiveShip(ship);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', null);
  };

  const handleDragEnd = () => {
    setActiveShip(null);
  };

  return (
    <div className={'ship-options'}>
      <div className={`ship-option carrier ${activeShip === 'carrier' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={5} draggable onDragStart={(event) => handleDragStart(event, 'carrier')} onDragEnd={handleDragEnd}></div>
      <div className={'ship-option carrier '} data-length={5} hidden></div>
      <div className={`ship-option battleship ${activeShip === 'battleship' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={4} draggable onDragStart={(event) => handleDragStart(event, 'battleship')} onDragEnd={handleDragEnd}></div>
      <div className={`ship-option cruiser ${activeShip === 'cruiser' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={3} draggable onDragStart={(event) => handleDragStart(event, 'cruiser')} onDragEnd={handleDragEnd}></div>
      <div className={`ship-option submarine ${activeShip === 'submarine' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={3} draggable onDragStart={(event) => handleDragStart(event, 'submarine')} onDragEnd={handleDragEnd}></div>
      <div className={`ship-option destroyer ${activeShip === 'destroyer' ? 'dragging' :''} ${isFlipped ? 'flipped' : ''}`} data-length={2} draggable onDragStart={(event) => handleDragStart(event, 'destroyer')} onDragEnd={handleDragEnd}></div>
    </div>
  );
};

export default ShipOptions;
