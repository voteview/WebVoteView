% STATIC_URL = "/static/"
% rebase('base.tpl',title='Plot Vote', extra_css=["map.css","scatter.css"])
% include('header.tpl')
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
<div class="container">
  <div class="row">
      <div class="col-md-12">
        <h3>
                <abbr title="Congress">{{ rcSuffix(rollcall["congress"]) }} Congress</abbr> &gt;
                <abbr title="Chamber">{{ rollcall["chamber"] }}</abbr> &gt;
                <abbr title="Rollnumber">Vote {{ rollcall["rollnumber"] }}</abbr> </h3>
        <p style="float:left;margin-right:20px;"><strong>Date:</strong> {{ rollcall["date"] }}</p>
        <p style="float:left;">
                <strong>Vote Subject Matter:</strong> {{ rollcall["code"]["Clausen"][0] }} / {{ rollcall["code"]["Peltzman"][0] }}
        </p>
        <p style="clear:both;">{{ rollcall["description"] }}</p>
    </div>
  </div>


 <div class="row" id="loadBar">
	<div class="col-md-12">
		<h4>Loading</h4>
		We are currently constructing the map and plots you requested, please wait...
	</div>
 </div>

	<div style="display:none;" id="loadedContent">

 <div class="row">
      <div class="col-md-9">
	<h4 style="float:left;clear:none;vertical-align:middle;">Vote Map</h4>
          <span id="map-chart" style="margin-top:10px; padding: 10px; vertical-align:bottom;">
	      <span id="suppressMapControls" style="display:none;">
		<span class="filter"></span>
	      </span>
          </span>
      </div>
      <div class="col-md-3">
          <div id="party-chart" style="position:absolute;">
              <strong>Votes</strong>
	      <span id="suppressVoteChartControls" style="display:none;">
		<span class="filter"></span>
	      </span>
          </div>
      </div>
  </div>

  <div class="row">
      <div class="col-md-12">
          <h4>DW-Nominate Cut-Line for Vote</h4>
          <div id="scatter-container" style="margin:0 auto 0 auto;">
              <div id="scatter-bg">
                  <svg id="svg-bg"> 
                  </svg> 
              </div>
	      <div id="scatter-chart">
			<span id="suppressNominateControls" style="display:none;">
				<span class="filter"></span>
			</span>
              </div>
	  </div>
      </div>
  </div>

<!--
  <div class="row">
      <div class="col-md-12">
	<h4>Vote Table</h4>
          <table class="table table-hover dc-data-table">
              <thead>
              <tr class="header">
                  <th>Name</th>
                  <th>Party</th>
                  <th>Profile</th>
              </tr>
              </thead>
          </table>
      </div>
  </div>
-->

	</div>
</div>

<div id="selectionFilterBar" style="z-index: 99;position:fixed; bottom:0px; height:40px; left:0px; width:100%; background-color:#EEEEEE; padding: 10px; border-top:1px solid black; display:none; ">
	<strong>Selected:</strong> 
	<span id="data-count"><span class="filter-count"></span> of <span class="total-count"></span> <span id="votertype"></span> </span>
	<span id="map-chart-controls" style="display:none;">from <span class="filter"></span> </span> 
	<span id="vote-chart-controls" style="display:none;">including <span class="filter"></span> </span>
	<span id="nominate-chart-controls" style="display:none;">with NOMINATE scores within <span class="filter"></span></em> </span>
	. 
	<a class="reset" href="javascript:doFullFilterReset();">Remove Filter</a>
</div>

<script type="text/javascript" src="{{ STATIC_URL }}js/libs/sprintf.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/topojson.v1.min.js"></script>

<script type="text/javascript">
'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

var chamber = "{{ rollcall["chamber"] }}";

