'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

var timeChart = dc.barChart("#time-chart");
var dimChart = dc.compositeChart("#dim-chart");
var partyMapChart = dc.geoChoroplethChart("#party-map-chart");
// Need to hold these things in globals to do dynamic on-the-fly changes to map.
var groupSel = "both", bothGroup, senateGroup, houseGroup, currSet, pmx, stateDimension, partycontroljson, clusterUpper, colourSet;
var inLoop, playLoop, currCong, minCong, maxCong, forceStopLoop, slider;

var eW=0; var eH = 0;
function tooltip(d)
{
	return JSON.stringify(d);
}

function congYear(num) { return [1787+2*num, 1788+2*num]; }

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}

var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip").attr("id","mapTooltip").style("visibility","hidden");

var q = queue()
    .defer(d3.json, "/static/partyjson/"+party_param+".json")
    .defer(d3.json, "/static/partyjson/grand.json")
    .defer(d3.json, "/api/getPartyName?id="+party_param)
    .defer(d3.json, "/static/json/states_all.json")
    .defer(d3.json, "/static/controljson/"+party_param+".json")

q
    .await(function(error, pdat, cdat,partyname, stateboundaries, pcontrol) {	
	partycontroljson = pcontrol;
	if(!partyname["error"])
	{
		var pName = partyname["partyname"];
		var partyCol = colorSchemes[partyColorMap[partyNameSimplify(pName)]];
		colourSet = colorSchemesSequential[partyColorMap[partyNameSimplify(pName)]];
		colourSet.push("#ffffff");
	}
	else
	{
		var pName = "Party "+party_param;
		var partyname = {"partyname": "Party "+party_param, "fullName": "Party "+party_param, "pluralNoun": "Party "+party_param+" Member", "noun": "Party "+party_param};
		var partyCol = ["#CCCCCC", "#CCCCCC", "#CCCCCC"];
	}

	d3.select("#content").style("display", "block");

	var min = 1;
	var max = 114;	
	
	var minY = -0.6;
	var maxY = 0.6;
        var maxMembers = 1;
	var singletonsOnly=1;
	var activeSet=0;
	var congressSet = cdat.filter(function(cong) { return +cong.congress>=min && +cong.congress<=max; });
	var memSetScatter = [];
	congressSet.forEach(function (d) {
		var party = pdat.filter(function(dpart) {
			return +dpart.congress === d.congress;
		});
		d.nMembers = (party[0] !== undefined) ? +party[0].nMembers : 0;
		if(d.nMembers > maxMembers) { maxMembers = d.nMembers; }
		d.partymedian = (party[0] !== undefined) ? +party[0].grandMedian : -999;
		d.congressmedian = d.grandMedian;
		if(d.partymedian>-900 && activeSet) { singletonsOnly=0; }
		if(d.partymedian>-900) { activeSet=1; }
		else { activeSet=0; }

		if(party[0]!==undefined)
		{
			maxY = Math.max(maxY, d.congressmedian*1.05, Math.max(...party[0].grandSet)*1.05);
			minY = Math.min(minY, d.congressmedian*1.05, Math.min(...party[0].grandSet)*1.05);
		}
		else
		{
			maxY = Math.max(maxY, d.congressmedian*1.05);
			minY = Math.min(minY, d.congressmedian*1.05);
		}

		if(party[0] !== undefined)
		{
			for(var qQ=0;qQ<party[0].grandSet.length;qQ++)
			{
				memSetScatter.push({"x": d.congress, "y": party[0].grandSet[qQ]});
			}
		}
	});

        var ndx = crossfilter(congressSet); 
	var cfMemSet = crossfilter(memSetScatter);
	var congressDimension = ndx.dimension(function (d) {
	    return d.congress;
	});
	var congressDimMem = cfMemSet.dimension(function(d) { return [+d.x, +d.y]; });
	var congressGroupMem = congressDimMem.group();//.reduceSum(function(d) { return +d.y; });
        var congressGroup = congressDimension.group().reduceSum(function (d) {return d.nMembers;});

        var dimParty = congressDimension.group().reduceSum(function (d) {return d.partymedian;});
        var dimCong = congressDimension.group().reduceSum(function (d) {return d.congressmedian;});

        timeChart
            .width(1160)
            .height(180)
            .dimension(congressDimension)
            .group(congressGroup)
            .elasticX(true)
            .brushOn(false)
	    .colors([partyCol[0]])
            .x(d3.scale.linear().domain([0, 115]))
            .y(d3.scale.linear().domain([0, maxMembers+0.2]))
	    .on('renderlet.click', function(chart, filter)
		{
			chart.selectAll("rect.bar").on('click.custom', function(d) {
				switchCongress(d.x);				
			});
		})
	    .margins({top: 0, left: 50, bottom: 50, right: 50})
	    .xAxisLabel("Year").yAxisLabel("Members in office")
            .xAxis().tickValues([6, 16, 26, 36, 46, 56, 66, 76, 86, 96, 106, 111]).tickFormat(function(v) { return (1787 + 2*v)+1; });
	timeChart
	    .yAxis().ticks(5).tickFormat(d3.format("d"));
	 
	dimChart
	    .width(1160)
	    .height(250)
	    .dimension(congressDimension)
	    .elasticX(true)
	    .brushOn(false)
            .x(d3.scale.linear().domain([0, 115]))
	    .y(d3.scale.linear().domain([minY, maxY]))
	    .margins({top: 0, left: 50, bottom: 50, right: 50})
	    .on('postRender', function() { 
			d3.select('.dc-chart svg > g').selectAll('g.sub').selectAll('path.symbol').attr('opacity','0.5'); 
	    })
	    .xAxisLabel("Year").yAxisLabel("Liberal - Conservative")
	    .xAxis().tickValues([6, 16, 26, 36, 46, 56, 66, 76, 86, 96, 106, 111]).tickFormat(function(v) { return (1787 + 2*v)+1; })

	if(!singletonsOnly)
	{
		function colHack(d) { return 0; }
		dimChart
		    .compose([
		        dc.lineChart(dimChart).group(dimCong).colors(['#D3D3D3']).interpolate("basis"),
			dc.scatterPlot(dimChart).group(congressGroupMem).colors([partyCol[1]]).colorAccessor(colHack).symbolSize(3),
		        dc.lineChart(dimChart).group(dimParty).colors([partyCol[0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
		    ]);
	}
	else
	{
		// Hack to get around singleton bug
		function keyHack(d) { return d.key; }
		function valHack(d) { return d.value; }
		function colHack(d) { return 0; }
		dimChart
		    .compose([
		        dc.lineChart(dimChart).group(dimCong).colors(['#D3D3D3']).interpolate("basis"),
			dc.scatterPlot(dimChart).group(congressGroupMem).colors([partyCol[1]]).colorAccessor(colHack).symbolSize(3),
			dc.scatterPlot(dimChart).group(dimParty).colors([partyCol[0]]).colorAccessor(colHack).keyAccessor(keyHack).symbolSize(6).valueAccessor(valHack)
		    ]);
	}

	// Get congress range to initialize map
	minCong = 999;
	maxCong = 0;
	for(var z=0;z!=partycontroljson.length;z++)
	{
		minCong = (partycontroljson[z].congress<minCong)?partycontroljson[z].congress:minCong;
		maxCong = (partycontroljson[z].congress>maxCong)?partycontroljson[z].congress:maxCong;
	}
	// Initialize map to maximum congress.
	var baseValue = (congressNum>maxCong)?maxCong:(congressNum<minCong)?minCong:(congressNum==0)?maxCong:congressNum;
	setupCongress(baseValue);
	$("#congNum").val(baseValue);
	$("#yearNum").val(new Date().getFullYear());

	// Initialize ticks for scroll-bar
	var finalCong = 114;
	var tickSet = [1];
	var tickPos = [0];
	var tickLabels = [];
	if(minCong>10) tickLabels.push("1st Congress<br/><small>"+congYear(1)[0]+"-"+congYear(1)[1]+"</small>");
	else tickLabels.push("");

	// Abbreviated names for some parties, if present
	var nameUse = (partyname["briefName"]===undefined)?partyname["fullName"]:partyname["briefName"];

	// Single-congress party
	if(minCong==maxCong && minCong>1 && minCong<finalCong)
	{
		tickSet.push(minCong);
		tickPos.push((minCong-1)*100/(finalCong-1));
		tickLabels.push("<small>"+nameUse+"<br/>Active "+congYear(minCong)[0]+"-"+congYear(minCong)[1]+"</small>");
	}
	// Multi-congress party
	else
	{
		// Show start tick only if start after 1st
		if(minCong>1) 
		{ 
			tickSet.push(minCong); tickPos.push((minCong-1)*100/(finalCong-1)); 
			// Labels differ depending on space available
			if(maxCong-minCong<4) tickLabels.push("");
			else if(maxCong-minCong<9) tickLabels.push("<small>Start of /</small>");
			else tickLabels.push("<small>Start of<br/>"+nameUse+"</small>"); 
		}
		// Show end tick only if end before today's congress
		if(maxCong<finalCong) 
		{ 
			tickSet.push(maxCong); 
			tickPos.push((maxCong-1)*100/(finalCong-1)); 
			// Again, labels differ depending on space available.
			if(maxCong-minCong<4) tickLabels.push("<small>Start / End of<br/>"+nameUse+"</small>");
			else tickLabels.push("<small>End of<br/>"+nameUse+"</small>"); 
		}
	}
	tickSet.push(finalCong);
	tickPos.push(100);
	tickLabels.push(getGetOrdinal(finalCong)+" Congress<br/><small>"+congYear(finalCong)[0]+"-"+congYear(finalCong)[1])+"</small>";

	// Initialize the slider
	slider = $("input.slider").slider({
		ticks: tickSet,
		ticks_positions: tickPos, 
		ticks_labels: tickLabels,
		tooltip: 'hide',
		value: baseValue
	});
	// Wire up the slider to work
	slider.on("change", function(slideEvt)
	{
		var currValue = slideEvt.value.newValue;
		currValue = (currValue>maxCong)?maxCong:(currValue<minCong)?minCong:currValue;
		if(currValue!=slideEvt.value) { slider.slider("setValue", currValue); }
		switchCongress(currValue);		
	});

	// Now let's make our map!
	var mapTopo = topojson.feature(stateboundaries, stateboundaries.objects.states).features;
	partyMapChart
		.width(920)
		.height(500)
		.dimension(stateDimension)
		.group(bothGroup)
		.filterHandler(function() { })
		.colorCalculator(function(d) {
			if(d===undefined) { return "#CCCCCC"; }
			for(var i=0;i!=clusterUpper.length;i++)
			{
				if(d>=clusterUpper[i]) { return colourSet[i]; }
			}
			return colourSet[colourSet.length-1];
		})
		.overlayGeoJson(mapTopo, 'state', function(d) { return d.id; })
		.on('preRedraw',function(c) { ensureTextLabel(c); ensureLegend(c); })
		.on('postRender',function(c) { ensureTextLabel(c); ensureLegend(c); });

        dc.renderAll();
	timeChart.svg().selectAll("text").filter(".y-label").attr("font-size","13px");
	$(".fullName").html(partyname["fullName"]);
	$(".pluralNoun").html(partyname["pluralNoun"]);
	$(".noun").html(partyname["noun"]);
	$("#loading-container").delay(200).slideUp();
    });

function ensureLegend(c)
{
	var baseSVG = c.svg();
	if(baseSVG.selectAll("g").filter(".legendLabel")[0].length)
	{
		baseSVG.selectAll("g").filter(".legendLabel").remove();
	}

	var bX = 810;
	var bY = 290;
	var legendBox = baseSVG.insert("g");
	legendBox.attr("class","legendLabel");
	legendBox.append("text").attr("x",bX).attr("y",bY).attr("font-weight","400").text(function(){return "Legend";});
	legendBox.append("text").attr("x",bX+10).attr("y",bY+18).attr("font-size","0.9em").text(function() { return "100%"; });
	for(var i=0;i!=colourSet.length-1;i++)
	{
		legendBox.append("rect").attr("x",bX).attr("y",bY+10+(i*20))
					.attr("width","6").attr("height","20").attr("fill",colourSet[i]);
		legendBox.append("text").attr("x",bX+10).attr("y",bY+15+((i+1)*20)).attr("font-size","0.7em")
					.text(function() { return clusterUpper[i].toString()+"%"; });
	}
	legendBox.append("text").attr("x",bX+10).attr("y",bY+15+((colourSet.length)*20)).attr("font-size","0.9em")
				.text(function() { return "0%"; });

	if(currCong<86)
	{
		// Divider line
		legendBox.append("rect").attr("x",bX).attr("y",bY+22+( (colourSet.length)*20))
					.attr("width","70").attr("height","1").attr("fill","#EEEEEE");
		// Not a state
		legendBox.append("rect").attr("x",bX).attr("y",bY+10+((colourSet.length+1)*20))
					.attr("width","6").attr("height","20").attr("fill","#CCCCCC");
		legendBox.append("text").attr("x",bX+10).attr("y",bY+22+((colourSet.length+1)*20)).attr("font-size","0.7em")
					.text(function() { return "Not a US State"; });
	}
}

function ensureTextLabel(c)
{
	var textLabelTitle = getGetOrdinal(currCong)+" ";
	if(groupSel=="both") { textLabelTitle+="Congress"; }
	else if(groupSel=="senate") { textLabelTitle+="Senate"; }
	else if(groupSel=="house") { textLabelTitle+="House"; }
	var years = congYear(currCong);
	textLabelTitle += " ("+years[0]+"-"+years[1]+")";

	var baseSVG = c.svg();
	if(baseSVG.selectAll("g").filter(".textLabel")[0].length)
	{
		var textBox = baseSVG.selectAll("g").filter(".textLabel").selectAll("text");
		textBox.text(function() { return textLabelTitle; });
	}
	else
	{
		var textBox = baseSVG.insert("g")
		textBox.attr("class","textLabel").append("text").attr("x",680).attr("y",20).attr("font-weight",700)
								.text(function() { return textLabelTitle; });
	}
}

function toggleMapSupport(toggle)
{
	if(toggle=="both") partyMapChart.group(bothGroup);
	else if(toggle=="house") partyMapChart.group(houseGroup);
	else if(toggle=="senate") partyMapChart.group(senateGroup);
	else { return; }
	groupSel = toggle;	
	partyMapChart.redraw();
}

function setupCongress(num)
{
	currCong=num;
	currSet = jQuery.grep(partycontroljson, function(n,i) { return n.congress==num.toString(); })[0]["data"];
	pmx = crossfilter(currSet);
	stateDimension = pmx.dimension(function(d) { return d["state"]; });
	bothGroup = stateDimension.group().reduceSum(function(d) { return d["both"] });
	senateGroup = stateDimension.group().reduceSum(function(d) { return d["senate"] });
	houseGroup = stateDimension.group().reduceSum(function(d) { return d["house"] });

	// Just equal interval clustering
	clusterUpper = [85, 71, 57, 42, 28, 14];
	/*
	// For simple-statistics to do k-means clustering
	// Several problems: 1) clusters are highly unstable over time
	// 2) In many cases, there are fewer classes than clusters, so you get a bunch of 0 clusters
	var results = [];
	for(var i=0;i!=currSet.length;i++) { results.push(currSet[i]["both"]); }
	var clusterSet = ss.ckmeans(results, 7);
	clusterUpper = [];
	for(var i=0;i!=clusterSet.length;i++) { clusterUpper.push(clusterSet[i][clusterSet[i].length-1]); }
	clusterUpper.reverse();
	clusterUpper = clusterUpper.slice(1);
	*/

}

function switchCongress(num, autoLoop=0)
{
	if(autoLoop==0 && inLoop) { stopLoop(); }
	num = parseInt(num);
	var yearSet;
	if(num>1000)
	{
		yearSet = num;
		num = Math.floor((num-1787)/2);
	}
	else { yearSet = congYear(num)[0]; }

	num = (num>maxCong)?maxCong:(num<minCong)?minCong:num;
	if(num!=$("#congNum").val()) { $("#congNum").val(num); }
	if(yearSet!=$("#yearNum").val()) { $("#yearNum").val(yearSet); }
	if(slider.slider("getValue")!=num) { slider.slider("setValue", parseInt(num)); }
	setupCongress(num);
	partyMapChart.dimension(stateDimension);

	var loadNum = num;
	if(num<100) { loadNum = "0"+loadNum; }

	// Map substitution
	/*d3.json("/static/json/states"+loadNum+".json", function(error, stateboundaries)
	{
		if(!error)
		{
			var mapTopo = topojson.feature(stateboundaries, stateboundaries.objects.states).features;
			partyMapChart.overlayGeoJson(mapTopo, 'state', function(d) { return d.id; })
			partyMapChart.render();
		}
	});*/

	toggleMapSupport(groupSel);
	currCong=num;
}

function playLoopInt()
{
	$("#playButton").hide();
	$("#pauseButton").show();
	$("#playHint").html("Pause");
	inLoop=1;
	forceStopLoop=0;
	if(currCong==maxCong) { currCong = minCong-1; }
	partyMapChart.transitionDuration(100);
	playLoopIteration();
}

function playLoopIteration()
{
	if(forceStopLoop)
	{
		forceStopLoop=0;
		return;
	}
	var delay = 250;
	currCong = currCong+1;
	if(currCong>maxCong) { currCong=minCong; }
	if(currCong==maxCong) { delay=3000; } // Hang on the last, current congress before looping
	switchCongress(currCong, 1);
	playLoop = setTimeout(playLoopIteration, delay);
}

function stopLoop()
{
	$("#playButton").show();
	$("#pauseButton").hide();
	$("#playHint").html("Animate");
	partyMapChart.transitionDuration(700);
	forceStopLoop=1;
	inLoop=0;
	clearTimeout(playLoop);
}
