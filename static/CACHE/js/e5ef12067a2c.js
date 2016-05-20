var chamber_param = "senate";
'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

var timeChart = dc.barChart("#time-chart");
var clausenChart = dc.rowChart("#clausen-chart");
var resultChart = dc.pieChart("#result-chart");

// Return the ID for each rollcall
// ID is: chamber(1 char) + session(3 char) + rollcall number(4 char)
function getRollcallID(rollcallData) {

    // Fill with zeroes at the right 
    // lpad (17, 4) -> 0017
    function lpad(value, padding) {
        var zeroes = new Array(padding+1).join("0");
        return (zeroes + value).slice(-padding);
    }

    var result = "";
    result += rollcallData.chamber.slice(0,1);
    result += lpad(rollcallData.session ,3)
    result += lpad(rollcallData.rcnum ,4)
    return result
}

var xhr = d3.json("/api/getrollcalls/?chamber=" + chamber_param)
    .on("progress", function() { 
        console.log("progress", d3.event.loaded); 

    })
    .on("load", function(json) { console.log("success!", json); })
    .on("error", function(error) { console.log("failure!", error); })
    .get(function(error, data) {
        
        d3.select("#loading-container").style("display", "none");
        d3.select("#content").style("display", "block");

        var dateFormat = d3.time.format("%Y-%m-%d");

        data.forEach(function (d) {
            d.dd = dateFormat.parse(d.date);
            d.year = d3.time.year(d.dd);
        });

        var ndx = crossfilter(data); 
        var all = ndx.groupAll();

        var yearlyDimension = ndx.dimension(function (d) {
            return d3.time.year(d.dd).getFullYear();
        });
        var yearlyGroup = yearlyDimension.group();

        var clausenDimension = ndx.dimension(function(d) { return d.clausen; });
        var clausenGroup = clausenDimension.group();

        var resultDimension = ndx.dimension(function(d) { return d.result; });
        var resultGroup = resultDimension.group();

        timeChart
            .width(1180)
            .height(180)
            .dimension(yearlyDimension)
            .group(yearlyGroup)
            .elasticX(true)
            .elasticY(true)
            .x(d3.scale.linear().domain([0, 2014]));

        clausenChart
            .width(480)
            .height(180)
            .dimension(clausenDimension)
            .elasticX(true)
            .group(clausenGroup)
            .xAxis().ticks(4);

        resultChart
            .width(180)
            .height(180)
            .radius(80)
            .dimension(resultDimension)
            .group(resultGroup);

        dc.dataCount("#data-count")
            .dimension(ndx)
            .group(all);

        dc.dataTable(".dc-data-table")
            .dimension(clausenDimension)
            .group(function (d) {
                return d.clausen;
            })
            .size(200)
            .columns([
                function (d) {
                    return d.date;
                },
                function (d) {
                    return d.result;
                },
                function (d) {
                    return d.desc;
                },
                function (d) {
                    var rollcallID = getRollcallID(d);
                    return "<a href='/rollcall/" + rollcallID + "' class='btn btn-primary btn-sm'>See vote</a>";
                }
            ]);

        dc.renderAll();
    });
