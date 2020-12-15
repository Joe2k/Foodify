require('dotenv').config();
const sgMail = require('@sendgrid/mail');

const sgConfig = sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = sgConfig;