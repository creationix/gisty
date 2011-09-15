// This is a mostly fully interruptible parser for http-like data
// It assumes that chunk's are never broken within a single header line
// TODO: make fully interruptible

var EventEmitter = require('events').EventEmitter;
module.exports = Parser;
Parser.prototype.__proto__ = EventEmitter.prototype;
Parser.prototype.initialize = initialize;
Parser.prototype.execute = execute;

// States for the FSM
var FIELD = 1,
    VALUE = 2,
    LINE  = 3,
    END   = 4,
    BODY  = 6;

////////////////////////////////////////////////////////////////////////////////

function Parser() {
  EventEmitter.call(this);
  this.initialize();
}

function initialize() {
  this.headers = {};
  this.status = "200 OK";
  this.state = FIELD;
}

function execute(chunk) {
  if (this.state === BODY) {
    this.emit('data', chunk);
    return;
  }
  var field, start = 0;
  var l = chunk.length;
  var i = 0;
  while (i < l) {
    var c = chunk[i];
    switch(this.state) {
    case FIELD:
      if (c === 0x0d) {
        this.state = END;
        break;
      }
      if (c === 0x3a) {
        field = chunk.toString('ascii', start, i).trim();
        start = i + 1;
        this.state = VALUE;
        break;
      }
      // Speed scan through the rest of the field
      while (i + 1 < l && chunk[i + 1] !== 0x3a) { i++; }
      break;
    case VALUE:
      if (c === 0x0d) {
        var value = chunk.toString('ascii', start, i).trim();
        if (field.toLowerCase() === 'status') {
          this.status = value;
        } else {
          this.headers[field] = value;
        }
        
        this.state = LINE;
        break;
      }
      // Speed scan through the rest of the field
      while (i + 1 < l && chunk[i + 1] !== 0x0d) { i++; }
      break;
    case LINE:
      if (c !== 0x0a) {
        this.emit('error', new Error("Parse Error"));
        break;
      }
      start = i + 1;
      this.state = FIELD;
      break;
    case END:
      if (c !== 0x0a) {
        this.emit('error', new Error("Parse Error"));
        break;
      }
      start = i + 1;
      this.emit('headers', this.status, this.headers);
      this.state = BODY;
      break;
    case BODY:
      this.emit('data', chunk.slice(start));
      i = l - 1;
      break;
    }
    i++;
  }
}

////////////////////////////////////////////////////////////////////////////////
// TEST
/*

var p = new Parser();
p.on('headers', function (headers) {
  console.dir({headers:headers});
});
p.on('data', function (data) {
  console.dir(data);
});
//p.execute(new Buffer("Hello: world\r\nThis: is cool\r\ndon't: you think?\r\n\r\nthis is\nbody"))


p.execute(new Buffer("Hello: world\r\nThis: is cool\r\n"))
p.execute(new Buffer("don't: you think?\r\n\r\nthis is\nbody\n"))
p.execute(new Buffer("and mroe to come"));

*/

