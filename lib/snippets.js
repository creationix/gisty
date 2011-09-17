var Url = require('url'),
    GitFS = require('./gitFS'),
    QueryString = require('querystring'),
    Path = require('path');

module.exports = function setup(repoBase) {

  return function handle(req, res, params, next) {
    var query = QueryString.parse(req.uri.query);
    var repo = Path.join(repoBase, params.user, params.repo);
    var path = params.path;
    GitFS.getHead(repo, function (err, revision) {
      if (err) {
        if (err.code === "ENOENT") return next();
        return next(err);
      }
      GitFS.readFile(repo, revision, path, function (err, code) {
        if (err) {
          console.log(err.message);
          if (err.code === "ENOENT") return next();
          return next(err);
        }
        var js = query.jsonp + '(' + JSON.stringify(code) + ')';
        res.writeHead(200, {
          "Content-Type": "application/javascript",
          "Content-Length": Buffer.byteLength(js)
        });
        res.end(js);
      });
    });

  }
};
