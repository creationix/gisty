// A super simple logging middleware
module.exports = function setup(special) {
  special = special || {
    "Content-Type": true,
    "Content-Length": true,
    "Content-Range": true,
    "Location": true,
  };
  return function handle(req, res, next) {
    var writeHead = res.writeHead;
    var start = Date.now();
    res.writeHead = function (code, headers) {
      var extra = [];
      Object.keys(special).forEach(function (key) {
        if (headers.hasOwnProperty(key)) {
          extra.push(key + "=" + headers[key]);
        }
      });
      if (!headers.hasOwnProperty('Date')) {
        headers.Date = (new Date()).toUTCString();
      }
      headers.Server = "NodeJS " + process.version;
      headers["X-Runtime"] = Date.now() - start;
      console.log("%s %s://%s/%s %s %s", req.method, req.socket.encrypted ? "https" : "http", req.headers ? req.headers.host : "*", req.url, code, extra.join(" "));
      res.writeHead = writeHead;
      res.writeHead(code, headers);
    };
    next();
  };
};
