const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    id : {
        type: String,
        required: true
    },
    gameTime : {

    },
    gameMode : {

    },
    createdAt : {
        type: Date,
        immutable: true,
        default: () => Date.now()
    }
})

mondule.exports = mongoose.model("User", userSchema)

