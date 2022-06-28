var baseTipVoter = d3.select("body")
	.append("div")
	.attr("class", "d3-tip")
	.attr("id", "voterTooltip");

function outVotes(groupBy)
{
	// Check that we're grouping by something valid and set it if not.
	groupBy =
		(groupBy == "state") ? "state_abbrev" :
		!["party", "vote", "state", "x", "prob"].includes(groupBy) ? "party" :
		groupBy;

	// Pull out every filtered bit of data.
	var filteredVotes = globalPartyDimension.top(Infinity);
	var groupings = {};

	// Which people have same last name, so we know to de-dupe those.
	const nameCounts = filteredVotes.reduce((acc, value) => {
		if(typeof votes["name"] === undefined) { return acc; }
		const lastName = votes["name"].split(",")[0];
		acc[lastName] = acc[lastName] + 1 || 1;
		return acc;
	})
	// This will give us a list of duplicate last name
	const dedupeLast = Object(nameCounts)
		.elements()
		.map(x => x[1] > 1 ? x[0] : null)
		.filter(x => x != null);


	var errorCount = 0;
	for(var i=0; i != filteredVotes.length; i++)
	{
		if(filteredVotes[i]["name"] == undefined) { continue; }
		var voteSubset = {
			"party": filteredVotes[i]["party"],
			"vote": filteredVotes[i]["vote"],
			"state_abbrev": filteredVotes[i]["state_abbrev"],
			"icpsr": filteredVotes[i]["icpsr"],
			"x": parseFloat(filteredVotes[i]["x"]),
			"fullName": filteredVotes[i]["name"],
			"seo_name": filteredVotes[i]["seo_name"],
		};
		if(filteredVotes[i]["flags"] != undefined) {
			voteSubset["flags"] = filteredVotes[i]["flags"];
		}
		if(filteredVotes[i]["img"] != undefined) {
			voteSubset["img"] = filteredVotes[i]["img"];
		}

		if(groupBy=="x" && isNaN(voteSubset["x"]))
		{
			errorCount += 1;
			continue;
		}
		if(filteredVotes[i]["prob"] != undefined) {
			voteSubset["prob"] = filteredVotes[i]["prob"];
		}
		var lastName = filteredVotes[i]["name"].split(",")[0];
		if(dedupeLastNames.indexOf(lastName)!=-1) {
			voteSubset["name"] = filteredVotes[i]["name"]
				.split(" ")
				.slice(0, 2)
				.join(" ");
		}
		else { voteSubset["name"] = lastName; }
		if(groupBy == "prob") {
			var key = "Voted";
			if(voteSubset["vote"] == "Abs") {
				key = "Not Voting (Least to Most Likely To Vote With Party)";
			}
			if(groupings[key] != undefined) {
				groupings[key].push(voteSubset);
			}
			else {
				groupings[key] = [voteSubset];
			}
		}
		else {
			if(groupings[filteredVotes[i][groupBy]] != undefined) {
				groupings[filteredVotes[i][groupBy]].push(voteSubset);
			}
			else {
				groupings[filteredVotes[i][groupBy]] = [voteSubset];
			}
		}
	}

	// Output table
	function numSort(a, b) { return a - b; }

	if(groupBy == "x") { var sortedKeys = Object.keys(groupings).sort(numSort); }
	else if(groupBy=="prob" || groupBy == "vote") {
		var sortedKeys = Object.keys(groupings).sort().reverse();
	}
	else {
		var sortedKeys = Object.keys(groupings).sort();
	}

	// Hack so when few members are selected it fills down the column
    // alternative is min-height and column-fill, but column-fill auto only
	// works in Firefox
    var listItems = filteredVotes.length + 2 * Object.keys(groupings).length;

	// How many columns?
	// 0-10: 1 column; 11-20: 2 columns; 21-30: 3 columns; 31+ 4 columns
	var columnClass = Math.max(1, Math.min(4, Math.ceil(listItems / 10)));
    var baseList = $("<ul></ul>")
		.addClass("voteTable")
		.addClass(`columns${columnClass}`);

	var rowCount = 0;
	var i = 0;
	var colCount = 0;

	if(["x", "prob"].includes(groupBy))
	{
		var idProbLabel = $("<li></li>");
		if(groupBy=="x") {
			$("<strong>Most Liberal</strong> <span class='glyphicon glyphicon-arrow-down'></span>")
			.appendTo(idProbLabel);
		} else if(groupBy=="prob") {
			$('<strong>Most Unlikely</strong> <span class="glyphicon glyphicon-arrow-down"></span> <br/> <span class="unlikely-vote">Red: Probability < 25%</span>')
			.appendTo(idProbLabel);
		}
		idProbLabel.appendTo(baseList);
	}

 	for(var key in sortedKeys)
	{
		// Sort everyone by name within whatever the sort groupung is.
		if(groupBy != "prob")
		{
			groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(
				function(a, b) {
					return a["name"] < b["name"] ? -1 :
							(a["name"] > b["name"] ? 1 : 0);
				}
			);
		}
		else
		{
			groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(
				function(a, b){
					return numSort(a["prob"], b["prob"]);
				}
			);
		}


		// Add spacers before the next category
		if(i && groupBy != "state_abbrev" && groupBy != "x") {
			$("<li>&nbsp;</li>").appendTo(baseList);
		}

		// Category header
		var partyLabel = $("<li></li>").css("break-before", "auto")
			.css("break-after", "avoid");
		var headerLabel = sortedKeys[key];
		if(headerLabel == "Abs") { headerLabel = "Not Voting"; }
		if(groupBy == "state_abbrev") { headerLabel = stateMap[headerLabel]; }
		if(groupBy != "x" && sortedKeys[key] != "Voted")
		{
			$(`<strong>${headerLabel}</strong>`).appendTo(partyLabel);
			partyLabel.appendTo(baseList);
		}

		// Loop through everything in the category
		for(var j in groupings[sortedKeys[key]])
		{
			var person = groupings[sortedKeys[key]][j];
			var outLabel = "";
			var party_text = person["party"].substr(0, 1);
			// Text label vary by facet
			if(groupBy == "party") outLabel = ` (${person["state_abbrev"]}) `;
			else if(groupBy == "state_abbrev") outLabel = ` (${party_text})`;
			else outLabel = ` (${party_text}-${person["state_abbrev"]})`;

			// Check if the current user is our sponsor.
			var isSponsor = 0;
			if(globalData["rollcalls"][0]["sponsor"] != undefined &&
				person["icpsr"] == globalData["rollcalls"][0]["sponsor"])
			{
				isSponsor = 1;
			}

			// Style and assemble list item
			var li = $("<li></li>").addClass("voter");
			if(j == 0) li.css("break-before", "avoid");
			if(isSponsor) li.addClass("sponsor");
			var span = $("<span></span>");
			// if(isSponsor) span.addClass("sponsor");
			if((person["flags"] != undefined && groupBy == "x") || isSponsor) {
				$("<span>* </span>").addClass("bullet").appendTo(span);
			}

			// Add link to user.
			$("<a></a>")
				.attr("href",`/person/${person["icpsr"]}/${person["seo_name"]}`)
				.html(person["name"])
				.appendTo(span);
			$("<span></span>")
				.addClass("meta")
				.html(outLabel)
				.appendTo(span);
			span.appendTo(li);

			// If we're not grouping on vote, right-float vote and class the
			// LI to use the dot leaders.
			if(groupBy!="vote")
			{
				var p_vote = person["vote"].substr(0, 1);
				var addVote = $("<span>" + p_vote + "</span>").addClass("vote");
				if(person["prob"] != undefined &&
					parseInt(person["prob"]) < 25 &&
					sortedKeys[key] == "Voted") addVote.addClass("bullet");
				addVote.appendTo(li);
				li.addClass("dotted");
			}
			li.appendTo(baseList);

			// Use a closure to assign the current person's data to the tooltip.
			(function(pp)
			{
				li.on("mouseover", function() {
					var baseText = `<strong><u>${pp["fullName"]}</u></strong> (${pp["party"].substr(0, 1)}-${pp["state_abbrev"]})<br/><br/>`;

					if(!isNaN(pp["x"]))
					{
						if(pp["prob"]<25) { var probText = '<span class="unlikely-vote">' + pp["prob"] + '%</span>'; }
						else { var probText = pp["prob"] + "%"; }

						baseText += "<strong>Ideology Score:</strong> "+pp["x"]+"<br/>(<em>DW-NOMINATE First Dimension</em>)<br/><br/>";
					}
					else { baseText += "We do not have a score for this member yet.<br/><br/>"; }


					if(pp["vote"]=="Abs") {
						baseText += "<strong>Not Voting</strong>.";
						if(pp["prob"]!=undefined) { baseText += "If "+pp["name"]+" had voted, we predict they would vote with their party with "+probText+" probability.<br/>"; }
					}
					else
					{
						baseText += "<strong>Voted "+pp["vote"]+"</strong>. ";
						if(pp["prob"]!=undefined) { baseText += "Predicted probability of this vote: "+probText+"."; }
					}

					if(pp["flags"]=="median") { baseText += "<br/><br/><strong>Pivotal Voter:</strong> Median Voter."; }
					else if(pp["flags"]=="fbPivot") { baseText += "<br/><br/><strong>Pivotal Voter:</strong> 60th Vote for Cloture"; }
					else if(pp["flags"]=="voPivot") { baseText += "<br/><br/><strong>Pivotal Voter:</strong> Veto override."; }
					if(globalData["rollcalls"][0]["sponsor"] != undefined && pp["icpsr"]==globalData["rollcalls"][0]["sponsor"]) { baseText += "<br/><br/><strong>Sponsor:</strong> This member sponsored the bill or amendment."; }

					var profileImg = $("<img>").attr("src","/static/img/bios/"+pp["img"]);
					var profileImgDiv = $("<div></div>").addClass("profile").addClass("pull-left");
					var textChunk = $("<div></div>").addClass("text").html(baseText);
					baseTipVoter.html("");
					profileImg.appendTo(profileImgDiv);
					profileImgDiv.appendTo(baseTipVoter);
					textChunk.appendTo(baseTipVoter);

					var eWV = parseInt(baseTipVoter.style("width"));
					var eHV = parseInt(baseTipVoter.style("height"));
					var tHV = parseInt($(this).height());
					var tWV = parseInt($(this).width());
					$("#voterTooltip").removeClass().addClass("d3-tip");
					baseTipVoter.style("visibility","visible");
					if($(this).offset().left < $(document).width() / 2)
					{
						baseTipVoter.style("left", ($(this).offset().left + (tWV*0.6))+"px");
					}
					else
					{
						baseTipVoter.style("left", ($(this).offset().left - (tWV*0.1) - eWV)+"px");
					}
					baseTipVoter.style("top", ($(this).offset().top + (tHV/2) - (eHV/2))+"px");
				})
				.on("mouseout",function() { baseTipVoter.style("visibility","hidden"); });
			})(person);
		}

		if(sortedKeys[key] == "Voted" && groupBy == "prob")
		{
			var probLabel = $("<li></li>");
			$("<strong>Most Likely</strong> <span class='glyphicon glyphicon-arrow-up'></span>").appendTo(probLabel);
			probLabel.appendTo(baseList);

		}

		i=i+1;
	}

	if(groupBy == "x")
	{
		var ideologyLabel = $("<li></li>");
		$("<strong>Most Conservative</strong> <span class='glyphicon glyphicon-arrow-up'></span>").appendTo(ideologyLabel);
		ideologyLabel.appendTo(baseList);

		if(errorCount)
		{
			var missingIdeology = $("<li></li>");
			if(errorCount > 1) $(`<strong>${errorCount} members have no ideology score.</strong>`).appendTo(missingIdeology);
			else $(`<strong>${errorCount} member has no ideology score.</strong`).appendTo(missingIdeology);
			missingIdeology.appendTo(baseList);
		}
	}

	$("#voteList").html(baseList);
}