// TODO: Define the colors used for the cloropeth
// dc_rollcall
var partyColors = {
    "YeaFederalist": "#0000FF",
    "NayFederalist": "#AAAAFF",
    "AbsFederalist": "#DDD",
    "YeaDemocrat": "#0000FF",
    "NayDemocrat": "#AAAAFF",
    "AbsDemocrat": "#EEE",
    "YeaFarmer-Labor": "#0000FF",
    "NayFarmer-Labor": "#AAAAFF",
    "AbsFarmer-Labor": "#DDD",
    "YeaProgressive": "#0000FF",
    "NayProgressive": "#AAAAFF",
    "AbsProgressive": "#DDD",
    "YeaRepublican": "#FF0000",
    "NayRepublican": "#FFAAAA",
    "AbsRepublican": "#EEE",
    "YeaIndependent": "#FFDD00",
    "NayIndependent": "#FFDDAA",
    "AbsIndependent": "#DDD",
    "YeaJackson": "#024959",
    "NayJackson": "#F24C27",
    "AbsJackson": "#5F5448",
    "YeaAnti-Jackson": "#5F5448",
    "NayAnti-Jackson": "#0092B2",
    "AbsAnti-Jackson": "#A8C545",
    "YeaConservative": "#5F5448",
    "NayConservative": "#0092B2",
    "AbsConservative": "#A8C545",
    "YeaAmerican": "#0092B2",
    "NayAmerican": "#B6E548",
    "AbsAmerican": "#FF530D",
    "YeaPopulist": "#D93D4A",
    "NayPopulist": "#0367A6",
    "AbsPopulist": "#F2CB05",
    "YeaUnionist": "#01A55B",
    "NayUnionist": "#F4A104",
    "AbsUnionist": "#A62F01"
};

var votePartyChart = dc.rowChart("#party-chart");
var mapChart = dc.geoChoroplethChart("#map-chart");
var nominateScatterChart = dc.scatterPlot("#scatter-chart");
var debugDimensions;
var globalData;

(function loadData() {
    if (chamber == "House") {
        queue()
          .defer(d3.json, sprintf("{{ STATIC_URL }}json/districts%03d.json", {{ rollcall["congress"] }}))
          .defer(d3.json, "/api/download/{{ rollcall["id"] }}")
          .await(drawWidgets);
    } else if (chamber == "Senate") {
        queue()
          .defer(d3.json, sprintf("{{ STATIC_URL }}json/states%03d.json", {{ rollcall["congress"] }}))
          .defer(d3.json, "/api/download/{{ rollcall["id"] }}")
          .await(drawWidgets);
    }
})();

