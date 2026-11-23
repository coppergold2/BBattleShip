import { fireEvent, render, screen } from '@testing-library/react';
import Home from './Home';

const homeStats = {
  id: 'player-id',
  userName: 'Player',
  allGameStats: { wins: 9, losses: 3, winRate: 75 },
  lastTenGames: [
    {
      winner: { user: { id: 'player-id', userName: 'Player' }, numHits: 17, numMisses: 3, isComputer: false },
      loser: { user: { id: 'opponent-id', userName: 'Opponent' }, numHits: 9, numMisses: 6, isComputer: false },
      duration: 42.5,
      createdAt: '2025-01-01T12:00:00.000Z',
      isCompleted: true,
    },
    {
      winner: { user: null, userName: 'Computer', numHits: 10, numMisses: 2, isComputer: true },
      loser: { user: { id: 'player-id', userName: 'Player' }, numHits: 8, numMisses: 4, isComputer: false },
      duration: 35,
      createdAt: '2025-01-02T12:00:00.000Z',
      isCompleted: false,
    },
  ],
};

test('renders recent and lifetime statistics with game opponents and results', () => {
  render(<Home homeStats={homeStats} />);

  expect(screen.getByText('User: Player')).toBeInTheDocument();
  expect(screen.getByText('Wins: 1')).toBeInTheDocument();
  expect(screen.getByText('Losses: 1')).toBeInTheDocument();
  expect(screen.getByText('Win Rate: 50.00%')).toBeInTheDocument();
  expect(screen.getByText('Win Rate: 75%')).toBeInTheDocument();
  expect(screen.getByText('Opponent', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Computer', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Won', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Lost', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Incomplete', { exact: true })).toBeInTheDocument();
});

test('supports an empty match history and zero recent win rate', () => {
  render(
    <Home
      homeStats={{
        id: 'player-id',
        userName: 'Player',
        allGameStats: { wins: 0, losses: 0, winRate: 0 },
        lastTenGames: [],
      }}
    />
  );

  expect(screen.getByText('Win Rate: 0.00%')).toBeInTheDocument();
  expect(screen.queryByText(/Opponent:/)).not.toBeInTheDocument();
});

test('dispatches the selected game mode', () => {
  const handleSinglePlayerClick = jest.fn();
  const handleMultiPlayerClick = jest.fn();
  render(
    <Home
      homeStats={homeStats}
      handleSinglePlayerClick={handleSinglePlayerClick}
      handleMultiPlayerClick={handleMultiPlayerClick}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Single Player vs Computer' }));
  fireEvent.click(screen.getByRole('button', { name: 'Two Player Mode' }));

  expect(handleSinglePlayerClick).toHaveBeenCalledTimes(1);
  expect(handleMultiPlayerClick).toHaveBeenCalledTimes(1);
});
