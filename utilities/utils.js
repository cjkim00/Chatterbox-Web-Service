//Get the connection to Heroku Database
let db = require('./sql_conn.js');

//We use this create the SHA256 hash
const crypto = require("crypto");

var randomValue = randomValue = Math.floor((Math.random() * 100000) + 54);

function sendEmail(from, receiver, subj, message, rVal) {

    var nodemailer = require('nodemailer');

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '450finalproject@gmail.com',
            pass: 'project123!'
        }
    });

    link = "http://final-project-450.herokuapp.com" + "/register/verify?id=" + randomValue;

    var mailOptions = {
        to: receiver,
        subject: "Please confirm your Email account",
        html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">Click here to verify</a>"
    };
    db.manyOrNone('SELECT email FROM Members')
        .then(rows => {
            rows.forEach(element => {
                list.push(element);
            });
        })

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            res.end("error");
        } else {
            console.log('Email sent: ' + info.response);
            res.end("sent");
        }
    });
    console.log('Email sent: ' + message);
}

/**
* Method to get a salted hash.
* We put this in its own method to keep consistency
* @param {string} pw the password to hash
* @param {string} salt the salt to use when hashing
*/
function getHash(pw, salt) {
    return crypto.createHash("sha256").update(pw + salt).digest("hex");
}
let admin = require('./firebase_services.js').admin;
let fcm_functions = require('./firebase_services.js').fcm_functions;

module.exports = {
    db, getHash, sendEmail, admin, fcm_functions
};