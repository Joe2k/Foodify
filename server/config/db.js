require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = () => {
    mongoose.connect("mongodb+srv://admin-joe:"+process.env.DB_PASS+"@cluster0.hbzmq.mongodb.net/saleDB?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});

    mongoose.set('useNewUrlParser', true);
    mongoose.set('useFindAndModify', false);
    mongoose.set('useCreateIndex', true);
}

module.exports = connectDB;