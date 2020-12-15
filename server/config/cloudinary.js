require('dotenv').config();
const cloudinary = require('cloudinary').v2;

const cloudSetup = () => cloudinary.config({
    cloud_name:"du9apidv6",
    api_key:process.env.CLOUD_KEY,
    api_secret:process.env.CLOUD_SECRET
});

module.exports = cloudSetup;