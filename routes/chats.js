//express is the framework we're going to use to handle requests
const express = require('express');
//Create connection to Heroku Database
let db = require('../utilities/utils').db;
var router = express.Router();
const bodyParser = require("body-parser");
let fcm_functions = require('../utilities/utils').fcm_functions;
//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());

router.post("/getuser", (req, res) => {
    let email = req.body['email'];
    if (email) {
        db.one(`select username, firstname, lastname from members where email=$1`, [email])
            .then((row) => {
                res.send({
                    success: true,
                    username: row
                });
            }).catch((err) => {
                res.send({
                    success: false,
                    error: err
                });
            });
    } else {
        res.send({
            success: false,
            error: err
        });
    }
});

//create a new chat session with new chatID and chatName NEED TO ADD MEMBERS INTO CHATMEMBERS TABLE
router.post("/newchat", (req, res) => {
    let chatName = req.body['chatName'];
    let email1 = req.body['email1'];
    let email2 = req.body['email2'];
    if (!chatName || !email1 || !email2) {
        res.send({
            success: false,
            error: "chatId or chatName not supplied"
        });
        return;
    }
    // add chat to chats table and add members to chat members table 

    db.none("INSERT INTO Chats(Name) VALUES($1)", [chatName])
        .catch((err) => {
            res.send({
                success: false,
                error: err
            });
        });
    db.none(`INSERT INTO ChatMembers(ChatID, MemberID)
            SELECT c.ChatID, m.MemberID
            FROM Chats c, Members m
            WHERE c.ChatID = (SELECT ChatID FROM Chats WHERE Name = $1)
            AND m.MemberID = (SELECT MemberID FROM Members WHERE email = $2)`, [chatName, email1])
        .catch((err) => {
            res.send({
                success: false,
                error: err
            });
        });
    db.none(`INSERT INTO ChatMembers(ChatID, MemberID)
            SELECT c.ChatID, m.MemberID
            FROM Chats c, Members m
            WHERE c.ChatID = (SELECT ChatID FROM Chats WHERE Name = $1)
            AND m.MemberID = (SELECT MemberID FROM Members WHERE email = $2)`, [chatName, email2])
        .catch((err) => {
            res.send({
                success: false,
                error: err
            });
        });
    db.manyOrNone(`Select chatid from chats where name=$1`, [chatName])
        .then(the_id => {
            db.manyOrNone(`Select email, username, firstname, lastname from members where email=$1`, [email2])
                .then(the_rows => {
                    let newChat_chatID
                    the_id.forEach(id_val => {
                        newChat_chatID = id_val['chatid'];
                    });

                    db.manyOrNone(`select members.memberid, fcm_token.token
                            from members, fcm_token, chatmembers 
                            where members.memberid=fcm_token.memberid and 
                            chatid=$1 and chatmembers.memberid=fcm_token.memberid;`, [newChat_chatID])
                        .then(rows => {
                            rows.forEach(element => {
                                fcm_functions.sendNewChatNotification(element['token'], chatName, email1, newChat_chatID.toString());
                            });
                        }).catch((err) => {
                            res.send({
                                success: false,
                                error: err
                            });
                        });
                    res.send({
                        success: true,
                        chatname: chatName,
                        chatid: newChat_chatID,
                        data: the_rows
                    });
                }).catch((err) => {
                    res.send({
                        success: false,
                        error: err
                    });
                });
        }).catch((err) => {
            res.send({
                success: false,
                error: err
            });
        });



});

router.post("/newGroupChat", (req, res) => {
    let groupChatName = req.body['chatName'];
    // let email_list = req.body['emaillist'];
    let email_List = req.body['emaillist'];
    if (groupChatName && email_List) {

        db.none("INSERT INTO Chats(Name) VALUES($1)", [groupChatName]);

        let emailList_data = [];
        email_List.forEach(eml => {
            db.manyOrNone(`Select email, username, firstname, lastname from members where email=$1`, [eml])
                .then(row => {
                    row.forEach(i => {
                        emailList_data.push(i);
                    });
                }).catch((err) => {
                    res.send({
                        success: false,
                        error: err
                    });
                });
        });


        let groupChatID;
        email_List.forEach(emailElem => {
            db.manyOrNone(`Select chatid from chats where name=$1`, [groupChatName])
                .then(the_id => {
                    db.none(`INSERT INTO ChatMembers(ChatID, MemberID)
                SELECT c.ChatID, m.MemberID
                FROM Chats c, Members m
                WHERE c.ChatID = (SELECT ChatID FROM Chats WHERE Name = $1)
                AND m.MemberID = (SELECT MemberID FROM Members WHERE email = $2)`, [groupChatName, emailElem])
                        .catch((err) => {
                            res.send({
                                success: false,
                                error: err
                            });
                        });

                    the_id.forEach(elem => {
                        groupChatID = elem['chatid'];
                    });
                    res.send({
                        success: true,
                        chatname: groupChatName,
                        chatid: groupChatID,
                        data: emailList_data
                    });
                }).catch((err) => {
                    res.send({
                        success: false,
                        error: err
                    });
                });
        });

    } else {
        res.send({
            success: false,
            error: "Missing required information",
            email: email_List
        });
    }
});

