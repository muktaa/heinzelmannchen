(function() {

  function loadIssues(projectName) {
    return $.ajax({
             url: "https://api.github.com/repos/" + heinz.org + "/" + projectName + "/issues",
             type: "GET",
             beforeSend: function(xhr){xhr.setRequestHeader('Authorization', 'token ' + heinz.authToken);}
          });
  }

  function drawGraph(dependencies) {

    function makeNodes(type) {
      return _.map(_.values(dependencies[type]), function(e) {e.type = type; return e;});
    }

    var width = 1280,
        height = 800;

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-300)
        .linkDistance(80)
        .size([width, height]);

    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);

    var users = makeNodes("users");
    var issues = makeNodes("issues");
    var milestones = makeNodes("milestones")
    var nodes = _.union(users, issues, milestones);
    var links = [];

    // assemble milestone -> issue dependencies
    _.each(dependencies.milestoneDependencies, function(dep) {
      links.push({
        source: dependencies.milestones[dep.milestone],
        target: dependencies.issues[dep.issue]
      })
    })

    // assemble issue -> user dependencies
    _.each(dependencies.userDependencies, function(dep) {
      links.push({
        source: dependencies.issues[dep.issue],
        target: dependencies.users[dep.user]
      })
    })

    _.each(dependencies.indicationDependencies, function(dep) {
      links.push({
        source: dependencies.issues[dep.source],
        target: dependencies.issues[dep.target]
      })
    })

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
        .attr("id", function(d) { return d[0]})
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", function(d) { return d[1]})
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
          .attr("d", "M0,-5L10,0L0,5");

    force
        .nodes(graph.nodes)
        .links(graph.links)
        .start();

    var link = svg.selectAll(".link")
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

    var node = svg.selectAll(".node")
        .data(graph.nodes)
      .enter().append("circle")
        .attr("class", "node")
        .attr("r", function(d) {
          if(d.type ==="users") {
            return 20;
          } else {
            return 10;
          }
        })
        .style("fill", function(d) {
          if(d.type === 'users') {
            return "url(#avatar_" + d.id + ")"
          }return color(d.type);
        })
        .call(force.drag);

    node.append("title")
        .text(function(d) { return (d.title ||  d.login);});

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
      var re = /\* \[ \] \#(\d+) \- (.*)/g;
      var issueDependencies = [];
      var match;
      while (match = re.exec(dependenciesSection)) {
        issueDependencies.push({number: match[1], title: match[2]});
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

  (function() {
    //load issues for all repos configured in the config file
    var issuePromises = _.map(heinz.repos, loadIssues);
    Promise.all(issuePromises).then(function() {
      var issues = _.flatten(arguments);
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

        var dependentIssuesMeta = findIssueDependencies(issue.body)
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
            })
          } else {
            console.warn("Referenced issue was not found:");
            console.warn(dependentIssue);
          }
        })
      });


      drawGraph({
        issues: _.indexBy(issues, 'id'),
        users : users,
        milestones: milestones,
        milestoneDependencies: milestoneDependencies,
        userDependencies: userDependencies,
        indicationDependencies: indicationDependencies
      })
    }, function(err) {
      console.error(err);
    });
  }())
}())
