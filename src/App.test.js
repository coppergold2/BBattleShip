import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import packageJson from '../package.json';
import api from './services/api';
import { createSocket } from './services/socket';

jest.mock('./services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('./services/socket', () => ({
  createSocket: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

beforeEach(() => {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open');
    };
  }
  api.get.mockRejectedValue({ response: { status: 401 } });
  api.post.mockReset();
  createSocket.mockReset();
  createSocket.mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  }));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('checks the API session and shows the login form when signed out', async () => {
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(screen.getByText(`Version ${packageJson.version}`)).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/api/auth/session');
});

test('sends login credentials to the auth API and opens a socket after success', async () => {
  api.post.mockResolvedValue({
    data: {
      id: 'user-id',
      userName: 'Player',
      games: [],
      allGameStats: { wins: 0, losses: 0, winRate: 0 },
    },
  });
  render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'player@example.com',
      password: 'secret',
    });
  });
  expect(createSocket).toHaveBeenCalled();
});

test('shows a blocking reconnect overlay instead of alerting on transient socket errors', async () => {
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  const socketInstance = {
    on: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
  createSocket.mockReturnValue(socketInstance);
  api.post.mockResolvedValue({
    data: {
      id: 'user-id',
      userName: 'Player',
      games: [],
      allGameStats: { wins: 0, losses: 0, winRate: 0 },
    },
  });
  render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  await waitFor(() => {
    expect(createSocket).toHaveBeenCalled();
  });

  const connectErrorHandler = socketInstance.on.mock.calls
    .find(([event]) => event === 'connect_error')[1];

  act(() => {
    connectErrorHandler({ message: 'xhr poll error' });
  });

  expect(alertSpy).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveClass('loading-overlay');
  expect(screen.getByRole('status')).toHaveTextContent('Connection lost. Reconnecting...');
});

test('requests session reconciliation when the socket connects without recovery', async () => {
  const socketInstance = {
    id: 'socket-id',
    recovered: false,
    connected: true,
    on: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
  createSocket.mockReturnValue(socketInstance);
  api.post.mockResolvedValue({
    data: {
      id: 'user-id',
      userName: 'Player',
      games: [],
      allGameStats: { wins: 0, losses: 0, winRate: 0 },
    },
  });
  render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => {
    expect(createSocket).toHaveBeenCalled();
  });

  const connectHandler = socketInstance.on.mock.calls
    .find(([event]) => event === 'connect')[1];
  act(() => {
    connectHandler();
  });

  expect(socketInstance.emit).toHaveBeenCalledWith('restoreLogin');

  act(() => {
    connectHandler();
  });

  expect(socketInstance.emit).toHaveBeenLastCalledWith('restoreLogin');

});

test('offers a reconnect action when a disconnected game is available', async () => {
  const socketInstance = {
    id: 'socket-id',
    recovered: false,
    connected: true,
    on: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
  createSocket.mockReturnValue(socketInstance);
  api.post.mockResolvedValue({
    data: {
      id: 'user-id',
      userName: 'Player',
      games: [],
      allGameStats: { wins: 0, losses: 0, winRate: 0 },
    },
  });
  render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => {
    expect(createSocket).toHaveBeenCalled();
  });

  const handlerFor = (event) => socketInstance.on.mock.calls
    .find(([registeredEvent]) => registeredEvent === event)[1];

  act(() => {
    handlerFor('connect')();
  });
  expect(socketInstance.emit).toHaveBeenCalledWith('restoreLogin');

  act(() => {
    handlerFor('reconnectAvailable')({ activeElsewhere: true, roomCode: 'active-room' });
  });
  expect(screen.getByRole('region', { name: 'Your game is open in another tab' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Info: Your game is active in another tab.' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Reconnect here to move the game to this tab. The other tab will be disconnected.'
  );
  expect(screen.getByRole('button', { name: 'Reconnect in this tab' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Minimize' }));
  expect(screen.getByRole('region', { name: 'Reconnect banner minimized' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Show reconnect options' })).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(screen.getByRole('button', { name: 'Show reconnect options' }));
  expect(screen.getByRole('region', { name: 'Your game is open in another tab' })).toBeInTheDocument();

  act(() => {
    handlerFor('reconnectDismissed')({ roomCode: 'different-room' });
  });
  expect(screen.getByRole('button', { name: 'Reconnect in this tab' })).toBeInTheDocument();

  act(() => {
    handlerFor('reconnectDismissed')({ roomCode: 'active-room' });
  });
  expect(screen.queryByRole('button', { name: 'Reconnect in this tab' })).not.toBeInTheDocument();

  act(() => {
    handlerFor('reconnectAvailable')({ roomCode: 'disconnected-room' });
  });
  expect(screen.getByRole('region', { name: 'Your game is ready to resume' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Info: A disconnected game is available to reconnect.' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Reconnect to continue your current game. This option is available for five minutes after disconnection.'
  );
  expect(screen.getByRole('button', { name: 'Reconnect to game' })).toBeInTheDocument();

  act(() => {
    handlerFor('reconnectClaimed')({ roomCode: 'disconnected-room' });
  });
  expect(screen.queryByRole('button', { name: 'Reconnect to game' })).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Your game is open in another tab' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reconnect in this tab' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Info: The game was reconnected in another tab.' })).not.toBeInTheDocument();

  act(() => {
    handlerFor('reconnectDismissed')({ roomCode: 'disconnected-room' });
  });
  expect(screen.queryByRole('button', { name: 'Reconnect in this tab' })).not.toBeInTheDocument();

  act(() => {
    handlerFor('reconnectAvailable')();
  });
  await userEvent.click(screen.getByRole('button', { name: 'Reconnect to game' }));
  expect(socketInstance.emit).toHaveBeenLastCalledWith('reconnectGame');

  await userEvent.click(screen.getByRole('button', { name: 'Single Player vs Computer' }));
  expect(socketInstance.emit).toHaveBeenLastCalledWith('requestGameStart', 'singleplayer');

  socketInstance.connected = true;
  act(() => {
    handlerFor('gameStartConfirmationRequired')({
      mode: 'singleplayer',
      roomCode: 'previous-room',
      activeElsewhere: true,
      inProgress: true,
    });
  });
  expect(screen.getByRole('dialog')).toHaveTextContent('Your game is still active in another tab.');
  expect(screen.getByRole('button', { name: 'Keep previous game' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Abandon & start single-player' }));
  expect(socketInstance.emit).toHaveBeenLastCalledWith('abandonGameAndStart', {
    mode: 'singleplayer',
    roomCode: 'previous-room',
  });
});

test('keeps the last online count visible during a transient disconnect', async () => {
  const socketInstance = {
    id: 'socket-id',
    recovered: false,
    on: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
  createSocket.mockReturnValue(socketInstance);
  api.post.mockResolvedValue({
    data: {
      id: 'user-id',
      userName: 'Player',
      games: [],
      allGameStats: { wins: 0, losses: 0, winRate: 0 },
    },
  });
  render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => {
    expect(createSocket).toHaveBeenCalled();
  });

  const handlerFor = (event) => socketInstance.on.mock.calls
    .find(([registeredEvent]) => registeredEvent === event)[1];

  act(() => {
    handlerFor('userCountUpdate')(6);
  });
  act(() => {
    handlerFor('disconnect')('transport close');
  });

  expect(document.querySelector('.user-count')).toHaveTextContent('6 users online');
});

test('shows the authentication error returned by the login API', async () => {
  api.post.mockRejectedValue({
    response: { data: { message: 'Invalid email or password' } },
  });
  render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  expect(createSocket).not.toHaveBeenCalled();
});

test('registers a player with trimmed profile fields and connects after success', async () => {
  api.post.mockResolvedValue({
    data: {
      id: 'new-user-id',
      userName: 'Player One',
      games: [],
      allGameStats: { wins: 0, losses: 0, winRate: 0 },
    },
  });
  render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  await userEvent.type(screen.getByLabelText('Username'), ' Player One ');
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/api/auth/register', {
      userName: 'Player One',
      email: 'player@example.com',
      password: 'secret',
    });
  });
  expect(createSocket).toHaveBeenCalled();
});

test('reveals the opponent ship locations when the opponent quits', async () => {
  const socketInstance = {
    on: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
  createSocket.mockReturnValue(socketInstance);
  api.post.mockResolvedValue({
    data: {
      id: 'user-id',
      userName: 'Player',
      games: [],
      allGameStats: { wins: 0, losses: 0, winRate: 0 },
    },
  });
  const { container } = render(<App />);

  await screen.findByRole('heading', { name: 'Welcome back' });
  await userEvent.type(screen.getByLabelText('Email address'), 'player@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'secret');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() => {
    expect(createSocket).toHaveBeenCalled();
  });

  const handlerFor = (event) => socketInstance.on.mock.calls
    .find(([registeredEvent]) => registeredEvent === event)[1];

  act(() => {
    handlerFor('multiplayer')();
    handlerFor('start')();
    handlerFor('oquit')(
      'Your opponent has quit, you have won!',
      [],
      { wins: 1, losses: 0, winRate: 100 },
      { carrier: [12, 13, 14], destroyer: [72, 73] }
    );
  });

  expect(container.querySelectorAll('.opponent-board .carrier.loser')).toHaveLength(3);
  expect(container.querySelectorAll('.opponent-board .destroyer.loser')).toHaveLength(2);
  expect(screen.getByText('Info: Your opponent has quit, you have won!')).toBeInTheDocument();
});
