var doRedirectForce=0;
var cookieId = "";
var mostRecentSearch = "";
var resultCount = 0;
var cachedVotes = {};
var globalQueueRequests = 0;
var requestQueue;
var nextId = 0; // What skip value we send to the next page loader.
var metaPageloaded = 0; // How many pages we've auto-loaded on this search.
var blockAutoscroll = 0; // If there's a load still in progress.

function numberWithCommas(x) 
{
	if(x == null) { return 0; }
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function openStashCart()
{
	$('.carousel').carousel(0);
	$("#stashCartIcon").fadeOut(100);
	$("#stashCartBar").slideDown(300,function()
	{
		$("#stashCartClose").fadeIn(100);
	});
}

function closeStashCart()
{
	$("#stashCartClose").fadeOut(100,function()
	{
		$("#stashCartBar").slideUp(300,function()
		{
			if(cachedVotes["old"] || cachedVotes["votes"])
			{
				$("#stashCartIcon").fadeIn(100);
			}
		});
	});	
}

function exportJSON() { window.location="/api/exportJSON?id="+cookieId; }
function exportXLS() { window.location="/api/downloadXLS?stash="+cookieId; }

function updateStashCart()
{
	var totalVoteCount = 0;
	// Calculate and set total vote count.
	if(cachedVotes["old"]) 
	{ 
		$("#oldCount").html(cachedVotes["old"].length);
		if(cachedVotes["old"].length)
		{
			$("#oldResults").show();
		} else { $("#oldResults").hide(); }
		totalVoteCount += cachedVotes["old"].length; 
	}
	else 
	{ 
		$("#oldCount").html("0");
		$("#oldResults").hide();
		totalVoteCount=0;
	}

	if(cachedVotes["votes"]) 
	{
		$("#newCount").html(cachedVotes["votes"].length);
		totalVoteCount += cachedVotes["votes"].length; 
	}
	else
	{
		$("#newCount").html("0");
		totalVoteCount+=0;
	}
	$('#totalVoteNumber').html(numberWithCommas(totalVoteCount));

	// Hide or show facet icons in the bar.
	if(totalVoteCount>0)
	{
		$("#emptyCartIcon").fadeIn();
		$("#downloadVotesIcon").fadeIn();
		$("#createLinkIcon").fadeIn();
		openStashCart();
	}
	else
	{
		$("#emptyCartIcon").fadeOut();
		$("#downloadVotesIcon").fadeOut();
		$("#createLinkIcon").fadeOut();
	}

	// Hide or show "add all" link.
	if(resultCount>0 && resultCount<2000)
	{
		$(".searchResultNum").html(numberWithCommas(resultCount));
		$("#addAll").fadeIn();
		$("#delAll").fadeIn();
	}
	else
	{
		$("#addAll").fadeOut();
		$("#delAll").fadeOut();
	}

	// Update search text
	if(mostRecentSearch.length)
	{
		$(".searchText").html('"'+mostRecentSearch+'"');
	}
	else { $(".searchText").html("all votes"); }

	if(mostRecentSearch.substr(0,6)=="saved:")
	{
		$("#addAll").hide();
	}

	if(totalVoteCount>250)
	{
		$("#errorTooManyVotes").fadeIn();
		$("#exportXLS").hide();
		$("#exportJSON").hide();
		$("#format3").hide();
	}

	// Nuke any residual link creation stuff.
	$("#shareLinkText").val("");
	$("#shareTextInput").show();
	$("#shareTextLink").html("").hide();
	$("#shareLinkStatus").hide();
}

function addAllVotes()
{
	$.ajax({
		dataType: "JSON",
		url: "/api/addAll",
		data: "id="+cookieId+"&search="+mostRecentSearch,
		success: function(data, status, xhr)
		{
			if(data["old"]) { cachedVotes["old"] = data["old"]; }
			if(data["votes"]) { cachedVotes["votes"] = data["votes"]; }
			updateStashCart();
			selectIncludedVotes();						
		}
	});
}

function delAllVotes()
{
	$.ajax({
		dataType: "JSON",
		url: "/api/delAll",
		data: "id="+cookieId+"&search="+mostRecentSearch,
		success: function(data, status, xhr)
		{
			if(data["old"]) { cachedVotes["old"] = data["old"]; }
			if(data["votes"]) { cachedVotes["votes"] = data["votes"]; }
			console.log(cachedVotes);
			updateStashCart();
			selectIncludedVotes();						
		}
	});

}

function loadSavedVotes()
{
	if(cookieId.length)
	{
		$("#searchTextInput").val("saved: "+cookieId);
		getRollcalls();
	}
}

function toggleAdvancedSearch(instant)
{
	if(!instant)
	{
		if($('#results-selects').is(':visible'))
		{
			$('#results-selects').animate({width: 'toggle', opacity: 'toggle'},125,function()
			{
				$('#resultsHolder').animate({width: '100%'},125);
			});
		}
		else
		{
			$('#resultsHolder').animate({width: '75%'},125, function()
			{
				$('#results-selects').animate({width: 'toggle', opacity: 'toggle'},125, 'linear');
				$('#support').slider('refresh');
				$("#support").slider("relayout");
			});
		}
	}
	else
	{
		if(!$('#results-selects').is(':visible')) 
		{ 
			$('#resultsHolder').css('width', '75%'); 
		}
		else { $('#resultsHolder').css('width', '100%'); }
		$('#results-selects').toggle();
		setTimeout(function(){$('#support').slider('refresh'); $("#support").slider('relayout');}, 20);
	}
}

function emptyCart()
{
	$.ajax({
		dataType: "JSON",
		url: "/api/stash/empty",
		data: "id="+cookieId,
		success: function(data, status, xhr)
		{
			Cookies.set("stash_id", data["id"]);
			console.log('Remaining ID '+data["id"]);
			if(data["errorMessages"]==undefined)
			{
				cookieId = data["id"];
				cachedVotes = {};
			}
			else
			{
				cookieId = "";
				cachedVotes = {};
				console.log(data["errorMessages"]);
			}
			unselectAll();
			updateStashCart();
		}			
	});
}

function startPulseSuggested()
{
	if($("#searchTextInput").val()=="") { $("#searchTextInput").attr("placeholder",suggestions[Math.floor(Math.random()*suggestions.length)]); }
}

var suggestions = ["john mccain", "tax congress: [100 to 112]", "support: [95 to 100]", "impeach chamber:Senate", "iraq war","cuba","france","codes: Civil Liberties", "terrorism"]; 
var suggestedPulse;
$(document).ready(function(){
	$('[data-toggle="tooltip"]').tooltip(); 
	$('.carousel').carousel({"interval": false, "keyboard": false, "wrap": false});

	// Load stash
	cookieId = Cookies.get('stash_id');
	console.log(cookieId);
	// We don't have a stash, so let's ask for one.
	if(cookieId == undefined || cookieId.length<8)
	{
		cookieId = "";
		$.ajax({
			dataType: "JSON",
			url: '/api/stash/init',
			success: function(data, status, xhr)
			{
				cookieId = data["id"];
				Cookies.set('stash_id',cookieId);
				console.log('Stash initialized.');
			}
		});
	}
	// We do have a stash, so let's load the votes from it.
	else
	{
		$.ajax({
			dataType: "JSON",
			url: '/api/stash/get',
			data: 'id='+cookieId,
			success: function(data, status, xhr)
			{
				cachedVotes["old"] = data["old"];
				cachedVotes["votes"] = data["votes"];
				updateStashCart();
				console.log("Loaded votes: "+cachedVotes["old"].length+" old and "+cachedVotes["votes"].length+" new");
				selectIncludedVotes();
			}
		});
	}

	// Setup suggested searches
	suggestedPulse = setInterval(startPulseSuggested,8000);
	$("#searchTextInput").focus();
	$("#searchTextInput").on('input',function() 
	{ 
		clearInterval(suggestedPulse); 
		$("#searchTextInput").attr("placeholder","Enter a term to search for"); 
		suggestedPulse = setInterval(startPulseSuggested, 8000);
	});
	$("#searchTextInput").focus();
	$("#searchTextInput").on('focus',function()
	{
		if($("#searchTextInput").attr("placeholder")!="Enter a term to search for")
		{
			$("#searchTextInput").val($("#searchTextInput").attr("placeholder")).select();
		}
	});
	
	$.ajax({
		dataType: "JSON",
		url: "/static/search/suggested.json",
		success: function(data, status, xhr)
		{
			suggestions = data["suggestions"];
			console.log("Pre-loaded "+suggestions.length+" search suggestions.");
		}
	});

	// Do initial search
	getRollcalls();

	// Pagination
	$("#next-page").click(function(e)
	{
		e.preventDefault();
		if(nextId!=0)
		{
			getRollcallsPage();
		}
	});

	// Infinite scrolling for searches.
	$(window).scroll(function() { // Scroll listener
		// Load next page when scroll is >95% through the whole document, there's a next page to load,
		// and we've loaded fewer than 10 pages already and there's not a request currently underway.
		if($(window).scrollTop() + $(window).height() >= $(document).height()*0.95 && nextId>0 & metaPageloaded<10 & !blockAutoscroll)
		{
			blockAutoscroll=1;
			getRollcallsPage();
		}
	});

	// On form change we reset the search and do the initial AJAX call
	$("#faceted-search-form input:not(#searchTextInput), #sort").change(function() 
	{
		$('#sortScore').val(1);
		$('#sortD').val(-1);
		updateRequest();
	});

	// Prevent form submission, force an AJAX call everytime we update the search bar
	$("#faceted-search-form").submit(function(event) 
	{
		$('#sortScore').val(1);
		$('#sortD').val(-1);
		event.preventDefault();
		updateRequest();
	});

	// When we check a vote, do the appropriate stash changes.
	$(document.body).on("change", "#download-rollcalls-form :input", function() {
		if(this.checked)
		{
			console.log('Adding');
			$.ajax({
				dataType: "JSON",
				url: "/api/stash/add",
				data: "id="+cookieId+"&votes="+this.value,
				success: function(res, status, xhr)
				{
					if(res["old"]) { cachedVotes["old"] = res["old"]; }
					if(res["votes"]) { cachedVotes["votes"] = res["votes"]; }
					console.log('added one');
					console.log(cachedVotes);
					updateStashCart();
				}
			});
		}
		else
		{
			console.log('Removing');
			$.ajax({
				dataType: "JSON",
				url: "/api/stash/del",
				data: "id="+cookieId+"&votes="+this.value,
				success: function(res, status, xhr)
				{
					console.log('Removed');
					if(res["old"]) { cachedVotes["old"] = res["old"]; }
					if(res["votes"]) { cachedVotes["votes"] = res["votes"]; }
					console.log(cachedVotes);
					updateStashCart();
				}
			});
		}
	});

	// Toggle panel icons
	function toggleChevron(e)
	{
		if(e.target.id=="facet-support") { $("#support").slider("relayout"); }
		$(e.target)
		.prev('.panel-heading')
		.find('i.indicator')
		.toggleClass('glyphicon-chevron-down glyphicon-chevron-up');
	}
	$('.panel').on('hidden.bs.collapse', toggleChevron);
	$('.panel').on('shown.bs.collapse', toggleChevron);


	// If any panel has data display it
	if($('#facet-chamber input[type=checkbox]:checked').length) {
		$("#facet-chamber").collapse('show');
	}
	if($('#facet-clausen input[type=checkbox]:checked').length) {
		$("#facet-clausen").collapse('show');
	}
	if($('#facet-keyvote input[type=checkbox]:checked').length) {
		$("facet-keyvote").collapse('show');
	}
	if($('#fromDate').val()  || $("#toDate").val()) {
		$("#facet-date").collapse('show');
	}
	if($('#fromCongress').val()  || $("#toCongress").val()) {
		$("#facet-congress").collapse('show');
	}
	if($('#support').slider('getValue')[0]!=0 || $('#support').slider('getValue')[1]!=100) {
		$('#facet-support').collapse('show');
	}

});

function updateRequest()
{
	if(!globalQueueRequests)
	{
		globalQueueRequests = 1;
		nextId = "";
		requestQueue = setTimeout(getRollcalls, 200);
	}
	else
	{
		clearTimeout(requestQueue);
		nextID = "";
		requestQueue = setTimeout(getRollcalls, 200);
	}
}

	// Get the initial list of rollcalls and replace all elements in the container with them
	function getRollcalls()
	{
		if($("#searchTextInput").val().length==9 && ($("#searchTextInput").val().substring(0,2)=="RH" || $("#searchTextInput").val().substring(0,2)=="RS"))
		{
			window.location='/rollcall/'+$("#searchTextInput").val();
			return;
		}
		globalQueueRequests=0;
		$.ajax({
			type: "POST",
			url: "/api/searchAssemble",
			data: $('#faceted-search-form').serialize() + "&jsapi=1",
			beforeSend:function(){
				$('#results-list').html('<div id="loading-container"><h2 id="container">Loading...</h2><img src="/static/img/loading.gif" alt="Loading..." /></div>');
				mostRecentSearch = $("#searchTextInput").val();
				$.ajax({
					dataType: "JSON",
					url: "/api/setSearch",
					data: "id="+cookieId+"&search="+$('#searchTextInput').val(),
					success: function(res, status, xhr)
					{
						if(res["old"]) { cachedVotes["old"] = res["old"]; }
						if(res["votes"]) { cachedVotes["votes"] = res["votes"]; }
						updateStashCart();
						console.log('Search set.');
						console.log(res);
					}
				});
			},
			success: function(res, status, xhr) 
			{
				metaPageloaded = 0; // Reset page load count. We use this for stopping auto-scroll after 10 pages.
				var resultsNumber = parseInt(xhr.getResponseHeader("Rollcall-Number"));
				var memberNumber = parseInt(xhr.getResponseHeader("Member-Number"));
				var partyNumber = parseInt(xhr.getResponseHeader("Party-Number"));
			        var needScore = parseInt(xhr.getResponseHeader("Need-Score"));
				if(xhr.getResponseHeader("Redirect-Url") != undefined && xhr.getResponseHeader("Redirect-Url").length && !doRedirectForce)
				{
					console.log(xhr.getResponseHeader("Redirect-Url"));
					doRedirectForce=1;
					window.location=xhr.getResponseHeader("Redirect-Url");
					return;
				}
				resultCount = resultsNumber;
				var resultText = "";
				if(partyNumber)
				{
					var partyLabelText = partyNumber+" part"+(partyNumber!=1?"ies":"y");
				}
				else { var partyLabelText = ""; }
				var memLabelText = "member"+(memberNumber!=1?"s":"");
				var voteLabelText = "vote"+(resultsNumber!=1?"s":"");
				if(partyNumber>0 && memberNumber>0 && resultsNumber>0) resultText = partyLabelText+", "+numberWithCommas(memberNumber)+ " "+memLabelText+", and "+numberWithCommas(resultsNumber)+" "+voteLabelText+" found.";
				else if(partyNumber>0 && memberNumber>0) resultText = partyLabelText+" and "+numberWithCommas(memberNumber)+ " "+memLabelText+" found.";
				else if(partyNumber>0 && resultsNumber>0) resultText = partyLabelText+" and "+numberWithCommas(resultsNumber)+" "+voteLabelText+" found.";
				else if(memberNumber>0 && resultsNumber>0) resultText = numberWithCommas(memberNumber)+ " "+memLabelText+" and "+numberWithCommas(resultsNumber)+" "+voteLabelText+" found.";
				else if(memberNumber>0) resultText = numberWithCommas(memberNumber)+ " "+memLabelText+" found.";
				else if(resultsNumber>0) resultText = numberWithCommas(resultsNumber)+" "+voteLabelText+" found.";
				else if(partyNumber>0) resultText = partyLabelText+" found.";
				else if(resultsNumber==0) resultText = "0 results found.";
				else { resultText = "Error completing search."; }
				$("#results-number").html(resultText);
			   
			        // Control how sorting buttons appear
			        if(needScore && $("#sortScore").val() == 1)
				{
				        $("#relevanceAppear")[0].style.display = "inline-block";
				        $("#relevanceSort")[0].className = "selectedSort";
				        $("#newestSort")[0].className = "";
				        $("#oldestSort")[0].className = "";
				} else if ($("#sortD").val() == -1)
			        {
				        $("#relevanceSort")[0].className = "";
				        $("#newestSort")[0].className = "selectedSort";
				        $("#oldestSort")[0].className = "";
				} else if ($("#sortD").val() == 1)
				{
				        $("#relevanceSort")[0].className = "";
				        $("#newestSort")[0].className = "";
				        $("#oldestSort")[0].className = "selectedSort";
				}

			        if(!needScore)
				{
				        $("#relevanceAppear")[0].style.display = "none";
				}


				if(resultsNumber<0) 
				{
					$("#addAll").hide(); 
				}
				nextId = xhr.getResponseHeader("Nextid");
				console.log('New next id: '+nextId);
				if(nextId==0)
				{
					$("#next-page").html("End of Results").attr("disabled","disabled");
				}
				else
				{
					$("#next-page").html("Next page").removeAttr("disabled");
				}
				$("#results-list").fadeOut(50, function()
				{
					$("#results-list").html(res);
					selectIncludedVotes();
					updateStashCart();
					$("#results-list").fadeIn();
					$('[data-toggle="tooltip"]').tooltip(); 
				});
			}
		});
		$("#download-btn").fadeOut();
	}

	// Get a rollcalls page and append them to the container
	function getRollcallsPage()
	{
		$.ajax({
			type: "POST",
			url: "/api/searchAssemble",
			data: $('#faceted-search-form').serialize() + '&sort=' + $("#sorting-select").val() + '&nextId=' + nextId + "&jsapi=1",
			beforeSend:function(){
				$('#next-page').html('Loading...').attr('disabled', 'disabled');
			},
			success: function(res, status, xhr) {
				metaPageloaded += 1;
				$("#results-list").append(res);
				selectIncludedVotes();
				nextId = xhr.getResponseHeader("Nextid");
				console.log('New next id: '+nextId);
				if(nextId==0)
				{
					$("#next-page").html("End of Results").attr("disabled","disabled");
				}
				else
				{
					$("#next-page").html("Next page").removeAttr("disabled");
					blockAutoscroll = 0; // Request resolved.
				}
				$('[data-toggle="tooltip"]').tooltip(); 
			}
		});
	}

function selectIncludedVotes()
{
	$('input[name=ids]').prop('checked',false);

	$.each(cachedVotes["old"],function(a, b)
	{
		$('input[value='+b+']').prop('checked',true);
	});
	$.each(cachedVotes["votes"],function(a, b)
	{
		$('input[value='+b+']').prop('checked',true);
	});
}

function unselectAll()
{
	$("input[name='ids']").attr('checked', false);
	$("#download-btn").fadeOut();
}


function exportVote()
{
	console.log($('#download-rollcalls-form').serialize());
}

function checkBox(id)
{
	console.log(id);
	var cb = $("input[value='"+id+"']");
	cb.prop('checked', !cb.prop('checked'));
	cb.trigger('change');
}

function shareLink()
{
	var shortLink = cleanLink($('#shareLinkText').val());

	$.ajax({
		type: "POST",
		url: "/api/shareableLink",
		data: "id="+cookieId+"&text="+shortLink,
		success: function(res, status, xhr)
		{
			if(res["link"]!="undefined" && res["link"]!="")
			{
				console.log(res);
				$('#shareTextInput').hide();
				var a = $("<a></a>").attr("href",res["link"]).html(res["link"]).appendTo("#shareTextLink");
				$("#shareTextLink").show();
				if("{{STATIC_URL}}" + "/s/"+shortLink!=res["link"])
				{
					$("#shareLinkStatus").hide().html("Link copied to clipboard.<br/>Note: The link has been modified.").fadeIn();
				}
				else
				{
					$('#shareLinkStatus').hide().html("Link copied to clipboard.").fadeIn();
				}
			}
			else
			{
				$('#shareLinkStatus').hide().html(res["errors"][0]).fadeIn();
			}
		}
	});
}


function clipboardCopyHack(text)
{
	var shortLink = cleanLink($('#shareLinkText').val());
	var baseLink = text.innerText;

	var q = $("<input>").val(baseLink.concat(shortLink).replace(/ /g, '')).appendTo($("body"));

	q.focus();
	q.select();
	try
	{
		var result = document.execCommand('copy');
		console.log(result);
	}
	catch(err)
	{
		console.log('copy to clipboard failed');
	}
}

function cleanLink(text)
{
	text = text.replace(/[^a-zA-Z0-9_\-\s]/g,'')
		 .replace(/\s/g, '-')
		 .replace(/\_/g, '-')
		 .replace(/\-$/g, '')
		 .toLowerCase();
	return text;
}

$('#toggleAlert').click(function()
{
        if($('#alertWelcome').is(':hidden')) { $('#alertWelcome').show(); }
        else { $('#alertWelcome').hide(); }
});
$('#closeAlert').click(function(e)
{
        if($('#alertWelcome').is(':hidden')) { $('#alertWelcome').show(); }
        else { $('#alertWelcome').hide(); }
	Cookies.set(e.currentTarget.parentElement.id, '1', {expires: 14});
});
