//express is the framework we're going to use to handle requests
const express = require('express');
//Create connection to Heroku Database
let db = require('../utilities/utils').db;
var router = express.Router();
const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());
let fcm_functions = require('../utilities/utils').fcm_functions;

//send a message to all users "in" the chat session with chatId
router.post("/send", (req, res) => {
    let email = req.body['email'];
    let message = req.body['message'];
    let chatId = req.body['chatId'];
    if (!email || !message || !chatId) {
        res.send({
            success: false,
            error: "Username, message, or chatId not supplied"
        });
        return;
    }
    //add the message to the database
    let insert = `INSERT INTO Messages(ChatId, Message, MemberId)
                    SELECT $1, $2, MemberId FROM Members
                    WHERE email=$3`
    db.none(insert, [chatId, message, email])
        .then(() => {
            //send a notification of this message to ALL members with registered tokens
            // db.manyOrNone('SELECT * FROM FCM_Token')
            // send notif. of this message to member with given chatid 
            db.manyOrNone(`select members.memberid, fcm_token.token
                            from members, fcm_token, chatmembers 
                            where members.memberid=fcm_token.memberid and chatid=$1 and chatmembers.memberid=fcm_token.memberid;`, [chatId])
                .then(rows => {
                    let time;
                    rows.forEach(element => {
                        // fcm_functions.sendToIndividual(element['token'], message, email, chatId.toString());
                        db.manyOrNone(`select members.Username, members.FirstName, members.LastName 
                                        from members where email=$1;`, [email])
                            .then(rows2 => {
                                rows2.forEach(elem2 => {
                                    
                                    let query = `SELECT Members.Email, Members.Username, Messages.Message,
                                                    to_char(Messages.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS.US' ) AS Timestamp
                                                    FROM Messages
                                                    INNER JOIN Members ON Messages.MemberId=Members.MemberId
                                                    WHERE ChatId=$1
                                                    ORDER BY Timestamp DESC`
                                    db.manyOrNone(query, [chatId])
                                        .then((rows3) => {
                                            time = rows3[0]['timestamp'];
                                        }).catch((err) => {
                                            res.send({
                                                success: false,
                                                error: err
                                            })
                                        });
                                    fcm_functions.sendToIndividual(element['token'], message, email, 
                                                chatId.toString(), elem2['username'], time.toString());
                                });
                            });
                    });
                    res.send({
                        success: true,
                        email: email,
                        msg: message,
                        timestamp: time
                    });
                }).catch(err => {
                    res.send({
                        success: false,
                        error: "error selecting tokens"
                    });
                })
        }).catch((err) => {
            res.send({
                success: false,
                error: err,
            });
        });
});

//Get all of the messages from a chat session with id chatid
router.post("/getAll", (req, res) => {
    let chatId = req.body['chatId'];

    let query = `SELECT Members.Email, Members.Username, Messages.Message,
                    to_char(Messages.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS.US' ) AS Timestamp
                    FROM Messages
                    INNER JOIN Members ON Messages.MemberId=Members.MemberId
                    WHERE ChatId=$1
                    ORDER BY Timestamp DESC`
    db.manyOrNone(query, [chatId])
        .then((rows) => {
            res.send({
                chatid: chatId,
                messages: rows
            })
        }).catch((err) => {
            res.send({
                success: false,
                error: err
            })
        });
});
module.exports = router;