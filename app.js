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

const app = express();

app.set('view engine', 'ejs');

cloudinary.config({
    cloud_name:"du9apidv6",
    api_key:"511194793499251",
    api_secret:"V-FKfZT2hbvXYc2IMP5iSnUcShk"
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

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
var forLoginPromt="";
var forSuc="";
var forReset="";
var forLogin="";
var forLogout="no";
var userTransfer="";

app.get("/",function (req,res) {
    res.redirect("/home");

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
    if(req.isAuthenticated()){
        Item.find(function (err,docs) {
            res.render("cart",{docs:docs,items:items});
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
        res.render("sell");
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
        User.find({name:req.user.name},function (err,docs) {
            res.render("account",{docs:docs[0],newname:req.user.name});
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

app.get("/mail",function (req,res) {
    var link="https://desolate-shore-11420.herokuapp.com/mail/verify/"+userTransfer;
    const msg = {
        to: userTransfer,
        from: 'jonathansamuel2k@gmail.com', // Use the email address or domain you verified above
        subject: 'Sending with Twilio SendGrid is Fun',
        text: 'and easy to do anywhere, even with Node.js',
        html: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"><html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml"><head>\n' +
            '      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n' +
            '      <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1">\n' +
            '      <!--[if !mso]><!-->\n' +
            '      <meta http-equiv="X-UA-Compatible" content="IE=Edge">\n' +
            '      <!--<![endif]-->\n' +
            '      <!--[if (gte mso 9)|(IE)]>\n' +
            '      <xml>\n' +
            '        <o:OfficeDocumentSettings>\n' +
            '          <o:AllowPNG/>\n' +
            '          <o:PixelsPerInch>96</o:PixelsPerInch>\n' +
            '        </o:OfficeDocumentSettings>\n' +
            '      </xml>\n' +
            '      <![endif]-->\n' +
            '      <!--[if (gte mso 9)|(IE)]>\n' +
            '  <style type="text/css">\n' +
            '    body {width: 600px;margin: 0 auto;}\n' +
            '    table {border-collapse: collapse;}\n' +
            '    table, td {mso-table-lspace: 0pt;mso-table-rspace: 0pt;}\n' +
            '    img {-ms-interpolation-mode: bicubic;}\n' +
            '  </style>\n' +
            '<![endif]-->\n' +
            '      <style type="text/css">\n' +
            '    body, p, div {\n' +
            '      font-family: inherit;\n' +
            '      font-size: 14px;\n' +
            '    }\n' +
            '    body {\n' +
            '      color: #000000;\n' +
            '    }\n' +
            '    body a {\n' +
            '      color: #000000;\n' +
            '      text-decoration: none;\n' +
            '    }\n' +
            '    p { margin: 0; padding: 0; }\n' +
            '    table.wrapper {\n' +
            '      width:100% !important;\n' +
            '      table-layout: fixed;\n' +
            '      -webkit-font-smoothing: antialiased;\n' +
            '      -webkit-text-size-adjust: 100%;\n' +
            '      -moz-text-size-adjust: 100%;\n' +
            '      -ms-text-size-adjust: 100%;\n' +
            '    }\n' +
            '    img.max-width {\n' +
            '      max-width: 100% !important;\n' +
            '    }\n' +
            '    .column.of-2 {\n' +
            '      width: 50%;\n' +
            '    }\n' +
            '    .column.of-3 {\n' +
            '      width: 33.333%;\n' +
            '    }\n' +
            '    .column.of-4 {\n' +
            '      width: 25%;\n' +
            '    }\n' +
            '    @media screen and (max-width:480px) {\n' +
            '      .preheader .rightColumnContent,\n' +
            '      .footer .rightColumnContent {\n' +
            '        text-align: left !important;\n' +
            '      }\n' +
            '      .preheader .rightColumnContent div,\n' +
            '      .preheader .rightColumnContent span,\n' +
            '      .footer .rightColumnContent div,\n' +
            '      .footer .rightColumnContent span {\n' +
            '        text-align: left !important;\n' +
            '      }\n' +
            '      .preheader .rightColumnContent,\n' +
            '      .preheader .leftColumnContent {\n' +
            '        font-size: 80% !important;\n' +
            '        padding: 5px 0;\n' +
            '      }\n' +
            '      table.wrapper-mobile {\n' +
            '        width: 100% !important;\n' +
            '        table-layout: fixed;\n' +
            '      }\n' +
            '      img.max-width {\n' +
            '        height: auto !important;\n' +
            '        max-width: 100% !important;\n' +
            '      }\n' +
            '      a.bulletproof-button {\n' +
            '        display: block !important;\n' +
            '        width: auto !important;\n' +
            '        font-size: 80%;\n' +
            '        padding-left: 0 !important;\n' +
            '        padding-right: 0 !important;\n' +
            '      }\n' +
            '      .columns {\n' +
            '        width: 100% !important;\n' +
            '      }\n' +
            '      .column {\n' +
            '        display: block !important;\n' +
            '        width: 100% !important;\n' +
            '        padding-left: 0 !important;\n' +
            '        padding-right: 0 !important;\n' +
            '        margin-left: 0 !important;\n' +
            '        margin-right: 0 !important;\n' +
            '      }\n' +
            '    }\n' +
            '  </style>\n' +
            '      <!--user entered Head Start--><link href="https://fonts.googleapis.com/css?family=Viga&display=swap" rel="stylesheet"><style>\n' +
            '    body {font-family: \'Viga\', sans-serif;}\n' +
            '</style><!--End Head user entered-->\n' +
            '    </head>\n' +
            '    <body>\n' +
            '      <center class="wrapper" data-link-color="#000000" data-body-style="font-size:14px; font-family:inherit; color:#000000; background-color:#FFFFFF;">\n' +
            '        <div class="webkit">\n' +
            '          <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF">\n' +
            '            <tbody><tr>\n' +
            '              <td valign="top" bgcolor="#FFFFFF" width="100%">\n' +
            '                <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">\n' +
            '                  <tbody><tr>\n' +
            '                    <td width="100%">\n' +
            '                      <table width="100%" cellpadding="0" cellspacing="0" border="0">\n' +
            '                        <tbody><tr>\n' +
            '                          <td>\n' +
            '                            <!--[if mso]>\n' +
            '    <center>\n' +
            '    <table><tr><td width="600">\n' +
            '  <![endif]-->\n' +
            '                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px;" align="center">\n' +
            '                                      <tbody><tr>\n' +
            '                                        <td role="modules-container" style="padding:0px 0px 0px 0px; color:#000000; text-align:left;" bgcolor="#FFFFFF" width="100%" align="left"><table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">\n' +
            '    <tbody><tr>\n' +
            '      <td role="module-content">\n' +
            '        <p></p>\n' +
            '      </td>\n' +
            '    </tr>\n' +
            '  </tbody></table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:0px 0px 0px 0px;" bgcolor="#dde6de">\n' +
            '    <tbody>\n' +
            '      <tr role="module-content">\n' +
            '        <td height="100%" valign="top">\n' +
            '          <table class="column" width="580" style="width:580px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n' +
            '            <tbody>\n' +
            '              <tr>\n' +
            '                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="10cc50ce-3fd3-4f37-899b-a52a7ad0ccce">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:0px 0px 40px 0px;" role="module-content" bgcolor="">\n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="f8665f9c-039e-4b86-a34d-9f6d5d439327">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="font-size:50px; line-height:50px; padding:0px 0px 0px 0px;" valign="top" align="center">\n' +
            '          <h1 style="color: lightcoral ; font-size: 70px;">Food.</h1>\n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="module" role="module" data-type="spacer" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="10cc50ce-3fd3-4f37-899b-a52a7ad0ccce.1">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:0px 0px 30px 0px;" role="module-content" bgcolor="">\n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table></td>\n' +
            '              </tr>\n' +
            '            </tbody>\n' +
            '          </table>\n' +
            '          \n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="bff8ffa1-41a9-4aab-a2ea-52ac3767c6f4">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:18px 30px 18px 30px; line-height:40px; text-align:inherit; background-color:#dde6de;" height="100%" valign="top" bgcolor="#dde6de" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #6fab81; font-size: 40px; font-family: inherit">Thank you for using our service! Now what?</span></div><div></div></div></td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="2f94ef24-a0d9-4e6f-be94-d2d1257946b0">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:18px 50px 18px 50px; line-height:22px; text-align:inherit; background-color:#dde6de;" height="100%" valign="top" bgcolor="#dde6de" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="font-size: 16px; font-family: inherit">Confirm your email address to start buying and selling food items in our web app.&nbsp;</span></div><div></div></div></td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="c7bd4768-c1ab-4c64-ba24-75a9fd6daed8">\n' +
            '      <tbody>\n' +
            '        <tr>\n' +
            '          <td align="center" bgcolor="#dde6de" class="outer-td" style="padding:10px 0px 20px 0px;">\n' +
            '            <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">\n' +
            '              <tbody>\n' +
            '                <tr>\n' +
            '                <td align="center" bgcolor="#eac96c" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;">\n' +

            '                  <a href='+link+' style="background-color:#eac96c; border:0px solid #333333; border-color:#333333; border-radius:0px; border-width:0px; color:#000000; display:inline-block; font-size:16px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:20px 30px 20px 30px; text-align:center; text-decoration:none; border-style:solid; font-family:inherit;" target="_blank">Confirm Email</a>\n' +

            '                   </td>\n' +
            '                </tr>\n' +
            '              </tbody>\n' +
            '            </table>\n' +
            '          </td>\n' +
            '        </tr>\n' +
            '      </tbody>\n' +
            '    </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:30px 0px 0px 0px;" bgcolor="#dde6de">\n' +
            '    <tbody>\n' +
            '      <tr role="module-content">\n' +
            '        <td height="100%" valign="top">\n' +
            '          <table class="column" width="600" style="width:600px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n' +
            '            <tbody>\n' +
            '              <tr>\n' +
            '                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="ce6dd3be-5ed4-42d2-b304-55a58022cdf0">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">\n' +
            '          <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px; max-width:100% !important; width:100%; height:auto !important;" width="600" alt="" data-proportionally-constrained="true" data-responsive="true" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/a8915cf9-9083-4c7b-bf41-dfbe1bdec0f7/600x539.png">\n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table></td>\n' +
            '              </tr>\n' +
            '            </tbody>\n' +
            '          </table>\n' +
            '          \n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table border="0" cellpadding="0" cellspacing="0" align="center" width="100%" role="module" data-type="columns" style="padding:40px 30px 30px 30px;" bgcolor="#dde6de">\n' +
            '    <tbody>\n' +
            '      <tr role="module-content">\n' +
            '        <td height="100%" valign="top">\n' +
            '          <table class="column" width="166" style="width:166px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 0px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n' +
            '            <tbody>\n' +
            '              <tr>\n' +
            '                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="35f4b6e7-fc49-4a6f-a23c-e84ad33abca4">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">\n' +
            '          <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="80" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/0394b217-16c4-49ae-b696-561adcd513aa/119x119.png" height="80">\n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="4f3e6dad-4d49-49b4-b842-97c93e43616f">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:18px 0px 18px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit"><span style="font-size: 14px">Keep track of your spending by day, week, month, quarterly or year!&nbsp;</span></div>\n' +
            '<div style="font-family: inherit; text-align: inherit"><br></div>\n' +
            '<div style="font-family: inherit; text-align: inherit"><a href="http://"><span style="font-size: 14px"><u>Learn More</u></span></a></div><div></div></div></td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table></td>\n' +
            '              </tr>\n' +
            '            </tbody>\n' +
            '          </table>\n' +
            '          <table class="column" width="166" style="width:166px; border-spacing:0; border-collapse:collapse; margin:0px 10px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="">\n' +
            '            <tbody>\n' +
            '              <tr>\n' +
            '                <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="0cb2f52e-e1c0-4b42-a114-04aa36fe57f5">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">\n' +
            '          <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="80" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/461a0641-b2b7-459c-ab49-ea560fc221f7/119x119.png" height="80">\n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="9bf90608-97e0-467e-a709-f45d87b0451b">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:18px 0px 18px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit"><span style="font-size: 14px">Recieve text or email alerts when you’re close to going above your limit.</span></div>\n' +
            '<div style="font-family: inherit; text-align: inherit"><br></div>\n' +
            '<div style="font-family: inherit; text-align: inherit"><a href="http://"><span style="font-size: 14px"><u>Learn More&nbsp;</u></span></a></div><div></div></div></td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table></td>\n' +
            '              </tr>\n' +
            '            </tbody>\n' +
            '          </table>\n' +
            '        <table width="166" style="width:166px; border-spacing:0; border-collapse:collapse; margin:0px 0px 0px 10px;" cellpadding="0" cellspacing="0" align="left" border="0" bgcolor="" class="column column-2">\n' +
            '      <tbody>\n' +
            '        <tr>\n' +
            '          <td style="padding:0px;margin:0px;border-spacing:0;"><table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="231c1abd-75e6-4f22-a697-c5f3819b2b07">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="font-size:6px; line-height:10px; padding:0px 0px 0px 0px;" valign="top" align="center">\n' +
            '          <img class="max-width" border="0" style="display:block; color:#000000; text-decoration:none; font-family:Helvetica, arial, sans-serif; font-size:16px;" width="80" alt="" data-proportionally-constrained="true" data-responsive="false" src="http://cdn.mcauto-images-production.sendgrid.net/954c252fedab403f/61f17ba7-b7af-4276-8e61-2501e525e4c3/119x119.png" height="80">\n' +
            '        </td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="e82d5e62-b94c-42bb-a289-4515ec9ecc85">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:18px 0px 18px 0px; line-height:22px; text-align:inherit;" height="100%" valign="top" bgcolor="" role="module-content"><div><div style="font-family: inherit; text-align: inherit"><span style="font-size: 14px">Receive special members-only discounts on over 300 retailers!</span></div>\n' +
            '<div style="font-family: inherit; text-align: inherit"><br></div>\n' +
            '<div style="font-family: inherit; text-align: inherit"><a href="http://"><span style="font-size: 14px"><u>Learn More&nbsp;</u></span></a></div><div></div></div></td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table></td>\n' +
            '        </tr>\n' +
            '      </tbody>\n' +
            '    </table></td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;" data-muid="30d9a68c-ce13-4754-a845-6c3dc22721ee">\n' +
            '    <tbody>\n' +
            '      <tr>\n' +
            '        <td style="padding:40px 40px 40px 40px; line-height:22px; text-align:inherit; background-color:#fe737c;" height="100%" valign="top" bgcolor="#fe737c" role="module-content"><div><div style="font-family: inherit; text-align: center"><span style="color: #ffffff; font-size: 16px">Need more help figuring things out? Our support team is here to help!</span></div>\n' +
            '<div style="font-family: inherit; text-align: center"><br></div>\n' +
            '<div style="font-family: inherit; text-align: center"><a href="http://www.google.com"><span style="color: #ffffff; font-size: 16px"><u>Help Center</u></span></a></div><div></div></div></td>\n' +
            '      </tr>\n' +
            '    </tbody>\n' +
            '  </table><div data-role="module-unsubscribe" class="module" role="module" data-type="unsubscribe" style="color:#444444; font-size:12px; line-height:20px; padding:16px 16px 16px 16px; text-align:Center;" data-muid="4e838cf3-9892-4a6d-94d6-170e474d21e5">\n' +
            '                                            <div class="Unsubscribe--addressLine"><p class="Unsubscribe--senderName" style="font-size:12px; line-height:20px;">{{Sender_Name}}</p><p style="font-size:12px; line-height:20px;"><span class="Unsubscribe--senderAddress">{{Sender_Address}}</span>, <span class="Unsubscribe--senderCity">{{Sender_City}}</span>, <span class="Unsubscribe--senderState">{{Sender_State}}</span> <span class="Unsubscribe--senderZip">{{Sender_Zip}}</span></p></div>\n' +
            '                                            <p style="font-size:12px; line-height:20px;"><a class="Unsubscribe--unsubscribeLink" href="{{{unsubscribe}}}" target="_blank" style="">Unsubscribe</a> - <a href="{{{unsubscribe_preferences}}}" target="_blank" class="Unsubscribe--unsubscribePreferences" style="">Unsubscribe Preferences</a></p>\n' +
            '                                          </div><table border="0" cellpadding="0" cellspacing="0" class="module" data-role="module-button" data-type="button" role="module" style="table-layout:fixed;" width="100%" data-muid="188c3d22-338c-4a35-a298-a7d3957f579d">\n' +
            '      <tbody>\n' +
            '        <tr>\n' +
            '          <td align="center" bgcolor="" class="outer-td" style="padding:0px 0px 20px 0px;">\n' +
            '            <table border="0" cellpadding="0" cellspacing="0" class="wrapper-mobile" style="text-align:center;">\n' +
            '              <tbody>\n' +
            '                <tr>\n' +
            '                <td align="center" bgcolor="#f5f8fd" class="inner-td" style="border-radius:6px; font-size:16px; text-align:center; background-color:inherit;"><a href="https://www.sendgrid.com/?utm_source=powered-by&utm_medium=email" style="background-color:#f5f8fd; border:1px solid #f5f8fd; border-color:#f5f8fd; border-radius:25px; border-width:1px; color:#a8b9d5; display:inline-block; font-size:10px; font-weight:normal; letter-spacing:0px; line-height:normal; padding:5px 18px 5px 18px; text-align:center; text-decoration:none; border-style:solid; font-family:helvetica,sans-serif;" target="_blank">♥ POWERED BY TWILIO SENDGRID</a></td>\n' +
            '                </tr>\n' +
            '              </tbody>\n' +
            '            </table>\n' +
            '          </td>\n' +
            '        </tr>\n' +
            '      </tbody>\n' +
            '    </table></td>\n' +
            '                                      </tr>\n' +
            '                                    </tbody></table>\n' +
            '                                    <!--[if mso]>\n' +
            '                                  </td>\n' +
            '                                </tr>\n' +
            '                              </table>\n' +
            '                            </center>\n' +
            '                            <![endif]-->\n' +
            '                          </td>\n' +
            '                        </tr>\n' +
            '                      </tbody></table>\n' +
            '                    </td>\n' +
            '                  </tr>\n' +
            '                </tbody></table>\n' +
            '              </td>\n' +
            '            </tr>\n' +
            '          </tbody></table>\n' +
            '        </div>\n' +
            '      </center>\n' +
            '    \n' +
            '  \n' +
            '</body></html>',
    };
    sgMail
        .send(msg)
        .then(() => {}, error => {
            console.error(error);

            if (error.response) {
                console.error(error.response.body)
            }
        });
    userTransfer="";
    res.redirect("/login");
});

app.get("/mail/verify/:checkname",function (req,res){
    console.log("success");
    console.log(req.params);
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

app.post("/register",function (req,res) {
    Users=new User({username : req.body.username});
    User.register(Users,req.body.password,function (err,user) {
        if(err){
            res.redirect("/register");
            console.log(err);
        }

        else
        {
            User.findOneAndUpdate({username: req.body.username},{name:req.body.name,phone:req.body.phone,area:req.body.area},function (err,doc) {
                if(err)
                    console.log(err);
                else
                    console.log(doc);
            });
            passport.authenticate("local");
            forLogin="again";
            userTransfer=req.body.username;
            res.redirect("/mail");

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
            forSuc="buy";
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
    Item.create({name:req.body.name,discription:req.body.disc,price:req.body.price,category:"food",subcategory:newname,by:req.user.name,sold:"0",veg:true});
    User.findOneAndUpdate({name:req.user.name},{$push: { selling: req.body.name }}, function (err,doc) {
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