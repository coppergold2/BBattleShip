const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
    id : {
        type: String,
        required: true
    },
    createdAt : {
        type: Date,
        immutable: true,
        default: () => Date.now()
    } ,
    winStep : {
        type: [Number],
        default : []
    },
    lossStep: {
        type: [Number],
        default : []
    } 
})

module.exports = mongoose.model("User", UserSchema)

