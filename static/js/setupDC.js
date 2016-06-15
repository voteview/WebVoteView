'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

var stateMap = {
	"AL": "Alabama", "AK": "Alaska", "AS": "American Samoa", "AZ": "Arizona",
	"AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut",
	"DE": "Delaware", "DC": "District Of Columbia", "FM": "Federated States Of Micronesia",
	"FL": "Florida", "GA": "Georgia", "GU": "Guam", "HI": "Hawaii", 
	"ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
	"KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
	"MH": "Marshall Islands", "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan",
	"MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
	"NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
	"NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota",
	"MP": "Northern Mariana Islands", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon",
	"PW": "Palau", "PA": "Pennsylvania", "PR": "Puerto Rico", "RI": "Rhode Island",
	"SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
	"UT": "Utah", "VT": "Vermont", "VI": "Virgin Islands", "VA": "Virginia",
	"WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
	"POTUS": "President"
}

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
          .defer(d3.json, "/api/download/"+rcID)
          .defer(d3.json, "/static/json/districts"+congressNum+".json")
          .await(drawWidgets);
    } else if (chamber == "Senate") {
        queue()
          .defer(d3.json, "/api/download/"+rcID)
          .defer(d3.json, "/static/json/states"+congressNum+".json")
          .await(drawWidgets);
    }
})();

function drawWidgetsFailMap(error, data)
{
	drawWidgets(error, data, undefined);
}

var eW = 0; var eH = 0;
function tooltipText(d)
{
	var nays=0; var yeas=0; var abs=0;
	if(chamber=="House") { var result = "<p><strong>" + d.key + "</strong></p>"; }
	else { var result = "<p><strong>" + stateMap[d.key] + "</strong></p>"; }
	for(var i=0; i<d.value.members.length; i++)
	{
		var colorVote = partyColors[d.value.members[i].vote + partyNameSimplify(d.value.members[i].party)];
		// Tooltip data display:
		if(i<5) { result += "<p>" + d.value.members[i].name + " ("+partyNameSimplify(d.value.members[i].party).substr(0,1)+") - <span>"+d.value.members[i].vote+"</span></p>"; }
		else
		{
			if(d.value.members[i].vote=="Nay") { nays=nays+1; }	
			else if(d.value.members[i].vote=="Yea") { yeas=yeas+1; }
			else { abs=abs+1; }
		}
	}
	if(i>=5)
	{
		result+= "<p>+";
		if(yeas) { result += yeas+" other Yea"+(yeas!=1?"s":""); }
		if(nays)
		{
			if(yeas) { result += ", "; }
			result += nays+" other Nay"+(nays!=1?"s":"");
		}
		if(abs)
		{
			if(yeas || nays) { result += ", "; }
			result += abs+" other Abs";
		}
	}
	return(result);
}

var failedMapLoad=0;
function drawWidgets(error, data, geodata)
{
	if(failedMapLoad==0 && (data==undefined || geodata==undefined))
	{
		var errorMessage = "Unknown error loading vote data.";
		if(error.status==404 && error.responseURL.indexOf(".json")!=-1)
		{
			errorMessage = "Unable to download geographic data for this session.";
			queue().defer(d3.json, "/api/download/"+rcID).await(drawWidgetsFailMap);
		}
		$("#errorContent > div > div.errorMessage").html(errorMessage);
		$("#errorContent").animate({"height": "toggle", "opacity": "toggle"},"slow");
		$("#geoMap").hide();
		$("#map-chart").attr("id","junk");
		failedMapLoad = 1;
		dc.chartRegistry.deregister(dc.chartRegistry.list()[1]);
		return(0);
	}

	//$("#vote_chart_float").stick_in_parent({offset_top: 20});

	$("#loadBar").slideToggle();
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
	var partyDimension = ndx.dimension(function(d) { return partyNameSimplify(d.party); });
	var partyGroup = partyDimension.group(); // Grouping is exact
	globalPartyDimension = partyDimension;

	// Dimension 3: What type of vote you cast and what party you are in.
	var votePartyDimension = ndx.dimension(function(d) { return d.vote + partyNameSimplify(d.party); });
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
			var atlargecodes = [d.state + "00", d.state+"98", d.state+"99"];
			var atlarge = $.grep(data.rollcalls[0].votes, function(e)
			{
				return e.district==atlargecodes[0] || e.district==atlargecodes[1] || e.district==atlargecodes[2];
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
		.width(280).height(320)
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

	// Nominate scatter chart setup
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

	// Updates the total number of units selected on the selection bar.
	dc.dataCount("#data-count")
		.dimension(ndx)
		.group(all);

	// Setting up the map chart only if we load geo data.
	if(!failedMapLoad)
	{
		// Add the tooltip to the body and hide it.
		var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip").attr("id","mapTooltip").style("visibility","hidden");
		// Set up topographic data
		var mapTopo = topojson.feature(geodata, (chamber=="House")?geodata.objects.districts:geodata.objects.states).features;
		// Define the chart
		mapChart
			.width(890).height(500) // Basic dimensions
			.dimension((chamber=="House")?districtDimension:stateDimension) // How the data are separated and grouped.
			.group((chamber=="House")?districtGroup:stateGroup)
			.colorCalculator(function (d) { // What color does each unit use
				var color = "#eee";
				try {
					if(d.members.length > 0){ // If there are any members here, blend their colours.
						color = blendColors(d.members);
					}
				}catch(e){
					//console.log("MC: " + e);
				}
				return color; 
			})
			.overlayGeoJson(mapTopo, (chamber=="House")?"district":"state", function (d) { // Folds in the data.
				return d.id;
			})
			.renderTitle(false) // No default tooltips if you mouse over the map.
			.on("postRender", function(c){ // Attach the tooltip code.
				c.svg() // Chart SVG
					.selectAll("path") // Attach the listeners to every path (district) item in the SVG
					.on('mouseover', function(d,i) // When you mouseover, it's a new district, set up the tooltip and make it visible
					{ 
						var districtSet = c.data();
						var result = $.grep(c.data(), function(e){
							return e.key == d.id; 
						});
						if(result[0]==undefined) { baseToolTip.html("<p><strong>"+d.id+"</strong></p> This district was vacant at the time of the vote."); } // Don't tooltip null results.
						else { baseToolTip.html(tooltipText(result[0])); }
						eH = baseToolTip.style("height"); // We need these for centering the tooltip appropriately.
						eW = baseToolTip.style("width");
						baseToolTip.style("visibility","visible"); 
					})
					.on('mouseout', function() { baseToolTip.style("visibility","hidden"); }) // If you mouse out of the districts, hide the tooltip
					.on('mousemove', function(d, i){ // If you move your mouse within the district, update the position of the tooltip.
						baseToolTip.style("top",(event.pageY+32)+"px").style("left",(event.pageX-(parseInt(eW.substr(0,eW.length-2))/2))+"px");
					});
			});
	}

	// We are done defining everything, now let's just run our ancillary functions.
	dc.renderAll();
	decorateNominate(nominateScatterChart,data);
	if(!failedMapLoad) mapChart.on("filtered", pollFilters);
	votePartyChart.on("filtered", pollFilters);
	nominateScatterChart.on("filtered", pollFilters);
	outVotes();

}


// Easier to update steps to take on a full filter reset by running this.
function doFullFilterReset()
{
	// Hide the bar.
	$("#selectionFilterBar").slideUp();
	// Deselect everything.
	dc.filterAll();
	// Draw the charts from scratch.
	dc.redrawAll();
	// Re-apply our decoration hack.
	decorateNominate(nominateScatterChart, globalData);
	//updateVoteChart();
}
