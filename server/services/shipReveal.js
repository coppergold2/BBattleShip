function getUnhitShipLocations(hitLocations, shipLocations) {
    const unhitShips = {};
    for (const [shipName, locations] of Object.entries(shipLocations)) {
        const unhitLocations = locations.filter((location) => !hitLocations.includes(location));
        if (unhitLocations.length > 0) {
            unhitShips[shipName] = unhitLocations;
        }
    }

    return unhitShips;
}

module.exports = { getUnhitShipLocations };
