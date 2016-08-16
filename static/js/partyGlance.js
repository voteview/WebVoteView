'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

var eW=0; var eH=0;
var globalParties = [];
var partyList = [];
var opacityTimer;
function tooltipText(party, d)
{
	var result = getGetOrdinal(d.x)+" Congress &gt; ";
	if(party<partyList.length) // One of the major parties
	{
		result = result+"<strong>"+globalParties[party][1]["name"]+" Party</strong>";
	}
	else
	{
		result = result+"<strong>Congressional Median (Midpoint)</strong>";
	}
	result = result+"<br/><br/><em>Median Ideology Score</em>: "+(Math.round(d.y*100)/100);
	result = result+"<br/><br/><em>How to interpret Ideology scores:</em><br/>These scores show how liberal or conservative a party is on a scale from -1 (Very Liberal) to +1 (Very Conservative). The scores provided are the median--mid-point--member of each party across both the House of Representative and the Senate.";
	if(party>=partyList.length)
	{
		result = result+"<br/><br/>The Congressional Median is unstable (swings back and forth) as control of the House and Senate change.";
	}
	return(result);
}

var dimChart = dc.compositeChart("#dim-chart");

var q = queue()
    .defer(d3.json, "/static/partyjson/parties.json")
    .defer(d3.json, "/static/partyjson/grand.json");

