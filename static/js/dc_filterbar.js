// Poll Filter: Basically, use DC's on filtered method to call this function when a filter changes.
function pollFilters(chart, filter)
{
	// Because this runs before the filters are applied, we delay it.
	// We can try directly accessing the filters through the .filters() method if we must avoid this.
	updateVoteChart();
	setTimeout(pollFilters2, 1);
	outVotes();
}

function pollFilters2()
{
	zoomCSS();

	// Proper diction for text
	if(chamber=="House")
	{
		var districtName = "districts";
		var voterName = "representatives";
	}
	else
	{
		var districtName = "states";
		var voterName = "senators";
	}
	$("#votertype").text(voterName);

	var baseFilters = 0;

	// Filters for map unit selection
	
	var mapFilter = $("#suppressMapControls > .filter").text();
	if(mapFilter.length)
	{
		// Collapse the text, it's too long
		if(mapFilter.length>20)
		{
			var selectCount = (mapFilter.match(/,/g) || []).length;
			mapFilter = mapFilter.split(", ")[0] + " and "+(selectCount-1)+" other "+districtName;
		}
		$("#map-chart-controls > .filter").text(mapFilter);
		$("#map-chart-controls").show();
		baseFilters = baseFilters+1;
	}
	else
	{
		$("#map-chart-controls").hide();
	}

	// Filters for party/vote selection
	var voteFilter = $("#suppressVoteChartControls > .filter").text();
	if(voteFilter.length)
	{
		var selected = voteFilter.split(", ");
		var newDict = {};
		// Rewrite into Party->Vote dict for sentence construction.
		for(var i=0;i!=selected.length;i++)
		{
			var vote = selected[i].substr(0,3);
			var party = selected[i].substr(3);
			if(newDict[party] != undefined)
			{
				newDict[party].push(vote);
			}
			else
			{
				newDict[party] = [vote];
			}
		}

		var baseString = "";
		var p=0;
		for(var party in newDict)
		{
			var pString = "";
			if(p) { baseString+= "; "; }
			pString += party+"s voting ";
			var z=0;
			for(var voteType in newDict[party])
			{
				if(z && z+1==newDict[party].length) { pString += ", and "; }
				else if(z) { pString += ", "; }
				pString += newDict[party][voteType];
				z+=1;
			}
			if(z==3) pString = party+"s voting";
			baseString += pString;
			p+=1;
		}
		$("#vote-chart-controls > .filter").text(baseString);
		$("#vote-chart-controls").show();
		baseFilters=baseFilters+1;
	}
	else
	{
		$("#vote-chart-controls").hide();
	}

	// Filters for NOMINATE selection
	var nominateFilter = $("#suppressNominateControls > .filter").text();
	if(nominateFilter.length)
	{
		// Round coordinates to 2 sig figs.
		var coordSets = nominateFilter.split(" -> ");
		var initXY = coordSets[0].split(",");
		var endXY = coordSets[1].split(",");
		initXY[0] = parseFloat(initXY[0].substr(1)).toPrecision(2);
		initXY[1] = parseFloat(initXY[1]).toPrecision(2);
		endXY[0] = parseFloat(endXY[0].substr(0,endXY[0].length-1)).toPrecision(2);
		endXY[1] = parseFloat(endXY[1]).toPrecision(2);
		var resultText = "("+initXY[0]+", "+initXY[1]+") to ("+endXY[0]+", "+endXY[1]+")";
		$("#nominate-chart-controls > .filter").text(resultText);
		$("#nominate-chart-controls").show();
		baseFilters=baseFilters+1;
	}
	else
	{
		$("#nominate-chart-controls").hide();
	}

	var filteredVotes = globalPartyDimension.top(Infinity);
	if(filteredVotes.length==1)
	{
		var splitNames = filteredVotes[0]["name"].split(", ");
		var recoveredName = splitNames[1]+" "+splitNames[0]
		$("#sparse-selection").html("Selected: "+recoveredName).show();
	}
	else
	{
		$("#sparse-selection").html("").hide();
	}

	// Hide or show the full bar.
	if(baseFilters)
	{
		$("#selectionFilterBar").slideDown(300,function()
		{
			$("#selectionFilterClose").fadeIn(200);
		});
	}
	else
	{
		$("#selectionFilterClose").fadeOut(100,function()
		{
			$("#selectionFilterBar").slideUp(300);
		});
	}
}
