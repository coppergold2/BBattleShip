const ships = {
    carrier: 5,
    battleship: 4,
    cruiser: 3,
    submarine: 3,
    destroyer: 2
};

function getShipPlacement(startIndex, isVertical, shipLength) {
    if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex >= 100 ||
        !Number.isInteger(shipLength) || shipLength < 1 || shipLength > 10) {
        return null;
    }

    const row = Math.floor(startIndex / 10);
    const column = startIndex % 10;
    if (isVertical ? row + shipLength > 10 : column + shipLength > 10) {
        return null;
    }

    return Array.from(
        { length: shipLength },
        (_, offset) => startIndex + offset * (isVertical ? 10 : 1)
    );
}

function isValidShipPlacement(command) {
    if (typeof command !== 'object' || command === null || Array.isArray(command)) {
        return false;
    }

    const occupiedCells = new Set();
    for (const [shipName, shipLength] of Object.entries(ships)) {
        const locations = command[shipName];
        if (!Array.isArray(locations) || locations.length !== shipLength ||
            !locations.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < 100)) {
            return false;
        }

        const uniqueLocations = [...new Set(locations)];
        if (uniqueLocations.length !== shipLength ||
            uniqueLocations.some((cell) => occupiedCells.has(cell))) {
            return false;
        }

        const sortedLocations = [...uniqueLocations].sort((first, second) => first - second);
        const horizontal = sortedLocations.every(
            (cell, index) => index === 0 || cell === sortedLocations[index - 1] + 1
        ) && Math.floor(sortedLocations[0] / 10) ===
            Math.floor(sortedLocations[sortedLocations.length - 1] / 10);
        const vertical = sortedLocations.every(
            (cell, index) => index === 0 || cell === sortedLocations[index - 1] + 10
        );
        if (!horizontal && !vertical) {
            return false;
        }

        uniqueLocations.forEach((cell) => occupiedCells.add(cell));
    }

    return true;
}

function checkAdjacentCells(cellIndex, possibleHitLocations, minSizeShip, checkHit, hitLocations) {
    const cols = 10;
    let horizontalPossibilities = 1;
    let verticalPossibilities = 1;
    let current = cellIndex;

    while (horizontalPossibilities < minSizeShip) {
        if (current % cols !== 0 &&
            (possibleHitLocations.has(current - 1) || hitLocations.includes(current - 1))) {
            horizontalPossibilities += 1;
            current -= 1;
        } else {
            break;
        }
    }

    current = cellIndex;
    while (horizontalPossibilities < minSizeShip) {
        if ((current + 1) % cols !== 0 &&
            (possibleHitLocations.has(current + 1) || hitLocations.includes(current + 1))) {
            horizontalPossibilities += 1;
            current += 1;
        } else {
            break;
        }
    }

    current = cellIndex;
    while (verticalPossibilities < minSizeShip) {
        if (current - cols >= 0 &&
            (possibleHitLocations.has(current - cols) || hitLocations.includes(current - cols))) {
            verticalPossibilities += 1;
            current -= cols;
        } else {
            break;
        }
    }

    current = cellIndex;
    while (verticalPossibilities < minSizeShip) {
        if (current + cols < 100 &&
            (possibleHitLocations.has(current + cols) || hitLocations.includes(current + cols))) {
            verticalPossibilities += 1;
            current += cols;
        } else {
            break;
        }
    }

    if (horizontalPossibilities === minSizeShip || verticalPossibilities === minSizeShip) {
        if (!checkHit) {
            return true;
        }
        return getNextFourDirection(
            cellIndex,
            possibleHitLocations,
            hitLocations,
            horizontalPossibilities,
            verticalPossibilities,
            minSizeShip
        );
    }

    return checkHit ? undefined : false;
}

function getNextFourDirection(
    cellIndex,
    possibleHitLocations,
    hitLocations,
    horizontalPossibilities,
    verticalPossibilities,
    minSizeShip
) {
    const nextHitLocations = [-1, -1, -1, -1];
    const cols = 10;
    let current = cellIndex;

    if (horizontalPossibilities === minSizeShip) {
        if (current % cols !== 0 && possibleHitLocations.has(current - 1)) {
            nextHitLocations[1] = current - 1;
        } else if (current % cols !== 0 && hitLocations.includes(current - 1)) {
            current -= 1;
            while (current % cols !== 0 && hitLocations.includes(current - 1)) {
                current -= 1;
            }
            if (possibleHitLocations.has(current)) {
                nextHitLocations[1] = current;
            }
        }

        current = cellIndex;
        if ((current + 1) % cols !== 0 && possibleHitLocations.has(current + 1)) {
            nextHitLocations[3] = current + 1;
        } else if ((current + 1) % cols !== 0 && hitLocations.includes(current + 1)) {
            current += 1;
            while ((current + 1) % cols !== 0 && hitLocations.includes(current + 1)) {
                current += 1;
            }
            if (possibleHitLocations.has(current)) {
                nextHitLocations[3] = current;
            }
        }
    }

    if (verticalPossibilities === minSizeShip) {
        current = cellIndex;
        if (current - cols >= 0 && possibleHitLocations.has(current - cols)) {
            nextHitLocations[0] = current - cols;
        } else if (current - cols >= 0 && hitLocations.includes(current - cols)) {
            current -= cols;
            while (current - cols >= 0 && hitLocations.includes(current - cols)) {
                current -= cols;
            }
            if (possibleHitLocations.has(current)) {
                nextHitLocations[0] = current;
            }
        }

        current = cellIndex;
        if (current + cols < 100 && possibleHitLocations.has(current + cols)) {
            nextHitLocations[2] = current + cols;
        } else if (current + cols < 100 && hitLocations.includes(current + cols)) {
            current += cols;
            while (current + cols < 100 && hitLocations.includes(current + cols)) {
                current += cols;
            }
            if (possibleHitLocations.has(current)) {
                nextHitLocations[2] = current;
            }
        }
    }

    return nextHitLocations;
}

module.exports = {
    ships,
    getShipPlacement,
    isValidShipPlacement,
    checkAdjacentCells
};
