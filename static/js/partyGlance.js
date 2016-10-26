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
		result = result+"<strong>"+globalParties[party][1]["fullName"]+"</strong>";
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

console.time("beginPageLoad");

var dimChart = dc.compositeChart("#dim-chart");

var q = queue()
    .defer(d3.json, "/static/partyjson/parties.json")
    .defer(d3.json, "/static/partyjson/glance.json")
    .defer(d3.json, "/static/config.json");

q
    .await(function(error, parties, glance, configFile) {
	// Parties is the full party list, sorted by size bracket, then old to new, then A-Z.
	globalParties = parties;	

	console.timeEnd("beginPageLoad");
	console.time("processData");

	// Check if user has dismissed the alert.
	var hasCookie = Cookies.get('alertPartiesGlance');
	if(hasCookie != undefined) { $('#alertPartiesGlance').hide(); }

	var baseToolTip = d3.select("body").append("div").attr("class", "d3-tip").attr("id","mapTooltip").style("visibility","hidden");
	var min = 1;
	var max = configFile["maxCongress"];	

	// Take the "glance" file and break it into the grand file and the party files.
	var grand;
	var partySet = [];
	$.each(glance,function(p, o)
	{
		if(p=="grand") { grand = o; }
		else 
		{ 
			partySet.push(o); 
		}
	});

	partySet.sort(function(a,b){
		var aTotal = 0, bTotal = 0;
		$.each(a,function(i, o) { aTotal += o["nMembers"]; });
		$.each(b,function(i, o) { bTotal += o["nMembers"]; });
		return bTotal - aTotal;
	});

	var cutoff = 143;
	var tempParties = parties;
	tempParties.sort(function(a,b){ return b[1]["count"] - a[1]["count"]; });
	$.each(tempParties, function(ip, op) { if(op[1]["count"]>=cutoff) { partyList.push(op[1]); } else { return false; }});
	var numQualifyingParties = partyList.length;
	console.log(partyList);

	// Append each party's median to the grand median so we have a set of medians for every congress.
	var memSetScatter = [];
	grand.forEach(function (d) {
		d.congressMedian = d.grandMedian;
		d.pMedians = [];
		for(var j=0; j!=partySet.length; j++)
		{
			var match = partySet[j].filter(function(dMatch) { return +dMatch.congress === d.congress; });
			if(match[0] !== undefined && match[0].grandSet !== undefined)
			{ 
				d.pMedians.push(+match[0].grandMedian); 
				for(var k=0;k<match[0].grandSet.length;k+=1)
				{
					memSetScatter.push({"x": d.congress, "y": match[0].grandSet[k], "p": j});
				}
			}
			else { d.pMedians.push(-999); }
		}
	});

	console.timeEnd("processData");
	console.time("DCDimensions");
	// Construct DC dimensions
	var ndx = crossfilter(grand); 
	
	var congressDimension = ndx.dimension(function (d) {
		return d.congress;
	});

	// For the scatter plot
	var scatterDX = crossfilter(memSetScatter);
	var scatterDimension = scatterDX.dimension(function(d) { return [+d.x, +d.y, +d.p];});
	var scatterGroup = scatterDimension.group();
	
	var dimSet = [];
	// Each party median
	var compSet = [];
	for(var k=0;k!=partySet.length;k++)
	{
		// First add to the group set -- hack to force evaluation of k.
		dimSet.push(congressDimension.group().reduceSum(new Function("d", "return d.pMedians["+k+"];")));
	}
	// Grand Median
	dimSet.push(congressDimension.group().reduceSum(function (d) { return d.congressMedian; }));
	console.timeEnd("DCDimensions");

	// Make the chart.
	console.time("DCChart")
	var tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d; });

	// Hack to get around singleton bug
	function keyHack(d) { return d.key; }
	function valHack(d) { return d.value; }
	function colHack(d) { return 0; }
	function scatterCol(d) { return d.key[2]; }
	var fullColSet = [];
	for(var i=0;i!=numQualifyingParties;i++)
	{
		fullColSet.push(colorSchemes[partyColorMap[partyNameSimplify(parties[i][1]["name"])]][1]);
	}

	// Set up the x-axis ticks. What we want is a tick every 20 years (congresses ending
	// in 6). Our last tick should be every 10 (congresses ending in 1) if necessary. 
	var xAxisTickValues = [];
	for(var tickCtr = 6; tickCtr<max;tickCtr+=10) { xAxisTickValues.push(tickCtr); }
	if(max-xAxisTickValues[xAxisTickValues.length-1]>5) xAxisTickValues.push(xAxisTickValues[xAxisTickValues.length-1]+5);

	dimChart
	    .width(1160)
	    .height(400)
	    .dimension(congressDimension)
	    //.elasticX(true)
	    .brushOn(false)
	    .shareTitle(false)
	    .renderTitle(false)
	    .x(d3.scale.linear().domain([1, max+1]))
	    .y(d3.scale.linear().domain([-0.6,0.7]))
	    .margins({top: 0, right: 50, bottom: 50, left: 50})
	    .compose([
		dc.scatterPlot(dimChart).group(scatterGroup).colors(function(d){return fullColSet[d];}).colorAccessor(scatterCol).symbolSize(4),
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
		//dc.scatterPlot(dimChart).group(dimSet[10])
		//			.colors([colorSchemes[partyColorMap[partyNameSimplify(parties[10][1]["name"])]][0]])
		//			.colorAccessor(colHack).keyAccessor(keyHack).valueAccessor(valHack).symbolSize(5),
		dc.lineChart(dimChart).group(dimSet[dimSet.length-1]).colors(["#D3D3D3"]).defined(function(d) { return d.y>-900; }).interpolate("basis"),
	    ])
	    .on('postRender', function() { d3.select(".dc-chart svg").select("g.sub").selectAll("path.symbol").attr('opacity','0.5'); })
	    .xAxisLabel("Year").yAxisLabel("Liberal - Conservative Ideology")
	    .xAxis().tickValues(xAxisTickValues).tickFormat(function(v) { return (1787 + 2*v)+1; });
	console.timeEnd("DCChart")
	console.time("DCRender");
	dc.renderAll();
	console.timeEnd("DCRender");

	var i=0;

	// Populating the tooltip.
	console.time("tooltip");
	d3.select(".dc-chart svg").selectAll("g.sub").each(function()
	{
		var tempFuncOverride = function(d)
		{
			(function(j, obj)
			{
				j=j-1 // To compensate for the fact that the first group is the scatterplot, not the line charts.
				d3.select(obj).attr('r',10);
				d3.select(obj).on("mouseover",function(d)
				{
					clearTimeout(opacityTimer);
					baseToolTip.html(tooltipText(j, d));
					if(j<partyList.length)
					{
						try
						{	
							$('#mapTooltip').removeClass().addClass('d3-tip')
									.addClass(partyColorMap[partyNameSimplify(parties[j][1]["name"])])
							console.log($('#mapTooltip').attr('class'));
						} catch(err) { console.log(err); }
					}
					else
					{
						$('mapTooltip').removeClass().addClass('d3-tip');
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
	console.timeEnd("tooltip");

	$("#loading-container").delay(200).slideUp(100);
	$("#content").fadeIn();

	console.time("partyList");
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
		if(partyID==328) { continue; } // Hack to exclude independents?
		var minCong = parties[i][1]["minCongress"];
		var maxCong = parties[i][1]["maxCongress"];
		var textLabel = "Active ";
		if(minCong==maxCong) { textLabel += "in the "+getGetOrdinal(minCong)+" Congress"; }
		else if(maxCong>=max) { textLabel += "from the "+getGetOrdinal(minCong)+" Congress onwards"; }
		else { textLabel += "from the "+getGetOrdinal(minCong)+" Congress until the "+getGetOrdinal(maxCong)+" Congress"; }
		try { var partyColorScheme = partyColorMap[partyNameSimplify(parties[i][1]["name"])];}
		catch(e) { var partyColorScheme = "grey"; }

		var pName = $("<div></div>").addClass('col-md-3').addClass("memberResultBox").addClass(partyColorScheme)
						.data('partyID',partyID);
		var linkBox = $("<a></a>").attr("class","nohover").attr("href","/parties/"+partyID);

		if(j==0) // Major current party with logo
		{
			var imgBox = $("<img />").css("width","100px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
					.attr("src","/static/img/parties/"+partyID+".png");
			imgBox.appendTo(pName);
		}

		var partyName = parties[i][1]["fullName"] 
		var bioBox = $("<span></span>").html("<strong>"+partyName+"</strong><br/>"+textLabel+"<br/><br/>");
		bioBox.appendTo(pName);
		pName.appendTo(linkBox);
		linkBox.appendTo($("#partySet"));
	}
	console.timeEnd("partyList");
    });


$('#toggleAlert').click(function()
{
        if($('#alertPartiesGlance').is(':hidden')) { $('#alertPartiesGlance').show(); }
        else { $('#alertPartiesGlance').hide(); }
});
$('#closeAlert').click(function(e)
{
        if($('#alertPartiesGlance').is(':hidden')) { $('#alertPartiesGlance').show(); }
        else { $('#alertPartiesGlance').hide(); }
	Cookies.set(e.currentTarget.parentElement.id, '1', {expires: 7});
});
