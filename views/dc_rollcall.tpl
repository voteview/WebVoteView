% STATIC_URL = "/static/"
% rebase('base.tpl',title='Plot Vote', extra_css=["map.css","scatter.css"])
% include('header.tpl')
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
<div class="container">
	<div class="row">
		<div class="col-md-12">
			<h3>
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt;
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber">Vote {{ rollcall["rollnumber"] }}</abbr>
			</h3>
			<p style="float:left;margin-right:20px;"><strong>Date:</strong> {{ rollcall["date"] }}</p>
			% if len(rollcall["code"]["Clausen"]):
			<p style="float:left;">
				<strong>Vote Subject Matter:</strong> {{ rollcall["code"]["Clausen"][0] }} / {{ rollcall["code"]["Peltzman"][0] }}
			</p>
			% end
			<p style="clear:both;">{{ rollcall["description"] }}</p>
		</div>
	</div>

	<div class="row" id="loadBar">
		<div class="col-md-12">
			<h4>
				Loading 
				<img src="/static/img/loading.gif" style="margin-left:10px;width:24px;vertical-align:middle;">
			</h4>
			We are currently constructing the map and plots you requested, please wait...
		</div>
	</div>

	<div class="row" id="errorContent" style="display:none;">
		<div class="col-md-12">
			<h4>Error!</h4>
			<div class="errorMessage"></div>
		</div>
	</div>

	<div style="display:none;" id="loadedContent">

		<div class="row">
			<div class="col-md-9">
				<h4 style="float:left;clear:none;vertical-align:middle;">
					Vote Map 
					%if int(rollcall["congress"])<86:
						<img style="margin-left:5px;width:22px;vertical-align:middle;" src="/static/img/help.png" data-toggle="tooltip" data-position="bottom" data-html="true" title="<u>Note</u><br/>States as of {{ rcSuffix(rollcall["congress"]) }} Congress.">
					%end
				</h4>
				<span id="map-chart" style="margin-top:10px; padding: 10px; vertical-align:bottom;">
					<span id="suppressMapControls" style="display:none;"><span class="filter"></span></span>
				</span>
			</div>
			<div class="col-md-3">
				<h4>Votes</h4> 
				<div id="party-chart">
					<span id="suppressVoteChartControls" style="display:none;"><span class="filter"></span></span>
				</div>
			</div>
		</div>

		<div class="row" style="margin-bottom:20px;">
			<div class="col-md-12">
				<h4>DW-Nominate Cut-Line for Vote</h4>
				<div id="scatter-container" style="margin:0 auto 0 auto;">
					<div id="scatter-bg">
						<svg id="svg-bg"></svg> 
					</div>
					<div id="scatter-chart">
						<span id="suppressNominateControls" style="display:none;"><span class="filter"></span></span>
					</div>
				</div>
			</div>
		</div>

		<div class="row" style="margin-bottom:50px;">
			<div class="col-md-12">
				<div>
					<h4 style="float:left;padding-right:20px;">Vote List</h4>
					<span style="vertical-align:bottom;">
						(Sort by 
						<a href="#" onclick="javascript:outVotes('party');return false;">Party</a>, 
						<a href="#" onclick="javascript:outVotes('state');return false;">State</a>, 
						<a href="#" onclick="javascript:outVotes('vote');return false;">Vote</a>)
					</span>
				</div>
				<div id="voteList"></div>
			</div>
		</div>
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

// Pass this in.
var chamber = "{{ rollcall["chamber"] }}";

// This is a hack to match colours to votes.
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

// All of our charts are now accessible globally.
var votePartyChart = dc.rowChart("#party-chart");
var mapChart = dc.geoChoroplethChart("#map-chart");
var nominateScatterChart = dc.scatterPlot("#scatter-chart");
var globalPartyDimension = null;
var globalData;

// Makes the bootstrap tooltip run for votes from before states were contiguous.
$(document).ready(function(){$('[data-toggle="tooltip"]').tooltip();});

