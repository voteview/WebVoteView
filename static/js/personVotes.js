function loadSavedVotes()
{
	if(cookieId.length)
	{
		$("#memberSearchBox").val("saved: "+cookieId);
		startNewSearch()
	}
}

function startNewSearch()
{
	globalNextId=0;
	nextPageSearch();
}

function nextPageSearch()
{
		if(!globalNextId) $("#memberVotesTable").animate({opacity: 0});
		else $("#loadIndicator").fadeIn();
		$.ajax("/api/getMemberVotesAssemble?icpsr="+memberICPSR+"&qtext="+$("#memberSearchBox").val()+"&skip="+globalNextId, 	
			{"type": "GET", "success": function(d, status, xhr)
				{
					if($('#memberSearch').val().length) { $("#voteLabel").html("Search Results"); console.log('fwd'); }
					else { $("#voteLabel").html("Selected Votes"); console.log('back'); }
					if(!globalNextId) $("#memberVotesTable").animate({opacity: 1});

					if(globalNextId==0) { $('#memberVotesTable').html(d); }
 					else { $('#voteDataTable > tbody').append(d); }

					globalNextId = xhr.getResponseHeader("Nextid");
					if(globalNextId==0) { $("#nextVotes").fadeOut(); }
					else { $("#nextVotes").fadeIn(); }

					$('[data-toggle="tooltip"]').tooltip();
					$("#loadIndicator").hide();
					$("#voteDataTable").tablesorter({headers: {5: {sorter: 'splitFunc'}}});
					$("#voteDataTable").bind("tablesorter-ready", function() { $('[data-toggle="tooltip"]').tooltip(); });
					$("#voteDataTable").bind("sortEnd",hideDates);
					//$("#voteDataTable").trigger("update");
				}});
	return;
}

function hideDates()
{
	var lastDate = "0000-00-00";
	console.log("here");
	$('#voteDataTable tbody tr').each(function(i, d) {
		var rowSpan = $(d).children("td:first").children("span:first");
		if($.trim(rowSpan.text())==lastDate)
		{
			rowSpan.hide();
		}
		else
		{
			lastDate = $.trim(rowSpan.text());
			rowSpan.show();
		}
	});
}


$.tablesorter.addParser({
	id: 'splitFunc', is: function(s) { return false },
	format: function(s) 
	{ 
		var numbers = s.split("-");
		if(parseInt(numbers[1])==0 && parseInt(numbers[0])>0) { return 1; }
		else if(parseInt(numbers[1])==0) { return 0; }
		else { return parseFloat(numbers[0])/parseFloat(numbers[1]); }
	},
	type: 'numeric'
});
$.tablesorter.addParser({
	id: 'probFunc', is: function(s) { return false },
	format: function(s, table, cell)
	{
		var cell = $(cell);
		return cell.attr("data-impute-sort");
	},
	type: 'numeric'
});

$(document).ready(function(){
	cookieId = Cookies.get('stash_id');
	if(cookieId==undefined || cookieId.length<8) $('#loadStash').hide();
	else
	{
		$.ajax("/api/stash/get?id="+cookieId, {"type": "GET", "success": function(d, status, xhr)
			{
				if(d["old"].length || d["votes"].length) { $("#loadStash").show(); console.log('Stash votes exist.'); }
				else { $("#loadStash").hide(); console.log('No stash votes.'); }
			}});
	}
	startNewSearch();
	/*$("#voteDataTable").tablesorter({headerTemplate: "{content}{icon}", headers: {4: {sortInitialOrder: 'desc', sorter: 'probFunc'}, 5: {sorter: 'splitFunc'}}});
	$("#voteDataTable").bind("tablesorter-ready", function() { $('[data-toggle="tooltip"]').tooltip(); });
	$("#voteDataTable").bind("sortEnd",hideDates);*/
});
