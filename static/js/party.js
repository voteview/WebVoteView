'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

var resultCache;
var sortBy="name";
var timeChart = dc.barChart("#time-chart");
var dimChart = dc.compositeChart("#dim-chart");
var partyMapChart = dc.geoChoroplethChart("#party-map-chart");
// Need to hold these things in globals to do dynamic on-the-fly changes to map.
var groupSel = "both", bothGroup, senateGroup, houseGroup, currSet, pmx, stateDimension, partycontroljson, clusterUpper, colourSet;
var inLoop, playLoop, currCong, minCong, maxCong, forceStopLoop, slider;
var mapTopo, stateTopo;
var opacityTimer;
var globalPartyName, globalPartyColorName;

function congYear(num) { return [1787+2*num, 1788+2*num]; }

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}

var eW = 0; var eH = 0;
function tooltipText(d)
{
	var nays=0; var yeas=0; var abs=0;
	var result = "<p>"+getGetOrdinal(currCong)+" Congress &gt; <strong>" + stateMap[d.key] + "</strong></p>";
	result = result + globalPartyName+" control "+d.value+"% of the ";
	if(groupSel=="both") result += "House and Senate";
	else if(groupSel=="house") result += "House";
	else result += "Senate";
	result += " in this state.";
	return(result);
}

function ideologyTooltip(party, d)
{
	var result = getGetOrdinal(d.x)+" Congress &gt; ";
	if(party > 0)
	{
		result = result+"<strong>" + globalPartyName + "</strong>";
	}
	else
	{
		result = result+"<strong>Congressional Median (Midpoint)</strong>";
	}
	result = result+"<br/><br/><em>Median Ideology Score</em>: "+(Math.round(d.y*100)/100);
	result = result+"<br/><br/><em>How to interpret Ideology scores:</em><br/>These scores show how liberal or conservative a party is on a scale from -1 (Very Liberal) to +1 (Very Conservative). The scores provided are the median--mid-point--member of each party across both the House of Representative and the Senate.";

	if(party < 0)
	{
		result = result+"<br/><br/>The Congressional Median is unstable (swings back and forth) as control of the House and Senate change.";
	}
	return(result);
}


var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip").attr("id","mapTooltip").style("visibility","hidden");

var q = queue()
    .defer(d3.json, "/static/partyjson/"+party_param+".json")
    .defer(d3.json, "/static/partyjson/grand.json")
    .defer(d3.json, "/api/getPartyData?id="+party_param)
    .defer(d3.json, "/static/json/states_all.json")
    .defer(d3.json, "/static/controljson/"+party_param+".json")
    .defer(d3.json, "/static/config.json")
    .defer(d3.json, "/static/json/usa.topojson");

