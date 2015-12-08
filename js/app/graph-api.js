define(["d3js", "app/graph-config"], function (d3, graphConfig) {

  function resetZoom() {
    d3.select("#graph-container").transition().duration(600).attr("transform", "translate(0,0) scale(1)");
    var zoom = graphConfig.zoom;
    zoom.scale(1);
    zoom.translate([0, 0]);
  }

  return {
    resetZoom: resetZoom
  };
});
