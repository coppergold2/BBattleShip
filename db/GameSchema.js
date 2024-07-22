const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Will be null for computer player
    },
    isComputer: {
        type: Boolean,
        default: false
    },
    numHits: {
        type: Number,
        required: true,
        min: 0
    },
    numMisses: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const GameSchema = new mongoose.Schema({
    winner: PlayerSchema,
    loser: PlayerSchema,
    isCompleted: {
        type: Boolean,
        default: true
    },
    duration: {
        type: Number,
        required: true,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Game', GameSchema);