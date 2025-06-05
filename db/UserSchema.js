/*UserSchema.js*/
const mongoose = require("mongoose");
const moment = require("moment-timezone");

const UserSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        immutable: true,
        default: () => moment.tz(Date.now(), "America/Toronto").toDate()
    },
    isLoggedIn: {
        type: Boolean,
        default: false
    },
    currGameRoom: {
        type: String,
        default: null
    },
    lastSeen: {
        type: Date,
        default: () => new Date()
    },
    games: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    }]
});

// Ensure virtual fields are included in toJSON and toObject outputs
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', UserSchema);

module.exports = User;