q
    .await(function(error, pdat, cdat,partyname, stateboundaries, pcontrol, configFile, usaboundaries) {	
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

	var min = 1;
	var max = configFile["max_congress"];	
	
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

	// Set up the x-axis ticks. What we want is a tick every 20 years (congresses ending
	// in 6). Our last tick should be every 10 (congresses ending in 1) if necessary. 
	var xAxisTickValues = [];
	for(var tickCtr = 6; tickCtr<max;tickCtr+=10) { xAxisTickValues.push(tickCtr); }
	if(max-xAxisTickValues[xAxisTickValues.length-1]>5) xAxisTickValues.push(xAxisTickValues[xAxisTickValues.length-1]+5);

        timeChart
            .width(1160)
            .height(180)
            .dimension(congressDimension)
            .group(congressGroup)
            .elasticX(true)
            .brushOn(false)
	    .colors([partyCol[0]])
            .x(d3.scale.linear().domain([0, max+1]))
            .y(d3.scale.linear().domain([0, maxMembers+0.2]))
	    .on('renderlet.click', function(chart, filter)
		{
			chart.selectAll("rect.bar").on('click.custom', function(d) {
				switchCongress(d.x);				
			});
		})
	    .margins({top: 0, left: 50, bottom: 50, right: 50})
	    .xAxisLabel("Year").yAxisLabel("Members in office")
            .xAxis().tickValues(xAxisTickValues).tickFormat(function(v) { return (1787 + 2*v)+1; });
	timeChart
	    .yAxis().ticks(5).tickFormat(d3.format("d"));
	 
	dimChart
	    .width(1160)
	    .height(250)
	    .dimension(congressDimension)
	    .elasticX(true)
	    .renderTitle(false)
	    .brushOn(false)
            .x(d3.scale.linear().domain([0, max+1]))
	    .y(d3.scale.linear().domain([minY, maxY]))
	    .margins({top: 0, left: 50, bottom: 50, right: 50})
	    .on('postRender', function() { 
			d3.select('.dc-chart svg > g').selectAll('g.sub').selectAll('path.symbol').attr('opacity','0.5'); 
	    })
	    .xAxisLabel("Year").yAxisLabel("Liberal - Conservative")
	    .xAxis().tickValues(xAxisTickValues).tickFormat(function(v) { return (1787 + 2*v)+1; })

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
		// Hack to get around singleton bug -- 
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

	// If it's a one congress party, disable a bunch of the controls
	if(minCong==maxCong)
	{
		$(".congressControl").hide();	
	}

	// Initialize map to maximum congress.
	var baseValue = (congressNum>maxCong)?maxCong:(congressNum<minCong)?minCong:(congressNum==0)?maxCong:congressNum;
	setupCongress(baseValue);
	$("#congNum").val(baseValue);
	$("#yearNum").val(new Date().getFullYear());

	// Initialize ticks for scroll-bar
	var finalCong = max;
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
	mapTopo = topojson.feature(stateboundaries, stateboundaries.objects.states).features;
	stateTopo = topojson.feature(usaboundaries, usaboundaries.objects.usa).features;
	partyMapChart
		.width(930)
		.height(500)
		.dimension(stateDimension)
		.group(bothGroup)
		.filterHandler(function() { })
		.colorCalculator(function(d, i) {
			if(d===undefined) { return "#FFFFFF"; }
			for(var i=0;i!=clusterUpper.length;i++)
			{
				if(d>=clusterUpper[i]) { return colourSet[i]; }
			}
			return colourSet[colourSet.length-1];
		})
		.overlayGeoJson(stateTopo, 'country')
		.overlayGeoJson(mapTopo, 'state', function(d) { return d.id; })
		.renderTitle(false)
		.on('preRedraw',function(c) { fadeStates(c); ensureTextLabel(c); ensureLegend(c); })
		.on('postRender',function(c) 
		{ 
			c.svg() // Chart SVG
				.selectAll("path") // Attach the listeners to every path (district) item in the SVG
				.on('mouseover', function(d,i) // When you mouseover, it's a new district, set up the tooltip and make it visible
				{ 
					var districtSet = c.data();
					var result = $.grep(c.data(), function(e){
						return e.key == d.id; 
					});
					if(result[0]==undefined) baseToolTip.html(""); // Don't tooltip null results.
					else baseToolTip.html(tooltipText(result[0])); 
					eH = baseToolTip.style("height"); // We need these for centering the tooltip appropriately.
					eW = baseToolTip.style("width");
					baseToolTip.style("visibility","visible"); 
				})
				.on('mouseout', function() { baseToolTip.style("visibility","hidden"); }) // If you mouse out of the districts, hide the tooltip
				.on('mousemove', function(d, i)
				{ // If you move your mouse within the district, update the position of the tooltip.
					if(baseToolTip.html().length) baseToolTip.style("visibility","visible");
					else baseToolTip.style("visibility","hidden");

					baseToolTip
						.style("top", (event.pageY + 32) + "px")
						.style("left", (event.pageX - (parseInt(eW.substr(0, eW.length - 2)) / 2)) + "px");
				});

			// Toggle off states that are not valid, put the legend and the title label.
			fadeStates(c); 
			ensureTextLabel(c); 
			ensureLegend(c); 
		});

        dc.renderAll();
	timeChart.svg().selectAll("text").filter(".y-label").attr("font-size","13px");
	globalPartyName = partyname["pluralNoun"];
	globalPartyColorName = partyname["partyname"];
	$(".fullName").html(partyname["fullName"]);
	$(".pluralNoun").html(partyname["pluralNoun"]);
	$(".noun").html(partyname["noun"]);

	// Populating the tooltip for ideology
	console.time("tooltip");
	var i = 0;
	d3.select("#dim-chart svg").selectAll("g.sub").each(function()
	{
		var tempFuncOverride = function(d)
		{
			(function(j, obj)
			{
				j=j-1 // To compensate for the fact that the first group is the scatterplot, not the line charts.
				d3.select(obj).attr('r',10);
				d3.select(obj).on("mouseover",function(d)
				{
					// Thing that checks if this is a point mouseover or a line mouseover
					if(d3.select(obj).attr("class")=="line") // Need to detect pixel position to figure out which congress
					{
						var d3MouseCoords = d3.mouse(this);
						var d3CanvasWidth = d3.select("#dim-chart svg").select("g.sub").node().getBBox()["width"];
						var currCong = Math.ceil(116 * d3MouseCoords[0]/(d3CanvasWidth));
						var dUse = d["values"][currCong-1];
					}
					else // We only have one congress, we're good to go.
					{
						var dUse = d;
					}

					clearTimeout(opacityTimer);
					baseToolTip.html(ideologyTooltip(j, dUse));
					if(j == 1)
					{
						try
						{	
							$('#mapTooltip').removeClass().addClass('d3-tip')
									.addClass(partyColorMap[globalPartyColorName]);
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
					baseToolTip
						.style("top", (event.pageY + 32) + "px")
						.style("left", (event.pageX - (parseInt(eW.substr(0, eW.length - 2)) / 2)) + "px");
				})
			})(i, this);
		};

		d3.select(this).selectAll(".dc-tooltip-list .dc-tooltip circle").each(tempFuncOverride);
		d3.select(this).selectAll(".stack-list g.stack path.line").each(tempFuncOverride);
		//d3.select(this).selectAll(".dc-tooltip-list .dc-tooltip path").each(tempFuncOverride);
		i=i+1;
	});
	console.timeEnd("tooltip");

	$("#loading-container").slideUp();
	$("#content").fadeIn();

	var initialCong = maxCong; //(maxCong==max)?max:0;
	$.ajax({
		dataType: "JSON",
		url: "/api/getmembersbyparty?id="+party_param+"&congress="+initialCong+"&api=Web_Party",
		success: function(data, status, xhr)
		{
			resultCache = data;
			writeBioTable(["name", "state", "chamber", "elected"]);
		}
	});

    });

function fadeStates(c)
{
	var currentYear = congYear(currCong);
	var baseSVG = d3.select("div#party-map-chart svg"); //c.svg();
	for(var i=0;i!=baseSVG.selectAll("g.layer1 g.state")[0].length;i++)
	{
		if(currentYear[0]>=mapTopo[i].properties["STARTYEAR"] && currentYear[1]<=mapTopo[i].properties["ENDYEAR"])
		{
			baseSVG.select("g.layer1").select("g:nth-child("+(i+1)+")").select("path").attr("opacity",1).style("pointer-events","auto");
		}
		else
		{
			baseSVG.select("g.layer1").select("g:nth-child("+(i+1)+")").select("path").attr("opacity",0).style("pointer-events","none");

		}
	}
	baseSVG.select("g.layer0").select("g").select("path").attr("opacity", 1).attr("stroke", "#666666").attr("opacity", 0.3);
}

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

	toggleMapSupport(groupSel);
	currCong=num;
	if(!inLoop)
	{
		$.ajax({
			dataType: "JSON",
			url: "/api/getmembersbyparty?id="+party_param+"&congress="+currCong+"&api=Web_Party",
			success: function(data, status, xhr)
			{
				resultCache = data;
				writeBioTable();
			}
		});
	}
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
	// Set this to 1 to not loop.
	var PREVENTLOOPBEHAVIOUR = 1;


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

	// Loop on.
	if(!PREVENTLOOPBEHAVIOUR || currCong!=maxCong) playLoop = setTimeout(playLoopIteration, delay);
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

	$.ajax({
		dataType: "JSON",
		url: "/api/getmembersbyparty?id="+party_param+"&congress="+currCong+"&api=Web_Party",
		success: function(data, status, xhr)
		{
			resultCache = data;
			writeBioTable();
		}
	});
}
