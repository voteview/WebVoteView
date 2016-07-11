'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

var timeChart = dc.barChart("#time-chart");

var xhr = d3.json("/static/partyjson/"+party_param+".json")
    .on("progress", function() { 
        console.log("progress", d3.event.loaded); 

    })
    .on("load", function(json) { console.log("success!", json); })
    .on("error", function(error) { console.log("failure!", error); })
    .get(function(error, data) {
	
        d3.select("#content").style("display", "block");

	data.forEach(function (d) {
		d.desc = "";
		d.congress = +d.congress;
		d.nMembers = +d.nMembers;
	});
        var ndx = crossfilter(data); 
        var all = ndx.groupAll();

        var congressDimension = ndx.dimension(function (d) {
            return d.congress;
        });
        var congressGroup = congressDimension.group();


        timeChart
            .width(1180)
            .height(180)
	    .margins({top: 10, right: 50, bottom: 30, left: 40})
            .dimension(congressDimension)
            .group(congressGroup)
            .elasticX(true)
            .elasticY(true)
            .x(d3.scale.linear().domain([0, 115]))
            .xAxis().tickFormat(function(v) { return v; });

        dc.renderAll();
	$("#loading-container").delay(200).slideUp();
    });
