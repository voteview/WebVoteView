'use strict';

/* jshint globalstript: true */
/* global dc,d3,crossfilter,colorbrewer */

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
	  .defer(d3.json, "/static/json/usa.topojson")
          .await(drawWidgets);
    } else if (chamber == "Senate") {
        queue()
          .defer(d3.json, "/api/download/"+rcID)
          .defer(d3.json, "/static/json/states"+congressNum+".json")
	  .defer(d3.json, "/static/json/usa.topojson")
          .await(drawWidgets);
    }
})();

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
		if(i<5) 
		{ 
			result += "<p>" + d.value.members[i].name + 
				  " (<span class=\"meta\">"+partyNameSimplify(d.value.members[i].party).substr(0,1) + "</span>) - <span>"+d.value.members[i].vote+"</span></p>"; 
		}
		else
		{
			if(d.value.members[i].vote=="Nay") { nays=nays+1; }	
			else if(d.value.members[i].vote=="Yea") { yeas=yeas+1; }
			else { abs=abs+1; }
		}
	}
	if(i > 5)
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
	if(d.value.members.length == 0)
	{
		result += "<p>Your selected filters exclude all members in this location.</p>";
	}
	return(result);
}

function buildHatchDefs(members)
{
	// In order to specify cross-hatching patterns that are reusable, we need to make a bunch of pattern elements.
	// We put them in a <defs> element of an <svg> element so that we can reference them later. This function
	// constructs the defs for each possible district color combination for crosshatching.

	// Figure out which party-vote combinations are in this vote.
	var uniqueValues = [];
	members.forEach(function(member) {
		var voteParty = member.vote + partyNameSimplify(member.party_short_name);
		if(!uniqueValues.includes(voteParty)) {
			uniqueValues.push(voteParty);
		}
	});
	uniqueValues.sort();

	// Temp function for building an SVG element -- this is fairly standard boilerplate
	// from e.g. StackOverflow here https://stackoverflow.com/questions/3642035/jquerys-append-not-working-with-svg-element
	function makeSVGTag(tag, attributes)
	{
		var element = document.createElementNS("http://www.w3.org/2000/svg", tag);
		for(var key in attributes)
		{
			element.setAttribute(key, attributes[key]);
		}
		return element;
	}

	// Make holder SVG
	var svgHeader = makeSVGTag("svg", {"width": 0, "height": 0});
	var defsHeader = makeSVGTag("defs", {});

	// Make Senate vote combos for ID.
	for(var index1 = 0; index1 != uniqueValues.length; index1++)
	{
		// Make each of the combations -- this is actually a hack, since not all combinations are possiblr.
		// i.e. if there are 3 parties, there may be some states with no party A/C combo. So we can make fewer
		// patterns.
		for(var index2 = index1; index2 != uniqueValues.length; index2++)
		{
			var pattern = makeSVGTag("pattern", 
						 {"id": uniqueValues[index1] + uniqueValues[index2], 
						  "width": 20, "height": 20, 
						  "patternTransform": "rotate(45)", 
						  "patternUnits": "userSpaceOnUse"});

			var hatch1 = makeSVGTag("rect",
						{"x": 0, "y": 0, 
						 "width": 10, "height": 20, 
						 "fill": partyColors[uniqueValues[index1]]});

			var hatch2 = makeSVGTag("rect",
						{"x": 10, "y": 0,
						 "width": 10, "height": 20,
						 "fill": partyColors[uniqueValues[index2]]});

			pattern.appendChild(hatch1);
			pattern.appendChild(hatch2);
			defsHeader.appendChild(pattern);
		}
	}

	// Add defs to SVG
	svgHeader.appendChild(defsHeader);

	// Add SVG to the DOM.
	document.getElementById("holdHatching").appendChild(svgHeader);

	// Now we have the cross-hatches available for us elsewhere.
}

// Check unincorporated land: this is land that is part of a state but hasn't yet been baked into
// a congressional district.
function checkUnincorporated(district, congress)
{
	var unincSet = {"AL-1": [18, 22], "GA-1": [1, 22], "IN-1": [17, 22], "NC-1": [1, 1], "OH-1": [7, 7], "SC-1": [13, 14], "TN-1": [8, 17], "TX-1": [28, 31]}
	for(var key in unincSet)
	{
		if(district==key && congress>=unincSet[key][0] && congress<=unincSet[key][1]) { return 1; }
	}
	return 0;
}

