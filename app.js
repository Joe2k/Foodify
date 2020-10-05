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
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

const app = express();

app.set('view engine', 'ejs');

cloudinary.config({
    cloud_name:"du9apidv6",
    api_key:"511194793499251",
    api_secret:"V-FKfZT2hbvXYc2IMP5iSnUcShk"
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const accountSid = process.env.PHONE_ID;
const authToken = process.env.PHONE_TOKEN;
const client = require('twilio')(accountSid, authToken);
var serid;

client.verify.services.create({friendlyName: 'Food App'})
    .then(service => serid=service.sid);


app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(express.json({limit:'1mb'}));

app.use(session({
    secret: process.env.PASS_SECRET,
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
    veg:Boolean,
    lat: Number,
    long: Number,
    distance: Number
});
const Order= mongoose.model("Order",{
   name:String,
   userName: String,
   active: Boolean,
   delivered: Boolean
});

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var items={};
var totalPrice=0;
var forLoginPromt="";
var forSuc="";
var forReset="";
var forLogin="";
var forLogout="no";
var userTransfer="";
var deliveryLat=0.0;
var deliveryLong=0.0;

function haversine_distance(lat1, long1, lat2,long2) {
    var R = 6371.0710; // Radius of the Earth in miles
    var rlat1 = lat1 * (Math.PI/180); // Convert degrees to radians
    var rlat2 = lat2 * (Math.PI/180); // Convert degrees to radians
    var difflat = rlat2-rlat1; // Radian difference (latitudes)
    var difflon = (long2-long1) * (Math.PI/180); // Radian difference (longitudes)

    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat/2)*Math.sin(difflat/2)+Math.cos(rlat1)*Math.cos(rlat2)*Math.sin(difflon/2)*Math.sin(difflon/2)));
    return d;
}


app.get("/",function (req,res) {
    res.redirect("/home");

});

app.get("/phone",function (req,res){
    User.find({username:req.user.username},function (err,docs1) {
        client.verify.services(serid)
            .verifications
            .create({to: docs1[0].phone, channel: 'sms'})
            .then(verification => console.log(verification.status));
    });

   res.render("phone",{phoneType:req.body.phoneType});

});

app.get("/login",function (req,res) {
    res.render("login",{forLogin:forLogin,forLoginPromt:forLoginPromt});
    forLogin="";
    forLoginPromt="";
});

app.get("/register",function (req,res) {
    res.render("register");
});

app.get("/home",function (req,res) {
    if(req.isAuthenticated()){
        newname=req.user.name;
        //console.log(req.user.username);
        res.render("home",{newname:newname,forLogout:forLogout});
    }
    else
        res.render("home",{newname:"",forLogout:forLogout});
    forLogout="no";


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
            //console.log(arr);
            Item.find({}).sort({"sold":-1}).exec(function (err,docs1) {
                res.render("buy",{items:docs1,arr:arr});
            });
        });
});

app.get("/menu/:someurl",function (req,res) {
    var login="";
    var dis="no";
    if(req.isAuthenticated()){
        login="yes";
    }
    else
        login="no";
    const menuname=req.params.someurl;
        Item.find(function (err,docs) {
            res.render("menu",{items:docs,menuname:menuname,login:login,dis:dis});
        });

});

