'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

var timeChart = dc.barChart("#time-chart");
var dimChart = dc.compositeChart("#dim-chart");

var q = queue()
    .defer(d3.json, "/static/partyjson/"+party_param+".json")
    .defer(d3.json, "/static/partyjson/grand.json")
    .defer(d3.json, "/api/getPartyName?id="+party_param);


q
    .await(function(error, pdat, cdat,partyname) {	

	if(!partyname["error"])
	{
		var pName = partyname["partyname"];
		var partyCol = colorSchemes[partyColorMap[partyNameSimplify(pName)]];
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
            .width(1180)
            .height(180)
            .dimension(congressDimension)
            .group(congressGroup)
            .elasticX(true)
            .elasticY(true)
            .brushOn(false)
	    .colors([partyCol[0]])
            .x(d3.scale.linear().domain([0, 115]))
            .xAxis().tickFormat(function(v) { return v; });
	 
	dimChart
	    .width(1160)
	    .height(250)
	    .dimension(congressDimension)
	    .elasticX(true)
	    .brushOn(false)
            .x(d3.scale.linear().domain([0, 115]))
	    .y(d3.scale.linear().domain([minY, maxY]))
	    .compose([
	        dc.lineChart(dimChart).group(dimParty).colors([partyCol[0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimPartyLow).colors([partyCol[1]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimPartyHigh).colors([partyCol[1]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
	        dc.lineChart(dimChart).group(dimCong).colors(['#D3D3D3']).interpolate("basis")
	    ]);

        dc.renderAll();
	$(".partyName").html(pName);
	$("#loading-container").delay(200).slideUp();
    });
