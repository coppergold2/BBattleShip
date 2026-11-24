import { render } from '@testing-library/react';
import ShipOptions from './ShipOption';

test('removes the empty ship-options area after every ship is placed', () => {
  const { container } = render(
    <ShipOptions
      isFlipped={false}
      activeShip={null}
      placedShips={['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer']}
      handleShipOptionClick={jest.fn()}
    />
  );

  expect(container.querySelector('.ship-options')).not.toBeInTheDocument();
});

test('keeps remaining ship options visible while ships are unplaced', () => {
  const { container } = render(
    <ShipOptions
      isFlipped={false}
      activeShip="destroyer"
      placedShips={['carrier', 'battleship', 'cruiser', 'submarine']}
      handleShipOptionClick={jest.fn()}
    />
  );

  expect(container.querySelector('.ship-options')).toBeInTheDocument();
  expect(container.querySelector('.ship-option.destroyer')).toBeInTheDocument();
});
