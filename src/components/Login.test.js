import { fireEvent, render, screen } from '@testing-library/react';
import Login from './Login';

const baseProps = {
  handleFormChange: jest.fn(),
  handleLogin: jest.fn(),
  handleRegister: jest.fn(),
  handleNewUserClick: jest.fn(),
  handleBackClick: jest.fn(),
  form: { username: ' Fleet Captain ', email: ' captain@example.com ', password: 'secret' },
  register: false,
  authError: '',
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('submits trimmed login email and the entered password', () => {
  render(<Login {...baseProps} />);

  fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form'));

  expect(baseProps.handleLogin).toHaveBeenCalledWith('captain@example.com', 'secret');
  expect(baseProps.handleRegister).not.toHaveBeenCalled();
});

test('submits normalized registration fields and preserves the password', () => {
  render(<Login {...baseProps} register />);

  fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));

  expect(baseProps.handleRegister).toHaveBeenCalledWith(
    'Fleet Captain',
    'captain@example.com',
    'secret'
  );
  expect(baseProps.handleLogin).not.toHaveBeenCalled();
});

test('does not submit when required account fields are blank after trimming', () => {
  render(
    <Login
      {...baseProps}
      register
      form={{ username: '  ', email: '  ', password: 'secret' }}
    />
  );

  fireEvent.submit(screen.getByRole('button', { name: 'Create account' }).closest('form'));

  expect(baseProps.handleRegister).not.toHaveBeenCalled();
});

test('announces authentication errors accessibly', () => {
  render(<Login {...baseProps} authError="Invalid email or password" />);

  expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password');
});
