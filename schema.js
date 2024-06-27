const mongoose = require("mongoose");
const moment = require("moment-timezone");

const UserSchema = new mongoose.Schema({
    createdAt: {
        type: Date,
        immutable: true,
        default: () => moment.tz(Date.now(), "America/Toronto").toDate()
    },
    winStep: {
        type: [Number],
        default: []
    },
    lossStep: {
        type: [Number],
        default: []
    }
});

module.exports = mongoose.model("User", UserSchema);