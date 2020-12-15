require('dotenv').config();

const accountSid = process.env.PHONE_ID;
const authToken = process.env.PHONE_TOKEN;
const client = require('twilio')(accountSid, authToken);
let serviceId;

client.verify.services.create({friendlyName: 'Foodify'})
    .then(service => serviceId=service.sid);

module.exports = {
    serviceId : serviceId,
    client : client
}