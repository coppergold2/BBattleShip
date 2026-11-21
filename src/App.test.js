import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
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
    handlerFor('reconnectAvailable')({ activeElsewhere: true });
  });
  expect(screen.getByRole('region', { name: 'Your game is open in another tab' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Reconnect here to move the game to this tab. The other tab will be disconnected.'
  );
  expect(screen.getByRole('button', { name: 'Reconnect in this tab' })).toBeInTheDocument();

  act(() => {
    handlerFor('reconnectAvailable')();
  });
  expect(screen.getByRole('region', { name: 'Your game is ready to resume' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent(
    'Reconnect to continue your current game. This option is available for five minutes after disconnection.'
  );
  expect(screen.getByRole('button', { name: 'Reconnect to game' })).toBeInTheDocument();

  act(() => {
    handlerFor('reconnectClaimed')();
  });
  expect(screen.queryByRole('button', { name: 'Reconnect to game' })).not.toBeInTheDocument();

  act(() => {
    handlerFor('reconnectAvailable')();
  });
  await userEvent.click(screen.getByRole('button', { name: 'Reconnect to game' }));
  expect(socketInstance.emit).toHaveBeenLastCalledWith('reconnectGame');
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
