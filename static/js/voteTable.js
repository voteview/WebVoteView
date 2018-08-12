var baseTipVoter = d3.select("body").append("div").attr("class", "d3-tip").style("visibility","hidden").attr("id","voterTooltip").style("min-width","320px");

function outVotes(groupBy)
{
	// Check that we're grouping by something valid.
	if(["party", "vote", "state", "x", "prob"].indexOf(groupBy)==-1) { groupBy = "party"; }
	if(groupBy=="state") { groupBy="state_abbrev"; }
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

	var errorCount=0;
	for(var i=0;i!=filteredVotes.length;i++)
	{
		if(filteredVotes[i]["name"] == undefined) { continue; }
		var voteSubset = {
			"party": filteredVotes[i]["party"], 
			"vote": filteredVotes[i]["vote"],
			"state_abbrev": filteredVotes[i]["state_abbrev"],
			"icpsr": filteredVotes[i]["icpsr"],
			"x": parseFloat(filteredVotes[i]["x"]),
			"fullName": filteredVotes[i]["name"],
			"seo_name": filteredVotes[i]["seo_name"]
		};
		if(filteredVotes[i]["flags"] != undefined) { voteSubset["flags"] = filteredVotes[i]["flags"]; }
		if(filteredVotes[i]["img"] != undefined) { voteSubset["img"] = filteredVotes[i]["img"]; }

		if(groupBy=="x" && isNaN(voteSubset["x"]))
		{
			errorCount+=1;
			continue;
		}
		if(filteredVotes[i]["prob"] != undefined) { voteSubset["prob"] = filteredVotes[i]["prob"]; }
		var lastName = filteredVotes[i]["name"].split(",")[0];
		if(dedupeLastNames.indexOf(lastName)!=-1) { voteSubset["name"] = filteredVotes[i]["name"].split(" ").slice(0,2).join(" "); }
		else { voteSubset["name"] = lastName; }
		if(groupBy=="prob") {
			var key = "Voted";
			if(voteSubset["vote"] == "Abs") { key = "Not Voting (Least to Most Likely To Vote With Party)";}
			if(groupings[key] != undefined) { groupings[key].push(voteSubset); }
			else { groupings[key] = [voteSubset]; }
		}
		else {
			if(groupings[filteredVotes[i][groupBy]] != undefined) {groupings[filteredVotes[i][groupBy]].push(voteSubset); }
			else { groupings[filteredVotes[i][groupBy]] = [voteSubset]; }
		}
	}

	// Output table
	function numSort(a, b) { return a-b; }
	if(groupBy=="x") { var sortedKeys = Object.keys(groupings).sort(numSort); }
	else if(groupBy=="prob" || groupBy == "vote") { var sortedKeys = Object.keys(groupings).sort().reverse(); }
	else { var sortedKeys = Object.keys(groupings).sort(); }
        // Hack so when few members are selected it fills down the column
        // alternative is min-height and column-fill, but column-fill auto only works in firefox
        var listItems = filteredVotes.length + 2 * Object.keys(groupings).length;
        var baseList = $("<ul></ul>").css("list-style-type","none").css("overflow","auto").addClass("voteTable");
        if(listItems < 11){
	        baseList = baseList.css("columns","1").css("width","25%");
	} else if (listItems < 21)
	{
	        baseList = baseList.css("columns","2").css("width","50%")
	} else if (listItems < 31)
	{
	        baseList = baseList.css("columns","3").css("width","75%")
	} else
	{
	        baseList = baseList.css("columns","4").css("width","100%")
	}

	// 
	
	var rowCount=0;
	var i=0; var colCount=0;

	if(groupBy=="x" || groupBy=="prob")
	{
		var idProbLabel = $("<li></li>").css("padding-bottom","3px");
		if(groupBy=="x") $("<strong>Most Liberal</strong> <span class='glyphicon glyphicon-arrow-down'></span>").appendTo(idProbLabel);
	
		if(groupBy=="prob")
		{
			$('<strong>Most Unlikely</strong> <span class="glyphicon glyphicon-arrow-down"></span> <br/> <span style="color:red;">Red: Probability < 25%</span>').appendTo(idProbLabel);
		}
		idProbLabel.appendTo(baseList);
	}

 	for(var key in sortedKeys)
	{
		// Sort everyone by name within whatever the
		if(groupBy!="prob") { groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(function(a,b){return a["name"] < b["name"] ? -1 : (a["name"] > b["name"] ? 1 : 0);}); }
		else { groupings[sortedKeys[key]] = groupings[sortedKeys[key]].sort(function(a,b){return numSort(a["prob"], b["prob"]); }); }
			
		// Add spacers before the next category
		if(i && groupBy!="state_abbrev" && groupBy!="x") { $("<li>&nbsp;</li>").appendTo(baseList); }
		// Category header
		var partyLabel = $("<li></li>").css("padding-bottom","3px").css("-webkit-column-break-after","avoid");
		var headerLabel = sortedKeys[key];
		if(headerLabel=="Abs") { headerLabel="Not Voting"; }
		if(groupBy=="state_abbrev") { headerLabel = stateMap[headerLabel]; }
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
			if(groupBy=="party") outLabel = " ("+person["state_abbrev"]+") ";
			else if(groupBy=="state") outLabel = " ("+person["party"].substr(0,1)+") ";
			else outLabel = " ("+person["party"].substr(0,1) + "-" +person["state_abbrev"] + ")";

			// Check if the current user is our sponsor.
			var isSponsor = 0;
			if(globalData["rollcalls"][0]["sponsor"]!=undefined && person["icpsr"]==globalData["rollcalls"][0]["sponsor"])
			{
				isSponsor=1;
			}
			
			// Style and assemble list item
			var li = $("<li></li>").css("display","inline-block").css("width","100%").css("padding-bottom","3px");
			if(isSponsor)	var span = $("<span></span>").css("background-color","yellow").css("padding-right","5px");
			else var span = $("<span></span>").css("background-color","white").css("padding-right","5px");

			if(person["flags"]!=undefined && groupBy=="x") { $("<span>* </span>").css("color","red").appendTo(span); }

			if(isSponsor) { li.css("background-color","yellow"); $("<span>* </span>").css("color","red").appendTo(span); }

			$("<a></a>").attr("href","/person/"+person["icpsr"]+"/"+person["seo_name"])
					.html(person["name"]).appendTo(span);
			$("<span></span>").css({"color": "grey", "font-size": "0.9em"}).html(outLabel).appendTo(span);
			span.appendTo(li);

			// If we're not grouping on vote, right-float vote and class the LI to use the dot leaders.
			if(groupBy!="vote") 
			{ 
				var p_vote = person["vote"].substr(0, 1);
				if(isSponsor) var addVote = $("<span>"+ p_vote + "</span>").css("background-color","yellow").css("float","right").css("padding-right","40px")
				else var addVote = $("<span>" + p_vote +"</span>").css("background-color","white").css("float","right").css("padding-right","40px")
				if(person["prob"]!=undefined && parseInt(person["prob"])<25 && sortedKeys[key] == "Voted") { addVote.css("color","red"); }
				addVote.appendTo(li); 
				li.addClass("dotted");
			}
			li.appendTo(baseList);

			// Use a closure to assign the current person's data to the tooltip.
			(function(pp) 
			{
				li.on("mouseover", function() {
					var baseText = "<strong><u>"+pp["fullName"]+"</u></strong> ("+pp["party"].substr(0,1)+"-"+pp["state_abbrev"]+")<br/><br/>"; 

					if(!isNaN(pp["x"])) 
					{ 
						if(pp["prob"]<25) { var probText = '<span style="color:red;">'+pp["prob"]+'%</span>'; }
						else { var probText = pp["prob"]+"%"; }

						baseText += "<strong>Ideology Score:</strong> "+pp["x"]+"<br/>(<em>DW-NOMINATE First Dimension</em>)<br/><br/>"; 
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
					}
					else { baseText += "We do not have a score for this member yet.<br/>"; }

					var profileImg = $("<img>").attr("src","/static/img/bios/"+pp["img"]).css("width","80px");
					var profileImgDiv = $("<div></div>").css("padding-right","10px")
									.css("vertical-align","middle").css("height","100%").css("min-height","100px")
									.addClass("pull-left");
					var textChunk = $("<div></div>").css("font-size","0.9em").css("vertical-align","middle").css("padding-top","5px").html(baseText);
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

		if(sortedKeys[key] == "Voted" && groupBy=="prob")
		{
			var probLabel = $("<li></li>").css("padding-bottom","3px");
			$("<strong>Most Likely</strong> <span class='glyphicon glyphicon-arrow-up'></span>").appendTo(probLabel);
			probLabel.appendTo(baseList);

		}

		i=i+1;
	}

	if(groupBy=="x")
	{
		var ideologyLabel = $("<li></li>").css("padding-bottom","3px");
		$("<strong>Most Conservative</strong> <span class='glyphicon glyphicon-arrow-up'></span>").appendTo(ideologyLabel);
		ideologyLabel.appendTo(baseList);

		if(errorCount)
		{
			var missingIdeology = $("<li></li>").css("padding-bottom","3px");
			if(errorCount>1) $("<strong>"+errorCount+" members have no ideology score.</strong>").appendTo(missingIdeology);
			else $("<strong>"+errorCount+" member has no ideology score.</strong").appendTo(missingIdeology);
			missingIdeology.appendTo(baseList);
		}
	}

	$("#voteList").html(baseList);
	//$('[data-toggle="tooltip"]').tooltip();
}