q
    .await(function(error, parties, grand) {
	globalParties = parties;	
	d3.select("#content").style("display", "block");
	var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip").attr("id","mapTooltip").style("visibility","hidden");
	var min = 1;
	var max = 114;	

	// Which parties are "major"?
	var z = queue();
	for(var i=0;i!=parties.length;i++)
	{
		if(parties[i][1]["count"]<100) { break;}
		partyList.push(parties[i][0]);
		z.defer(d3.json, "/static/partyjson/"+parties[i][0]+".json");
	}

	// Load all the major parties
	z.awaitAll(function(error, partySet) {
		// Append each party's median to the grand median so we have a set of medians for every congress.
		grand.forEach(function (d) {
			d.congressMedian = d.grandMedian;
			d.pMedians = [];
			for(var j=0; j!=partySet.length; j++)
			{
				var match = partySet[j].filter(function(dMatch) { return +dMatch.congress === d.congress; });
				if(match[0] !== undefined) { d.pMedians.push(+match[0].grandMedian); }
				else { d.pMedians.push(-999); }
			}
		});
	
		// Construct DC dimensions
	        var ndx = crossfilter(grand); 
	
		var congressDimension = ndx.dimension(function (d) {
		    return d.congress;
		});
	
		// Grand Median
		var dimSet = [];
		// Each party median
		var compSet = [];
		for(var k=0;k!=partySet.length;k++)
		{
			// First add to the group set -- hack to force evaluation of k.
			dimSet.push(congressDimension.group().reduceSum(new Function("d", "return d.pMedians["+k+"];")));

			// Then add to the line compositor
		}
		dimSet.push(congressDimension.group().reduceSum(function (d) { return d.congressMedian; }));
	
		// Make the chart.
		var tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d; });

		// Hack to get around singleton bug
		function keyHack(d) { return d.key; }
		function valHack(d) { return d.value; }
		function colHack(d) { return 0; }

		dimChart
		    .width(1160)
		    .height(400)
		    .dimension(congressDimension)
		    //.elasticX(true)
		    .brushOn(false)
		    .shareTitle(false)
		    .renderTitle(false)
		    .x(d3.scale.linear().domain([1, 115]))
		    .y(d3.scale.linear().domain([-0.6,0.7]))
		    .margins({top: 0, right: 50, bottom: 50, left: 50})
		    .compose([
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
			dc.scatterPlot(dimChart).group(dimSet[10])
						.colors([colorSchemes[partyColorMap[partyNameSimplify(parties[10][1]["name"])]][0]])
						.colorAccessor(colHack).keyAccessor(keyHack).valueAccessor(valHack).symbolSize(4),
			//dc.lineChart(dimChart).group(dimSet[10]).colors([colorSchemes[partyColorMap[partyNameSimplify(parties[10][1]["name"])]][0]]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
			dc.lineChart(dimChart).group(dimSet[dimSet.length-1]).colors(["#D3D3D3"]).defined(function(d) { return d.y>-900; }).interpolate("basis")

		    ])
		    .xAxisLabel("Year").yAxisLabel("Liberal - Conservative Ideology")
		    .xAxis().tickValues([6, 16, 26, 36, 46, 56, 66, 76, 86, 96, 106, 111]).tickFormat(function(v) { return (1787 + 2*v)+1; });

		dc.renderAll();

		var i=0;
		// Populating the tooltip.
		d3.select(".dc-chart svg").selectAll("g.sub").each(function()
		{
			var tempFuncOverride = function(d)
			{
				(function(j, obj)
				{
					console.log("in 2");
					console.log(obj);
					d3.select(obj).on("mouseover",function(d)
					{
						clearTimeout(opacityTimer);
						baseToolTip.html(tooltipText(j, d));
						if(j<partyList.length)
						{
							try
							{
								baseToolTip.style("border-left","3px solid "+colorSchemes[partyColorMap[partyNameSimplify(parties[j][1]["name"])]][0]);
							} catch(err) { }
						}
						else
						{
							baseToolTip.style("border-left","");
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
							window.location="/parties/"+parties[j][0];
						} 
					});
				})(i, this);
			};

			d3.select(this).selectAll(".dc-tooltip-list .dc-tooltip circle").each(tempFuncOverride);
			//d3.select(this).selectAll(".stack-list g.stack path.line").each(tempFuncOverride);
			//d3.select(this).selectAll(".dc-tooltip-list .dc-tooltip path").each(tempFuncOverride);
			i=i+1;
		});

		$("#loading-container").delay(200).slideUp();

	});

	var j=0;
	for(var i=0;i!=parties.length;i++)
	{
		// Breaks between Major, Historical Major, and Historical Minor Parties
		if(i==0)
		{
			var majParty = $("<div></div>").css("clear","both").css("padding-bottom","10px").html("<big>Today's Parties</big>");
			majParty.appendTo($("#partySet"));
		}
		if(parties[i][1]["count"]<5000 && j==0)
		{
			var majParty = $("<div></div>").css("clear","both").css("padding-top","10px").css("padding-bottom","10px").html("<big>Historical Major Parties</big>");
			majParty.appendTo($("#partySet"));
			j=1;
		}
		if(parties[i][1]["count"]<100 && j==1)
		{
			var minParty = $("<div></div>").css("clear","both").css("padding-top","10px").css("padding-bottom","10px").html("<big>Historical Minor Parties</big>");
			minParty.appendTo($("#partySet"));
			j=2;
		}

		// Construct the Original Text Stuff
		var partyID = parties[i][0];
		if(partyID==328) { continue; }
		var minCong = parties[i][1]["minCongress"];
		var maxCong = parties[i][1]["maxCongress"];
		var textLabel = "Active ";
		if(minCong==maxCong) { textLabel += "in the "+getGetOrdinal(minCong)+" Congress"; }
		else if(maxCong==114) { textLabel += "from the "+getGetOrdinal(minCong)+" Congress onwards"; }
		else { textLabel += "from the "+getGetOrdinal(minCong)+" Congress until the "+getGetOrdinal(maxCong)+" Congress"; }
		try
		{
			var pColor = colorSchemes[partyColorMap[partyNameSimplify(parties[i][1]["name"])]][0];
		}
		catch(err)
		{
			var pColor = "#FFFFFF";
		}
		var pName = $("<div></div>").addClass('col-md-3').addClass("memberResultBox").css("border-left","3px solid "+pColor)
					    .data('partyID',partyID).click(function() { window.location='/parties/'+$(this).data('partyID'); });

		if(j==0) // Major current party with logo
		{
			var imgBox = $("<img />").css("width","100px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
					.attr("src","/static/img/parties/"+partyID+".png");
			imgBox.appendTo(pName);
		}

		var partyName = (parties[i][1]["name"] == "American") ? "American (\"Know-Nothing\")": (parties[i][1]["name"] == "Democrat") ? "Democratic" : parties[i][1]["name"] ;
		var bioBox = $("<span></span>").html("<strong>"+partyName+" Party</strong><br/>"+textLabel+"<br/><br/>");
		bioBox.appendTo(pName);
		pName.appendTo($("#partySet"));
	}
		
    });
