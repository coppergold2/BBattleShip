const mongoose = require("mongoose");
const moment = require("moment-timezone");

const UserSchema = new mongoose.Schema({
    userName: {
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
    lastSeen: {
        type: Date,
        default: () => new Date()
    },
    games: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    }]
});

// // Define the virtual field for averageGameOverSteps
// UserSchema.virtual('averageGameOverSteps').get(function() {
//     const allSteps = [...this.winStep, ...this.lossStep];
//     if (allSteps.length === 0) {
//         return 0; // or any other default value you prefer
//     }
//     const sum = allSteps.reduce((total, step) => total + step, 0);
//     return sum / allSteps.length;
// });

// Ensure virtual fields are included in toJSON and toObject outputs
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', UserSchema);

module.exports = User;