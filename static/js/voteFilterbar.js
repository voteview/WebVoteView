// Poll Filter: Basically, use DC's on filtered method to call this function
// when a filter changes.
function pollFilters(chart, filter)
{
	// Because this runs before the filters are applied, we delay it.
	// We can try directly accessing the filters through the .filters() method
	// if we must avoid this.
	setTimeout(pollFiltersInner, 1);
	outVotes("party");
}

function pollFiltersInner()
{
	// Proper diction for text
	const districtName = (chamber == "House") ? "districts" : "states";
	const voterName = (chamber == "House") ? "representatives" : "senators";
	$("#votertype").text(voterName);

	const countFilters =
		pollFiltersMap() +
		pollFiltersVotes() +
		pollFiltersNominate() +
		pollFiltersSelected();

	// Hide or show the full bar if there's a filter.
	if(countFilters)
	{
		$("#selectionFilterBar").slideDown(300, () => {
			$("#selectionFilterClose").fadeIn(200);
		});
		return;
	}

	$("#selectionFilterClose").fadeOut(100, () => {
		$("#selectionFilterBar").slideUp(300);
	});
}

function pollFiltersMap() {
	// Filters for map unit selection
	let mapFilter = $("#suppressMapControls > .filter").text();
	if(mapFilter.length)
	{
		// Collapse the text, it's too long
		if(mapFilter.length > 20)
		{
			let selectCount = (mapFilter.match(/,/g) || []).length;
			mapFilter =
				`${mapFilter.split(", ")[0]} and \
					${selectCount - 1} other ${districtName}`;
		}
		$("#map-chart-controls > .filter").text(mapFilter);
		$("#map-chart-controls").show();
		return 1;
	}

	$("#map-chart-controls").hide();
	return 0;
}

function assemblePartyString(party) {
	// Destructure the party array into key and values (works because)
	// party is passed from Object.entries() and so it is set up this way.
	let [partyKey, partyValues] = party;

	// Gramatically correct party text
	const voteText =
		(partyValues.length == 3) ? "s regardless of vote" :
		(partyValues.length == 1 && partyValues[0] == "Abs") ?
			"s who abstained" :
		(partyValues.length == 1) ? `s who voted ${partyValues[0]}` :
		(partyValues.length == 2 && !partyValues.includes("Abs")) ?
			"s who voted 'Yea' or 'Nay'" :
		(partyValues.length == 2 && partyValues.includes("Yea")) ?
			"s who voted 'Yea' or abstained" :
		"s who voted 'Nay' or Abstained";

	return `${partyKey}${voteText}`;
}

function pollFiltersVotes() {
	// Filters for party/vote selection
	let voteFilter = $("#suppressVoteChartControls > .filter").text();
	if(voteFilter.length)
	{
		// We're splitting ["AbsDem", "AbsRep", "YeaDem", ...]
		// into {"Dem": ["Abs", "Yea"], ...}
		const partyVotes = voteFilter.split(", ").sort()
			.reduce((acc, value) => {
				const vote = value.substr(0, 3);
				const party = value.substr(3);
				if(party in acc) { acc[party].push(vote); }
				else { acc[party] = [vote]; }
				return acc;
			}, {});

		// We're taking the object and mapping it to get the gramatically
		// correct sentences.
		const partyStrings = Object
			.entries(partyVotes)
			.map(assemblePartyString);

		// Oxford semicolon for list entries
		const last = partyStrings.pop();
		const baseString = `${partyStrings.join("; ")}; and ${last}`;

		// Display output
		$("#vote-chart-controls > .filter").text(baseString);
		$("#vote-chart-controls").show();
		return 1;
	}

	$("#vote-chart-controls").hide();
	return 0;
}

function pollFiltersNominate() {
	// Filters for NOMINATE selection
	let nominateFilter = $("#suppressNominateControls > .filter").text();
	if(nominateFilter.length)
	{
		// Round coordinates to 2 sig figs.
		let coordSets = nominateFilter.split(" -> ");
		let initXY = coordSets[0].split(",");
		let endXY = coordSets[1].split(",");
		initXY[0] = parseFloat(initXY[0].substr(1)).toPrecision(2);
		initXY[1] = parseFloat(initXY[1]).toPrecision(2);
		endXY[0] = parseFloat(endXY[0].substr(0, endXY[0].length))
			.toPrecision(2);
		endXY[1] = parseFloat(endXY[1]).toPrecision(2);
		const resultText = `(${initXY[0]}, ${initXY[1]}) to \
			(${endXY[0]}, ${endXY[1]})`;
		$("#nominate-chart-controls > .filter").text(resultText);
		$("#nominate-chart-controls").show();
		return 1;
	}

	$("#nominate-chart-controls").hide();
	return 0;
}

function pollFiltersSelected() {
	const filteredVotes = globalPartyDimension.top(Infinity);
	if(filteredVotes.length == 1)
	{
		const splitNames = filteredVotes[0]["name"].split(", ");
		const recoveredName = `${splitNames[1]} ${splitNames[0]}`;
		$("#sparse-selection").html(`Selected: ${recoveredName}`).show();
		return 1;
	}

	$("#sparse-selection").html("").hide();
	return 0;
}
