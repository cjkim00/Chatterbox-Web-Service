//express is the framework we're going to use to handle requests

var express = require('express');
var app = express();
const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
app.use(bodyParser.json());
app.use('/verification', require('./routes/verification.js'));
app.use('/login', require('./routes/login.js'));
app.use('/register', require('./routes/register.js'));
app.use('/messaging', require('./routes/messaging.js'));
app.use('/contacts', require('./routes/contacts.js'));
app.use('/chats', require('./routes/chats.js'));
//app.use('/verify', require('./routes/verify.js'));

app.get("/", (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    for (i = 1; i < 7; i++) {
        //write a response to the client
        res.write('<h' + i + ' style="color:blue">Hello World!</h' + i + '>');
    }
    res.end(); //end the response
});

app.listen(process.env.PORT || 5000, () => {
    console.log("Server up and running on port: " + (process.env.PORT || 5000));
});