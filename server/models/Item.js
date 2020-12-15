const mongoose = require("mongoose");

const Item =mongoose.model("Item",{
    name:String,
    img:String,
    by:String,
    category:String,
    subcategory:String,
    discription:String,
    price:Number,
    sold:Number,
    veg:Boolean,
    lat: Number,
    long: Number,
    distance: Number
});

module.exports = Item;