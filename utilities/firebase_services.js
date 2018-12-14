var admin = require('firebase-admin');
var serviceAccount = require("./tcss450-chatapp-team2-firebase-adminsdk-qtlpr-0ffc39105e.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://lab5-fcm-cfb3.firebaseio.com'
});
//use to send message to all clients register to the Topoic (ALL)
function sendToTopic(msg, from, topic) {
    //build the message for FCM to send
    var message = {
        notification: {
            title: 'New Message from '.concat(from),
            body: msg,
        },
        data: {
            "type": "contacrt",
            "sender": from,
            "message": msg,
        },
        "topic": topic
    };
    console.log(message);
    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}
//use to send message to a specific client by the token
function sendToIndividual(token, msg, from, chatid, username, time) {

    //build the message for FCM to send
    var message = {
        android: {
            notification: {
                title: 'New Message from '.concat(username),
                body: msg,
                color: "#0000FF",
                icon: '@drawable/ic_notification_phish'
            },
            data: {
                "msgnotif": "contacrt",
                "sender": from,
                "message": msg,
                "chatid": chatid,
                "username": username, 
                "timestamp": time
            }
        },
        "token": token
    };
    console.log(message);
    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

function sendToIndividualContactRequest(token, msg, from) {

    //build the message for FCM to send
    var message = {
        android: {
            notification: {
                title: 'New Message from '.concat(from),
                body: msg,
                color: "#0000FF",
                icon: '@drawable/ic_notification_phish'
            },
            data: {
                "type": "contact",
                "sender": from,
                "message": msg,
            }
        },
        "token": token
    };
    console.log(message);
    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

function sendNewChatNotification(token, from, chatname, chatid) {
    var message = {
        android: {
            notification: {
                title: 'New Chat Request from '.concat(from),
                body: chatname,
                color: "#0000FF",
                icon: '@drawable/ic_notification_phish'
            },
            data: {
                "newchat": "newChat",
                "sender": from,
                "chatname": chatname,
                "chatid": chatid
            }
        },
        "token": token
    };
    console.log(message);
    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

let fcm_functions = { sendToTopic, sendToIndividual, sendToIndividualContactRequest, sendNewChatNotification};
module.exports = {
    admin, fcm_functions
};