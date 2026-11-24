import { render, screen } from '@testing-library/react';
import Buttons from './Buttons';

const buttonProps = {
  start: false,
  isFlipped: false,
  handleRandomPlacement: jest.fn(),
  handleFlipBoat: jest.fn(),
  handleStartClick: jest.fn(),
};

test('hides the flip control when all ships are placed and none is selected', () => {
  render(<Buttons {...buttonProps} allShipsPlaced activeShip={null} />);

  expect(screen.queryByRole('button', { name: 'Flip to Vertical' })).not.toBeInTheDocument();
});

test('shows the flip control while repositioning a placed ship', () => {
  render(<Buttons {...buttonProps} allShipsPlaced activeShip="destroyer" />);

  expect(screen.getByRole('button', { name: 'Flip to Vertical' })).toBeInTheDocument();
});

test('keeps the flip control available before all ships are placed', () => {
  render(<Buttons {...buttonProps} allShipsPlaced={false} activeShip={null} />);

  expect(screen.getByRole('button', { name: 'Flip to Vertical' })).toBeInTheDocument();
});
