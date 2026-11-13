import { render, screen, waitFor } from '@testing-library/react';
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
