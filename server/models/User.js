const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    lat: Number,
    long: Number,
    phone: String,
    orders: Array,
    selling: Array,
    emailVerify: Boolean,
    emailToken: String,
    phoneVerify: Boolean,
    orderLocations: Array
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);