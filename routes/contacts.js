/**contacts.js handles all contact related backend such as sending and handling a request,
 *getting all contacts, showing who has sent contact requests to whom and so on.
 */


//express is the framework we're going to use to handle requests
const express = require('express');
//Create connection to Heroku Database
let db = require('../utilities/utils').db;
var router = express.Router();
const bodyParser = require("body-parser");
let fcm_functions = require('../utilities/utils').fcm_functions;
var contactsList = [];
//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());

/**When this endpoint is used the sender's email and receiver's email is inserted into the contacts table
 *as an unverified contact and also sends an alert to the receiver that they have gotten a contact request.
 */
router.post("/send_request", (req, res) => {
    let senderEmail = req.body['senderEmail'];
    let receiverEmail = req.body['receiverEmail'];
    let message = "You have received a contact request";
    if (senderEmail && receiverEmail) {
        //inserts the sender's email and receiver's email into the contacts table as an unverified contact.
        db.none('INSERT INTO Contacts(MemberID_A, MemberID_B) SELECT a.MemberID, b.MemberID FROM Members a, Members b WHERE a.Email = $1 AND b.Email = $2', [senderEmail, receiverEmail])
            .then(() => {
                //selects the receiver's FCM token to send an alert that they have gotten a contact request.
                db.manyOrNone('SELECT * FROM Members JOIN FCM_Token ON FCM_Token.memberid = Members.memberid AND Members.Email = $1', [receiverEmail])
                    .then(rows => {
                        rows.forEach(element => {
                            fcm_functions.sendToIndividualContactRequest(element['token'], message, senderEmail);
                        });
                        res.send({
                            success: true,
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

/**This endpoint gets every contact of the email sent to is.
 *The enedpoint is used to populate the contacts fragment.
 */
router.post("/getAllContacts", (req, res) => {
    let email = req.body['email'];
    let listContacts = [];
    if (email) {
        //selects all of the contacts of the sent email and returns them as a list when success is true
        db.manyOrNone(`SELECT Members.Email, Members.FirstName, Members.LastName, Members.Username 
                        FROM Contacts, Members 
                        WHERE Members.MemberID = Contacts.MemberID_B AND Contacts.MemberID_A = (
                        SELECT MemberID FROM Members WHERE Members.Email = $1) AND Contacts.Verified = 1
                        UNION
                        SELECT Members.Email, Members.FirstName, Members.LastName, Members.Username 
                        FROM Contacts, Members 
                        WHERE Members.MemberID = Contacts.MemberID_A AND Contacts.MemberID_B = (
                        SELECT MemberID FROM Members WHERE Members.Email = $1) AND Contacts.Verified = 1`, [email])
            .then(rows => {
                rows.forEach(element => {
                    listContacts.push(element);
                });
                res.send({
                    success: true,
                    data: listContacts
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

/**
 *This endpoint handles contact requests of the two emails sent to it.
 *if the response is a 1 (success) then the contact's verified is set to 1
 *if the response is a 0 (rejected) then the contact is deleted from the table.
 */
router.post('/handle_request', (req, res) => {
    let senderEmail = req.body['senderEmail'];
    let receiverEmail = req.body['receiverEmail'];
    let response = req.body['response'];
    if (response && senderEmail && receiverEmail) {
        if (response == 1) {
            //if the response is 1 then the contact is updated to 1
            db.result('UPDATE Contacts SET Verified = 1 WHERE MemberID_A = (SELECT MemberID FROM Members WHERE email = $1) AND MemberID_B = (SELECT MemberID FROM Members WHERE email = $2);', [senderEmail, receiverEmail])
                .then(() => {
                    //send fcm ping to sender that request was accepted
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
        } else {
            //if the response is 0 then the contact is removed from the table
            db.result('DELETE FROM Contacts WHERE MemberID_A = (SELECT MemberID FROM Members WHERE Email = $2) AND MemberID_B = (SELECT MemberID FROM Members WHERE Email = $1) AND contacts.verified = 0;', [senderEmail, receiverEmail])
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
                });;
        }
    } else {
        res.send({
            success: false,
            input: req.body,
            error: "Missing required information"
        });
    }

});

/**
 *This endpoint handles the deleting of contacts
 */
router.post('/delete_contact', (req, res) => {
    let userEmail = req.body['userEmail'];
    let removedEmail = req.body['removedEmail'];
    if (userEmail && removedEmail) {
        //deletes the contacts from the table where the user's member id is MemberID_A and the removed email is MemberID_B
        db.one('DELETE FROM Contacts WHERE MemberID_A = (SELECT MemberID FROM Members WHERE email = $1) AND MemberID_B = (SELECT MemberID FROM Members WHERE email = $2) OR MemberID_A = (SELECT MemberID FROM Members WHERE email = $2) AND MemberID_B = (SELECT MemberID FROM Members WHERE email = $1);', [userEmail, removedEmail])
            .then(() => {
                //send fcm ping to sender that request was accepted
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
    } else {
        res.send({
            success: false,
            input: req.body,
            error: "Missing required information"
        });
    }
});


/**
 *This endpoint handles the requests sent by the user using a username
 */
router.post("/send_request_by_username", (req, res) => {
    let senderEmail = req.body['senderEmail'];
    let receiverUsername = req.body['receiverUsername'];
    if (senderEmail && receiverUsername) {
        //inserts the sender and receiver into the contacts table as an unverified contact
        db.none(`INSERT INTO Contacts(MemberID_A, MemberID_B) 
                SELECT a.MemberID, b.MemberID FROM Members a, Members b 
                WHERE a.Email = $1 AND b.username = $2`, [senderEmail, receiverUsername])
            .then(() => {
                //selects the FCM token from the receiver and sends them an alert that they have received a contact request
                db.manyOrNone('SELECT * FROM Members JOIN FCM_Token ON FCM_Token.memberid = Members.memberid AND Members.Username = $1', [receiverUsername])
                    .then(rows => {
                        rows.forEach(element => {
                            fcm_functions.sendToIndividual(element['token'], message, senderEmail);
                        })
                        res.send({
                            success: true,
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

/**
 *This endpoint gets all members and is used to populate the autofill text box
 */
router.get('/get_all_members', (req, res) => {
    let users = [];
    //select only email, first name, last name, and username of all members
    db.manyOrNone(`select email, firstname, lastname, username from members;`)
        .then(rows => {
            rows.forEach(element => {
                users.push(element);
            });
            res.send({
                success: true,
                data: users
            });
        }).catch((err) => {
            console.log(err);
            res.send({
                success: false,
                error: err
            });
        });
});


/**
 *This endpoint handles searches by email
 */
router.post('/search_contact_by_email', (req, res) => {
    let searchEmail = req.body['searchEmail'];
    let users = []

    if (searchEmail) {
        //selects the email, first name, last name, and username of members whose email is equal to the one sent to the endpoint
        db.manyOrNone(`SELECT Members.email, Members.firstname, Members.lastname, Members.username 
                       FROM Members WHERE email = $1`, [searchEmail])
            .then(rows => {
                rows.forEach(element => {
                    users.push(element);
                });
                res.send({
                    success: true,
                    data: users
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
            error: "Missing email."
        });
    }
});


/**
 *This endpoint handles searches by username
 */
router.post('/search_contact_by_username', (req, res) => {
    let searchUsername = req.body['searchUsername'];
    let users = []

    if (searchUsername) {
        //Selects the email, first name, last name, and username of members whose username is equal to the one sent to the endpoint
        db.manyOrNone(`SELECT Members.email, Members.firstname, Members.lastname, Members.username 
                       FROM Members WHERE username = $1`, [searchUsername])
            .then(rows => {
                rows.forEach(element => {
                    users.push(element);
                });
                res.send({
                    success: true,
                    data: users
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
            error: "Missing email."
        });
    }
});

/**
 *Handles search requests by first name and last name
 */
router.post('/search_contact_by_name', (req, res) => {
    let firstName = req.body['firstName'];
    let lastName = req.body['lastName'];
    let users = []

    if (firstName && lastName) {
        //Selects email, first name, last name, and username using the first name and last name sent to the endpoint
        db.manyOrNone(`SELECT Email, firstname, lastname, username 
                       FROM Members
                       WHERE FirstName = $1
                       AND LastName = $2`, [firstName, lastName])
            .then(rows => {
                rows.forEach(element => {
                    users.push(element);
                });
                res.send({
                    success: true,
                    data: users
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
            error: "Missing email."
        });
    }
});

/**
 *This endpoint handles searches using email, username or first and last names
 */
router.post('/search_contact', (req, res) => {
    let first = req.body['first'];
    let second = req.body['second'];
    let users = []

    if (first && !second) {
        //if only one string was sent then select the first and last name, username, and email for the user whose username or email matches the one sent
        db.manyOrNone(`SELECT FirstName, LastName, Username, Email 
                       FROM Members
                       WHERE Username = $1
                       OR Email = $2`, [first, first])
            .then(rows => {
                rows.forEach(element => {
                    users.push(element);
                });
                res.send({
                    success: true,
                    data: users
                });
            }).catch((err) => {
                console.log(err);
                res.send({
                    success: false,
                    error: err
                });
            });
    } else if (first && second) {
            //if two strings were sent then select the first and last name, username, and email for the user whose first and last name matches the ones sent
            db.manyOrNone(`SELECT Email, firstname, lastname, username 
                           FROM Members
                           WHERE FirstName = $1
                           AND LastName = $2`, [first, second])
                .then(rows => {
                    rows.forEach(element => {
                        users.push(element);
                    });
                    res.send({
                        success: true,
                        data: users
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
            error: "Missing email."
        });
    }
});
/**
 *This endpoint gets the information of members who sent requests to the email sent to the endpoint
 */
router.post('/contact_request_sent_to_user', (req, res) => {
    let email = req.body['email'];
    let requests = []

    if (email) {
        //Selects the email, first name, last name, and username of the members who have sent a contact request to the user
        db.manyOrNone(`SELECT Members.Email, Members.FirstName, Members.LastName, Members.Username 
        FROM Contacts, Members 
        WHERE Members.MemberID = Contacts.MemberID_A AND Contacts.MemberID_B = (
        SELECT MemberID FROM Members WHERE Members.Email = $1) AND Contacts.Verified = 0;`, [email])
            .then(rows => {
                rows.forEach(element => {
                    requests.push(element);
                });
                res.send({
                    success: true,
                    data: requests
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
            error: "Missing email."
        });
    }
});

/**
 *This endpoint gets the contact requests sent by the user
 */
router.post('/contact_request_sent_by_user', (req, res) => {
    let email = req.body['email'];
    let requests = []

    if (email) {
        db.manyOrNone(`SELECT Members.Email, Members.FirstName, Members.LastName, Members.Username 
        FROM Contacts, Members 
        WHERE Members.MemberID = Contacts.MemberID_B AND Contacts.MemberID_A = (
        SELECT MemberID FROM Members WHERE Members.Email = $1) AND Contacts.Verified = 0;`, [email])
            .then(rows => {
                rows.forEach(element => {
                    requests.push(element);
                });
                res.send({
                    success: true,
                    data: requests
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
            error: "Missing email."
        });
    }
});

module.exports = router;