// If there's an error loading the map, still load the vote data, and just fail as gracefully as possible.
function drawWidgetsFailMap(error, data)
{
	drawWidgets(error, data, undefined);
}

var globalData;
var failedMapLoad=0, fallback=0;
function drawWidgets(error, data, geodata, usaboundaries)
{
	// If we have an error loading the map data, try a fallback map.
	if(fallback == 0 && geodata == undefined && error.status == 404 && error.responseURL.indexOf(".json") != -1)
	{
		var tryLoadingOneLower = "/static/"+error.responseURL.replace(congressNum,congressNum-1).split("/static/")[1];
		fallback=1;
		queue().defer(d3.json, "/api/download/"+rcID).defer(d3.json, tryLoadingOneLower).await(drawWidgets);
		return(0);
	}
	// If we still have an error, give up on the map but still load the vote.
	else if(failedMapLoad == 0 && (data == undefined || geodata == undefined))
	{
		var errorMessage = "Unknown error loading vote data.";
		if(error.status == 404 && error.responseURL.indexOf(".json") != -1)
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

	$("#loadBar").slideToggle();
	globalData = data;
	$(".loadedContent").animate({"height": "toggle", "opacity": "toggle"},"slow");

	var ndx = crossfilter(data.rollcalls[0].votes);
	var all = ndx.groupAll();

	buildHatchDefs(data.rollcalls[0].votes);

	// Dimension 1: What type of vote you cast
	var voteDimension = ndx.dimension(function(d) { return d.vote; });
	var voteGroup = voteDimension.group(); // Grouping is exact

	// Dimension 2: What party you are in
	var partyDimension = ndx.dimension(function(d) { return partyNameSimplify(d.party_short_name); });
	var partyGroup = partyDimension.group(); // Grouping is exact
	globalPartyDimension = partyDimension;

	// Dimension 3: What type of vote you cast and what party you are in.
	var votePartyDimension = ndx.dimension(function(d) { return d.vote + partyNameSimplify(d.party_short_name); });
	var votePartyGroup = votePartyDimension.group(); // Grouping is exact

	// Dimension 4: Coordinates of vote
	var xDimension = ndx.dimension(
		//Project outlying ideal points onto the outer circle 		    
		function(d) {
			var x = d.x;  var y = d.y;
		        var dlen = Math.sqrt(x*x + y*y);
		        if (dlen>1.0) {
			    x = x/dlen;
			    y = y/dlen;
			}
		        // JBL: Hack to stop new members from being placed in the upper left corner of the scatter.
		        if (typeof d.x == 'undefined') {
			    x = -99; y = -99;
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
	var stateDimension = ndx.dimension(function(d) { return d.state_abbrev; });
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
    
        /* JBL working on making Classification & PRE dynamic; 

        // Dimension 7: Fit
        var fitDimension = ndx.dimension(function(d) { return d; });
	var fitGroup = fitDimension.group().reduce(
		function (p, d)
	        {
		    if (d.vote == "Yea" | d.vote == "Nay") {
			p.correct += (d.prob>=50 ? 1 : 0);
			p.noes += (d.vote=="Nay" ? 1 : 0);
			p.yeas += (d.vote=="Yea" ? 1 : 0);
			p.denom++;
		    }
		    return p;
		},
		function (p, d) 
    	        {
		    if (d.vote == "Yea" | d.vote == "Nay") {
			p.correct -= (d.prob>=50 ? 1 : 0);
			p.noes -= (d.vote=="Nay" ? 1 : 0);
			p.yeas -= (d.vote=="Yea" ? 1 : 0);
			--p.denom;
		    }
		    return p;
		},
		function ()
		{
		    return {yeas:0, noes:0, denom:0, correct:0} ;
		});

        //In practice, can't set up numberDisplay these before the decorate.js is called?!
    
        d3.select("#scatter-chart").append("div").attr("id","chart-scatter-pre");
        d3.select("#scatter-chart").append("div").attr("id","chart-scatter-class");
    
        var preValue = dc.numberDisplay('#chart-scatter-pre');
        var classValue = dc.numberDisplay('#chart-scatter-class');
        preValue
	  .valueAccessor( function(d) {
	      var ne = Math.min(d.value.yeas, d.value.noes);
	      var me = d.value.denom - d.value.correct;
	      var pre =  (ne - me)/ne + 0.005
	      return pre > 0 ? pre : 0;
	  })
	  .group(fitGroup)
          .formatNumber(d3.format(".2f"));

        classValue
	  .valueAccessor( function(d) { return d.value.correct/d.value.denom + 0.005 } )
	  .group(fitGroup)
          .formatNumber(d3.format(".2f"));
    
         JBL: End of dynamic PRE/Classified Dev */
     
	// DIMENSIONS HAVE BEEN DEFINED =========

	// NOW BEGIN CHART SPECIFICATIONS =======
	var calculatedHeight = votePartyGroup.top(Infinity).length * 40;
	var chartHeight = Math.max(320, Math.min(1000, calculatedHeight));

        votePartyChart
  	        .width(280).height(chartHeight)
	        .dimension(votePartyDimension)
                .group(votePartyGroup)
		.elasticX(true)
	        .colorAccessor(function (d) {
			return d.key;
		})
                .colors(function(d) { return partyColors[d] }) 
		.fixedBarHeight(24).gap(10)
	        .labelOffsetX(40)
		.label(function(d)
		{
			if(d.key.substr(0,3)=="Abs") { var textLabel = d.key.substr(3,d.key.length)+": Not Voting"; }
			else { var textLabel = d.key.substr(3,d.key.length)+": "+d.key.substr(0,3) }
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

	// Nominate scatter chart 

        // User sets width and can also change margins, but axis text size 
        // is not adapt to sizing so best to leave margins.  Should probably
        // have width set in template or css to better separation of style and logi.

        var scWidth = 890; // Set overall width of scatter plot
        var scMargins = {top:25,right:25,bottom:75,left:75};
        var scHeight = (scWidth-scMargins['left']-scMargins['right'])*nomDWeight+scMargins['top']+scMargins['bottom']; 

	nominateScatterChart
                .clipPadding(4) // JBL:fixes problem with symbols on ellipse boundary being clipped
                .transitionDuration(250) // JBL:Speed up symbol size changes on brush per AB request
		.width(scWidth)
		.height(scHeight)
		.margins(scMargins)
		.dimension(xDimension)
		.mouseZoomable(false)
		.group(xGroup)
	        .symbolSize(7)
      	        .excludedSize(4)
   
                .emptySize(3)           // JBL: Empty settings control rendering pnts that are crossfiltered out
                .emptyOpacity(0.5)
                .emptyColor("#999999")             
                .symbol(function (d) {
		     try {
			 var v = d.value.members[0].vote; 
//			 if(globalData["rollcalls"][0]["sponsor"] != undefined && d.value.members[0].icpsr==globalData["rollcalls"][0]["sponsor"]) { return "cross"; }
			 if(v == "Yea") {return "triangle-up";}
			 if(v == "Nay") {return "triangle-down";}
		     }catch(e){
		     }
		     return "circle"
                }) 
		.colorAccessor(function (d) { 
			var color = "#CCC";
			try {
			    if(d.value.members.length > 0){   
				color = blendColors(d.value.members,true); //JBL: true/false toggles Y/N coloring of plot symbols
			    }
			}catch(e){
			}
			return color; 
		})
                .colors(function(d) {return d})
	        .existenceAccessor(function(d) {
		    if(d.value.members.length==0){ return false };
		    return parseFloat(String(d.key).split(",")[0])>-98; })
	 	.x(d3.scale.linear().domain([-1, 1])) 
		.y(d3.scale.linear().domain([-1, 1]));

	// Updates the total number of units selected on the selection bar.
	dc.dataCount("#data-count")
		.dimension(ndx)
		.group(all);

	// Setting up the map chart only if we load geo data.
	if(!failedMapLoad)
	{
		// Add the tooltip to the body and hide it.
		var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip")
					.attr("id", "mapTooltip").style("visibility", "hidden").style("opacity", 0);

		// Set up topographic data
		var mapTopo = topojson.feature(geodata, (chamber=="House")?geodata.objects.districts:geodata.objects.states).features;
		var countryTopo = topojson.feature(usaboundaries, usaboundaries.objects.usa).features;

		// Define the chart
		mapChart
			.width(850).height(500) // Basic dimensions
			.dimension((chamber=="House")?districtDimension:stateDimension) // How the data are separated and grouped.
			.group((chamber=="House")?districtGroup:stateGroup)
			.colorAccessor(function (d) { 
				// No members, so no color
				if(!d || !("members" in d) || !d.members.length) return "#eee";

				// One member, so return the color
				if(d.members.length == 1) return partyColors[d.members[0].vote + partyNameSimplify(d.members[0].party_short_name)];

				// Many members (at-large districts early on, so blend
				if(d.members.length > 2) return blendColors(d.members, true);

				// Multiple members, so cross-hatch.
				var voteType = [];
				for(var i = 0; i != d.members.length; i++) 
				{
					voteType.push(d.members[i].vote + partyNameSimplify(d.members[i].party_short_name));
				}
				voteType.sort();

				var voteString = "";
				for(var i = 0; i != voteType.length; i++) 
				{
					voteString += voteType[i];
				}

				return "url(#" + voteString + ")";
			})
  	                .colors(function(d) {return d})
			.overlayGeoJson(countryTopo, "country")
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
						if(result[0] == undefined)
						{
							if(checkUnincorporated(d.id, congressNum))
							{
								baseToolTip.html("<p><strong>Unincorporated Land</strong></p> This area was unincorporated at the time of the vote.");
							}
							else
							{
								if(d.id == undefined) { return; }
								baseToolTip.html("<p><strong>"+d.id+"</strong></p> This district was vacant at the time of the vote."); 
							} 
						}
						else { baseToolTip.html(tooltipText(result[0])); }
						eH = baseToolTip.style("height"); // We need these for centering the tooltip appropriately.
						eW = baseToolTip.style("width");
						baseToolTip.style("transition", "opacity 0.15s linear");
						baseToolTip.style("visibility", "visible").style("opacity", "1"); 
					})
					.on('mouseout', function() 
					{ 
						baseToolTip.style("transition", "visibility 0s linear 0.15s,opacity 0.15s linear");
						baseToolTip.style("opacity", "0").style("visibility", "hidden"); 
					}) // If you mouse out of the districts, hide the tooltip
					.on('mousemove', function(d, i){ // If you move your mouse within the district, update the position of the tooltip.
						baseToolTip
						.style("top", (event.pageY + 32) + "px")
						.style("left", (event.pageX - (parseInt(eW.substr(0, eW.length - 2)) / 2)) + "px");
					});
			});
	}

	// We are done defining everything, now let's just run our ancillary functions.
	dc.renderAll();
	d3.select("div#geoMap > span#map-chart > svg").select("g.layer0").select("g").select("path").attr("opacity", 0.3).attr("stroke", "#666666");
        decorateNominate(nominateScatterChart, data);
        addSponsorCircle(nominateScatterChart);
	if(!failedMapLoad) mapChart.on("filtered", pollFilters);
	votePartyChart.on("filtered", pollFilters);
	nominateScatterChart.on("filtered", pollFilters);
	outVotes();

        // Make brush box appear on click
        var scb = nominateScatterChart.select(".brush");
        scb.on('click', function(){
	  var sizeOfBox = 0.03/2;
  	  var extent = nominateScatterChart.brush().extent();
	  var x = nominateScatterChart.x().invert(d3.mouse(this)[0]),
	      y = nominateScatterChart.y().invert(d3.mouse(this)[1]);
	  // Only draw box if there isn't one already there...
 	  if (extent[0][0]==extent[1][0] & extent[0][1]==extent[1][1]) {
	      if (x*x + y*y <= 1) {
		  var insideBox = $.grep(nominateScatterChart.data(), function(n, i) {
		      return (  n["value"]["members"].length > 0 && //JBL: Allows box when selection in effect
			        n["value"]["members"][0]["x"] >= x-sizeOfBox &&
				n["value"]["members"][0]["x"] <= x+sizeOfBox &&
				n["value"]["members"][0]["y"] >= y-sizeOfBox/nomDWeight &&
				n["value"]["members"][0]["y"] <= y+sizeOfBox/nomDWeight);
		 });
		if(insideBox.length) { nominateScatterChart.brush().extent([[x-sizeOfBox,y-sizeOfBox/nomDWeight],[x+sizeOfBox,y+sizeOfBox/nomDWeight]]).event(scb); }
		else { nominateScatterChart.brush().extent([[x,y],[x,y]]).event(scb); }
	      } else {
		  nominateScatterChart.brush().extent([[x,y],[x,y]]).event(scb);
	      }
	  }
        });

	$("#vote_chart_float").delay(500).stick_in_parent();
}


// Easier to update steps to take on a full filter reset by running this.
function doFullFilterReset()
{
	console.log("Start full filter reset.");
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
