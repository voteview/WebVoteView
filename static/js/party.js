'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

var timeChart = dc.barChart("#time-chart");
var dimChart = dc.compositeChart("#dim-chart");
var partyMapChart = dc.geoChoroplethChart("#party-map-chart");
// Need to hold these things in globals to do dynamic on-the-fly changes to map.
var bothGroup, senateGroup, houseGroup, currSet, pmx, stateDimension, partycontroljson, clusterUpper;

var eW=0; var eH = 0;
function tooltip(d)
{
	return JSON.stringify(d);
}

var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip").attr("id","mapTooltip").style("visibility","hidden");

var q = queue()
    .defer(d3.json, "/static/partyjson/"+party_param+".json")
    .defer(d3.json, "/static/partyjson/grand.json")
    .defer(d3.json, "/api/getPartyName?id="+party_param)
    .defer(d3.json, "/static/json/states114.json")
    .defer(d3.json, "/static/controljson/"+party_param+".json")

q
    .await(function(error, pdat, cdat,partyname, stateboundaries, pcontrol) {	
	partycontroljson = pcontrol;
	if(!partyname["error"])
	{
		var pName = partyname["partyname"];
		var partyCol = colorSchemes[partyColorMap[partyNameSimplify(pName)]];
		var colourSet = colorSchemesSequential[partyColorMap[partyNameSimplify(pName)]];
		colourSet.push("#ffffff");
		if(pName=="Democrat") { pName="Democratic"; }
	}
	else
	{
		var pName = "Party "+party_param;
		var partyCol = ["#CCCCCC", "#CCCCCC", "#CCCCCC"];
	}

	d3.select("#content").style("display", "block");

	var min = 1;
	var max = 114;	
	
	var minY = -0.6;
	var maxY = 0.6;
	var congressSet = cdat.filter(function(cong) { return +cong.congress>=min && +cong.congress<=max; });
	congressSet.forEach(function (d) {
		var party = pdat.filter(function(dpart) {
			return +dpart.congress === d.congress;
		});
		d.nMembers = (party[0] !== undefined) ? +party[0].nMembers : 0;
		d.partymedian = (party[0] !== undefined) ? +party[0].grandMedian : -999;
		d.partySet = (party[0] !== undefined) ? [+party[0].grandLow,+party[0].grandHigh] : [-999,-999];
		d.congressmedian = d.grandMedian;
		if(Math.max(d.congressmedian, d.partySet[1])>maxY) { maxY = Math.max(d.congressmedian,d.partySet[1])*1.05; }
		if(Math.min(d.congressmedian, d.partySet[0])<minY && Math.min(d.congressmedian, d.partySet[0])>-10) { minY = Math.min(d.congressmedian,d.partySet[0])*1.05; }
	});

        var ndx = crossfilter(congressSet); 

	var congressDimension = ndx.dimension(function (d) {
	    return d.congress;
	});

        var congressGroup = congressDimension.group().reduceSum(function (d) {return d.nMembers;});

        var dimParty = congressDimension.group().reduceSum(function (d) {return d.partymedian;});
	var dimPartyLow = congressDimension.group().reduceSum(function (d) { return d.partySet[0];});
	var dimPartyHigh = congressDimension.group().reduceSum(function (d) { return d.partySet[1];});
        var dimCong = congressDimension.group().reduceSum(function (d) {return d.congressmedian;});

        timeChart
            .width(1160)
            .height(180)
            .dimension(congressDimension)
            .group(congressGroup)
            .elasticX(true)
            .elasticY(true)
            .brushOn(false)
	    .colors([partyCol[0]])
            .x(d3.scale.linear().domain([0, 115]))
	    .margins({top: 0, left: 50, bottom: 50, right: 50})
	    .xAxisLabel("Year").yAxisLabel("Number of Members Elected")
            .xAxis().tickValues([6, 16, 26, 36, 46, 56, 66, 76, 86, 96, 106, 111]).tickFormat(function(v) { return (1787 + 2*v)+1; });
	 
	dimChart
	    .width(1160)
	    .height(250)
	    .dimension(congressDimension)
	    .elasticX(true)
	    .brushOn(false)
            .x(d3.scale.linear().domain([0, 115]))
	    .y(d3.scale.linear().domain([minY, maxY]))
	    .margins({top: 0, left: 50, bottom: 50, right: 50})
	    .compose([
	        dc.lineChart(dimChart).group(dimParty).colors([partyCol[0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimPartyLow).colors([partyCol[1]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimPartyHigh).colors([partyCol[1]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
	        dc.lineChart(dimChart).group(dimCong).colors(['#D3D3D3']).interpolate("basis")
	    ])
	    .xAxisLabel("Year").yAxisLabel("Liberal - Conservative")
	    .xAxis().tickValues([6, 16, 26, 36, 46, 56, 66, 76, 86, 96, 106, 111]).tickFormat(function(v) { return (1787 + 2*v)+1; });

	setupCongress(114);

	var mapTopo = topojson.feature(stateboundaries, stateboundaries.objects.states).features;
	partyMapChart
		.width(900)
		.height(500)
		.dimension(stateDimension)
		.group(bothGroup)
		.colorCalculator(function(d) {
			for(var i=0;i!=clusterUpper.length;i++)
			{
				if(d>clusterUpper[i]) { return colourSet[i]; }
			}
			return colourSet[colourSet.length-1];
		})
		.overlayGeoJson(mapTopo, 'state', function(d) { return d.id; });

        dc.renderAll();
	$(".partyName").html(pName);
	$("#loading-container").delay(200).slideUp();
    });

function toggleMapSupport(toggle)
{
	console.log(toggle);
	if(toggle=="both") partyMapChart.group(bothGroup);
	else if(toggle=="house") partyMapChart.group(houseGroup);
	else partyMapChart.group(senateGroup);
	partyMapChart.redraw();
}

function setupCongress(num)
{
	currSet = jQuery.grep(partycontroljson, function(n,i) { return n.congress==num.toString(); })[0]["data"];
	pmx = crossfilter(currSet);
	stateDimension = pmx.dimension(function(d) { return d["state"]; });
	bothGroup = stateDimension.group().reduceSum(function(d) { return d["both"] });
	senateGroup = stateDimension.group().reduceSum(function(d) { return d["senate"] });
	houseGroup = stateDimension.group().reduceSum(function(d) { return d["house"] });

	// For simple-statistics to do k-means clustering
	var results = [];
	for(var i=0;i!=currSet.length;i++) { results.push(currSet[i]["both"]); }
	var clusterSet = ss.ckmeans(results, 7);
	clusterUpper = [];
	for(var i=0;i!=clusterSet.length;i++) { clusterUpper.push(clusterSet[i][clusterSet[i].length-1]); }
	clusterUpper.reverse();
	clusterUpper = clusterUpper.slice(1);

	console.log('done setup');
}

function switchCongress(num)
{
	console.log(num);
	setupCongress(num);
	partyMapChart.dimension(stateDimension);
	partyMapChart.group(bothGroup);
	partyMapChart.redraw();
}
