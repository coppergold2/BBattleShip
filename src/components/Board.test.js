import { fireEvent, render } from '@testing-library/react';
import Board from './Board';

const emptyCells = () => Array.from({ length: 100 }, () => ({
  shipName: null,
  hit: false,
  miss: false,
  destroy: false,
  ohit: false,
  omiss: false,
}));

test('allows placing an active ship on an empty player-board cell', () => {
  const handleShipPlacement = jest.fn();
  const { container } = render(
    <Board
      className="player-board"
      turn={null}
      pbCellClass={emptyCells()}
      obCellClass={emptyCells()}
      activeShip="destroyer"
      shipLocHover={new Set([10, 11])}
      handleShipPlacement={handleShipPlacement}
      handleShipHover={jest.fn()}
      handleShipHoverOut={jest.fn()}
      handleShipReplacement={jest.fn()}
    />
  );

  fireEvent.click(container.querySelectorAll('.player-board .cell')[10]);

  expect(handleShipPlacement).toHaveBeenCalledWith(10);
});

test('shows non-blocking feedback and prevents placement when the preview is invalid', () => {
  const handleShipPlacement = jest.fn();
  const { container, getByRole } = render(
    <Board
      className="player-board"
      turn={null}
      pbCellClass={emptyCells()}
      obCellClass={emptyCells()}
      activeShip="destroyer"
      shipLocHover={new Set([10])}
      shipPlacementValid={false}
      handleShipPlacement={handleShipPlacement}
      handleShipHover={jest.fn()}
      handleShipHoverOut={jest.fn()}
      handleShipReplacement={jest.fn()}
    />
  );
  const invalidCell = container.querySelectorAll('.player-board .cell')[10];

  expect(invalidCell).toHaveClass('invalid-placement');
  expect(invalidCell).toHaveStyle({ cursor: 'not-allowed' });
  expect(invalidCell).toHaveAttribute('title', 'Cannot place ship here');
  expect(getByRole('status')).toHaveTextContent('This ship cannot be placed here.');

  fireEvent.click(invalidCell);
  expect(handleShipPlacement).not.toHaveBeenCalled();
});

test('shows server placement rejections as non-blocking status feedback', () => {
  const { getByRole, queryByRole } = render(
    <Board
      className="player-board"
      turn={null}
      pbCellClass={emptyCells()}
      obCellClass={emptyCells()}
      activeShip="battleship"
      shipPlacementError="This ship cannot be placed here."
    />
  );

  expect(getByRole('status')).toHaveTextContent('This ship cannot be placed here.');
  expect(queryByRole('alert')).not.toBeInTheDocument();
});

test('allows selecting an already placed ship for replacement', () => {
  const cells = emptyCells();
  cells[10].shipName = 'destroyer';
  const handleShipReplacement = jest.fn();
  const { container } = render(
    <Board
      className="player-board"
      turn={null}
      pbCellClass={cells}
      obCellClass={emptyCells()}
      activeShip={null}
      handleShipReplacement={handleShipReplacement}
    />
  );

  fireEvent.click(container.querySelectorAll('.player-board .cell')[10]);

  expect(handleShipReplacement).toHaveBeenCalledWith('destroyer', 10);
});

test('allows attacks only on opponent cells during the player turn', () => {
  const handleCellClick = jest.fn();
  const { container, rerender } = render(
    <Board
      className="opponent-board"
      turn={true}
      pbCellClass={emptyCells()}
      obCellClass={emptyCells()}
      stats={{ numHits: 1, numMisses: 2, onumHits: 3, onumMisses: 4 }}
      handleCellClick={handleCellClick}
      handleCellHoverOut={jest.fn()}
      handleCellHover={jest.fn()}
    />
  );
  const targetCell = container.querySelectorAll('.opponent-board .cell')[5];

  fireEvent.click(targetCell);
  expect(handleCellClick).toHaveBeenCalledWith(5);

  rerender(
    <Board
      className="opponent-board"
      turn={false}
      pbCellClass={emptyCells()}
      obCellClass={emptyCells()}
      stats={{ numHits: 1, numMisses: 2, onumHits: 3, onumMisses: 4 }}
      handleCellClick={handleCellClick}
      handleCellHoverOut={jest.fn()}
      handleCellHover={jest.fn()}
    />
  );

  fireEvent.click(container.querySelectorAll('.opponent-board .cell')[6]);
  expect(handleCellClick).toHaveBeenCalledTimes(1);
});
