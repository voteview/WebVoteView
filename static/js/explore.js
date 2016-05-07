'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

var timeChart = dc.barChart("#time-chart");
var clausenChart = dc.rowChart("#clausen-chart");
var resultChart = dc.pieChart("#result-chart");

var xhr = d3.json("/static/explorejson/"+chamber_param+".json")
    .on("progress", function() { 
        console.log("progress", d3.event.loaded); 

    })
    .on("load", function(json) { console.log("success!", json); })
    .on("error", function(error) { console.log("failure!", error); })
    .get(function(error, data) {

	var clausenCats = d3.json("/static/explorejson/clausen.json").get(function(error, d2) {
		
        d3.select("#loading-container").style("display", "none");
        d3.select("#content").style("display", "block");

        var dateFormat = d3.time.format("%Y-%m-%d");

        data.forEach(function (d) {
	    d.desc = "";
            d.dd = dateFormat.parse(d.date);
            d.year = d3.time.year(d.dd);
        });

        var ndx = crossfilter(data); 
        var all = ndx.groupAll();

        var yearlyDimension = ndx.dimension(function (d) {
            return d3.time.year(d.dd).getFullYear();
        });
        var yearlyGroup = yearlyDimension.group();

        var resultDimension = ndx.dimension(function(d) { return d.result; });
        var resultGroup = resultDimension.group();

        var clausenDimension = ndx.dimension(function(d) { return d.clausenID; });
        var clausenGroup = clausenDimension.group();

        timeChart
            .width(1180)
            .height(180)
            .dimension(yearlyDimension)
            .group(yearlyGroup)
            .elasticX(true)
            .elasticY(true)
            .x(d3.scale.linear().domain([0, 2016]))
            .xAxis().tickFormat(function(v) { return v; });

        clausenChart
            .width(480)
            .height(180)
            .dimension(clausenDimension)
            .elasticX(true)
            .group(clausenGroup)
	    .label(function(d) { return d2[String(d.key)]; })
            .xAxis().ticks(4);

        resultChart
            .width(180)
            .height(180)
            .radius(80)
            .dimension(resultDimension)
            .group(resultGroup)
	    .label(function(d) { if(d.key) { return "Pass"; } else { return "Fail"; } });

        dc.dataCount("#data-count")
            .dimension(ndx)
            .group(all);

        dc.renderAll();
    });});
