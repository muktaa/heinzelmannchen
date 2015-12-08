define(["jquery", "d3js", "app/graph-api"], function ($, d3, graphApi) {
  $("#search").keyup(function(e){
    if(e.keyCode == 13){
      //reset previous pulse
      d3.selectAll("circle.pulse").classed('pulse', false);

      var searchKey = $("#search").val();
      var matches = d3.selectAll("circle[number='" + searchKey + "']");
      if(matches.length>0) {
        matches.classed('searched', true).classed('pulse', true);
        graphApi.resetZoom();
      } else {
        console.debug("No node found for search: " + searchKey);
      }
    }
  });

  $("#reset-search").click(function(){
    d3.selectAll("circle").classed('pulse', false).classed('searched', false);
    graphApi.resetZoom();
  });
});
