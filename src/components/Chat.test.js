import { fireEvent, render, screen } from '@testing-library/react';
import Chat from './Chat';

const messages = [
  { Player: 'Ready to play?' },
  { Opponent: 'Good luck!' },
  { admin: 'Player Opponent reconnected' },
];

test('labels player, opponent, and system messages distinctly', () => {
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
  expect(container.querySelectorAll('.chat-message-opponent')).toHaveLength(2);
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
