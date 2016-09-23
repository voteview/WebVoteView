
function outVotes(groupBy)
{
	// Check that we're grouping by something valid.
	if(["party", "vote", "state", "x", "prob"].indexOf(groupBy)==-1) { groupBy = "party"; }
	// Pull out every filtered bit of data.
	var filteredVotes = globalPartyDimension.top(Infinity);
	var groupings = {};

	// Iterate through the people, adding them to a dict of arrays by party
	var lastNames = []
	var dedupeLastNames = []
	for(var i=0;i!=filteredVotes.length;i++)
	{
		if(filteredVotes[i]["name"]==undefined) { console.log(filteredVotes[i]); continue; }

		var lastName = filteredVotes[i]["name"].split(",")[0];

		if(lastNames.indexOf(lastName)==-1)
		{
			lastNames.push(lastName);
		}
		else
		{
			dedupeLastNames.push(lastName);
		}
	}

	for(var i=0;i!=filteredVotes.length;i++)
	{
		if(filteredVotes[i]["name"] == undefined) { continue; }
		var voteSubset = {
			"party": filteredVotes[i]["party"], 
			"vote": filteredVotes[i]["vote"],
			"state": filteredVotes[i]["state"],
			"id": filteredVotes[i]["id"],
			"x": parseFloat(filteredVotes[i]["x"])
		};
		if(filteredVotes[i]["prob"] != undefined) { voteSubset["prob"] = filteredVotes[i]["prob"]; }
		var lastName = filteredVotes[i]["name"].split(",")[0];
		if(dedupeLastNames.indexOf(lastName)!=-1) { voteSubset["name"] = filteredVotes[i]["name"].split(" ").slice(0,2).join(" "); }
		else { voteSubset["name"] = lastName; }
		if(groupBy=="prob") {
			var key = "Voted";
			if(voteSubset["vote"] == "Abs") { key = "Absent (Least to Most Likely Yea)";}
			if(groupings[key] != undefined) { groupings[key].push(voteSubset); }
			else { groupings[key] = [voteSubset]; }
		}
		else {
			if(groupings[filteredVotes[i][groupBy]] != undefined) {groupings[filteredVotes[i][groupBy]].push(voteSubset); }
			else { groupings[filteredVotes[i][groupBy]] = [voteSubset]; }
		}
	}
	console.log(groupings);
	// Output table
	function numSort(a, b) { return a-b; }
	if(groupBy=="x") { var sortedKeys = Object.keys(groupings).sort(numSort); }
	else if(groupBy=="prob" || groupBy == "vote") { var sortedKeys = Object.keys(groupings).sort().reverse(); }
	else { var sortedKeys = Object.keys(groupings).sort(); }
	var baseList = $("<ul></ul>").css("columns","4").css("list-style-type","none").css("overflow","auto").css("width","100%").addClass("voteTable");
	
	var rowCount=0;
	var i=0; var colCount=0;

	if(groupBy=="x" || groupBy=="prob")
	{
		var partyLabel = $("<li></li>").css("padding-bottom","5px");
		if(groupBy=="x") $("<strong>Most Liberal</strong> <span class='glyphicon glyphicon-arrow-down'></span>").appendTo(partyLabel);
		if(groupBy=="prob") $("<strong>Most Unlikely</strong> <span class='glyphicon glyphicon-arrow-down'></span>").appendTo(partyLabel);
		partyLabel.appendTo(baseList);
	}

	for(var key in sortedKeys)
	{
		// Sort everyone by name within whatever the primary sort is
		if(groupBy!="prob") { groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(function(a,b){return a["name"] < b["name"] ? -1 : (a["name"] > b["name"] ? 1 : 0);}); }
		else { groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(function(a,b){return numSort(a["prob"], b["prob"]); }); }
			
		// Add spacers before the next category
		if(i && groupBy!="state" && groupBy!="x") { $("<li>&nbsp;</li>").css("padding-bottom","5px").appendTo(baseList); }
		console.log(groupBy);
		// Category header
		var partyLabel = $("<li></li>").css("padding-bottom","5px");
		var headerLabel = sortedKeys[key];
		if(headerLabel=="Abs") { headerLabel="Absent"; }
		if(groupBy=="state") { headerLabel = stateMap[headerLabel]; }
		if(groupBy!="x" && sortedKeys[key] != "Voted")
		{
			$("<strong>"+headerLabel+"</strong>").css("text-decoration","underline").appendTo(partyLabel);
			partyLabel.appendTo(baseList);
		}

		// Loop through everything in the category
		for(var j in groupings[sortedKeys[key]])
		{
			var person = groupings[sortedKeys[key]][j];
			var outLabel = "";
			// Text label vary by facet
			if(groupBy=="party") outLabel = person["name"]+" ("+person["state"]+") ";
			else if(groupBy=="state") outLabel = person["name"]+" ("+person["party"].substr(0,1)+") ";
			else outLabel = person["name"]+" ("+person["party"].substr(0,1) + "-" +person["state"] + ")";
			
			// Style and assemble list item
			var li = $("<li></li>").css("display","inline-block").css("width","100%").css("padding-bottom","5px");
			var span = $("<span></span>").css("background-color","white").css("padding-right","5px");
			$("<a></a>").attr("href","/person/"+person["id"])
					.html(outLabel).appendTo(span);
			span.appendTo(li);

			// If we're not grouping on vote, right-float vote and class the LI to use the dot leaders.
			if(groupBy!="vote") 
			{ 
				var addVote = $("<span>"+person["vote"]+"</span>").css("background-color","white").css("float","right").css("padding-right","40px")
				if(person["prob"]!=undefined && parseInt(person["prob"])<25 && sortedKeys[key] == "Voted") { addVote.css("color","red"); }
				addVote.appendTo(li); 
				li.addClass("dotted");
			}
			li.appendTo(baseList);
		}

		if(sortedKeys[key] == "Voted" && groupBy=="prob")
		{
			var partyLabel = $("<li></li>").css("padding-bottom","5px");
			$("<strong>Most Likely</strong> <span class='glyphicon glyphicon-arrow-up'></span>").appendTo(partyLabel);
			partyLabel.appendTo(baseList);

		}

		i=i+1;
	}

	if(groupBy=="x")
	{
		var partyLabel = $("<li></li>").css("padding-bottom","5px");
		$("<strong>Most Conservative</strong> <span class='glyphicon glyphicon-arrow-up'></span>").appendTo(partyLabel);
		partyLabel.appendTo(baseList);
	}

	$("#voteList").html(baseList);
}
