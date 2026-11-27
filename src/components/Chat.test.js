import { fireEvent, render, screen } from '@testing-library/react';
import Chat from './Chat';

const messages = [
  { Player: 'Ready to play?', sentAt: '2026-11-27T03:08:09.000Z' },
  { Opponent: 'Good luck!', sentAt: '2026-11-27T03:09:10.000Z' },
  { admin: 'Player Opponent reconnected', sentAt: '2026-11-27T03:10:11.000Z' },
];

test('labels player, opponent, and admin messages distinctly and shows 24-hour timestamps', () => {
  const { container } = render(
    <Chat
      messages={messages}
      input=""
      multiPlayer
      userName="Player"
      sendMessage={jest.fn()}
      handleInputChange={jest.fn()}
    />
  );

  expect(container.querySelector('.chat-message-player')).toHaveTextContent('Player: Ready to play?');
  expect(container.querySelector('.chat-message-opponent')).toHaveTextContent('Opponent: Good luck!');
  expect(container.querySelector('.chat-message-admin')).toHaveTextContent('Admin: Player Opponent reconnected');
  expect(container.querySelectorAll('time')).toHaveLength(3);
  expect(container.querySelector('time')).toHaveTextContent(/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/);
  expect(container.querySelector('time')).not.toHaveTextContent(/AM|PM/i);
});

test('sends a message on Enter and from the Send button', () => {
  const sendMessage = jest.fn();
  const handleInputChange = jest.fn();
  render(
    <Chat
      messages={[]}
      input="Hello"
      multiPlayer
      userName="Player"
      sendMessage={sendMessage}
      handleInputChange={handleInputChange}
    />
  );

  fireEvent.change(screen.getByPlaceholderText('Type here'), { target: { value: 'Hello there' } });
  fireEvent.keyDown(screen.getByPlaceholderText('Type here'), { key: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));

  expect(handleInputChange).toHaveBeenCalledWith('Hello there');
  expect(sendMessage).toHaveBeenCalledTimes(2);
  expect(sendMessage).toHaveBeenNthCalledWith(1, 'message');
});

test('hides the message composer outside multiplayer games', () => {
  render(
    <Chat
      messages={[]}
      input=""
      multiPlayer={false}
      userName="Player"
      sendMessage={jest.fn()}
      handleInputChange={jest.fn()}
    />
  );

  expect(screen.queryByPlaceholderText('Type here')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
});
