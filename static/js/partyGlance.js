'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

var min, max;
var eW=0; var eH=0;
var globalParties = [];
var partyList = [];
var opacityTimer;

function tooltipText(party, d)
{
	var prefix = getGetOrdinal(d.x)+" Congress &gt; ";
	var partyNameLabel = (party < partyList.length) ? globalParties[party][1]["fullName"] : "Congressional Median (Midpoint)";

	var result = "<p>" + prefix + "<strong>" + partyNameLabel + "</strong></p>";

	result += "<p><em>Median Ideology Score</em>: " + (Math.round(d.y*100)/100) + "</p>";
	result += "<p><em>How to interpret Ideology scores:</em><br/>These scores show how liberal or conservative a party is on a scale from -1 (Very Liberal) to +1 (Very Conservative). The scores provided are the median--mid-point--member of each party across both the House of Representative and the Senate.</p>";

	if(party >= partyList.length) 
	{ 
		result += "<p>The congressional median is unstable (swings back and forth) as the balance of power of the House and Senate changes.</p>"; 
	}

	return(result);
}

function generateGlanceChart(error, parties, glance, configFile) {
	// Parties is the full party list, sorted by size bracket, then old to new, then A-Z.
	globalParties = parties;	

	console.timeEnd("beginPageLoad");
	console.time("processData");

	var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip").attr("id","mapTooltip").style("visibility","hidden");
	min = 1;
	max = configFile["maxCongress"];	

	// Take the "glance" file and break it into the grand file and the party files.
	var grand;
	var partySet = [];
	$.each(glance,function(p, o)
	{
		if(p=="grand") { grand = o; }
		else 
		{ 
			partySet.push(o); 
		}
	});

	partySet.sort(function(a,b){
		var aTotal = 0, bTotal = 0;
		$.each(a,function(i, o) { aTotal += o["nMembers"]; });
		$.each(b,function(i, o) { bTotal += o["nMembers"]; });
		return bTotal - aTotal;
	});

	var cutoff = 143;
	var tempParties = parties;
	tempParties.sort(function(a,b){ return b[1]["count"] - a[1]["count"]; });
	$.each(tempParties, function(ip, op) { if(op[1]["count"]>=cutoff) { partyList.push(op[1]); } else { return false; }});
	var numQualifyingParties = partyList.length;

	// Append each party's median to the grand median so we have a set of medians for every congress.
	var memSetScatter = [];
	grand.forEach(function (d) {
		d.congressMedian = d.grandMedian;
		d.pMedians = [];
		for(var j=0; j!=partySet.length; j++)
		{
			var match = partySet[j].filter(function(dMatch) { return +dMatch.congress === d.congress; });
			if(match[0] !== undefined && match[0].grandSet !== undefined)
			{ 
				d.pMedians.push(+match[0].grandMedian); 
				for(var k=0;k<match[0].grandSet.length;k+=1)
				{
					memSetScatter.push({"x": d.congress, "y": match[0].grandSet[k], "p": j});
				}
			}
			else { d.pMedians.push(-999); }
		}
	});

	console.timeEnd("processData");
	console.time("DCDimensions");
	// Construct DC dimensions
	var ndx = crossfilter(grand); 
	
	var congressDimension = ndx.dimension(function (d) {
		return d.congress;
	});

	// For the scatter plot
	var scatterDX = crossfilter(memSetScatter);
	var scatterDimension = scatterDX.dimension(function(d) { return [+d.x, +d.y, +d.p];});
	var scatterGroup = scatterDimension.group();
	
	var dimSet = [];
	// Each party median
	var compSet = [];
	for(var k=0;k!=partySet.length;k++)
	{
		// First add to the group set -- hack to force evaluation of k.
		dimSet.push(congressDimension.group().reduceSum(new Function("d", "return d.pMedians["+k+"];")));
	}
	// Grand Median
	dimSet.push(congressDimension.group().reduceSum(function (d) { return d.congressMedian; }));
	console.timeEnd("DCDimensions");

	// Make the chart.
	console.time("DCChart")
	var tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d; });

	// Hack to get around singleton bug
	function keyHack(d) { return d.key; }
	function valHack(d) { return d.value; }
	function colHack(d) { return 0; }
	function scatterCol(d) { return d.key[2]; }
	var fullColSet = [];
	for(var i=0;i!=numQualifyingParties;i++)
	{
		fullColSet.push(colorSchemes[partyColorMap[partyNameSimplify(parties[i][1]["name"])]][1]);
	}

	// Set up the x-axis ticks. What we want is a tick every 20 years (congresses ending
	// in 6). Our last tick should be every 10 (congresses ending in 1) if necessary. 
	var xAxisTickValues = [];
	for(var tickCtr = 6; tickCtr<max;tickCtr+=10) { xAxisTickValues.push(tickCtr); }
	if(max-xAxisTickValues[xAxisTickValues.length-1]>5) xAxisTickValues.push(xAxisTickValues[xAxisTickValues.length-1]+5);

	// Try to scale the chart to make it a little more suitable for low resolution
	var chartWidth = Math.min(1140,Math.max(700,Math.round($("#content").width()*0.92)));
	var chartHeight = Math.max(280,Math.round(chartWidth/2.9));
	dimChart
	    .width(chartWidth)
	    .height(chartHeight)
	    .dimension(congressDimension)
	    //.elasticX(true)
	    .brushOn(false)
	    .shareTitle(false)
	    .renderTitle(false)
	    .x(d3.scale.linear().domain([1, max+1]))
	    .y(d3.scale.linear().domain([-0.6,0.7]))
	    .margins({top: 0, right: 0, bottom: 50, left: 50})
	    .compose([
		dc.scatterPlot(dimChart).group(scatterGroup).colors(function(d){return fullColSet[d];}).colorAccessor(scatterCol).symbolSize(4),
		dc.lineChart(dimChart).group(dimSet[0]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[0][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis").renderTitle(true).title(function(p) { return JSON.stringify(p); }),
		dc.lineChart(dimChart).group(dimSet[1]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[1][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[2]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[2][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[3]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[3][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[4]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[4][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[5]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[5][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[6]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[6][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[7]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[7][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[8]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[8][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[9]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[9][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimSet[dimSet.length-1]).colors(["#D3D3D3"]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
	    ])
	    .on('postRender', function() { d3.select(".dc-chart svg").select("g.sub").selectAll("path.symbol").attr('opacity','0.5'); })
	    .xAxisLabel("Year").yAxisLabel("Liberal - Conservative Ideology")
	    .xAxis().tickValues(xAxisTickValues).tickFormat(function(v) { return (1787 + 2*v)+1; });
	console.timeEnd("DCChart")
	console.time("DCRender");
	dc.renderAll();
	console.timeEnd("DCRender");

	var i=0;
	// Fatten up the congressional median line so as to have better mouseover capability.
	d3.select(d3.select(".dc-chart svg").selectAll("g.sub")[0][11]).select("g.stack").select("path").classed("line",false).classed("median",true);

	// Populating the tooltip.
	console.time("tooltip");
	d3.select(".dc-chart svg").selectAll("g.sub").each(function()
	{
		var tempFuncOverride = function(d)
		{
			(function(j, obj)
			{
				j=j-1 // To compensate for the fact that the first group is the scatterplot, not the line charts.
				d3.select(obj).attr('r',10).style("cursor", "pointer");
				d3.select(obj).on("mouseover",function(d)
				{
					// Thing that checks if this is a point mouseover or a line mouseover
					if(d3.select(obj).attr("class")=="line") // Need to detect pixel position to figure out which congress
					{
						var d3MouseCoords = d3.mouse(this);
						var d3CanvasWidth = d3.select(".dc-chart svg").select("g.sub").node().getBBox()["width"];
						var currCong = Math.ceil(115*d3MouseCoords[0]/(d3CanvasWidth));
						var dUse = d["values"][currCong-1];
					}
					else // We only have one congress, we're good to go.
					{
						var dUse = d;
					}

					clearTimeout(opacityTimer);
					baseToolTip.html(tooltipText(j, dUse));
					if(j<partyList.length)
					{
						try
						{	
							$('#mapTooltip').removeClass().addClass('d3-tip')
									.addClass(partyColorMap[partyNameSimplify(parties[j][1]["name"])])
						} catch(err) { console.log(err); }
					}
					else
					{
						$('#mapTooltip').removeClass().addClass('d3-tip').addClass("grey");
					}
					eH = baseToolTip.style("height");
					eW = baseToolTip.style("width");
					baseToolTip.style("visibility","visible");
				})
				.on("mouseout",function(){
					opacityTimer = setTimeout(function(){baseToolTip.style("visibility","hidden");}, 100);
				})
				.on("mousemove",function()
				{
					clearTimeout(opacityTimer);
					baseToolTip.style("top",(event.pageY+32)+"px").style("left",(event.pageX-(parseInt(eW.substr(0,eW.length-2))/2))+"px");
				})
				.on("click",function() 
				{
					if(j<partyList.length)
					{
						window.location="/parties/"+parties[j][0]+"/"+parties[j][1]["seo_name"];
					} 
				});
			})(i, this);
		};

		d3.select(this).selectAll(".dc-tooltip-list .dc-tooltip circle").each(tempFuncOverride);
		d3.select(this).selectAll(".stack-list g.stack path.line").each(tempFuncOverride);
		//d3.select(this).selectAll(".dc-tooltip-list .dc-tooltip path").each(tempFuncOverride);
		i=i+1;
	});
	console.timeEnd("tooltip");

	$("#loading-container").delay(200).slideUp(100);
	$("#content").fadeIn();

	generatePartyList(parties);
}

function generatePartyList(parties)
{
	console.time("partyList");
	var j=0;

	function activeLabel(pData)
	{
		if(pData["broken"] != undefined) { return "Occasional"; }

		var minDate = pData["mind"].split("-")[0], maxDate = pData["maxd"].split("-")[0];

		if(pData["min"] == pData["max"]) return getGetOrdinal(pData["min"]);
		else if(pData["max"] >= max) return getGetOrdinal(pData["min"]) + " onward";
		return getGetOrdinal(pData["min"]) + "-" + getGetOrdinal(pData["max"]);

		/*
		if(pData["min"] == pData["max"]) return getGetOrdinal(pData["min"]) + " <small>(" + minDate + "-" + maxDate + ")</small>";
		else if(pData["max"] >= max) return getGetOrdinal(pData["min"]) + " <small>(" + minDate + ")</small> onwards";
		return getGetOrdinal(pData["min"]) + "-" + getGetOrdinal(pData["max"]) + "";
		*/
	}

	var listParties = parties.slice();
	listParties.sort(function(a, b) {
		// First, sort by bucket
		var bucketA = (a[1]["count"] > 10000) ? 2 : (a[1]["count"] > 100 || $.inArray(a[0], [7777, 1346, 8000]) != -1) ? 1 : 0;
		var bucketB = (b[1]["count"] > 10000) ? 2 : (b[1]["count"] > 100 || $.inArray(b[0], [7777, 1346, 8000]) != -1) ? 1 : 0;

		// And if the bucket is the same, sort by last year, and if that is the same, sort by number.
		return (bucketB - bucketA) ? bucketB - bucketA : (b[1]["maxCongress"] - a[1]["maxCongress"]) ? b[1]["maxCongress"] - a[1]["maxCongress"] : b[1]["minCongress"] - a[1]["minCongress"];
	});
	

	var headerRow = $("<div></div>").addClass("row").addClass("party_row");
	var headerName = $("<div></div>").html("<strong>Party Name</strong>").addClass("col-md-3").appendTo(headerRow);
	var headerDates = $("<div></div>").html("<strong>Congresses</strong>").addClass("col-md-2").appendTo(headerRow);
	var headerTimeline = $("<div></div>").html("<strong>Timeline</strong>").addClass("col-md-6").appendTo(headerRow);
	headerRow.appendTo($("#content"));

	for(var i=0;i!=listParties.length;i++)
	{
		if(listParties[i][0] == 328) continue;
		var party = listParties[i];

		// Re-arrange data a bit.
		var pData = {"min": party[1]["minCongress"], "max": party[1]["maxCongress"], 
				"mind": party[1]["voting_dates"][0], "maxd": party[1]["voting_dates"][1],
				"id": party[0], "name": party[1]["fullName"], "slug": party[1]["seo_name"],
				"broken": party[1]["broken"]};

		try { pData["col"] = partyColorMap[partyNameSimplify(party[1]["name"])];}
		catch(e) { pData["col"] = "grey"; console.log("color problem" + party[0]); }

	 	// Build the row.
		var partyRow = $("<div></div>").addClass("row").addClass("party_row").attr("data-party", pData["id"]).attr("data-name", pData["slug"]);
		var nameColumn = $("<div></div>").addClass("col-md-3");
		var partyLink = $("<a></a>").attr("href", "/parties/" + pData["id"] + "/" + pData["slug"]).html(pData["name"]).appendTo(nameColumn);
		nameColumn.appendTo(partyRow);
		var activeColumn = $("<div></div>").addClass("col-md-2").html(activeLabel(pData)).appendTo(partyRow);

		// Visual tracking of timeline
		var leftPadding = Math.round(100 * (pData["min"] - 1) / max) + "%";
		var width = Math.max(1, Math.round(100 * (pData["max"] - pData["min"]) / max)) + "%"; 

		// For sporadic labels, just show a broken bar.
		var rowClass = (pData["broken"] != null) ? "box_broken_" + pData["col"] : "box_" + pData["col"];

		var timelineColumn = $("<div></div>")
					.addClass("col-md-6");
		var timelineMap = $("<div></div>")
					.css("margin-left", leftPadding)
					.addClass(rowClass)
					.css("width", width)
					.css("height", "20px")
					.appendTo(timelineColumn);
		timelineColumn.appendTo(partyRow);

		partyRow.click(function(d) { window.location='/parties/' + $(this).attr("data-party") + '/' + $(this).attr("data-name"); });
		partyRow.appendTo($("#content"));
	}

	$("<div></div>").css("margin-bottom", "50px").appendTo($("#content"));
	console.timeEnd("partyList");

}


$('#closeAlert').click(function(e)
{
        if($('#alertPartiesGlance').is(':hidden')) { $('#alertPartiesGlance').show(); }
        else { $('#alertPartiesGlance').hide(); }
});


console.time("beginPageLoad");

var dimChart = dc.compositeChart("#dim-chart");

var q = queue()
    .defer(d3.json, "/static/partyjson/parties.json")
    .defer(d3.json, "/static/partyjson/glance.json")
    .defer(d3.json, "/static/config.json")
    .await(generateGlanceChart);
