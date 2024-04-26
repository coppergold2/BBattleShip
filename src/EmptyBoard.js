import React from 'react';

const Board = (user) => {
  const cells = [];

  for (let i = 0; i < 100; i++) {
    cells.push(<div key={i} className="cell"></div>);
  }
  console.log(user.className)
  return <div className={`board ${user.className}`}> {cells}</div>;
};

export default Board;