// Initial asynchronous load
(function loadData(){
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

function drawWidgets(error, geodata, data)
{
	$("#loadBar").slideToggle();
	if(data==undefined || geodata==undefined)
	{
		var errorMessage = "Unknown error loading vote data.";
		if(error.status==404 && error.responseURL.indexOf(".json")!=-1)
		{
			errorMessage = "Unable to download geographic data for this session.";
		}
		$("#errorContent > div > div.errorMessage").html(errorMessage);
		$("#errorContent").animate({"height": "toggle", "opacity": "toggle"},"slow");
		return(0);
	}
	globalData = data;
	$("#loadedContent").animate({"height": "toggle", "opacity": "toggle"},"slow");

	var ndx = crossfilter(data.rollcalls[0].votes);
	var all = ndx.groupAll();

	// Test points for figure calibration, JBL
	if (false) 
	{
		data.rollcalls[0].votes[0].x = 0;
		data.rollcalls[0].votes[0].y = 1;
		data.rollcalls[0].votes[1].x = 0;
		data.rollcalls[0].votes[1].y = -1;
		data.rollcalls[0].votes[2].x = 1;
		data.rollcalls[0].votes[2].y = 0;
		data.rollcalls[0].votes[3].x = -1;
		data.rollcalls[0].votes[3].y = 0;
		for (var i=4;i< data.rollcalls[0].votes.length;i++)
		{
			data.rollcalls[0].votes[i].x=0;
			data.rollcalls[0].votes[i].y=0;
		}
	}

	// Dimension 1: What type of vote you cast
	var voteDimension = ndx.dimension(function(d) { return d.vote; });
	var voteGroup = voteDimension.group(); // Grouping is exact

	// Dimension 2: What party you are in
	var partyDimension = ndx.dimension(function(d) { return d.party; });
	var partyGroup = partyDimension.group(); // Grouping is exact
	globalPartyDimension = partyDimension;

	// Dimension 3: What type of vote you cast and what party you are in.
	var votePartyDimension = ndx.dimension(function(d) { return d.vote + d.party; });
	var votePartyGroup = votePartyDimension.group(); // Grouping is exact

	// Dimension 4: Coordinates of vote
	var xDimension = ndx.dimension(
		//Project outlying ideal points onto the outer circle (Radius=1.2)... 		    
		function(d) {
			var x = d.x;  var y = d.y;
			var R = Math.sqrt(x*x + y*y);
			if (R>1.2) 
			{
				x = x*1.2/R;
				y = y*1.2/R;
			}
			return [x, y];
		}
	);
	var xGroup = xDimension.group().reduce(
		function (p, d) 
		{
			p.members.push(d);
			return p;
		},

		function (p, d) 
		{
			var index = p.members.indexOf(d);
			if (index > -1) 
			{
				p.members.splice(index, 1);
			}
			return p;
		},

		function ()
		{
			return {members: []} ;
		}); // This is not super clear to me.

	// Dimension 5: What state you're from.
	var stateDimension = ndx.dimension(function(d) { return d.state; });
	var stateGroup = stateDimension.group().reduce(
		function (p, d)
		{
			p.members.push(d);
			return p;
		},

		function (p, d) 
		{
			var index = p.members.indexOf(d);
			if (index > -1) {
				p.members.splice(index, 1);
			}
			return p;
		},

		function ()
		{
			return {members: []} ;
		});

	// Dimension 6: Which district you are from
	var districtDimension = ndx.dimension(function(d) { 
		return d.district; 
	});


	var districtGroup = districtDimension.group().reduce(
		function (p, d) 
		{
			// Add at large members
			var atlargecode = d.state + "00";
			var atlarge = $.grep(data.rollcalls[0].votes, function(e)
			{
				return e.district==atlargecode;
			});
			$.each(atlarge, function(member) {
				p.members.push(atlarge[member]);
			});
			p.members.push(d);
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

	// DIMENSIONS HAVE BEEN DEFINED =========

	// NOW BEGIN CHART SPECIFICATIONS =======
	votePartyChart
		.width(320).height(320)
		.dimension(votePartyDimension).group(votePartyGroup)
		.elasticX(true)
		.colorCalculator(function (d) {
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

/*	dc.dataTable(".dc-data-table")
	.dimension(voteDimension)
	.group(function (d) { return d.vote; })
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
        ]);*/


	if (chamber == "House")
	{
		/* Initialize tooltip */
		var houseMapTip = d3.tip().attr('class', 'd3-tip').html(function(p, d) {
			var result = "<p>" + d.key + "</p>";
			for (var i = 0; i < d.value.members.length; i++) 
			{
				var colorVote = partyColors[d.value.members[i].vote + d.value.members[i].party];
				// Tooltip data display:
				result += "<p>" + d.value.members[i].name + "  -  <span style='color:" + "white" + "'> " + d.value.members[i].vote +"</span></p>";				  
			}
			return result;
		});

		var mapTopo = topojson.feature(geodata, geodata.objects.districts).features;
		mapChart
			.width(890).height(500)
			.dimension(districtDimension)
			.group(districtGroup)
			.colorCalculator(function (d) { 
				var color = "#CCC";
				try {
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
						var result = $.grep(c.data(), function(e){
							return e.key == d.id; 
						});

						houseMapTip.attr('class','d3-tip animate')
						.show(d, result[0]);
					})
					.on('mouseout',function(d, i){
						var result = $.grep(c.data(), function(e){ return e.key == d.id; });
						houseMapTip.attr('class','d3-tip').show(d, result[0])
						houseMapTip.hide();
					})
			});
	} 
	else if (chamber == "Senate") 
	{

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

	// We are done defining everything, now let's just run our ancillary functions.
	dc.renderAll();

	/*
	var gtest = d3.select("#map-chart svg g")
			.call(d3.behavior.zoom()
			.scaleExtent([1, 10])
			.on("zoom", zoom));

	function zoom()
	{
			gtest.attr("transform", "translate("
				+ d3.event.translate
				+ ")scale(" + d3.event.scale + ")");
			gtest.style("stroke-width", 1.2 / d3.event.scale + "px");
	}*/

	decorateNominate(nominateScatterChart,data);
	mapChart.on("filtered", pollFilters);
	votePartyChart.on("filtered", pollFilters);
	nominateScatterChart.on("filtered", pollFilters);
	outVotes();
}

function outVotes(groupBy="party")
{
	// Check that we're grouping by something valid.
	if(["party", "vote", "state"].indexOf(groupBy)==-1) { groupBy = "party"; }
	// Pull out every filtered bit of data.
	var filteredVotes = globalPartyDimension.top(Infinity);
	var groupings = {};

	// Iterate through the people, adding them to a dict of arrays by party
	for(var i=0;i!=filteredVotes.length;i++)
	{
		var voteSubset = {
			"name": filteredVotes[i]["name"], 
			"party": filteredVotes[i]["party"], 
			"vote": filteredVotes[i]["vote"], 
			"state": filteredVotes[i]["state"]
		};
		if(groupings[filteredVotes[i][groupBy]] != undefined) {groupings[filteredVotes[i][groupBy]].push(voteSubset); }
		else { groupings[filteredVotes[i][groupBy]] = [voteSubset]; }
	}

	// Output table
	var sortedKeys = Object.keys(groupings).sort();
	var baseTable = $("<table><tr></tr></table>").css("width","100%");
	var td = $("<td></td>");
	var rowCount=0;
	for(var key in sortedKeys)
	{
		groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(function(a,b){return a["name"] < b["name"] ? -1 : (a["name"] > b["name"] ? 1 : 0);});
		var partyLabel = $("<div></div>").css("padding-bottom","20px");
		$("<p><strong>"+groupBy+": "+sortedKeys[key]+"</strong></p>").css("text-decoration","underline").appendTo(partyLabel);
		for(var j in groupings[sortedKeys[key]])
		{
			var person = groupings[sortedKeys[key]][j];
			var outLabel = "";
			if(groupBy=="party")
			{
				outLabel = person["name"]+" ("+person["state"]+"): "+person["vote"];
			}
			else if(groupBy=="state")
			{
				outLabel = person["name"]+" ("+person["party"].substr(0,1)+"): "+person["vote"];
			}
			else
			{
				outLabel = person["name"]+" ("+person["party"].substr(0,1) + "-" +person["state"] + ")";
			}
			$("<p></p>").html(outLabel).appendTo(partyLabel);
		}
		partyLabel.appendTo(td);
		rowCount+= parseInt(j)+1;
		console.log(rowCount);
		if(rowCount>25)
		{
			rowCount=0;
			td.appendTo(baseTable)
			td = $("<td></td>");
		}
		td.appendTo(baseTable);
	}
	$("#voteList").html(baseTable);
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
	var labelSet = []
	voteChartSVG.children("g").children("g").each(function(index, item) {
		var tChildren = $(this).children("title").text();
		if(tChildren.length && tChildren.startsWith(scanFor[scanIndex]))
		{
			var currentTranslate = splitTranslate($(this).attr("transform")) + translateAdj;
			labelSet.push($('<g class="label _0" transform="translate(0,'+currentTranslate+')"><text fill="#000000;" font-size="12px" x="6" y="12" dy="0.35em" transform>'+scanMap[scanIndex]+'</text></g>'));
			//labelSet.push([currentTranslate, scanMap[scanIndex]]);
			translateAdj = translateAdj+34;
			scanIndex=scanIndex+1;
		}
		newMax = splitTranslate($(this).attr("transform"))+translateAdj;
		$(this).attr("transform","translate(0,"+newMax+")");
	});
	$.each(labelSet, function(index, item) {
		//var labelBox = d3.select(voteChartSVG).append("g").attr("class","label _0").attr("transform", "translate(0"+item[0]+")");
		//labelBox.selectAll("text").append("text").attr("fill","#000000").attr("font-size","12px").attr("x","6").attr("y","12").attr("dy","0.35em").text(item[1]);
		item.appendTo(voteChartSVG.children("g"));
	});
	voteChartSVG.children("g").children(".axis").attr("transform","translate(0,"+(newMax+34)+")");
	voteChartSVG.attr("height",(newMax+68));
	//$("#party-chart").html($("#party-chart").html());
	return 0;
}

// Poll Filter: Basically, use DC's on filtered method to call this function when a filter changes.
function pollFilters(chart, filter)
{
	// Because this runs before the filters are applied, we delay it.
	// We can try directly accessing the filters through the .filters() method if we must avoid this.
	setTimeout(pollFilters2, 30);
	outVotes();
}

function pollFilters2()
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
	//updateVoteChart();	
}

// Easier to update steps to take on a full filter reset by running this.
function doFullFilterReset()
{
	$("#selectionFilterBar").slideUp();
	dc.filterAll();
	dc.redrawAll();
	decorateNominate(nominateScatterChart, globalData);
	updateVoteChart();
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
