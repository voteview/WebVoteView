// Use this to extract offsets from vote party chart in order to insert category labels.
function splitTranslate(text)
{
	return(parseInt(text.split(",")[1].split(")")[0]));
}

// Update vote party chart in order to insert category labels.
function updateVoteChart() 
{
	return;
	var voteChartSVG = $("#party-chart > svg");
	if(d3.selectAll("#party-chart > svg > g >g.label").length)
	{
		d3.selectAll("#party-chart > svg > g > g.label").remove();	
	}

	var scanFor = ["Yea", "Nay", "Abs", "NA end"];
	var scanMap = ["Voting Yea", "Voting Nay", "Absent", ""];
	var scanIndex = 0;
	var translateAdj = 0;
	var newMax = 0;
	voteChartSVG.children("g").children("g").each(function(index, item) {
		var tChildren = $(this).children("title").text();
		if(tChildren.length && tChildren.startsWith(scanFor[scanIndex]))
		{
			var currentTranslate = splitTranslate($(this).attr("transform")) + translateAdj;
			d3.select("#party-chart > svg > g").insert("g")
				.attr("class","label").attr("transform","translate(0,"+currentTranslate+")")
				.append("text").attr("font-size","12px").attr("x","6").attr("y","12").attr("dy","0.35em").html(scanMap[scanIndex]);
			translateAdj = translateAdj+34;
			scanIndex=scanIndex+1;
		}
		if($(this).attr("class")!="label")
		{
			newMax = splitTranslate($(this).attr("transform"))+translateAdj;
			$(this).attr("transform","translate(0,"+newMax+")");
		}
	});

	voteChartSVG.children("g").children(".axis").attr("transform","translate(0,"+(newMax+34)+")");
	voteChartSVG.attr("height",(newMax+68));
	return 0;
}