function drawWidgets(error, geodata, data) {
	globalData = data;
    $("#loadBar").slideToggle();
    $("#loadedContent").animate({"height": "toggle", "opacity": "toggle"},"slow");
    var ndx = crossfilter(data.rollcalls[0].votes); 
    var all = ndx.groupAll();
  // Test points for figure calibration, JBL
  if (false) {
    data.rollcalls[0].votes[0].x = 0;
    data.rollcalls[0].votes[0].y = 1;
    data.rollcalls[0].votes[1].x = 0;
    data.rollcalls[0].votes[1].y = -1;
    data.rollcalls[0].votes[2].x = 1;
    data.rollcalls[0].votes[2].y = 0;
    data.rollcalls[0].votes[3].x = -1;
    data.rollcalls[0].votes[3].y = 0;
    for (var i=4;i< data.rollcalls[0].votes.length;i++) {
	data.rollcalls[0].votes[i].x=0;
	data.rollcalls[0].votes[i].y=0;
    }
  }

    var voteDimension = ndx.dimension(function(d) { return d.vote; });
    var voteGroup = voteDimension.group();

    var partyDimension = ndx.dimension(function(d) { return d.party; });
    var partyGroup = partyDimension.group();

    var votePartyDimension = ndx.dimension(function(d) { return d.vote + d.party; });
    var votePartyGroup = votePartyDimension.group();
    var xDimension = ndx.dimension(
                //Project outlying ideal points onto the outer circle (Radius=1.2)... 		    
		function(d) {
		    var x = d.x;  var y = d.y;
		    var R = Math.sqrt(x*x + y*y);
		    if (R>1.2) {
                       x = x*1.2/R;
                       y = y*1.2/R;
                    }
		    return [x, y];
		 }
         );

    var xGroup = xDimension.group().reduce(
        function (p, d) {
           p.members.push(d);
            return p;
        },

        function (p, d) {
            var index = p.members.indexOf(d);
            if (index > -1) {
              p.members.splice(index, 1);
            }
            return p;
        },

        function () {
            return {members: []} ;
        });

    var stateDimension = ndx.dimension(function(d) { return d.state; });
    // Array of colors for each district
    var stateGroup = stateDimension.group().reduce(
        function (p, d) {
            p.members.push(d);
            return p;
        },

        function (p, d) {
            var index = p.members.indexOf(d);
            if (index > -1) {
              p.members.splice(index, 1);
            }
            return p;
        },

        function () {
            return {members: []} ;
        });

    var districtDimension = ndx.dimension(function(d) { 
	//console.log(d.name+"/"+d.district);
	return d.district; 
	});
	debugDimensions = districtDimension;


    // Array of colors for each district
    var districtGroup = districtDimension.group().reduce(
        function (p, d) {
		//console.log("To group: ");
		var pcopy = p;
		//console.log(pcopy);
		//console.log("Trying to add district: ");
		//console.log(d);
		//console.log("Extant length: "+p.members.length);
            // Add at large members
            var atlargecode = d.state + "00";
            var atlarge = $.grep(data.rollcalls[0].votes, function(e)
		{
			if(e.district==atlargecode)
			{
				//console.log(e.district);
			}
			return e.district==atlargecode;
		});
		//console.log("At large found: "+atlarge.length);
            $.each(atlarge, function(member) {
                p.members.push(atlarge[member]);
            });
		//console.log("New extant length: "+p.members.length);
            p.members.push(d);
		//console.log("Final extant length: "+p.members.length);
		if(p.members.length!=1)
		{
			//console.log(p);
		}
		//console.log("=====");
            return p;
        },

        function (p, d) {
		//console.log('huh');
            // Remove at large members
            var atlargecode = d.state + "00";
            var atlarge = $.grep(data.rollcalls[0].votes, function(e){return e.district == atlargecode; });
            $.each(atlarge, function(member) {
                p.members.splice( $.inArray(atlarge[member], p.members), 1);
            });

            var index = p.members.indexOf(d);
            if (index > -1) {
              p.members.splice(index, 1);
            }
            return p;
        },

        function () {
            return {members: []} ;
        });

    votePartyChart
        .width(320)
        .height(320)
        .dimension(votePartyDimension)
        .group(votePartyGroup)
        .elasticX(true)
        .colorCalculator(function (d) {
            //console.log(d);
            return partyColors[d.key];
        })
	.fixedBarHeight(24).gap(10)
	.labelOffsetX(40)
	.label(function(d)
	{
		var textLabel = d.key.substr(3,d.key.length)+": "+d.key.substr(0,3)
		return textLabel
	})
	.ordering(function(d){ // Sort Yea-to-Nay, Alphabetically, set independents separately.
		var score = 0
		switch(d.key.substr(0,3))
		{
			case "Yea": score = 9; break;
			case "Nay": score = 6; break;
			case "Abs": score = 3; break
		}
		switch(d.key.substr(3,d.key.length))
		{
			case "Democrat": score=score+2; break;
			case "Republican": score=score+1; break;
			default: score=score+0; break;
		}
		return -score;
	})
	.transitionDuration(200)
        .xAxis().ticks(4);

    nominateScatterChart
        .width(600)
        .height(600)
        .margins({top:25,right:25,bottom:75,left:75})
        .dimension(xDimension)
        .mouseZoomable(false)
        .group(xGroup)
        .symbolSize(7)
        .colorCalculator(function (d) { 
            var color = "#CCC";
            try {
                if(d.value.members.length > 0){   
                    color = blendColors(d.value.members);
                }
            }catch(e){
           }
            return color; 
        })
        .highlightedSize(10)
        .x(d3.scale.linear().domain([-1.2, 1.2])) 
        .y(d3.scale.linear().domain([-1.2, 1.2]));
    
    dc.dataCount("#data-count")
        .dimension(ndx)
        .group(all);

    dc.dataTable(".dc-data-table")
        .dimension(voteDimension)
        .group(function (d) {
            return d.vote;
        })
        .size(436)
        .columns([
            function (d) {
		var cqlabel=""
		if(d.party) { cqlabel=d.party.substr(0,1); }
		else { cqlabel="?"; }

		if(chamber=="House") { 
			if(d.district) { cqlabel+="-"+d.district; }
			else if(d.state=="POTUS") { cqlabel +="-POTUS"; }
		} else { cqlabel+="-"+d.state; }
		
                return "<a href=\"/person/"+d["id"]+"\">"+d["name"] + "</a> ("+cqlabel+")";
            },
            function (d) {
		if(d.party)
		{
	                return d.party;
		}
		else
		{
			return "Data Error";
		}
            },
            function (d) {
              return "<a class='btn btn-primary btn-sm' href='/person/" + d.id + "'>See profile</a>"
            }
        ]);

        if (chamber == "House") {
            /* Initialize tooltip */
            var houseMapTip = d3.tip().attr('class', 'd3-tip').html(function(p, d) {
              var result = "<p>" + d.key + "</p>";
		//console.log(p);
		//console.log(d);
		//console.log(d.value);
              for (var i = 0; i < d.value.members.length; i++) {
		var colorVote = partyColors[d.value.members[i].vote + d.value.members[i].party];
		// Tooltip data display:
		// result += "<p>" + d.value.members[i].name + "  ("+d.value.members[i].party[0].toUpperCase()+"-"+d.value.members[i].district+"): <span style='color:" + colorVote + "'> " + d.value.members[i].vote + "</span></p>";
                result += "<p>" + d.value.members[i].name + "  -  <span style='color:" + "white" + "'> " + d.value.members[i].vote +"</span></p>";				  
              }
              return result;
            });


            var mapTopo = topojson.feature(geodata, geodata.objects.districts).features;
            mapChart.width(890)
                    .height(500)
                    .dimension(districtDimension)
                    .group(districtGroup)
                    .colorCalculator(function (d) { 
                        var color = "#CCC";
		        try {
	                    //console.log(d);
                            if(d.members.length > 0){
                                color = blendColors(d.members);
                            }
                        }catch(e){
                            //console.log("MC: " + e);
                        }
                        return color; 
                    })
                    .overlayGeoJson(mapTopo, "district", function (d) {
                        return d.id;
                    })
                    .on("postRender", function(c){
                        c.svg()
                          .selectAll("path")
                          .call(houseMapTip)
                          .on('mouseover',function(d, i){
				var districtSet = c.data();
				//console.log(districtSet[271]);
				//console.log(districtSet.length);
				for(i=0;i!=districtSet.length;i++)
				{
					//console.log(i+" - "+districtSet[i].key);
				}
                            var result = $.grep(c.data(), function(e){
				return e.key == d.id; 
				});

                            houseMapTip.attr('class','d3-tip animate')
                            .show(d, result[0])}
                            )
                          .on('mouseout',function(d, i){
                            var result = $.grep(c.data(), function(e){ return e.key == d.id; });
                            houseMapTip.attr('class','d3-tip').show(d, result[0])
                            houseMapTip.hide()
                          })
                    });



        } else if (chamber == "Senate") {

            /* Initialize tooltip */
            var senateMapTip = d3.tip().attr('class', 'd3-tip').html(function(p, d) {
              var result = "<p>" + d.key + "</p>";
              for (var i = 0; i < d.value.members.length; i++) {
                 var colorVote = partyColors[d.value.members[i].vote + d.value.members[i].party];
                  result += "<p>" + d.value.members[i].name + "  -  <span style='color:" + colorVote + "'> " + d.value.members[i].vote + " / " + d.value.members[i].party +"</span></p>";
              }
              return result;
            });

            var mapTopo = topojson.feature(geodata, geodata.objects.states).features;
            mapChart.width(890)
                    .height(500)
                    .dimension(stateDimension)
                    .group(stateGroup)
                    .colorCalculator(function (d) { 
                        var color = "#CCC";
                        try {
                            if(d.members.length > 0){   
                                color = blendColors(d.members);
                            }
                        }catch(e){
                       }
                        return color;
                    })
                    .overlayGeoJson(mapTopo, "state", function (d) {
                        return d.id;
                    })
                    .on("postRender", function(c){
                        c.svg()
                          .selectAll("path")
                          .call(senateMapTip)
                          .on('mouseover',function(d, i){
                            var result = $.grep(c.data(), function(e){ return e.key == d.id; });

                            senateMapTip.attr('class','d3-tip animate')
                            .show(d, result[0])}
                            )
                          .on('mouseout',function(d, i){
                            var result = $.grep(c.data(), function(e){ return e.key == d.id; });
                            senateMapTip.attr('class','d3-tip').show(d, result[0])
                            senateMapTip.hide()
                          })
                    });
        }




    dc.renderAll();

    var gtest = d3.select("#map-chart svg g")
        .call(d3.behavior.zoom()
        .scaleExtent([1, 10])
        .on("zoom", zoom));

    function zoom() {
        gtest.attr("transform", "translate("
                + d3.event.translate
                + ")scale(" + d3.event.scale + ")");
        gtest.style("stroke-width", 1.2 / d3.event.scale + "px");
    }


    decorateNominate(nominateScatterChart,data);

    window.setInterval(pollFilters, 1100);
}

