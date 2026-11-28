import React, { useEffect, useState } from 'react';
import Command from './Command'

const Board = ({
  className, turn, obCellClass, pbCellClass, activeShip, shipLocHover,
  shipPlacementValid, shipPlacementError, hoveredCell, stats,
  handleCellClick, handleShipPlacement, handleShipReplacement,
  handleShipHover, handleShipHoverOut, handleCellHover, handleCellHoverOut
}) => {
  const [draftPlacementCell, setDraftPlacementCell] = useState(null);
  const [draftAttackCell, setDraftAttackCell] = useState(null);
  const [unavailableAttackHintCell, setUnavailableAttackHintCell] = useState(null);

  useEffect(() => {
    setDraftPlacementCell(null);
  }, [activeShip, turn]);

  useEffect(() => {
    setDraftAttackCell(null);
    setUnavailableAttackHintCell(null);
  }, [turn]);

  const isTouchInput = (event) => {
    const nativeEvent = event.nativeEvent;
    if (nativeEvent.pointerType) {
      return nativeEvent.pointerType === 'touch';
    }
    if (nativeEvent.detail === 0 || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  };

  const selectPlacementCell = (index) => {
    handleShipHover(index);
    setDraftPlacementCell(index);
  };

  const isUnavailableAttackCell = (index) => {
    const cell = obCellClass && obCellClass[index];
    return cell != null && (cell.hit || cell.miss);
  };

  const handlePlacementCellClick = (index, event) => {
    if (!isTouchInput(event)) {
      if (shipPlacementValid !== false) {
        handleShipPlacement(index);
      }
      setDraftPlacementCell(null);
      return;
    }

    if (draftPlacementCell === index) {
      if (shipPlacementValid === true) {
        handleShipPlacement(index);
        setDraftPlacementCell(null);
      }
    } else {
      selectPlacementCell(index);
    }
  };

  const handleAttackCellClick = (index, event) => {
    const isTouch = isTouchInput(event);
    if (isUnavailableAttackCell(index)) {
      setDraftAttackCell(null);
      setUnavailableAttackHintCell(isTouch ? index : null);
      handleCellHover(index);
      return;
    }

    setUnavailableAttackHintCell(null);
    if (!isTouch || draftAttackCell === index) {
      handleCellClick(index);
      setDraftAttackCell(null);
      handleCellHoverOut();
    } else {
      setDraftAttackCell(index);
      handleCellHover(index);
    }
  };

  const getCellsClassName = () => {
    const classNameArr = new Array(100).fill("");
    if (className === "player-board" && pbCellClass !== null) {
      pbCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName;
          if (turn == null) {
            classNameArr[index] += " grab";
          }
        } else {
          classNameArr[index] = "cell";
        }
        if (element.ohit === true) {
          classNameArr[index] += " boom";
        } else if (element.omiss === true) {
          classNameArr[index] += " miss";
        }
        if (turn != null && element.ohit === false && element.omiss === false && element.possHitLocation === true) {
          classNameArr[index] += " possHit"
        }
      });
    } else if (className === "opponent-board" && pbCellClass !== null) {
      obCellClass.forEach((element, index) => {
        if (element.shipName !== null) {
          classNameArr[index] = "cell " + element.shipName;
        } else {
          classNameArr[index] = "cell";
          if (element.unHitShip != null) {
            classNameArr[index] += " " + element.unHitShip + " loser"
          }
        }
        if (element.hit === true) {
          classNameArr[index] += " boom";
        } else if (element.miss === true) {
          classNameArr[index] += " miss";
        }
        if (element.shipName === null && element.hit === false && element.miss === false && turn == true) {
          classNameArr[index] += " grab";
        }
      });
    }
    return classNameArr;
  };

  const renderColumnHeaders = () => {
    let headers = [];
    headers.push(<div key="corner" className="corner"></div>); // Add empty corner
    for (let i = 1; i <= 10; i++) {
      headers.push(<div key={`col-${i}`} className="column-header">{i}</div>);
    }
    return headers;
  };

  const renderRows = () => {
    let rows = [];
    const cellClassNames = getCellsClassName();
    for (let i = 0; i < 10; i++) {
      rows.push(<div key={`row-header-${i}`} className="row-header">{i + 1}</div>);
      for (let j = 0; j < 10; j++) {
        const index = i * 10 + j;
        const isDraftPlacement = draftPlacementCell === index;
        const isDraftAttack = draftAttackCell === index;
        const isUnavailableAttack = className === 'opponent-board' && isUnavailableAttackCell(index);
        const isUnavailableAttackHint = isUnavailableAttack &&
          (unavailableAttackHintCell === index || hoveredCell === index);
        const isHoveredAttackableCell = className === 'opponent-board' && turn === true &&
          hoveredCell === index && !isUnavailableAttack;
        const isPlacementCell = turn == null && activeShip != null &&
          className === 'player-board' && shipLocHover != null && shipLocHover.has(index);
        const isInvalidPlacementCell = isPlacementCell && shipPlacementValid === false;
        rows.push(
          <div
            key={index}
            className={`${cellClassNames[index]} ${isPlacementCell && shipPlacementValid === true ? activeShip + ' hover' : ''} ${isInvalidPlacementCell ? 'invalid-placement' : ''} ${isHoveredAttackableCell ? 'hittable' : ''} ${isDraftAttack ? 'attack-draft' : ''} ${isUnavailableAttackHint ? 'unavailable-target' : ''}`}
            onClick={
              turn && className === 'opponent-board' ? (event) => handleAttackCellClick(index, event) :
                turn == null && activeShip != null && className === 'player-board' && pbCellClass[index].shipName == null ? (event) => handlePlacementCellClick(index, event) :
                  turn == null && className === 'player-board' && pbCellClass[index].shipName != null ? () => { handleShipReplacement(pbCellClass[index].shipName, index); } : null
            }
            onMouseEnter={() => {
              if (className === 'opponent-board' && turn === true) {
                setUnavailableAttackHintCell(null);
                handleCellHover(index);
              } else if (turn == null && activeShip != null && className === 'player-board' && pbCellClass[index].shipName == null) {
                handleShipHover(index)
              }
            }}
            onMouseLeave={() => {
              if (turn === true && className === 'opponent-board') {
                handleCellHoverOut();
              } else if (turn == null && activeShip != null && className === 'player-board' && draftPlacementCell === null) {
                handleShipHoverOut();
              }
            }}
            style={{
              cursor: (isInvalidPlacementCell && !isDraftPlacement) || isUnavailableAttackHint ? 'not-allowed' :
                (activeShip && className === 'player-board' && turn == null) ? 'pointer' : undefined
            }}
            title={isInvalidPlacementCell && !isDraftPlacement ? 'Cannot place ship here' : undefined}
          ></div>
        );
      }
    }
    return rows;
  };

  return (
    <div>
      <div className={`${turn === null ? 'board-before' : 'board-after'} ${className}`}>
        {renderColumnHeaders()}
        {renderRows()}
      </div>
      {className === 'player-board' && turn == null && (
        <div className="placement-feedback" role="status" aria-live="polite">
          {shipPlacementError || (shipPlacementValid === false ? 'This ship cannot be placed here.' :
            draftPlacementCell != null ? 'Ship preview selected. Tap the same cell again to place.' : '')}
        </div>
      )}
      {className === 'opponent-board' && turn === true && draftAttackCell != null && (
        <div className="placement-feedback" role="status" aria-live="polite">
          Attack target selected. Tap the same cell again to attack.
        </div>
      )}
      {className === 'opponent-board' && turn === true &&
        unavailableAttackHintCell != null && (
        <div className="placement-feedback unavailable-attack-feedback" role="status" aria-live="polite">
          This location is not available to attack.
        </div>
      )}
      {turn != null && (
        <div className="stats-container">
          <div>
            Number of Hits: {className === 'player-board' ? stats.onumHits : stats.numHits}
          </div>
          <div>
            Number of Misses: {className === 'player-board' ? stats.onumMisses : stats.numMisses}
          </div>
          <div>
            Total Moves: {className === 'player-board' ? stats.onumMisses + stats.onumHits : stats.numHits + stats.numMisses}
          </div>
        </div>
      )}
    </div>
  );
};

export default Board;