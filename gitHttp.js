var CGI = require('cgi');

module.exports = function setup(root, repo) {

  if (root.substr(root.length - 1) === '/') {
    root = root.substr(0, root.length - 1);
  }
  return CGI("/usr/lib/git-core/git-http-backend", {
    mountPoint: root,
    env: {
      GIT_PROJECT_ROOT: repo,
      GIT_HTTP_EXPORT_ALL: "",
      REMOTE_USER: "tim"
    }
  });
};