// Blend an array of colors
function blendColors(members) {
    var r = 0, g = 0 , b = 0, i, rgbColor;
    for (i = 0; i < members.length; i++) {
      rgbColor = d3.rgb(partyColors[members[i].vote + members[i].party]);
      r = r + rgbColor.r;
      g = g + rgbColor.g;
      b = b + rgbColor.b; 
    }
    r = r / members.length;
    g = g / members.length;
    b = b / members.length;
    return d3.rgb(r,g,b).toString();
}

// Use this to extract offsets from vote party chart in order to insert category labels.
function splitTranslate(text)
{
	return(parseInt(text.split(",")[1].split(")")[0]));
}

// Update vote party chart in order to insert category labels.
function updateVoteChart() 
{
	var voteChartSVG = $("#party-chart > svg");
	var scanFor = ["Yea", "Nay", "Abs", "NA end"];
	var scanMap = ["Voting Yea", "Voting Nay", "Absent", ""];
	var scanIndex = 0;
	var translateAdj = 0;
	var newMax = 0;
	voteChartSVG.children("g").children("g").each(function(index, item) {
		var tChildren = $(this).children("title").text();
		if(tChildren.length && tChildren.startsWith(scanFor[scanIndex]))
		{
			var currentTranslate = splitTranslate($(this).attr("transform")) + translateAdj;
			$('<g class="label _0" transform="translate(0,'+currentTranslate+')"><text fill="#000000;" font-size="12px" x="6" y="12" dy="0.35em" transform>'+scanMap[scanIndex]+'</text></g>').insertBefore($(this));
			translateAdj = translateAdj+34;
			scanIndex=scanIndex+1;
		}
		newMax = splitTranslate($(this).attr("transform"))+translateAdj;
		$(this).attr("transform","translate(0,"+newMax+")");
	});
	voteChartSVG.children("g").children(".axis").attr("transform","translate(0,"+(newMax+34)+")");
	voteChartSVG.attr("height",(newMax+68));
	$("#party-chart").html($("#party-chart").html());
	return 0;
}

