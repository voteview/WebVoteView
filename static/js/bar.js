/*jslint white: true */
function WebVoteBar(element, data, options) {

  // Configurable variables
  var defaults_map = {
    width: 560,
    barHeight: 25,
    barSeparation: 5,
    transitionDuration: 750,
    margin: 40
  };

  // Compose Settings Object
  var settings = $.extend(defaults_map, options);

  // Map vote choices
  var choiceVotes = {
    "Yea": [1, 2, 3],
    "Nay": [4, 5 ,6],
    "Abs": [7, 8, 9]
  };

  // bar.js
  // Define the colors of the political parties and votes
  var partyColors = {
    "YeaFederalist": "#0000FF",
    "NayFederalist": "#AAAAFF",
    "AbsFederalist": "#DDD",
    "YeaDemocrat": "#0000FF",
    "NayDemocrat": "#AAAAFF",
    "AbsDemocrat": "#DDD",
    "YeaFarmer-Labor": "#0000FF",
    "NayFarmer-Labor": "#AAAAFF",
    "AbsFarmer-Labor": "#DDD",
    "YeaProgressive": "#0000FF",
    "NayProgressive": "#AAAAFF",
    "AbsProgressive": "#DDD",
    "YeaRepublican": "#FF0000",
    "NayRepublican": "#FFAAAA",
    "AbsRepublican": "#DDD",
    "YeaIndependent": "#FFDD00",
    "NayIndependent": "#FFDDAA",
    "AbsIndependent": "#DDD"
  };

  // Init the chart
  chart(element, data);

  function chart(element, data) {

    // Prepare the data for D3, objects -> arrays
    var parties = [];
    for(var index in data.votation.resultparty) {
      d = data.votation.resultparty[index];
      var votes = [];
      for (vote in choiceVotes){
          var numberVotes = choiceVotes[vote].map(function (x) { return d[x] || 0; });
          votes.push({'vote': vote, 'number': d3.sum(numberVotes), 'party': index})
      }
      d.votes = votes;
      d.party = index;
      parties.push(d);
    }

    // Order the result by  number of yea votes
    parties.sort(function(a, b) { return b.votes[0].number - a.votes[0].number; });

    // Calculate the svg height in function of the number of parties
    var svgHeight = parties.length * 3 * (settings.barHeight + settings.barSeparation) + settings.margin + settings.barSeparation;

    // Define the scales
    var partyScale = d3.scale.ordinal()
      .domain(parties.map(function(d) { return d.party; }))
      .rangeRoundBands([0, svgHeight - settings.margin], .1);

    var voteScale = d3.scale.ordinal()
      .domain(d3.keys(choiceVotes))
      .rangeRoundBands([0, svgHeight], .1);

    var xScale = d3.scale.linear()
      .domain([0, d3.max(parties, function(d) { return d3.max(d.votes, function(d) { return d.number }); })])
      .range([0, settings.width - 200]);

    // Define the axis
    var xAxis = d3.svg.axis()
      .scale(xScale)
      .ticks(5)
      .orient("bottom");

    var yAxis = d3.svg.axis()
      .scale(partyScale)
      .orient("left");

    // Lets draw the chart
    svgBar = d3.select(element)
      .append("svg")
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("width", settings.width)
      .attr("height", svgHeight);

    svgBar.append("g")
        .attr("class", "bar-axis")
        .attr("transform", "translate(200," + (svgHeight - settings.margin + settings.barSeparation) + ")")
        .call(xAxis);

    svgBar.append("g")
        .attr("class", "bar-axis")
        .attr("transform", "translate(155, " + settings.barSeparation + ")")
        .call(yAxis);

    var partyBars = svgBar.selectAll(".party")
        .data(parties)
      .enter().append("g")
        .attr("class", "g")
        .attr("transform", function(d) { return "translate(0, " + partyScale(d.party)  + ")"; });

    partyBars.selectAll('rect')
      .data(function(d) { return d.votes; })
      .enter()
      .append("rect")
      .attr("x", 200)
      .attr("y", function (d, i) {
        return i * (settings.barHeight + settings.barSeparation);
      })
      .attr("height", settings.barHeight)
      .attr("width",  function (d, i) {
        return xScale(d.number);
      })
      .attr("fill", function(d){
        return partyColors[d.vote + d.party];
      });

    var legend = partyBars.selectAll('text')
        .data(function(d) { return d.votes; })
      .enter().append("g")
        .attr("class", "legend");


    legend.append("text")
        .attr("x", 190)
        .attr("y", function(d, i) { return i * (settings.barHeight + settings.barSeparation) + settings.barHeight/2 ;} )
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d.vote; });

  }
}
