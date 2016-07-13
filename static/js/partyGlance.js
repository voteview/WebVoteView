'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

var dimChart = dc.compositeChart("#dim-chart");

var q = queue()
    .defer(d3.json, "/static/partyjson/200.json")
    .defer(d3.json, "/static/partyjson/100.json")
    .defer(d3.json, "/static/partyjson/grand.json");

q
    .await(function(error, repub, dem, grand) {	
	d3.select("#content").style("display", "block");

	var min = 1;
	var max = 114;	
	
	grand.forEach(function (d) {
		d.congressMedian = d.grandMedian;
		var demMatch = dem.filter(function(dDem) { return +dDem.congress === d.congress; });
		var repMatch = repub.filter(function(dRep) { return +dRep.congress === d.congress; });
		d.demMedian = (demMatch[0] !== undefined) ? +demMatch[0].grandMedian : -999;
		d.repMedian = (repMatch[0] !== undefined) ? +repMatch[0].grandMedian : -999;
	});

        var ndx = crossfilter(grand); 

	var congressDimension = ndx.dimension(function (d) {
	    return d.congress;
	});

        var dimCong = congressDimension.group().reduceSum(function (d) {return d.congressMedian;});
        var dimDem = congressDimension.group().reduceSum(function (d) {return d.demMedian;});
        var dimRep = congressDimension.group().reduceSum(function (d) {return d.repMedian;});

	dimChart
	    .width(1160)
	    .height(500)
	    .dimension(congressDimension)
	    //.elasticX(true)
	    .brushOn(false)
            .x(d3.scale.linear().domain([35, 115]))
	    .y(d3.scale.linear().domain([-0.6,0.7]))
	    .compose([
		dc.lineChart(dimChart).group(dimDem).colors([colorSchemes["blue"][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		dc.lineChart(dimChart).group(dimRep).colors([colorSchemes["red"][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
	        dc.lineChart(dimChart).group(dimCong).colors(['#D3D3D3']).interpolate("basis")
	    ]);

        dc.renderAll();
	$("#loading-container").delay(200).slideUp();
    });
