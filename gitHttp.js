var URL = require('url'),
    ChildProcess = require('child_process');

var SERVER_SOFTWARE = "Node/" + process.version;
var SERVER_PROTOCOL = "HTTP/1.1";
var GATEWAY_INTERFACE = "CGI/1.1";

module.exports = function setup(root, repo, options) {
  return function handle(req, res, next) {
    if (req.url.substring(0, root.length) !== root) return next();
    if (!req.hasOwnProperty("uri")) { req.uri = URL.parse(req.url); }

    var host = (req.headers.host || '').split(':');
    var address = host[0];
    var port = host[1];
    
    var env = {
      GIT_PROJECT_ROOT:   repo,
      GATEWAY_INTERFACE:  GATEWAY_INTERFACE,
      SCRIPT_NAME:        root,
      PATH_INFO:          req.uri.pathname.substring(root.length),
      SERVER_NAME:        address || 'unknown',
      SERVER_PORT:        port || 80,
      SERVER_PROTOCOL:    SERVER_PROTOCOL,
      SERVER_SOFTWARE:    SERVER_SOFTWARE,
      REQUEST_METHOD:     req.method,
      QUERY_STRING:       req.uri.query || '',
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

    var cgi = ChildProcess.spawn("/usr/lib/git-core/git-http-backend", [], {env: env});
    req.pipe(cgi.stdin);
    
    cgi.stderr.on('data', function(chunk) {
      console.error(chunk + "");
    });
    
    cgi.stderr.on('data', function(chunk) {
      process.stdout.write(chunk);
    });
    
    cgi.on('exit', function(code, signal) {
      next();
    });

    
    
    

  }
};

