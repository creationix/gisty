// Load some built-in modules
var HTTP = require('http'),
    HTTPS = require('https'),
    FS = require('fs');

// Load some npm community modules
var Stack = require('stack'),
    Creationix = require('creationix');

// Define our shared application structure that will be used for both servers
var handle = Stack(
  // Log all requests that go through the system to stdout
  require('./lib/log')(),

  // Mount an application that serves authenticated git repos over https
  Creationix.substack("/git/",
    // Everything in this module requires authentication
    Creationix.auth(require('./lib/myAuth'), "Git Repos"),
    // This is a wrapper over the git-http-backend cgi program
    require('./lib/gitHttp')("/", process.env.HOME + "/git")
  ),

  // Serve snippet generating script tags to the public at /snippets/
  Creationix.route("GET", "/snippets/:user/:repo/:path", require('./lib/snippets')(process.env.HOME + "/git")),

  // Serve anything else as static content relative to the www folder
  Creationix.static("/", __dirname + "/www", "index.html")
);

// Detect if we're running as root or not
var isRoot = !process.getuid();

// Serve over HTTP
var httpPort = isRoot ? 80: 8080;
HTTP.createServer(handle).listen(httpPort);
console.log("Server listening at http://localhost" + (httpPort === 80 ? "" : ":" + httpPort) + "/");

// Server over HTTPS
var httpsPort = isRoot ? 443 : 8443;
HTTPS.createServer({
  key: FS.readFileSync(__dirname + '/lib/keys/privatekey.pem'),
  cert: FS.readFileSync(__dirname + '/lib/keys/certificate.pem')
}, handle).listen(httpsPort);
console.log("Server listening at https://localhost" + (httpsPort === 443 ? "" : ":" + httpsPort) + "/");

// It's not good to stay running as root, so we'd better drop privileges
if (isRoot) {
  // Lets change to the owner of this file, whoever that may be
  var stat = FS.statSync(__filename);
  console.log("Changing gid to " + stat.gid);
  process.setgid(stat.gid);
  console.log("Changing uid to " + stat.uid);
  process.setuid(stat.uid);
}

