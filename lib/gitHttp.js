var URL = require('url'),
    Parser = require('./cgiParser'),
    ChildProcess = require('child_process');

var SERVER_SOFTWARE = "Node/" + process.version;
var SERVER_PROTOCOL = "HTTP/1.1";
var GATEWAY_INTERFACE = "CGI/1.1";

module.exports = function setup(root, repo) {
  return function handle(req, res, next) {
    if (req.url.substring(0, root.length) !== root) return next();
    if (!req.hasOwnProperty("uri")) { req.uri = URL.parse(req.url); }

    var host = (req.headers.host || '').split(':');
    var address = host[0];
    var port = host[1];

    var env = {
      GIT_PROJECT_ROOT:    repo,
      GIT_HTTP_EXPORT_ALL: '',
      REMOTE_ADDR:         req.socket.remoteAddress,
      REMOTE_USER:         req.remoteUser,
      GATEWAY_INTERFACE:   GATEWAY_INTERFACE,
      SCRIPT_NAME:         root,
      PATH_INFO:           req.uri.pathname.substring(root.length - 1),
      SERVER_NAME:         address || 'unknown',
      SERVER_PORT:         port || 80,
      SERVER_PROTOCOL:     SERVER_PROTOCOL,
      SERVER_SOFTWARE:     SERVER_SOFTWARE,
      REQUEST_METHOD:      req.method,
      QUERY_STRING:        req.uri.query || '',
    };

    if (req.headers.hasOwnProperty('content-length')) {
      env.CONTENT_LENGTH = req.headers['content-length'];
    }
    if (req.headers.hasOwnProperty('content-type')) {
      env.CONTENT_TYPE = req.headers['content-type'];
    }
    if (req.headers.hasOwnProperty('authorization')) {
      var auth = req.headers.authorization.split(' ');
      env.AUTH_TYPE = auth[0];
    }

    // The client HTTP request headers are attached to the env as well,
    // in the format: "User-Agent" -> "HTTP_USER_AGENT"
    Object.keys(req.headers).forEach(function (key) {
      var name = 'HTTP_' + key.toUpperCase().replace(/-/g, '_');
      env[name] = req.headers[key];
    });

    
    var cgi = ChildProcess.spawn("/usr/lib/git-core/git-http-backend", [], {env: env});
    req.pipe(cgi.stdin);



    var stderr = "";    
    cgi.stderr.setEncoding('utf8');
    cgi.stderr.on('data', function(chunk) {
      stderr += chunk;
    });
    
    var parser = new Parser();

    cgi.stdout.on('data', function (chunk) {
      parser.execute(chunk);
    });

    cgi.on('exit', function (code, signal) {
      res.end(stderr);
    });

    parser.on('headers', function (status, headers) {
      res.writeHead(status, headers);
    });

    parser.on('data', function (chunk) {
      res.write(chunk);
    });

  }
};