//get all chats
router.post("/getAllChats", (req, res) => {
    let email_a = req.body['email'];
    let list = [];
    if (email_a) {
        // db.manyOrNone("select memberid_b from contacts where memberid_a=$1", [memberID_a])
        // select members.email, members.FirstName, members.LastName, chatmembers.chatid, members.username, chats.name
        //                 from chatmembers, members, chats
        //                 where not email = $1 and chatmembers.memberid = members.memberid and chats.chatid=chatmembers.chatid and
        //                 chatmembers.chatid in (
        //                     select chatmembers.chatid
        //                     from chatmembers
        //                     where chatmembers.memberid = (
        //                         select members.memberid
        //                         from members
        //                         where email =$1));
        let chat_id;
        let msg = [];
        let currentuser;
        db.manyOrNone(`select distinct chats.chatid, chats.name
                        from chatmembers, members, chats
                        where not email = $1 and chatmembers.memberid = members.memberid and chats.chatid=chatmembers.chatid and
                        chats.chatid in (
                            select distinct chatmembers.chatid
                            from chatmembers
                            where chatmembers.memberid = (
                                select members.memberid
                                from members
                                where email = $1));`, [email_a])
            .then(rows => {
                rows.forEach(element => {
                    chat_id = element['chatid'];
                    list.push(element);
                });
                db.one(`select username, firstname, lastname from members where email=$1`, [email_a])
                    .then((row) => {
                        res.send({
                            success: true,
                            data: list,
                            currentuser: row
                        });
                    }).catch((err) => {
                        res.send({
                            success: false,
                            error: err
                        });
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
            success: false,
            input: req.body,
            error: "Missing required information"
        });
    }

});

router.post("/delete_chat", (req, res) => {
    let chatsID = req.body["chatid"];
    if (chatsID) {
        // db.one(`DELETE FROM ChatMembers WHERE ChatID = (SELECT ChatID FROM Chats WHERE Name = $1)`, [chatName]);
        // db.one(`DELETE FROM Chats WHERE ChatID = (SELECT ChatID FROM Chats WHERE Name = $1)`, [chatName])
        db.manyOrNone(`DELETE FROM ChatMembers WHERE ChatID =$1`, [chatsID])
            .then(() => {

                db.manyOrNone(`delete from messages where chatid=$1;`, [chatsID])
                    .then(() => {

                        db.result(`DELETE FROM Chats WHERE ChatID=$1`, [chatsID])
                            .then(() => {
                                res.send({
                                    success: true
                                });
                            }).catch((err) => {
                                console.log(err);
                                res.send({
                                    success: false,
                                    error: err
                                });
                            });

                    }).catch((err) => {
                        console.log(err);
                        res.send({
                            success: false,
                            error: err
                        });
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
            success: false,
            input: req.body,
            error: "Missing required information"
        });
    }
});

router.post("/testArray", (req, res) => {
    let the_email = req.body['email'];
    let chatId = req.body['chatid'];
    if (!the_email) {
        res.send({
            success: false,
            error: "chatId or chatName not supplied"
        });
        return;
    }
    db.manyOrNone(`select members.memberid, fcm_token.token
                            from members, fcm_token, chatmembers 
                            where members.memberid=fcm_token.memberid and chatid=$1 and chatmembers.memberid=fcm_token.memberid;`, [chatId])
        .then(rows => {
            rows.forEach(element => {
                // db.one(`select * from chats where chatid=$1;`, [chatId])
                //     .then(rows2 => {
                //         rows2.forEach(elem2 => {
                //             fcm_functions.sendNewChatNotification(element['token'], the_email, elem2['name'], elem2['chatid']);
                //         });
                //     });
                fcm_functions.sendNewChatNotification(element['token'], the_email, the_email, chatId);
            });
            res.send({
                success: true,
                email: the_email
            });
        }).catch((err) => {
            res.send({
                success: false,
                error: err
            });
        });
});

module.exports = router;