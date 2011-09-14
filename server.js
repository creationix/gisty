var HTTP = require('http'),
    Stack = require('stack'),
    Creationix = require('creationix');

HTTP.createServer(Stack(
  Creationix.log(),
  require('./gitHttp')("/", "/home/tim/sourcetest")
)).listen(8080);

console.log("Server listening at http://localhost:8080/");
