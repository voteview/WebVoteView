var searchPulseTime = 10000;
var hasSuggested = 0;
var shouldSuggest = 1;
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
	// $('.carousel').carousel(0);
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
			if(data["id"]!=cookieId) { Cookies.set("stash_id", data["id"]); cookieId=data["id"]; }
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
			if(data["id"]!=cookieId) { Cookies.set("stash_id", data["id"]); cookieId=data["id"]; }
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
	if(!shouldSuggest) { return; }

	if(!hasSuggested)
	{
		$("#suggestContainer").fadeIn();
		hasSuggested = 1;
	}

	$("#searchSuggest").html(suggestions[Math.floor(Math.random() * suggestions.length)]);
	$("#searchSuggest a").attr("href", "/search/" + stripJunkFromSearch($("#searchSuggest a").html()));
}

var suggestions = ["john mccain", "tax congress: [100 to 112]", "support: [95 to 100]", "impeach chamber:Senate", "iraq war","cuba","france","codes: Civil Liberties", "terrorism"];
var suggestedPulse;

$(document).ready(function(){
	$('[data-toggle="tooltip"]').tooltip();
	$('#stashCartBar').carousel({"interval": false, "keyboard": false, "wrap": false});

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
				if(data["id"]!=cookieId) { Cookies.set("stash_id", data["id"]); cookieId=data["id"]; }
				updateStashCart();
				console.log("Loaded votes: "+cachedVotes["old"].length+" old and "+cachedVotes["votes"].length+" new");
					selectIncludedVotes();
			}
		});
	}

	// Setup calendar dates
	$("#fromDatePicker").datetimepicker({useCurrent: false, format: "YYYY-MM-DD"}).on("dp.change", function(e) {
		updateRequest();
	});
	$("#toDatePicker").datetimepicker({useCurrent: false, format: "YYYY-MM-DD"}).on("dp.change", function(e) {
		updateRequest();
	});

	// Setup suggested searches
	suggestedPulse = setTimeout(startPulseSuggested, searchPulseTime / 2);
	suggestedPulse = setInterval(startPulseSuggested, searchPulseTime);
	$("#searchTextInput").focus();
	$("#searchTextInput").on('input',function()
	{
		shouldSuggest = 0;
	});
	$("#searchTextInput").focus();
	$("#searchTextInput").on('focus',function()
	{
		if($("#searchTextInput").attr("placeholder") != "Enter a search term (vote text, member names, parties, or advanced search.)")
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
	$("#faceted-search-form input:not(#searchTextInput):not(input[name*='supportGroup']), #sort, #faceted-search-form select").change(function()
	{
		updateRequest();
	});
	$('input[name*="supportGroup"]').click(function() {
		updateSupportRange(this);
	});
	$("#faceted-search-form input[name*='peltzman'], #faceted-search-form input[name*='clausen']").unbind("change").change(function(e)
	{
		updateCategoryCheck(e);
	});
	$('#faceted-search-form input[name*="all_categories"]').unbind("change").change(function(e)
	{
		updateCheckAll(e);
	});

	// Prevent form submission, force an AJAX call everytime we update the search bar
	$("#faceted-search-form").submit(function(event)
	{
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
					console.log(res);
					if(res["old"]) { cachedVotes["old"] = res["old"]; }
					if(res["votes"]) { cachedVotes["votes"] = res["votes"]; }
					if(res["id"]!=cookieId) { Cookies.set("stash_id", res["id"]); cookieId=res["id"]; }
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
					if(res["id"]!=cookieId) { Cookies.set("stash_id", res["id"]); cookieId=res["id"]; }
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
	if($('#facet-clausen input[name*="clausen"]:checked, #facet-clausen input[name*="peltzman"]:checked').length) {
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
	fixSupportGroup();
	$('#sortScore').val(1);
	$('#sortD').val(-1);
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

function stripJunkFromSearch(text)
{
	return encodeURIComponent(text.replace("/"," ").replace(/<(?:.|\n)*?>/gm, ''));
}

var globalSlowLoadTimer;

	// Get the initial list of rollcalls and replace all elements in the container with them
	function getRollcalls()
	{
		if($("#searchTextInput").val().length==9 && ($("#searchTextInput").val().substring(0,2)=="RH" || $("#searchTextInput").val().substring(0,2)=="RS"))
		{
			window.location='/rollcall/'+$("#searchTextInput").val();
			return;
		}
		if($("#searchTextInput").val().length) { $("#searchTextInput").val($("#searchTextInput").val().replace("/"," ").replace(/<(?:.|\n)*?>/gm, '')); }
		globalQueueRequests=0;
		$.ajax({
			type: "POST",
			url: "/api/searchAssemble",
			data: $('#faceted-search-form').serialize() + "&jsapi=1",
			beforeSend:function(){
				$('#results-list').html('<div id="loading-container"><h2 id="container">Loading...</h2><img src="/static/img/loading.gif" alt="Loading..." /></div>');
				globalSlowLoadTimer = setTimeout(function()
				{
					$('#results-list').html('<div id="loading-container"><img src="/static/img/loading.gif" alt="Loading..." /> <h4>Loading... We apologize that your search query is taking a long time to complete. Your search is still processing. <!--Please continue to wait and excuse us while we work on improving Voteview.com--></h4></div>');
				}, 5000);

				mostRecentSearch = $("#searchTextInput").val();

				if(mostRecentSearch) {
					shouldSuggest = 0;
				}

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
				clearTimeout(globalSlowLoadTimer);
				if($("#searchTextInput").val().length)
				{
					var setOPS = 0;
					if(window.history.state==undefined || window.history.state["search"] == undefined)
					{
						window.history.pushState({"search": $("#searchTextInput").val()}, "Searched for "+$("#searchTextInput").val(), "/search/"+stripJunkFromSearch($("#searchTextInput").val()));
						setOPS=1;
					}
					else if(window.history.state["search"]==$("#searchTextInput").val())
					{
						console.log("history state still saved, don't need to redo.");
					}
					else
					{
						window.history.pushState({"search": $("#searchTextInput").val()}, "Searched for "+$("#searchTextInput").val(), "/search/"+stripJunkFromSearch($("#searchTextInput").val()));
						setOPS=1;
					}

					if(setOPS)
					{
						window.onpopstate = function(event)
						{
							$("#searchTextInput").val(event.state["search"]);
							getRollcalls();
						};

					}
				}
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

				var baseString = "";
				if(partyNumber) baseString += partyLabelText + ", ";
				if(memberNumber) baseString += numberWithCommas(memberNumber) + " " + memLabelText;
				if(memberNumber > 8) baseString += " (showing 8)";
				if(memberNumber) baseString += ", ";
				if(baseString && resultsNumber) baseString += "and ";
				if(resultsNumber) baseString += numberWithCommas(resultsNumber) + " " + voteLabelText;
				if(!partyNumber && !memberNumber && resultsNumber == 0) baseString = "0 results ";
				if(baseString.endsWith(", ")) baseString = baseString.replace(/, $/gi, "");
				baseString += " found.";
				if(resultsNumber < 0) baseString = "";

				$("#results-number").html(baseString);
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
					try {
						selectIncludedVotes();
						updateStashCart();
					} catch(error) {
						console.log("Stash issue that may prevent vote loading.");
					}
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

function updateCategoryCheck(e)
{
	if(e.target.checked)
	{
		console.log("uncheck all");
		$('#faceted-search-form input[name="all_categories"]').prop("checked", false);
	}
	else
	{
		var num_checked = 0;
		$('#faceted-search-form input[name="peltzman"], #faceted-search-form input[name="clausen"]').each(function(index, element) {
			if($(this).prop("checked")) { num_checked = 1; }
		});

		if(!num_checked) $('#faceted-search-form input[name="all_categories"]').prop("checked", true);
	}
	updateRequest();
}

function updateCheckAll(e)
{
	if(e.target.checked)
	{
		$('#faceted-search-form input[name="peltzman"], #faceted-search-form input[name="clausen"]').each(function() { $(this).prop("checked", false); });
		updateRequest();
	}
	else
	{
		$(e.target).prop("checked", true);
	}
}

function updateSupportRange(element)
{
	var min = 0, max = 100;
	switch($(element).attr("value"))
	{
		case "super": min = 66; break;
		case "majority": min = 50; break;
		case "minority": max = 49; break;
	}

	var slider = $("#support").slider();
	slider.slider("setValue", [min, max]);
	updateRequest();
}

function fixSupportGroup()
{
	// Makes sure the radio button state is coherent with the slider support state.

	var result = $("#support").slider("getValue");
	var group = "other";
	if(result[0] == 0 && result[1] == 100) { group = "all"; }
	else if(result[0] == 66 && result[1] == 100) { group = "super"; }
	else if(result[0] == 50 && result[1] == 100) { group = "majority"; }
	else if(result[0] == 0 && result[1] == 49) { group = "minority"; }

	$("input[name*='supportGroup']").prop("checked", false);
	var element = $("input[name*='supportGroup'][value='" + group + "']");
	if(element && !element.prop("checked")) { element.prop("checked", true); }
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
