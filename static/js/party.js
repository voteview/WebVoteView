'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

var timeChart = dc.barChart("#time-chart");
var dimChart = dc.compositeChart("#dim-chart");

var q = queue()
    .defer(d3.json, "/static/partyjson/"+party_param+".json")
    .defer(d3.json, "/static/partyjson/congress.json");


q
//.on("progress", function() { 
//        console.log("progress", d3.event.loaded); 
//
//    })
//    .on("load", function(json) { console.log("success!", json); })
//    .on("error", function(error) { console.log("failure!", error); })
    .await(function(error, pdat, cdat) {	

	d3.select("#content").style("display", "block");
	
	pdat.forEach(function (d) {
		d.congress = +d.congress;
    		var cong = cdat.filter(function(dcong) {
        		return +dcong.congress === d.congress;
    		});
		d.nMembers = +d.nMembers;
		d.partymean = +d.mean;		
		d.congressmean = (cong[0] !== undefined) ? cong[0].mean : null;
	});

	// concatenated here so that they can be split later if need be
	//var dat = pdat.concat(cdat);
	
        var ndx = crossfilter(pdat); 

	var congressDimension = ndx.dimension(function (d) {
	    return d.congress;
	});

        var congressGroup = congressDimension.group().reduceSum(function (d) {return d.nMembers;});

        var dimParty = congressDimension.group().reduceSum(function (d) {return d.partymean;});
        var dimCong = congressDimension.group().reduceSum(function (d) {return d.congressmean;});
//	console.log(dat);
//	console.log(dimParty.top(Infinity));
        timeChart
            .width(1180)
            .height(180)
            .dimension(congressDimension)
            .group(congressGroup)
            .elasticX(true)
            .elasticY(true)
            .brushOn(false)
            .x(d3.scale.linear().domain([0, 115]))
            .xAxis().tickFormat(function(v) { return v; });
	 
	dimChart
	    .width(1160)
	    .height(250)
	    .dimension(congressDimension)
	    .elasticY(true)
	    .elasticX(true)
	    .brushOn(false)
            .x(d3.scale.linear().domain([0, 115]))
//            .xAxis().tickFormat(function(v) { return v; })
	    .compose([
	        dc.lineChart(dimChart).group(dimParty),
	        dc.lineChart(dimChart).group(dimCong).colors(['#D3D3D3'])
	    ]);

        dc.renderAll();
	$("#loading-container").delay(200).slideUp();
    });
