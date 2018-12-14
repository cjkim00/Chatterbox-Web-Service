/**
 * regisger.js: handles the registration of new users
 */

var express = require('express');
var nodemailer = require("nodemailer");
var app = express();
var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "450finalproject@gmail.com",
        pass: "project123!"
    }
});

//generates a random value that is used to verify the user
var randomValue = randomValue = Math.floor((Math.random() * 100000) + 54), mailOptions, host, link;


const crypto = require("crypto");
let db = require('../utilities/utils').db;
let getHash = require('../utilities/utils').getHash;
var router = express.Router();
const bodyParser = require("body-parser");


//checks if the email sent is valid
function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

router.use(bodyParser.json());

/**
 *This endpoint handles registerinmg a new user
 */
router.post('/', (req, res) => {
    var list = [];
    res.type("application/json");
    //Retrieve data from query params
    var email = req.body['email'];
    var password = req.body['password'];
    var first = req.body['first'];
    var last = req.body['last'];
    var nickname = req.body['nickname'];

    
    if (first && last && nickname && email && password) {
        if (validateEmail(email)) {
            let salt = crypto.randomBytes(32).toString("hex");
            let salted_hash = getHash(password, salt);
            let params = [first, last, nickname, email, salted_hash, salt];
            //if the required information is sent to the endpoint then insert the information into the members table with the verification defaulted to 0
            db.none("INSERT INTO MEMBERS(FirstName, LastName, Username, Email, Password, Salt) VALUES ($1, $2, $3, $4, $5, $6)", params)
                .then(() => {
                    host = req.get('host');
                    res.type("application/json");
                    //sends an email to verify the user to the email that was provided
                    link = "http://final-project-450.herokuapp.com" + "/register/verify?id=" + randomValue;
                    mailOptions = {
                        to: email,
                        subject: "Please confirm your Email account",
                        html: "Hello,<br> Please Click on the link to verify your email.<br><a href=" + link + ">Click here to verify</a>"
                    }
                    db.manyOrNone('SELECT email FROM Members')
                        .then(rows => {
                            rows.forEach(element => {
                                list.push(element);
                            });
                        })
                    console.log(mailOptions);
                    smtpTransport.sendMail(mailOptions, function (error, response) {
                        if (error) {
                            console.log(error);
                            res.end("error");
                        } else {
                            console.log("Message sent: " + response.message);
                            res.end("sent");
                        }
                    });
                    res.send({
                        success: true,
                        testInfo: "SELECT * FROM Members;",
                        emails: list
                    });
                }).catch((err) => {
                    console.log(err);
                    res.send({
                        success: false,
                        error: err
                    });
                });
        } else {
            res.send({
                success: false
            });
        }
    } else {
        res.send({
            success: false,
            input: req.body,
            error: "Missing required user information"
        });
    }
});

/**
 *This endpoint handles verifying the user
 */
router.get('/verify', (req, res) => {
    host = req.get('host');
    console.log(req.protocol + ":/" + req.get('host'));
    //if the host url matches the correct one
    if ((req.protocol + "://" + req.get('host')) == ("http://" + host)) {
        console.log("Domain is matched. Information is from Authentic email");
        //if the random value generated for the email matches the one saved for the user
        if (req.query.id == randomValue) {
            //updates the verification of the user to 1
            db.one('UPDATE Members SET verification = 1 WHERE email = $1', [mailOptions.to]);
            console.log("email is verified");
            res.end("<h1>Email " + mailOptions.to + " is been Successfully verified");
        }
        else {
            console.log("email is not verified");
            res.end("<h1>Bad Request</h1>" + "rand value ");
        }
    }
    else {
        res.end("<h1>Request is from unknown source");
    }
});

module.exports = router;