// Polls filters every second to ensure filter changes are reflected in bottom bar.
function pollFilters()
{
	// Proper diction for text
	if(chamber=="House")
	{
		var districtName = "districts";
		var voterName = "representatives";
	}
	else
	{
		var districtName = "states";
		var voterName = "senators";
	}
	$("#votertype").text(voterName);

	var baseFilters = 0;

	// Filters for map unit selection
	var mapFilter = $("#suppressMapControls > .filter").text();
	if(mapFilter.length)
	{
		// Collapse the text, it's too long
		if(mapFilter.length>20)
		{
			var selectCount = (mapFilter.match(/,/g) || []).length;
			mapFilter = mapFilter.split(", ")[0] + " and "+(selectCount-1)+" other "+districtName;
		}
		$("#map-chart-controls > .filter").text(mapFilter);
		$("#map-chart-controls").show();
		baseFilters = baseFilters+1;
	}
	else
	{
		$("#map-chart-controls").hide();
	}

	// Filters for party/vote selection
	var voteFilter = $("#suppressVoteChartControls > .filter").text();
	if(voteFilter.length)
	{
		var selected = voteFilter.split(", ");
		var newDict = {};
		// Rewrite into Party->Vote dict for sentence construction.
		for(var i=0;i!=selected.length;i++)
		{
			var vote = selected[i].substr(0,3);
			var party = selected[i].substr(3);
			if(newDict[party] != undefined)
			{
				newDict[party].push(vote);
			}
			else
			{
				newDict[party] = [vote];
			}
		}

		var baseString = "";
		var p=0;
		for(var party in newDict)
		{
			if(p) { baseString+= "; "; }
			baseString += party+"s voting ";
			var z=0;
			for(var voteType in newDict[party])
			{
				if(z && z+1==newDict[party].length) { baseString += ", and "; }
				else if(z) { baseString += ", "; }
				baseString += newDict[party][voteType];
				z+=1;
			}
			p+=1;
		}
		$("#vote-chart-controls > .filter").text(baseString);
		$("#vote-chart-controls").show();
		baseFilters=baseFilters+1;
	}
	else
	{
		$("#vote-chart-controls").hide();
	}

	// Filters for NOMINATE selection
	var nominateFilter = $("#suppressNominateControls > .filter").text();
	if(nominateFilter.length)
	{
		// Round coordinates to 2 sig figs.
		var coordSets = nominateFilter.split(" -> ");
		var initXY = coordSets[0].split(",");
		var endXY = coordSets[1].split(",");
		initXY[0] = parseFloat(initXY[0].substr(1)).toPrecision(2);
		initXY[1] = parseFloat(initXY[1]).toPrecision(2);
		endXY[0] = parseFloat(endXY[0].substr(0,endXY[0].length-1)).toPrecision(2);
		endXY[1] = parseFloat(endXY[1]).toPrecision(2);
		var resultText = "("+initXY[0]+", "+initXY[1]+") to ("+endXY[0]+", "+endXY[1]+")";
		$("#nominate-chart-controls > .filter").text(resultText);
		$("#nominate-chart-controls").show();
		baseFilters=baseFilters+1;
	}
	else
	{
		$("#nominate-chart-controls").hide();
	}

	// Hide or show the full bar.
	if(baseFilters)
	{
		$("#selectionFilterBar").slideDown();
	}
	else
	{
		$("#selectionFilterBar").slideUp();
	}
	
}

