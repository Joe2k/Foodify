require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "The biggest secret ever.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-joe:"+process.env.DB_PASS+"@cluster0.hbzmq.mongodb.net/saleDB?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    area: String,
    phone: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/",function (req,res) {
    if(req.isAuthenticated()){
        res.redirect("/home");
    }
    else
        res.redirect("/login");
});

app.get("/login",function (req,res) {
    res.render("login");
});

app.get("/register",function (req,res) {
    res.render("register");
});

app.get("/home",function (req,res) {
    res.render("home");
});

app.post("/login",function (req,res) {
    const user= new User({
        username:req.body.email,
        password:req.body.password
    });
    req.login(user, function (err) {

        if(err)
        {console.log(err);
        res.redirect("/login");}
        else{
            passport.authenticate("local");
            res.redirect("/home");
        }
    });
});

app.post("/register",function (req,res) {
    User.register({username: req.body.email},req.body.password,function (err,user) {
        if(err){
            res.redirect("/register");
            console.log(err);
        }

        else
        {
            User.findOneAndUpdate({username: req.body.email},{name:req.body.name,phone:req.body.phone,area:req.body.area},function (err,doc) {
                if(err)
                    console.log(err);
                else
                    console.log(doc);
            });
            passport.authenticate("local");
            res.redirect("/home");
        }
        }
    );
});

let PORT=process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log("Server started on port 3000");
});