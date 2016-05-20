function WebVoteView(options) {

  // Default values
  var defaults = {
    showDescription: true,
    chamber: 'H',
    session: 89,
    rcnum: 2
  };

  // Compose settings object
  var settings = $.extend(defaults, options);

  // Initialise
  init();

  // Main function
  function init() {
    d3.select("#loading").style("display", "block");
    loadData(settings.chamber, parseInt(settings.session, 10), parseInt(settings.rcnum, 10));
  }

  // AJAX calls to load data
  function loadData(chamber, session, rcnum) {
    queue()
      .defer(d3.json, sprintf("/static/json/districts%03d.json", session))
      .defer(d3.json, sprintf("/static/json/states%03d.json", session))
      // .defer(d3.json, sprintf("../voteview/getvote?id=%s%03d%04d", chamber, session, rcnum))
      // .defer(d3.json, sprintf("../voteview/getmemberslist?session=%d", session))
      .defer(d3.json, sprintf("../voteview/getvote/%s%03d%04d", chamber, session, rcnum))
      .defer(d3.json, sprintf("../voteview/getmemberslist/%d", session))
      .await(drawWidgets);
  }

  // Call the map and scatterplot widgets
  function drawWidgets(error, districts, states, votation, members) {
    d3.select("#loading").style("display", "none");
    if (error) return console.error("Error: ", error);
    if (settings.showDescription) setDescription(votation);
    if (settings.bar !== undefined) {
      var barChart = new WebVoteBar("#bar", {'votation': votation});
    }
    if (settings.map !== undefined) {
      var mapChart = new WebVoteMap("#map", {
                                            'districts': districts,
                                            'states': states,
                                            'votation': votation,
                                            'members': members
                                          },
                                          {
                                            'height': 800,
                                            'width': 1000
                                          });
    }
    if (settings.scatter !== undefined) {
      var scatterChart = new WebVoteScatter("#scatter", {
                                            'districts': districts,
                                            'states': states,
                                            'votation': votation,
                                            'members': members
                                          });
    }
  }

  // Write to the description ids the name, description and date of the rollcall
  function setDescription(vote) {
    d3.select("#wvv-rollcall").html(sprintf("Chamber %s/Congress %d/Rollcall %d",
                                             vote.chamber, vote.session, vote.rollnumber));
    d3.select("#wvv-description").html(vote.description);
    d3.select("#wvv-date").html(vote.date);
  }
}