const mongoose = require("mongoose");

const Order= mongoose.model("Order",{
    name:String,
    userName: String,
    active: Boolean,
    delivered: Boolean
});

module.exports = Order;