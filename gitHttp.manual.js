var URL = require('url'),
    ChildProcess = require('child_process'),
    FreeList = require('freelist').FreeList,
    HTTPParser = process.binding('http_parser').HTTPParser;


//var parsers = new FreeList('parsers', 1000, function() {
//  var parser = new HTTPParser('response');

//  parser.onMessageBegin = function() {
//    parser.incoming = new IncomingMessage(parser.socket);
//    parser.field = null;
//    parser.value = null;
//  };

//  parser.onHeaderField = function(b, start, len) {
//    var slice = b.toString('ascii', start, start + len).toLowerCase();
//    if (parser.value != undefined) {
//      parser.incoming._addHeaderLine(parser.field, parser.value);
//      parser.field = null;
//      parser.value = null;
//    }
//    if (parser.field) {
//      parser.field += slice;
//    } else {
//      parser.field = slice;
//    }
//  };

//  parser.onHeaderValue = function(b, start, len) {
//    var slice = b.toString('ascii', start, start + len);
//    if (parser.value) {
//      parser.value += slice;
//    } else {
//      parser.value = slice;
//    }
//  };

//  parser.onHeadersComplete = function(info) {
//    if (parser.field && (parser.value != undefined)) {
//      parser.incoming._addHeaderLine(parser.field, parser.value);
//      parser.field = null;
//      parser.value = null;
//    }

//    parser.incoming.httpVersionMajor = info.versionMajor;
//    parser.incoming.httpVersionMinor = info.versionMinor;
//    parser.incoming.httpVersion = info.versionMajor + '.' + info.versionMinor;

//    if (info.method) {
//      // server only
//      parser.incoming.method = info.method;
//    } else {
//      // client only
//      parser.incoming.statusCode = info.statusCode;
//    }

//    parser.incoming.upgrade = info.upgrade;

//    var isHeadResponse = false;

//    if (!info.upgrade) {
//      // For upgraded connections, we'll emit this after parser.execute
//      // so that we can capture the first part of the new protocol
//      isHeadResponse = parser.onIncoming(parser.incoming, info.shouldKeepAlive);
//    }

//    return isHeadResponse;
//  };

//  parser.onBody = function(b, start, len) {
//    // TODO body encoding?
//    var slice = b.slice(start, start + len);
//    if (parser.incoming._decoder) {
//      var string = parser.incoming._decoder.write(slice);
//      if (string.length) parser.incoming.emit('data', string);
//    } else {
//      parser.incoming.emit('data', slice);
//    }
//  };

//  parser.onMessageComplete = function() {
//    this.incoming.complete = true;
//    if (parser.field && (parser.value != undefined)) {
//      parser.incoming._addHeaderLine(parser.field, parser.value);
//    }
//    if (!parser.incoming.upgrade) {
//      // For upgraded connections, also emit this after parser.execute
//      parser.incoming.readable = false;
//      parser.incoming.emit('end');
//    }
//  };

//  return parser;
//});


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
      GIT_PROJECT_ROOT: repo,
      GIT_HTTP_EXPORT_ALL: "",
      REMOTE_USER: req.remoteUser,
      GATEWAY_INTERFACE:  GATEWAY_INTERFACE,
      SCRIPT_NAME:        root,
      PATH_INFO:          req.uri.pathname.substring(root.length - 1),
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

    // The client HTTP request headers are attached to the env as well,
    // in the format: "User-Agent" -> "HTTP_USER_AGENT"
    Object.keys(req.headers).forEach(function (key) {
      var name = 'HTTP_' + key.toUpperCase().replace(/-/g, '_');
      env[name] = req.headers[key];
    });
    
//    console.dir(env);
    
    var parser = new HTTPParser('response');
    parser.onHeadersComplete = function(info) {
//      console.dir({info:info});
    };
    
    parser.onHeaderField = function(b, start, len) {
      var slice = b.toString('ascii', start, start + len).toLowerCase();
//      console.dir({field:slice});
    }

    var cgi = ChildProcess.spawn("/usr/lib/git-core/git-http-backend", [], {env: env});
    req.pipe(cgi.stdin);
    
    cgi.stderr.on('data', function(chunk) {
      console.error("ERROR: " + chunk);
    });
    
    var first = true;
    cgi.stdout.on('data', function(chunk) {
      if (first) {
        var b = new Buffer("HTTP/1.1 200 OK\r\n");
        process.stdout.write(b);
        parser.execute(b, 0, b.length);
        first = false;
      }
      process.stdout.write(chunk);
      var ret = parser.execute(chunk, 0, chunk.length);
      if (ret) throw ret;
      console.dir({ret:ret});
    });

    cgi.on('exit', function(code, signal) {
      parser.finish();
      next();
    });

    

  }
};

