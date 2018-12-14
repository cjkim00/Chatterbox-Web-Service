//express is the framework we're going to use to handle requests
var express = require('express');
//Create connection to Heroku Database

let sendEmail = require('../utilities/utils').sendEmail;

var router = express.Router();
const bodyParser = require("body-parser");

var randomValue = randomValue = Math.floor((Math.random() * 100000) + 54), mailOptions, host, link;

// var initValue = 0;
// var a = require('./register')(initValue);
// var randomValue = a.getRand();

router.use(bodyParser.json());
router.post('/', (req, res) => {
    res.type("application/json");
    //Retrieve data from query params
    
    var email = req.body['email'];

    sendEmail("450finalproject@gmail.com", email, "Welcome!", "Welcome to our app!");

    // var nodemailer = require('nodemailer');

    // var transporter = nodemailer.createTransport({
    //     service: 'gmail',
    //     auth: {
    //         user: '450finalproject@gmail.com',
    //         pass: 'project123!'
    //     }
    // });

    // link = "http://final-project-450.herokuapp.com" + "/register/verify?id=" + randomValue;

    // var mailOptions = {
    //     to: email,
    //     subject: "Please confirm your Email account",
    //     html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">Click here to verify</a>"
    // };
    // db.manyOrNone('SELECT email FROM Members')
    //     .then(rows => {
    //         rows.forEach(element => {
    //             list.push(element);
    //         });
    //     })

    // transporter.sendMail(mailOptions, function (error, info) {
    //     if (error) {
    //         console.log(error);
    //         res.end("error");
    //     } else {
    //         console.log('Email sent: ' + info.response);
    //         res.end("sent");
    //     }
    // });
    res.send({
        success: true,
    });
});

module.exports = router;
