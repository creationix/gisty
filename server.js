var HTTP = require('http'),
    Stack = require('stack'),
    Creationix = require('creationix');

function auth(username, password) {
  return username === 'tim' ? username : false;
}

HTTP.createServer(Stack(
  Creationix.log(),
  require('./subApp')("/git/", 
    require('./basicAuth')(auth, "Git Repos"),
    require('./gitHttp.manual')("/", "/home/tim/git")  
  ),
  Creationix.static("/", __dirname + "/www", "index.html")
)).listen(8080);

console.log("Server listening at http://localhost:8080/");


