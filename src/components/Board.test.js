import { createEvent, fireEvent, render } from '@testing-library/react';
import Board from './Board';

const firePointerClick = (element, pointerType) => {
  const event = createEvent.click(element, { detail: 1 });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  fireEvent(element, event);
};

const emptyCells = () => Array.from({ length: 100 }, () => ({
  shipName: null,
  hit: false,
  miss: false,
  destroy: false,
  ohit: false,
  omiss: false,
}));

test('places a ship immediately when clicked with a mouse', () => {
  const handleShipPlacement = jest.fn();
  const { container } = render(
    <Board
      className="player-board"
      turn={null}
      pbCellClass={emptyCells()}
      obCellClass={emptyCells()}
      activeShip="destroyer"
      shipLocHover={new Set([10, 11])}
      shipPlacementValid={true}
      handleShipPlacement={handleShipPlacement}
      handleShipHover={jest.fn()}
      handleShipHoverOut={jest.fn()}
      handleShipReplacement={jest.fn()}
    />
  );

  fireEvent.click(container.querySelectorAll('.player-board .cell')[10]);

  expect(handleShipPlacement).toHaveBeenCalledWith(10);
});

test('requires a second tap on the same cell to place a ship on touch input', () => {
  const handleShipPlacement = jest.fn();
  const { container, getByRole } = render(
    <Board
      className="player-board"
      turn={null}
      pbCellClass={emptyCells()}
      obCellClass={emptyCells()}
      activeShip="destroyer"
      shipLocHover={new Set([10, 11])}
      shipPlacementValid={true}
      handleShipPlacement={handleShipPlacement}
      handleShipHover={jest.fn()}
      handleShipHoverOut={jest.fn()}
      handleShipReplacement={jest.fn()}
    />
  );
  const targetCell = container.querySelectorAll('.player-board .cell')[10];

  firePointerClick(targetCell, 'touch');
  expect(handleShipPlacement).not.toHaveBeenCalled();
  expect(targetCell).toHaveClass('destroyer', 'hover');
  expect(getByRole('status')).toHaveTextContent('Tap the same cell again to place.');

  firePointerClick(targetCell, 'touch');
  expect(handleShipPlacement).toHaveBeenCalledWith(10);
});

test('does not place a ship from an invalid touch draft', () => {
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

  firePointerClick(invalidCell, 'touch');
  firePointerClick(invalidCell, 'touch');
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

test('attacks immediately when clicked with a mouse and prevents attacks outside the player turn', () => {
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

test('highlights a hovered opponent cell as an attack target', () => {
  const handleCellHover = jest.fn();
  const boardProps = {
    className: 'opponent-board',
    turn: true,
    pbCellClass: emptyCells(),
    obCellClass: emptyCells(),
    stats: { numHits: 1, numMisses: 2, onumHits: 3, onumMisses: 4 },
    handleCellClick: jest.fn(),
    handleCellHoverOut: jest.fn(),
    handleCellHover,
  };
  const { container, rerender } = render(
    <Board
      {...boardProps}
      hoveredCell={null}
    />
  );
  const targetCell = container.querySelectorAll('.opponent-board .cell')[5];

  fireEvent.mouseEnter(targetCell);
  expect(handleCellHover).toHaveBeenCalledWith(5);

  rerender(<Board {...boardProps} hoveredCell={5} />);

  expect(targetCell).toHaveClass('hittable');
});

test('shows unavailable attack feedback on touch, but not on mouse hover', () => {
  const opponentCells = emptyCells();
  opponentCells[5].miss = true;
  const handleCellClick = jest.fn();
  const handleCellHover = jest.fn();
  const boardProps = {
    className: 'opponent-board',
    turn: true,
    pbCellClass: emptyCells(),
    obCellClass: opponentCells,
    stats: { numHits: 1, numMisses: 2, onumHits: 3, onumMisses: 4 },
    handleCellClick,
    handleCellHoverOut: jest.fn(),
    handleCellHover,
  };
  const { container, getByRole, queryByRole, rerender } = render(
    <Board {...boardProps} hoveredCell={null} />
  );
  const targetCell = container.querySelectorAll('.opponent-board .cell')[5];

  fireEvent.mouseEnter(targetCell);
  expect(handleCellHover).toHaveBeenCalledWith(5);
  rerender(<Board {...boardProps} hoveredCell={5} />);
  expect(targetCell).toHaveClass('unavailable-target');
  expect(targetCell).not.toHaveClass('hittable');
  expect(queryByRole('status')).not.toBeInTheDocument();

  fireEvent.click(targetCell);
  expect(handleCellClick).not.toHaveBeenCalled();
  expect(queryByRole('status')).not.toBeInTheDocument();

  rerender(<Board {...boardProps} hoveredCell={null} />);
  expect(queryByRole('status')).not.toBeInTheDocument();

  firePointerClick(targetCell, 'touch');
  expect(handleCellClick).not.toHaveBeenCalled();
  expect(targetCell).toHaveClass('unavailable-target');
  expect(getByRole('status')).toHaveTextContent('This location is not available to attack.');
});

test('requires a second tap on the same cell to attack on touch input', () => {
  const handleCellClick = jest.fn();
  const { container, getByRole } = render(
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
  const cells = container.querySelectorAll('.opponent-board .cell');

  firePointerClick(cells[5], 'touch');
  expect(handleCellClick).not.toHaveBeenCalled();
  expect(cells[5]).toHaveClass('attack-draft');
  expect(getByRole('status')).toHaveTextContent('Tap the same cell again to attack.');

  firePointerClick(cells[6], 'touch');
  expect(handleCellClick).not.toHaveBeenCalled();
  expect(cells[5]).not.toHaveClass('attack-draft');
  expect(cells[6]).toHaveClass('attack-draft');

  firePointerClick(cells[6], 'touch');
  expect(handleCellClick).toHaveBeenCalledWith(6);
});
