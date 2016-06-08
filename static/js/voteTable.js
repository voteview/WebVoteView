function outVotes(groupBy="party")
{
	// Check that we're grouping by something valid.
	if(["party", "vote", "stateLong"].indexOf(groupBy)==-1) { groupBy = "party"; }
	// Pull out every filtered bit of data.
	var filteredVotes = globalPartyDimension.top(Infinity);
	var groupings = {};

	// Iterate through the people, adding them to a dict of arrays by party
	var lastNames = []
	var dedupeLastNames = []
	for(var i=0;i!=filteredVotes.length;i++)
	{
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
		var voteSubset = {
			"party": filteredVotes[i]["party"], 
			"vote": filteredVotes[i]["vote"], 
			"stateLong": filteredVotes[i]["stateLong"],
			"state": filteredVotes[i]["state"],
			"id": filteredVotes[i]["id"]
		};
		var lastName = filteredVotes[i]["name"].split(",")[0];
		if(dedupeLastNames.indexOf(lastName)!=-1) { voteSubset["name"] = filteredVotes[i]["name"].split(" ").slice(0,2).join(" "); }
		else { voteSubset["name"] = lastName; }
		if(groupings[filteredVotes[i][groupBy]] != undefined) {groupings[filteredVotes[i][groupBy]].push(voteSubset); }
		else { groupings[filteredVotes[i][groupBy]] = [voteSubset]; }
	}

	// Output table
	var sortedKeys = Object.keys(groupings).sort();
	var baseList = $("<ul></ul>").css("columns","4").css("list-style-type","none").css("overflow-x","hidden").addClass("voteTable");
	
	var rowCount=0;
	var i=0; var colCount=0;
	for(var key in sortedKeys)
	{
		// Sort everyone by name within whatever the primary sort is
		groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(function(a,b){return a["name"] < b["name"] ? -1 : (a["name"] > b["name"] ? 1 : 0);});

		// Add spacers before the next category
		if(i && groupBy!="state") { $("<li>&nbsp;</li>").css("padding-bottom","5px").appendTo(baseList); }
		
		// Category header
		var partyLabel = $("<li></li>").css("padding-bottom","5px");
		var headerLabel = sortedKeys[key];
		if(headerLabel=="Abs") { headerLabel="Absent"; }
		$("<strong>"+headerLabel+"</strong>").css("text-decoration","underline").appendTo(partyLabel);
		partyLabel.appendTo(baseList);

		// Loop through everything in the category
		for(var j in groupings[sortedKeys[key]])
		{
			var person = groupings[sortedKeys[key]][j];
			var outLabel = "";
			// Text label vary by facet
			if(groupBy=="party") outLabel = person["name"]+" ("+person["state"]+") ";
			else if(groupBy=="stateLong") outLabel = person["name"]+" ("+person["party"].substr(0,1)+") ";
			else outLabel = person["name"]+" ("+person["party"].substr(0,1) + "-" +person["state"] + ")";
			
			// Style and assemble list item
			var li = $("<li></li>").css("padding-bottom","5px");
			var span = $("<span></span>").css("background-color","white").css("padding-right","5px");
			$("<a></a>").attr("href","/person/"+person["id"])
					.html(outLabel).appendTo(span);
			span.appendTo(li);

			// If we're not grouping on vote, right-float vote and class the LI to use the dot leaders.
			if(groupBy!="vote") 
			{ 
				$("<span>"+person["vote"]+"</span>").css("background-color","white").css("float","right").css("padding-right","40px").appendTo(li); 
				li.addClass("dotted");
			}
			li.appendTo(baseList);
		}
		i=i+1;
	}
	$("#voteList").html(baseList);
}
