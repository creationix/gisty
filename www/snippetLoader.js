window.addEventListener('load', function (evt) {
  var snippets = Array.prototype.slice.call(document.querySelectorAll("pre.snippet"));
  snippets.forEach(function (snippet, i) {
    var path = snippet.getAttribute('src');
    window["snippet" + i] = function (code) {
      // TODO: Detect type from path extension
      var lang = "js";

      var header = document.createElement('div');
      header.textContent = path;
      snippet.appendChild(header);
      var node = document.createElement('code');
      node.innerHTML = prettyPrintOne(code.replace(/\n/g, "<br/>\n").replace(/ /g, "&nbsp;"));
      snippet.appendChild(node);
    };
    var loader = document.createElement('script');
    loader.setAttribute('src', "/snippets/" + path + "?jsonp=snippet" + i);
    loader.setAttribute('async', '');
    document.head.appendChild(loader);
  });
});

