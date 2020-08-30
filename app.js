require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const upload = multer({dest: __dirname + '/uploads/images'});

const app = express();

app.set('view engine', 'ejs');

cloudinary.config({
    cloud_name:"du9apidv6",
    api_key:"511194793499251",
    api_secret:"V-FKfZT2hbvXYc2IMP5iSnUcShk"
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "Biggest secret ever.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-joe:jonathan@cluster0.hbzmq.mongodb.net/saleDB?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    area: String,
    phone: String,
    orders: Array,
    selling: Array
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Item =mongoose.model("Item",{
    name:String,
    img:String,
    by:String,
    category:String,
    subcategory:String,
    discription:String,
    price:Number,
    sold:Number,
    veg:Boolean
});

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var items={};
var totalPrice=0;

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
    newname=req.user.name;
    res.render("home",{newname:newname});
});

app.get("/buy",function (req,res) {
    var arr=[];
    Item.find(function (err,docs) {
        docs.forEach(function (doc) {
            arr.push(doc.name);
            arr.push(doc.by);
            if(!(doc.name in items))
            {
                items[doc.name]=0;
            }

        });
        console.log(arr);
        Item.find({}).sort({"sold":-1}).exec(function (err,docs1) {
            res.render("buy",{items:docs1,arr:arr});
        });
    });



});

app.get("/menu/:someurl",function (req,res) {
    const menuname=req.params.someurl;
    Item.find(function (err,docs) {
        res.render("menu",{items:docs,menuname:menuname});
    });
});

app.get("/menu/:someurl/:somename",function (req,res) {
    const menuname=req.params.someurl;
    const filtername=req.params.somename;
    if(filtername==="pop")
    {
        Item.find({}).sort({"sold":-1}).exec(function (err,docs) {
            res.render("menu",{items:docs,menuname:menuname})
        });
    }
    if(filtername==="asc")
    {
        Item.find({}).sort({"price":1}).exec(function (err,docs) {
            res.render("menu",{items:docs,menuname:menuname})
        });
    }
    if(filtername==="dsc")
    {
        Item.find({}).sort({"price":-1}).exec(function (err,docs) {
            res.render("menu",{items:docs,menuname:menuname})
        });
    }
});

app.get("/search/:searchpart",function (req,res) {
    const searchname=req.params.searchpart;
    Item.find({ name: { $regex: searchname, $options: "i" } }, function(err, docs1) {
        Item.find({ by: { $regex: searchname, $options: "i" } }, function(err, docs2){
            Item.find(function (err,docs) {
                res.render("search", {docs:docs,docs2: docs2, docs1: docs1});
            });
        });
    });

});

app.get("/cart",function (req,res) {
    Item.find(function (err,docs) {
        res.render("cart",{docs:docs,items:items});
    });
});

app.get("/:somename/image",function (req,res) {
    res.render("image",{newname:req.params.somename});
});

app.get("/sell",function (req,res){
    res.render("sell");
});

app.get("/success",function (req,res) {
    res.render("success");
});
app.get("/failure",function (req,res) {
    res.render("failure");
});
app.get("/account",function (req,res) {

        User.find({name:req.user.name},function (err,docs) {
            res.render("account",{docs:docs[0],newname:req.user.name});
            console.log(docs[0]);
        });
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

app.post("/home",function (req,res) {
    if(req.body.name==="buy")
        res.redirect("/buy");
    else
        res.redirect("/sell");
});

app.post("/buy",function (req,res){
    console.log(req.body);
    if(req.body.name)
        res.redirect("/menu/"+req.body.name);
    else
        res.redirect("/search/"+req.body.mysearch);

});

app.post("/cart/in",function (req,res) {
    items=req.body;
    res.redirect("/cart");
});

app.post("/cart",function (req,res) {
    console.log(req.user.name);
    User.findOneAndUpdate({name:req.user.name},{$push: { orders: req.body }}, function (err,doc) {

        if(err)
            res.redirect("/failure");

        else {
            res.redirect("/success");
        }
    });
});

app.post('/image', upload.single('photo'), (req, res) => {

    if(req.file) {

        cloudinary.uploader.upload(req.file.path, function(error, result) {


            Item.findOneAndUpdate({name:req.body.somename},{img:result.url},function (err,docs) {
                if(err)
                    console.log(err);
            });
        });
        res.redirect("/success");
    }
    else throw 'error';
});

app.post("/sell",function (req,res) {
    console.log(req.body);
    var newname="";
    if(req.body.category==="Starters")
        newname="starters";
    else if(req.body.category==="Main Course")
        newname="mains";
    else if(req.body.category==="Deserts")
        newname="deserts";
    Item.create({name:req.body.name,discription:req.body.disc,price:req.body.price,category:"food",subcategory:newname,by:req.user.name,sold:"0",veg:true});
    User.findOneAndUpdate({name:req.user.name},{$push: { selling: req.body.name }}, function (err,doc) {
        if(err)
            console.log(err);
    });
    res.redirect("/"+req.body.name+"/image");
});

let PORT=process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log("Server started on port 3000");
});