app.get("/menu/:someurl/:somename",function (req,res) {
    var login="";
    if(req.isAuthenticated()){
        login="yes";
    }
    else
        login="no";
        const menuname=req.params.someurl;
        const filtername=req.params.somename;
        var dis="";
        if(filtername==="pop")
        {
            dis="no";
            Item.find({}).sort({"sold":-1}).exec(function (err,docs) {
                res.render("menu",{items:docs,menuname:menuname,login:login,dis:dis})
            });
        }
        if(filtername==="asc")
        {
            dis="no";
            Item.find({}).sort({"price":1}).exec(function (err,docs) {
                res.render("menu",{items:docs,menuname:menuname,login:login,dis:dis})
            });
        }
        if(filtername==="dsc")
        {
            dis="no";
            Item.find({}).sort({"price":-1}).exec(function (err,docs) {
                res.render("menu",{items:docs,menuname:menuname,login:login,dis:dis})
            });
        }
        if(filtername==="dis")
        {
            dis="yes";
            //Item.updateMany({},{distance:haversine_distance(req.user.lat,req.user.long,lat,long)});
            //console.log("hii");
            Item.find({},function (err,arr){
                //console.log(arr.length);
                for(var i=0;i<arr.length;i++) {
                    Item.findOne({name:arr[i].name},function (err2,doc){
                        //console.log(doc);
                        doc.distance = haversine_distance(req.user.lat, req.user.long, doc.lat, doc.long);
                        doc.save();
                    });


                }
            });

            Item.find({}).sort({"distance":"asc"}).exec(function (err,docs) {
                res.render("menu",{items:docs,menuname:menuname,login:login,dis:dis})
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
    if(req.isAuthenticated()){
        User.find({username:req.user.username},function (err,docs1) {
            //console.log(docs1[0].emailVerify);
            Item.find(function (err, docs) {
                res.render("cart", {docs: docs, items: items, email:docs1[0].emailVerify, phone:docs1[0].phoneVerify });
            });
        });
    }
    else{
        forLogin="cart";
        res.redirect("/login");
    }


});

app.get("/:somename/image",function (req,res) {
    res.render("image",{newname:req.params.somename});
});

app.get("/sell",function (req,res){
    if(req.isAuthenticated()){
        User.find({username:req.user.username},function (err,docs1) {
            res.render("sell",{email:docs1[0].emailVerify,phone:docs1[0].phoneVerify});
        });
    }
    else{
        forLogin="sell";
        res.redirect("/login");
    }
});

app.get("/success",function (req,res) {
    res.render("success",{forSuc:forSuc});
    forSuc="";
});
app.get("/failure",function (req,res) {
    res.render("failure");
});
app.get("/account",function (req,res) {
    if(req.isAuthenticated()){
        User.find({username:req.user.username},function (err,docs) {
            res.render("account",{docs:docs[0],newname:req.user.name,userLat:req.user.lat,userLong:req.user.long,userName:req.user.username});
            //console.log(docs[0]);
        });
    }
    else
        res.redirect("/login");


});

app.get("/logout",function (req,res) {
    req.logout();
    forLogout="yes";
    res.redirect("/home");
});

app.get("/reset",function (req,res) {
    res.render("reset",{forReset:forReset});
    forReset="";
});


app.get("/verify/:checkname",async (req,res,next) => {
    //console.log("success");
    //console.log(req.params);
    try {
        const user = await User.findOne({ emailToken: req.params.checkname});
        if(!user)
            console.log("Error");
        else{
            user.emailToken= null;
            user.emailVerify= true;
            await user.save();
            await req.login(user,async (err) => {
                if(err) return next(err);

                const redirectUrl= req.session.redirectTo || "/";
                delete req.session.redirectTo;
                res.redirect(redirectUrl);
            });
        }
    } catch(error){
        console.log(error);
        res.redirect("/");
    }
    // User.findOneAndUpdate({username: req.params.checkname},{emailVerify:true},function (err,doc) {
    //     if(err)
    //         console.log(err);
    //
    // });
    // res.render("mail");
});

app.get("/delivery",function (req,res){

    Order.find({},async function (err,docs){
        let userLat=[];
        let userLong=[];
        let itemLat=[];
        let itemLong=[];
        for(var i=0;i<docs.length;i++){
            //userLat[i]=User.find({username:docs[i].userName}).lat;
            //userLong[i]=User.find({username:docs[i].userName}).long;
            let result=await User.find({username:docs[i].userName});
            let item=await Item.find({name:docs[i].name});
            //console.log(result);
            userLat[i]=result[0].lat;
            userLong[i]=result[0].long;
            itemLat[i]=item[0].lat;
            itemLong[i]=item[0].long;
            //console.log(userLat[i],userLong[i]);
        }
        //console.log(userLat[0],userLong[0]);
        res.render("delivery",{docs:docs,userLong:userLong,userLat:userLat,itemLat:itemLat,itemLong:itemLong});
    });

});

app.post("/deliver",function (req,res){
    //console.log(req.body.itemName);
    //console.log(req.body.userName);
   Order.findOneAndUpdate({name:req.body.itemName,userName:req.body.userName},{active:true},function (err,docs){
       if(err)
        console.log(err);
       //console.log(docs);
   });
   res.redirect("/delivery");
});

app.post("/delivered",function (req,res){
    Order.findOneAndUpdate({name:req.body.itemName,userName:req.body.userName},{delivered:true},function (err,docs){
        if(err)
            console.log(err);
    });
    res.redirect("/delivery");
});

app.post("/getdeliveryApi",function (req,res){
    //console.log(req.body);
    //console.log(deliveryLat,deliveryLong);
    Order.find({name:req.body.itemName, userName: req.body.userName},function (err,docs){
        if(err)
            console.log(err);
        res.json({
            active:docs[0].active,
            delivered:docs[0].delivered,
            delLat:deliveryLat,
            delLong:deliveryLong
        });
    });

});

app.post("/deliveryApi",function (req,res){
    //console.log(req.body);
    deliveryLat=req.body.lat;
    deliveryLong=req.body.long;
    //console.log(deliveryLat,deliveryLong);
    res.json({
       status:"success"
    });
});

app.post("/phone",function (req,res){

    User.find({username:req.user.username},function (err,docs1) {
        client.verify.services(serid)
            .verificationChecks
            .create({to: docs1[0].phone, code: req.body.password})
            .then(verification_check => {
                console.log(verification_check.status);
                if(verification_check.status=="approved")
                {
                    console.log("yes");
                    User.findOneAndUpdate({username: req.user.username}, {phoneVerify: true}, function (err, doc) {
                        if (err)
                            console.log(err);

                    });
                }
            });
    });

    if(req.body.phoneType==="cart"){
        res.redirect("/cart");
    }
    else if(req.body.phoneType==="sell")
        res.redirect("/sell");
    else
        res.redirect("/home");
});

app.post("/login",function (req,res) {
    const user= new User({
        username:req.body.email,
        password:req.body.password
    });

    passport.authenticate('local', function (err, user, info) {
        if(err){
            res.json({success: false, message: err})
        } else{
            if (! user) {
                forLoginPromt="yes";
                res.redirect("/login");
                console.log(info);
            } else{
                req.login(user, function(err){
                    if(err){
                        console.log(err);
                        res.redirect("/login");
                    }else{

                        if(req.body.type==="cart")
                            res.redirect("/cart");
                        else if(req.body.type==="sell")
                            res.redirect("/sell");
                        else
                            res.redirect("/home");
                         }
                    });
            }
        }
    })(req, res);
    // req.login(user, function (err) {
    //
    //     if(err)
    //     {console.log(err);
    //     res.redirect("/login");}
    //     else{
    //         passport.authenticate("local");
    //         res.redirect("/home");
    //     }
    // });
});

app.post("/register",async function (req,res) {
    Users=new User({username : req.body.username});
    User.register(Users,req.body.password,function (err,user) {
        if(err){
            res.redirect("/register");
            console.log(err);
        }

            User.findOneAndUpdate({username: req.body.username},{name:req.body.name,phone:req.body.phone,emailVerify:false,phoneVerify:false,emailToken: crypto.randomBytes(64).toString('hex'),lat: parseFloat(req.body.lat) , long: parseFloat(req.body.long)},function (err,doc) {
                if(err)
                    console.log(err);

            });
            passport.authenticate("local")(req,res,async function (){

                // sgMail
                //     .send(msg)
                //     .then(() => {}, error => {
                //         console.error(error);
                //
                //         if (error.response) {
                //             console.error(error.response.body)
                //         }
                //     });
                // res.redirect("/home");
            });

            User.findOne({username: req.body.username}, async function (err,doc){
                var link=""
                if(req.headers.host==="localhost:3000")
                 link="http://"+req.headers.host+"/verify/"+doc.emailToken;
                else
                    link="https://"+req.headers.host+"/verify/"+doc.emailToken;
                const msg = {
                    to: req.body.username,
                    from: 'jonathansamuel2k@gmail.com', // Use the email address or domain you verified above
                    subject: 'Sending with Twilio SendGrid is Fun',
                    text: 'and easy to do anywhere, even with Node.js',
                    html: "<!DOCTYPE html>\n" +
                        "<html lang=\"en\" >\n" +
                        "<head>\n" +
                        "  <meta charset=\"UTF-8\">\n" +
                        "  <title>Confirmation E-Mail</title>\n" +
                        "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.0/css/bootstrap.min.css'>\n" +
                        "\n" +
                        "</head>\n" +
                        "<body>\n" +
                        "<!-- partial:index.partial.html -->\n" +
                        "<div class=\"container\" style=\"padding-top:50px;\">\n" +
                        "  <img src=\"/foodify-logo.png\" style=\"width:60%; max-width: 200px;\">\n" +
                        "  <h3>Thanks for registering to our service!</h3>\n" +
                        "  <p>Please click the link below to verify your e-mail.</p>\n" +
                        "  <a href="+link+"><button class=\"btn btn-outline-primary\">Verify my E-Mail</button></a>\n" +
                        "</div>\n" +
                        "<!-- partial -->\n" +
                        "  <script src='https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.5.2/js/bootstrap.min.js'></script>\n" +
                        "</body>\n" +
                        "</html>\n"
                }
                try{
                    await sgMail.send(msg);

                    res.redirect("/phone");
                } catch(error){

                    res.redirect("/register");
                }
            });


            // userTransfer=req.body.username;
            // forLogin="again";
            // res.redirect("/mail");


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
    User.findOneAndUpdate({username:req.user.username},{$push: { orders: req.body }}, function (err,doc) {

        if(err)
            res.redirect("/failure");
    });

    for(const property in req.body){
        if(property!="total"){
            Item.find({name:property},function (err,docs){
                //console.log(docs);
                User.findOneAndUpdate({username:req.user.username},{$push: { orderLocations: [docs[0].lat,docs[0].long] }}, function (err,doc) {
                    if(err)
                        console.log(err);
                });
                // User.findOneAndUpdate({username:req.user.username},{$push: { orderLocations: docs[0].long }}, function (err,doc) {
                //     if(err)
                //         console.log(err);
                // });
                Order.create({
                    name:property,
                    userName: req.user.username,
                    active: false,
                    delivered: false
                });
            });
        }
    }
    forSuc="buy";
    res.redirect("/success");
});

app.post('/image', upload.single('photo'), (req, res) => {

    if(req.file) {

        cloudinary.uploader.upload(req.file.path, function(error, result) {


            Item.findOneAndUpdate({name:req.body.somename},{img:result.url},function (err,docs) {
                if(err)
                    console.log(err);
            });
        });
        forSuc="sell";
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
    Item.create({name:req.body.name,discription:req.body.disc,price:req.body.price,category:"food",subcategory:newname,by:req.user.name,sold:"0",veg:true,lat:req.user.lat,long:req.user.long,distance:"0"});
    User.findOneAndUpdate({username:req.user.username},{$push: { selling: req.body.name }}, function (err,doc) {
        if(err)
            console.log(err);
    });
    res.redirect("/"+req.body.name+"/image");
});

app.post("/reset",function (req,res) {
    // User.find({username:req.body.username},function (err,doc) {
    //     if(err)
    //         console.log(err);
    //     console.log(doc);
    //     // doc.setPassword(req.body.password,function (err) {
    //     //     if(err)
    //     //         res.redirect("/failure");
    //     //     else{
    //     //         doc.save();
    //     //         res.redirect("/success");
    //     //     }
    //
    //     // });
    // });

    User.findByUsername(req.body.username).then(function(sanitizedUser){
        if (sanitizedUser){
            sanitizedUser.setPassword(req.body.password, function(){
                sanitizedUser.save();
                forLogin="again";
                res.redirect("/login");
            });
        } else {
            forReset="yes";
            res.redirect("/reset");
        }
    },function(err){
        console.error(err);
    })
});

let PORT=process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log("Server started on port 3000");
});