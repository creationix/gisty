var HTTP = require('http'),
    HTTPS = require('https'),
    Stack = require('stack'),
    FS = require('fs'),
    Creationix = require('creationix');

var handle = Stack(
  Creationix.log(),
  require('./lib/subApp')("/git/", 
    require('./lib/basicAuth')(require('./lib/myAuth'), "Git Repos"),
    require('./lib/gitHttp')("/", process.env.HOME + "/git")  
  ),
  Creationix.static("/", __dirname + "/www", "index.html")
);

var options = {
  key: FS.readFileSync(__dirname + '/lib/keys/privatekey.pem'),
  cert: FS.readFileSync(__dirname + '/lib/keys/certificate.pem')
};

// Serve over HTTP
var httpPort = process.getuid() ? 8080 : 80;
HTTP.createServer(handle).listen(httpPort);
console.log("Server listening at http://localhost:" + httpPort + "/");

// Server over HTTPS
var httpsPort = process.getuid() ? 8443 : 443;
HTTPS.createServer(options, handle).listen(httpsPort);
console.log("Server listening at https://localhost:" + httpsPort + "/");


