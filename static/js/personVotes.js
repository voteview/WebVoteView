function loadSavedVotes()
{
	if(cookieId.length)
	{
		$("#memberSearchBox").val(`saved: ${cookieId}`);
		startNewSearch()
	}
}

function startNewSearch()
{
	globalNextId = 0;
	nextPageSearch();
}

function nextPageSearch()
{
	// If we've got no search results, everything should be hidden -- if we're
	// loading the next page, just show a throbber.
	if(!globalNextId) $("#memberVotesTable").animate({opacity: 0});
	else $("#loadIndicator").fadeIn();

	// If we're getting the next page, iterate the page again
	if(globalNextId) { globalNextId++; }

	// Build the API call
	const assembleURL = `\
		/api/getMemberVotesAssemble?icpsr=${memberICPSR}\
		&qtext=\${$("#memberSearchBox").val()}\
		&skip=${globalNextId}`;

	// Make the call
	$.ajax(assembleURL, {
		"type": "GET",
		"success": (d, status, xhr) => {
			// If we've got at least one member, we say search results instead
			// of selected votes.
			if ($('#memberSearch').val().length) {
				$("#voteLabel").html("Search Results");
			}
			else { $("#voteLabel").html("Selected Votes"); }

			// If we've got to show the results, let's show them
			if (!globalNextId) $("#memberVotesTable").animate({ opacity: 1 });

			// Do we append or overwrite the results
			if (globalNextId == 0) { $('#memberVotesTable').html(d); }
			else { $('#voteDataTable > tbody').append(d); }

			// Note the information for pagination -- if there's no next,
			// we don't need it.
			globalNextId = xhr.getResponseHeader("Nextid");
			if (globalNextId == 0) { $("#nextVotes").fadeOut(); }
			else { $("#nextVotes").fadeIn(); }

			// Setup the tooltip JS on the newly created nodes we dumped in
			// and setup the variables data.
			$('[data-toggle="tooltip"]').tooltip();
			$("#loadIndicator").hide();
			$("#voteDataTable").tablesorter({
				headerTemplate: "{content}",
				headers: {
					4: { sortInitialOrder: 'desc', sorter: 'probFunc' },
					5: { sorter: 'splitFunc' }
				}
			});
			$("#voteDataTable").bind("tablesorter-ready", () => {
				$('[data-toggle="tooltip"]').tooltip();
			});
			$("#voteDataTable").bind("sortEnd", hideDates);
		}
	});
	return;
}

function hideDates()
{
	// For which rows do we hide dates? Basically, if we see the last date is
	// the same as the current date, then hide it.
	let lastDate = "0000-00-00";
	$('#voteDataTable tbody tr').each((i, d) => {
		const rowSpan = $(d).children("td:first").children("span:first");
		if ($.trim(rowSpan.text()) == lastDate) {
			rowSpan.hide();
		}

		else {
			lastDate = $.trim(rowSpan.text());
			rowSpan.show();
		}
	});
}

// A few basic sorters for the various columns.
$.tablesorter.addParser({
	id: 'splitFunc', is: (s) => false,
	format: (s) => {
		const numbers = s.split("-");
		if (parseInt(numbers[1]) == 0 && parseInt(numbers[0]) > 0) { return 1; }
		else if (parseInt(numbers[1]) == 0) { return 0; }
		else { return parseFloat(numbers[0]) / parseFloat(numbers[1]); }
	},
	type: 'numeric'
});
$.tablesorter.addParser({
	id: 'probFunc', is: (s) => false,
	format: (s, table, cell) => {
		const cell = $(cell);
		return cell.attr("data-impute-sort");
	},
	type: 'numeric'
});

// When the document is ready, we can also fire off the stashes if necessary
$(document).ready(() => {
	// No stash? Then we're good.
	cookieId = Cookies.get('stash_id');
	if (cookieId == undefined || cookieId.length < 8) $('#loadStash').hide();
	else {
		$.ajax(`/api/stash/get?id=${cookieId}`,
			{
				"type": "GET", "success": (d, status, xhr) => {
					if (d["old"].length || d["votes"].length) {
						$("#loadStash").show();
					} else { $("#loadStash").hide(); }
				}
			});
	}

	// Ask for the member's votes.
	startNewSearch();
});
