require(["jquery", "underscorejs", "d3js", "app/search-widget", "app/graph-config"], function ($, underscore, d3, searchWidget, graphConfig) {
  (function() {

    var heinzConfig = {};

    function  getQueryStrings() {
      var queryStrings = {};
      location.search.substr(1).split("&").forEach(function(item) {
        var k = item.split("=")[0], v = decodeURIComponent(item.split("=")[1]);
        if (k in queryStrings) {queryStrings[k].push(v); } else { queryStrings[k] = [v]; }
      });
      return queryStrings;
    }

    function checkAuth() {
      if(typeof(Storage) !== "undefined") {
        if(localStorage.heinzAuth) {
          $("#auth-input").hide();
          heinzConfig.authToken = localStorage.heinzAuth;
          return true;
        } else {
          $("#auth-input").show();
          $("#issue-visualization").hide();
          return false;
        }
      } else {
        alert("Sorry, your broser does not support the required HTML5 features.");
        throw new Error("Unsupported broser!");
      }
    }

    function setConfig() {
      var queryStrings = getQueryStrings();
      if(!(queryStrings.repo && queryStrings.org)) {
        alert("Please fill in all required parameters in the URL.");
        window.open("/?org=cotiviti&repo=heinzelmannchen&repo=cotiviti-parent","_self",false);
      } else {
        heinzConfig.repos = queryStrings.repo;
        heinzConfig.org = queryStrings.org[0];
      }
    }

    function apiURI(projectName) {
      return "https://api.github.com/repos/" + heinzConfig.org + "/" + projectName + "/issues?per_page=100";
    }

    //controls remaining pagination loads
    var remainingPages = {};

    function loadIssuesPage(apiURI, page) {

      var requestUrl = apiURI + (page ? "&page=" + page : "");

      return $.ajax({
               url: requestUrl ,
               type: "GET",
               cache: false,
               beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'token ' + heinzConfig.authToken);},
               success: function(res, status, xhr) {
                 var pagination = xhr.getResponseHeader("link");
                 if (pagination && pagination.indexOf('rel="next"') > 0) {
                    if(!remainingPages[apiURI]) {
                      remainingPages[apiURI] = 1;
                    }
                    remainingPages[apiURI] = remainingPages[apiURI] + 1;
                 } else if (remainingPages[apiURI]) {
                   delete remainingPages[apiURI];
                 }
               }
            });
    }

    function drawGraph(dependencies) {

      function makeNodes(type) {
        return _.map(_.values(dependencies[type]), function(e) {e.type = type; return e;});
      }

      function rescale() {
        var trans = d3.event.translate;
        var scale = d3.event.scale;
        graphContainer.attr('transform', 'translate(' + trans + ') scale(' + scale + ')');
      }

      //TODO autmatic resizing
      var width = $(window).width();
      var height = $(window).height() - $(".nav-wrapper").height();

      var force = d3.layout.force()
          .charge(-300)
          .linkDistance(80)
          .size([width, height]);

      var drag = force.drag()
          .origin(function(d) { return d; })
          .on('dragstart', dragstarted);

      function dragstarted() { // jshint ignore:line
        d3.event.sourceEvent.stopPropagation();
      }

      var svg = d3.select("div#dependency-graph").append("svg")
          .attr("width", width)
          .attr("height", height)
          .call(graphConfig.zoom.on('zoom', rescale)).on('dblclick.zoom', null);

      var users = makeNodes("users");
      var issues = makeNodes("issues");
      var milestones = makeNodes("milestones");
      var nodes = _.union(users, issues, milestones);
      var links = [];

      // assemble milestone -> issue dependencies
      _.each(dependencies.milestoneDependencies, function(dep) {
        links.push({
          source: dependencies.milestones[dep.milestone],
          target: dependencies.issues[dep.issue]
        });
      });

      // assemble issue -> user dependencies
      _.each(dependencies.userDependencies, function(dep) {
        links.push({
          source: dependencies.issues[dep.issue],
          target: dependencies.users[dep.user]
        });
      });

      _.each(dependencies.indicationDependencies, function(dep) {
        links.push({
          source: dependencies.issues[dep.source],
          target: dependencies.issues[dep.target]
        });
      });

      var graph = {
        nodes: nodes,
        links: links
      };

      var defs = svg.append('svg:defs');

      defs.selectAll(".avatar")
      .data(users).enter()
      .append("pattern")
        .attr("id", function(d) { return "avatar_" + d.id; })
        .attr("width", "20")
        .attr("height", "20")
        .attr("x", 0)
        .attr("y", 0)
        .attr("viewbox", "0 0 20 20")
        .append("svg:image")
          .attr("xlink:href", function(d) { return d.avatar_url; })
          .attr("width", 40)
          .attr("height",40)
          .attr("x", 0)
          .attr("y", 0)
          .attr("class", "avatar");

      svg.append("svg:defs").selectAll("marker")
        .data([["endBig", 45], ["endDefault", 28]])
        .enter().append("svg:marker")
          .attr("id", function(d) { return d[0];})
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", function(d) { return d[1];})
          .attr("refY", 0)
          .attr("markerWidth", 6)
          .attr("markerHeight", 6)
          .attr("orient", "auto")
          .append("svg:path")
            .attr("d", "M0,-5L10,0L0,5");

      var graphContainer = svg.append('g').attr("id", "graph-container");

      force
          .nodes(graph.nodes)
          .links(graph.links)
          .start();

      var link = graphContainer.selectAll(".link")
          .data(graph.links)
        .enter().append("line")
          .attr("class", "link")
          .attr("marker-end", function(d) {
            if (d.target.type === "users") {
              return "url(#endBig)";
            } else {
              return "url(#endDefault)";
            }
          })
          .style("stroke-width", function(d) { return Math.sqrt(d.value); });

      var node = graphContainer.selectAll(".node")
          .data(graph.nodes)
        .enter().append("circle")
          .attr("class", "node")
          .classed("recently-modified", function(d) {
            if(d["created_at"]) {
              var created = new Date(d["updated_at"]);
              if (((new Date().getTime()) - created.getTime()) < 24*60*60*1000) {
                return true;
              }
            }
            return false;
          })
          .attr("r", function(d) {
            if(d.type === "users") {
              return 20;
            } else {
              return 10;
            }
          })
          .attr("number", function(d) { return d.number; })
          .attr("type", function(d) { return d.type; })
          .style("fill", function(d) {
            if(d.type === 'users') {
              return "url(#avatar_" + d.id + ")";
            } else if (d.type === "issues" && d.labels && d.labels.length > 0) {
              var priorityLabels = _.pluck(d.labels, "name");
              if(_.contains(priorityLabels, 'priority high')) {
                return '#b71c1c';
              } else if(_.contains(priorityLabels, 'priority medium')) {
                return '#f57c00';
              } else if(_.contains(priorityLabels, 'priority low')) {
                return '#ffa726';
              }
            }
            return graphConfig.color(d.type);
          })
          .on('click', function(d, ev) {   if (d3.event.defaultPrevented || !d.html_url) {return;} window.open(d.html_url, '_blank').focus();})
          .call(drag);

      node.append("title")
          .text(function(d) {
            if(d.type === 'users') {
              return d.login;
            } else if(d.type === 'issues') {
              return "#" + d.number + " - " + d.title;
            } else if(d.type === 'milestones') {
              return "M - " + d.title;
            } else if(d.type === 'issues') {
              return d.title;
            }
          });

      force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; });
      });
    }

    function findIssueDependencies(issueBody) {
      function getDependencies(dependenciesSection) {
        var re = /\* \[ \] \#(\d+).*/g;
        var issueDependencies = [];
        var match;
        while (match = re.exec(dependenciesSection)) {
          issueDependencies.push({number: match[1]});
        }
        return issueDependencies;
      }

      var startDependenciesSection = issueBody.indexOf("# Dependencies");
      if(startDependenciesSection<0) {
        return [];
      } else {
        //TODO improve the regex stuff
        var dependenciesSection = issueBody.substring(startDependenciesSection);
        return getDependencies(dependenciesSection);
      }
    }

    function processIssues(issues) {
      var milestones = {};
      var users = [];
      var milestoneDependencies = [];
      var userDependencies = [];
      var indicationDependencies = [];

      //extract dependencies from the graph
      _.each(issues, function(issue) {
        if(issue.milestone) {
          if(!milestones[issue.milestone.id]) {
            milestones[issue.milestone.id] = issue.milestone;
          }
          milestoneDependencies.push({milestone: issue.milestone.id, issue: issue.id});
        }

        if(issue.assignee) {
          if(!users[issue.assignee.id]) {
            users[issue.assignee.id] = issue.assignee;
          }
          userDependencies.push({user: issue.assignee.id, issue: issue.id});
        }

        var dependentIssuesMeta = findIssueDependencies(issue.body);
        var depententIssues = dependentIssuesMeta.map(function(dependentIssueMeta) {
          var urlPrefix = issue.html_url.substring(0, issue.html_url.lastIndexOf("/")+1);
          return _.find(issues, function(otherIssue) {
              return otherIssue.html_url === urlPrefix + dependentIssueMeta.number;
          }) || dependentIssueMeta;
        });
        _.each(depententIssues, function(dependentIssue) {
          if(dependentIssue.id) {
            indicationDependencies.push({
              source: issue.id,
              target: dependentIssue.id
            });
          } else {
            console.warn("Referenced issue #" + dependentIssue.number + " was not found as referenced in #" + issue.number);
          }
        });
      });

      drawGraph({
        issues: _.indexBy(issues, 'id'),
        users : users,
        milestones: milestones,
        milestoneDependencies: milestoneDependencies,
        userDependencies: userDependencies,
        indicationDependencies: indicationDependencies
      });
    }

    function waitForPromises(issuePromises, paginatedIssues) {
      Promise.all(issuePromises).then(function() {
          var issues = _.union(paginatedIssues, _.flatten(arguments));
          if(_.keys(remainingPages).length === 0) {
            processIssues(issues);
          } else {
            var extendedPromises = _.map(_.pairs(remainingPages), function(pair) { return loadIssuesPage(pair[0], pair[1]); });
            waitForPromises(extendedPromises, issues);
          }
        }, function(err) {
        console.error(err);
      });
    }

    function loadIssues() {
      //load issues for all repos configured in the config file
      var issuePromises = _.map(heinzConfig.repos, function(repo) { return loadIssuesPage(apiURI(repo));});
      waitForPromises(issuePromises, []);
    }

    (function() {

      var authIsSet = checkAuth();

      setConfig();

      if(authIsSet) {
        loadIssues();
      } else {
        $("#set-access-token").click(function(){
          var token = $("#authtoken").val();
          $("#auth-input").hide();
          heinzConfig.authToken = token;
          localStorage.heinzAuth = token;
          $("#issue-visualization").show();
          loadIssues();
        });
      }
    }());
  }());

});
