var ChildProcess = require('child_process'),
    Path = require('path'),
    FS = require('fs');

var ENOENT = require('constants').ENOENT;
var gitENOENT = /(does not exist in|unknown revision or path not in the working tree)/;

exports.getHead = getHead;
exports.readFile = readFile;

// Loop up the latest revision for a given repo using direct FS calls
// This is much faster than spawning `git` is a subprocess.
// Caches the value for 1 second
var headCache = {};
var headQueues = {};
function getHead(repo, callback) {

  // If the value is in the cache, return it right away!
  if (headCache.hasOwnProperty(repo)) {
    return callback(null, headCache[repo]);
  }

  // Load the queue, generate if needed  
  if (!headQueues.hasOwnProperty(repo)) headQueues[repo] = [];
  var headQueue = headQueues[repo];
  
  // If there is already a query enqueue, don't start another in parallel
  if (headQueue.length) {
    return headQueue.push(callback);
  }
  
  // Put this on the queue
  headQueue.push(callback);

  var packedRefs, head, master;
    
  FS.readFile(Path.join(repo, "packed-refs"), "ascii", function (err, result) {
    if (err) return groupCallback(err);
    packedRefs = result;
    done();
  });

  FS.readFile(Path.join(repo, "HEAD"), "ascii", function (err, result) {
    if (err) return groupCallback(err);
    var match = result.match(/^ref: (.*)\n$/);
    if (!(match && match[1])) return groupCallback(new Error("Missing ref: in HEAD"));
    head = match[1];
    FS.readFile(Path.join(repo, head), "ascii", function (err, result) {
      master = result || null;
      done();
    });
  });
  
  function groupCallback() {
    for (var i = 0, l = headQueue.length; i < l; i++) {
      headQueue[i].apply(null, arguments);
    }
    headQueue.length = 0;
  }
  
  function done() {
    if (packedRefs === undefined || head === undefined) return;
    if (master) {
      match = master.match(/([a-f0-9]{40})\n/);
    } else {
      match = packedRefs.match(new RegExp("([a-f0-9]{40}) " + head));
    }
    if (!(match && match[1])) return groupCallback(new Error("Can't find hash"));
    headCache[repo] = match[1];

    // Keep the value valid for a second
    setTimeout(function () {
      delete headCache[repo];
    }, 1000);

    groupCallback(null, headCache[repo]);
    
  }
}


var ENOENT = require('constants').ENOENT;
var gitENOENT = /(does not exist|unknown revision or path not in the working tree)/;

function readFile(repo, revision, path, callback) {
  var show = ChildProcess.spawn("git", ["--git-dir=" + repo, "show", revision + ":" + path]);
  
  var stdout = "";
  show.stdout.setEncoding('utf8');
  show.stdout.on('data', function (chunk) { stdout += chunk; });

  var stderr = "";
  show.stderr.setEncoding('utf8');
  show.stderr.on('data', function (chunk) { stderr += chunk; });
  
  show.on('exit', function (code, signal) {
    if (code > 0) {
      var err = new Error(stderr);
      if (gitENOENT.test(stderr)) {
        err.errno = ENOENT;
        err.code = 'ENOENT';
      }
      return callback(err);
    }
    callback(null, stdout);
  });
}


