var Crypto = require('crypto'),
    FS = require('fs');

module.exports = auth;
auth.hash = hash;

var KEY = FS.readFileSync(__dirname + "/keys/hashkey");

// These are salted against a secret phrase passed in from hashkey
// To generate new ones, run this via the command line:
//
//   node -e 'require("./lib/myAuth").hash("yourpassword")'
//
var data = {
  creationix: "5996710d6ca9d60be05e1e350ab6c745a58209d6715c438889d44e697d331a06"
};

function hash(password) {
  return Crypto.createHmac("sha256", KEY).update(password).digest("hex");
}

function auth(req, username, password, callback) {

  // Only the owner of a group can access the repos in it
  var match = req.url.match(/[a-z_][a-z_09]*/);
  if (!(match && match[0] && match[0] === username)) return;

  // Generate a password hash and see if it matches the config database
  if (data.hasOwnProperty(username) && data[username] === hash(password)) return username;
}

