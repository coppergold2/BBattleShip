const timestampMessage = (message, sentAt = new Date()) => ({
    ...message,
    sentAt: sentAt.toISOString()
});

const createShipLocationMessage = (shipLocations) => {
    return {
        admin: `Your ship locations are shown below. Copy the JSON to reuse this fleet: ${JSON.stringify(shipLocations)}`
    };
};

module.exports = { timestampMessage, createShipLocationMessage };
