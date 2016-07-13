'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer,queue */

var dimChart = dc.compositeChart("#dim-chart");

var q = queue()
    .defer(d3.json, "/static/partyjson/parties.json")
    .defer(d3.json, "/static/partyjson/grand.json");

q
    .await(function(error, parties, grand) {	
	d3.select("#content").style("display", "block");

	var min = 1;
	var max = 114;	

	// Which parties are "major"?
	var partyList = [];
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

		dimChart
		    .width(1160)
		    .height(400)
		    .dimension(congressDimension)
		    //.elasticX(true)
		    .brushOn(false)
		    .shareTitle(false)
        	    .x(d3.scale.linear().domain([1, 115]))
		    .y(d3.scale.linear().domain([-0.6,0.7]))
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
			dc.lineChart(dimChart).group(dimSet[dimSet.length-1]).colors(["#D3D3D3"]).defined(function(d) { return d.y>-900; }).interpolate("basis")
		    ]);

		dc.renderAll();
	
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
		var minCong = parties[i][1]["minCongress"];
		var maxCong = parties[i][1]["maxCongress"];
		var textLabel = "Active ";
		if(minCong==maxCong) { textLabel += "in the "+minCong+"th Congress"; }
		else if(maxCong==114) { textLabel += "from the "+minCong+"th Congress onwards"; }
		else { textLabel += "from the "+minCong+"th Congress until the "+maxCong+"th Congress"; }
		var pName = $("<div></div>").addClass('col-md-3').addClass("memberResultBox")
					    .data('partyID',partyID).click(function() { window.location='/parties/'+$(this).data('partyID'); });

		if(j==0) // Major current party with logo
		{
			var imgBox = $("<img />").css("width","100px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
					.attr("src","/static/img/parties/"+partyID+".png");
			imgBox.appendTo(pName);
		}

		var partyName = (parties[i][1]["name"] == "American") ? "American (\"Know-Nothing\")": parties[i][1]["name"] ;
		var bioBox = $("<span></span>").html("<strong>"+partyName+"</strong><br/>"+textLabel+"<br/><br/>");
		bioBox.appendTo(pName);
		pName.appendTo($("#partySet"));
	}
		
    });
