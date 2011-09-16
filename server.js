var HTTP = require('http'),
    HTTPS = require('https'),
    Stack = require('stack'),
    FS = require('fs'),
    Creationix = require('creationix');

var handle = Stack(
  require('./lib/log')(),
  Creationix.substack("/git/", 
    Creationix.auth(require('./lib/myAuth'), "Git Repos"),
    require('./lib/gitHttp')("/", process.env.HOME + "/git")  
  ),
  Creationix.static("/", __dirname + "/www", "index.html")
);

var options = {
  key: FS.readFileSync(__dirname + '/lib/keys/privatekey.pem'),
  cert: FS.readFileSync(__dirname + '/lib/keys/certificate.pem')
};

// Serve over HTTP
var isRoot = !process.getuid();

var httpPort = isRoot ? 80: 8080;
HTTP.createServer(handle).listen(httpPort);
console.log("Server listening at http://localhost" + (httpPort === 80 ? "" : ":" + httpPort) + "/");

// Server over HTTPS
var httpsPort = isRoot ? 443 : 8443;
HTTPS.createServer(options, handle).listen(httpsPort);
console.log("Server listening at https://localhost" + (httpsPort === 443 ? "" : ":" + httpsPort) + "/");

if (isRoot) {
  var stat = FS.statSync(__filename);
  console.log("Changing gid to " + stat.gid);
  process.setgid(stat.gid);
  console.log("Changing uid to " + stat.uid);
  process.setuid(stat.uid);
}