// Easier to update steps to take on a full filter reset by running this.
function doFullFilterReset()
{
	$("#selectionFilterBar").slideUp();
	dc.filterAll();
	dc.redrawAll();
	decorateNominate(nominateScatterChart, globalData);
}

/*
    Draws the background circles, labels and text for the scatter chart
*/
function decorateNominate(oc,data) {
  var width = oc.width();
  
  // Calculate circle attrs
  var margin = 50;
  var radius = (width - 2 * margin) / 2;
  var marginCircle = 25; // Distance of the main circle to the axis
  var circleCenter = { "x": (width + margin) / 2, "y": (width - margin) / 2 };
  var tickLength = width/10;
  var scale = 1.2; // sets radius of the outer circle in nominate units
  var vn = data.rollcalls[0].nominate;
		    
  var ocSVG = d3.select(oc.g()[0][0]);
  ocSVG.selectAll(".axis").remove();

  // Place bg stuff in SVG tree in front of .chart-body scatter points
  var svgbg = ocSVG.insert("g",".chart-body");
		    
  svgbg
    .append("clipPath")
      .attr("id", "scatterclip")
      .attr("x", 0)
      .attr("y", 0)
    .append("circle")
      .attr("r", radius)
      .attr("cx", circleCenter.x)
      .attr("cy", circleCenter.y);

   var gg = svgbg.append("g").attr("id","scatter-background");

   d3.select("clipPath#scatterclip")
      .append("circle")
      .attr("cx", circleCenter.x)
      .attr("cy", circleCenter.y)
      .attr("r", radius);
     
   gg
      .append("circle")
      .attr("cx", circleCenter.x)
      .attr("cy", circleCenter.y)
      .attr("r", radius)
      .attr("id","outer-circle");

   // Hacky way to shade region where yea vote is expected...
   var angle = vn.slope == null ? NaN : vn.slope;		    
   var cs = (angle>0?1:0) + 2*(vn.spread[0]>0?1:0);
   switch( cs ) {
     case 0:
        var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                           circleCenter.y-radius*vn.y[0]/scale ],
                         [ circleCenter.x+radius*(vn.x[0])/scale,
                           circleCenter.y-radius*(vn.y[0]+10)/scale ], 
                         [ circleCenter.x+radius*(vn.x[1]+10)/scale,  
                           circleCenter.y-radius*(vn.y[1]+10)/scale ], 
                         [ circleCenter.x+radius*(vn.x[1]+10)/scale,
                           circleCenter.y-radius*(vn.y[1])/scale ], 
                         [ circleCenter.x+radius*vn.x[1]/scale,
                           circleCenter.y-radius*vn.y[1]/scale ] ]; 
        break;
     case 1:
        var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                           circleCenter.y-radius*vn.y[0]/scale ],
                         [ circleCenter.x+radius*(vn.x[0])/scale,
                           circleCenter.y-radius*(vn.y[1]-10)/scale ], 
                         [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                           circleCenter.y-radius*(vn.y[1]-10)/scale ], 
                         [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                           circleCenter.y-radius*(vn.y[1])/scale ], 
                         [ circleCenter.x+radius*vn.x[1]/scale,
                           circleCenter.y-radius*vn.y[1]/scale ] ]; 
        break;
     case 2:
        var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                           circleCenter.y-radius*(vn.y[0])/scale ],
                         [ circleCenter.x+radius*(vn.x[0])/scale,
                           circleCenter.y-radius*(vn.y[0]-10)/scale ], 
                         [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                           circleCenter.y-radius*(vn.y[0]-10)/scale ],
                         [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                           circleCenter.y-radius*(vn.y[1])/scale ],
                         [ circleCenter.x+radius*vn.x[1]/scale,
                           circleCenter.y-radius*vn.y[1]/scale ] ]; 
        break;

     case 3:
        var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                           circleCenter.y-radius*vn.y[0]/scale ],
                         [ circleCenter.x+radius*(vn.x[0])/scale,
                           circleCenter.y-radius*(vn.y[0]+10)/scale ], 
                         [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                           circleCenter.y-radius*(vn.y[1]-10)/scale ], 
                         [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                           circleCenter.y-radius*(vn.y[1])/scale ], 
                         [ circleCenter.x+radius*vn.x[1]/scale,
                           circleCenter.y-radius*vn.y[1]/scale ] ]; 
        break;
   }
   if (isNaN(angle)) { polyData = [[0,0 ], [0, width],[width, width],[width, 0]] };

    gg.selectAll("polygon")
        .data([polyData])
        .enter()
         .append("polygon")
           .attr("points",function(d) {
                 return d.map( function(d) {
                     return [d[0], d[1]].join(",");
                 }).join(" ");
            })
         .attr("id","yea-semi")
         .attr("style","stroke:none;fill:#FFFFED;clip-path:url(#scatterclip)")
        ;
	
     gg
        .append("circle")
        .attr("cx", circleCenter.x)
        .attr("cy", circleCenter.y)
        .attr("r", radius/scale)
        .attr("id", "dashed-circle");

     gg
       .append("line")
       .attr("x1", radius/scale*vn.x[0] + circleCenter.x)
       .attr("x2", radius/scale*vn.x[1] + circleCenter.x)
       .attr("y1", circleCenter.y - radius/scale*vn.y[0])
       .attr("y2", circleCenter.y - radius/scale*vn.y[1])
       .attr("id","cutline")
       .attr("style","stroke:#000;stroke-width:2; clip-path:url(#scatterclip)")
       ;

      // X-axis
      gg.append('polyline')
        .attr("class", "scatter-axis")
        .attr("points", sprintf("%d,%d %d,%d %d,%d %d,%d", 
                                margin+15, width-margin, 
                                margin+15, width-tickLength, 
                                width-15, width-tickLength, 
                                width-15, width-margin));

      gg.append('text').text("Liberal")
        .attr("x", width/4)
        .attr("y", width-margin+10)
        .attr("style","text-anchor:middle")
      gg.append('text').text("Conservative")
        .attr("x", 3*width/4)
        .attr("y", width-margin+10)
        .attr("style","text-anchor:middle")
      gg.append('text').text("DW-Nominate Dimension 1: Economic/Redistribution")      
        .attr("x", width/2)
        .attr("y", width - 20)
        .attr("style","text-anchor:middle")

      // Y-axis
      gg.append('polyline')
        .attr("class","scatter-axis")
        .attr("points", sprintf("%d,%d  %d,%d  %d,%d  %d,%d", 
                                margin, margin, 
                                tickLength, margin, 
                                tickLength, width-margin-15, 
                                margin, width-margin-15));

      gg.append('text').text("Liberal")
        .attr("x", 40)
        .attr("y", 3*width/4)
        .attr("style","text-anchor:middle")
        .attr("transform", sprintf("rotate(-90 40 %d)", 3*width/4));
      gg.append('text').text("Conservative")
        .attr("x", 40)
        .attr("y", width/4)
        .attr("style","text-anchor:middle")
        .attr("transform", sprintf("rotate(-90 40 %d)", width/4));
      gg.append('text').text("DW-Nominate Dimension 2: Social/Race")
        .attr("x",20)
        .attr("y", width/2)
        .attr("style","text-anchor:middle")
        .attr("transform", sprintf("rotate(-90 20 %d)", width/2));

     // Add yea and nay locations to the plot on top of the dots
	  
     // Problem is that with Y/N on top we can select point under/near the Y/N
     // Need a way to insert after the dots but before the brush. Putting the Y/N group right
     // before the brush group does it. --JBL	  
     var ggg = ocSVG.insert("g",".brush");

     if (vn.mid[0] * vn.mid[0] != 0) { // Only drawn if there is a cutline!
       var ynpts =  [circleCenter.x + radius/scale*(vn.mid[0]+vn.spread[0]/2),
                     circleCenter.y - radius/scale*(vn.mid[1]+vn.spread[1]/2),
                     circleCenter.x + radius/scale*(vn.mid[0]-vn.spread[0]/2),
                     circleCenter.y - radius/scale*(vn.mid[1]-vn.spread[1]/2)];
       var angle = 57.295*Math.atan((vn.spread[1])/(vn.spread[0]));
       var cs = (angle>0?1:0) + 2*(vn.spread[0]>0?1:0);
       switch( cs ) {
         case 0:
           angle = 90-angle;
           break;
         case 1:
           angle = 90-angle;
           break;
         case 2:
           angle = 270 - angle;
           break;
         case 3:
           angle = -90 - angle;
           break;
       }
      
       ggg.append('polyline')
        .attr("class", "yeanay-line")
        .attr("points", ynpts.join(" "));

       ggg.append('text').text('Y')
        .attr("class","yeanay")
        .attr("x", ynpts[2])
        .attr("y", ynpts[3])
	.attr("z-index",-100)  
        .attr("transform",sprintf("rotate(%d %d %d)", angle, ynpts[2], ynpts[3]));

       ggg.append('text').text('N')
        .attr("class","yeanay")
        .attr("x", ynpts[0])
        .attr("y", ynpts[1])
        .attr("transform",sprintf("rotate(%d %d %d)", 180+angle, ynpts[0], ynpts[1]));

       // Fit box (only if cutline is displayed	
       ggg.append('text').text(sprintf("PRE: %4.2f", vn.pre == null ? 0 : vn.pre))
         .attr("class", "fitbox")
         .attr("x", width - 100)
         .attr("y", width - 70);
   
       ggg.append('text').text(sprintf("Classified: %4.2f",vn.classified == null ? 0 : vn.classified ))
         .attr("class", "fitbox")
         .attr("x", width - 100)
         .attr("y", width - 90);
     }
     


}
</script>
