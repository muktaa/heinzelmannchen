requirejs.config({
    "baseUrl": "js",
    "paths": {
      "app": "app",
      "jquery": "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.4/jquery.min",
      "underscorejs": "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.8.3/underscore-min",
      "materialize": "https://cdnjs.cloudflare.com/ajax/libs/materialize/0.97.3/js/materialize.min",
      "d3js":"https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.10/d3",
      "hammerjs":"https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.4/hammer.min"
    }
});

require(["jquery", "hammerjs"], function () {
  require(["materialize"]);
});

require(["app/heinz"]);
