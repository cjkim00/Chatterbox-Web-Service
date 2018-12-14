//express is the framework we're going to use to handle requests
const express = require('express');
//Create connection to Heroku Database
let db = require('../utilities/utils').db;
let getHash = require('../utilities/utils').getHash;
var router = express.Router();
const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());
router.post('/', (req, res) => {
    let email = req.body['email'];
    let theirPw = req.body['password'];
    let wasSuccessful = false;
    if (email && theirPw) {
        //Using the 'one' method means that only one row should be returned
        db.one('SELECT Password, Salt FROM Members WHERE Email=$1', [email])
            //If successful, run function passed into .then()
            .then(row => {
                let salt = row['salt'];
                //Retrieve our copy of the password
                let ourSaltedHash = row['password'];

                //Combined their password with our salt, then hash
                let theirSaltedHash = getHash(theirPw, salt);
                //Did our salted hash match their salted hash?
                let wasCorrectPw = ourSaltedHash === theirSaltedHash;
                let wasVerified = false;
                if (row['verification'] == 1) {
                    wasVerified = true;
                } else {
                    wasVerified = false;
                }
                //Send whether they had the correct password or not
                res.send({
                    success: wasCorrectPw && wasVerified,
                    message: wasVerified
                });
            })
            //More than one row shouldn't be found, since table has constraint on it
            .catch((err) => {
                //If anything happened, it wasn't successful
                res.send({
                    success: false,
                    message: err
                });
            });
    } else {
        res.send({
            success: false,
            message: 'missing credentials'
        });
    }
});
router.post('/with_token', (req, res) => {
    let email = req.body['email'];
    let token = req.body['token'];
    let theirPw = req.body['password'];
    if (email && theirPw && token) {
        //Using the 'one' method means that only one row should be returned
        db.one('SELECT MemberID, Password, Salt FROM Members WHERE Email=$1', [email])
            //If successful, run function passed into .then()
            .then(row => {
                let salt = row['salt'];
                //Retrieve our copy of the password
                let ourSaltedHash = row['password'];

                //Combined their password with our salt, then hash
                let theirSaltedHash = getHash(theirPw, salt);
                //Did our salted hash match their salted hash?
                let wasCorrectPw = ourSaltedHash === theirSaltedHash;
                if (wasCorrectPw) {
                    //password and email match. Save the current FB Token
                    let id = row['memberid'];
                    let params = [id, token];
                    db.manyOrNone('INSERT INTO FCM_Token (memberId, token) VALUES ($1, $2) ON CONFLICT (memberId) DO UPDATE SET token = $2; ', params)
                        .then(row => {
                            res.send({
                                success: true,
                                message: "Token Saved"
                            });
                        })
                        .catch(err => {
                            console.log("failed on insert");
                            console.log(err);
                            //If anything happened, it wasn't successful
                            res.send({
                                success: false,
                                message: err
                            });
                        })
                } else {
                    res.send({
                        success: false
                    });
                }
            })
            //More than one row shouldn't be found, since table has constraint on it
            .catch((err) => {
                //If anything happened, it wasn't successful
                res.send({
                    success: false,
                    message: err
                });
            });
    } else {
        res.send({
            success: false,
            message: 'missing credentials'
        });
    }
});
module.exports = router;