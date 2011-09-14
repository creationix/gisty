
// Based loosly on basicAuth from Connect
// Checker takes username and password and return a user if valid
module.exports = function basicAuth(checker, realm) {

  realm = realm || 'Authorization Required';
  
  function unauthorized(res) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="' + realm + '"',
      'Content-Length': 12
    });
    res.end("Unauthorized");
  }

  function badRequest(res) {  
    res.statusCode = 400;
    res.end('Bad Request');
  }

  return function(req, res, next) {
    var authorization = req.headers.authorization;
    if (!authorization) return unauthorized(res);
    var parts = authorization.split(' ');
    var scheme = parts[0];
    var credentials = new Buffer(parts[1], 'base64').toString().split(':');
    if ('Basic' != scheme) return badRequest(res);
    var user = checker(credentials[0], credentials[1]);
    if (!user) return unauthorized(res);
    req.remoteUser = user;
    next();
  }
};

