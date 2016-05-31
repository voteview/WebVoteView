function numberWithCommas(x) 
{
	if(x == null) { return 0; }
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
		setTimeout(function(){$('#support').slider('refresh');}, 20);
	}
}

$(document).ready(function(){
	$('[data-toggle="tooltip"]').tooltip(); 
	var nextId = 0;

	// Get the initial list of rollcalls and replace all elements in the container with them
	function getRollcalls()
	{
		$.ajax({
			type: "POST",
			url: "/api/searchAssemble",
			data: $('#faceted-search-form').serialize() + '&sort=' + $("#sorting-select").val() + "&jsapi=1",
			beforeSend:function(){
				$('#results-list').html('<div id="loading-container"><h2 id="container">Loading...</h2><img src="/static/img/loading.gif" alt="Loading..." /></div>');
			},
			success: function(res, status, xhr) 
			{
				$("#results-number").html(numberWithCommas(xhr.getResponseHeader("Rollcall-Number")) + " search results");
				nextId = xhr.getResponseHeader("Nextid");
				console.log(nextId);
				if(nextId==0)
				{
					console.log("here");
					$("#next-page").html("End of Results").attr("disabled","disabled");
				}
				else
				{
					$("#next-page").html("Next page").removeAttr("disabled");
				}
				$("#results-list").fadeOut(50, function()
				{
					$("#results-list").html(res);
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
				$("#results-list").append(res);
				nextId = xhr.getResponseHeader("Nextid");
				if(nextId==0)
				{
					$("#next-page").html("End of Results").attr("disabled","disabled");
				}
				else
				{
					$("#next-page").html("Next page").removeAttr("disabled");
				}
				$('[data-toggle="tooltip"]').tooltip(); 
			}
		});
	}

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

	var globalQueueRequests = 0;
	var requestQueue;
	// On form change we reset the search and do the initial AJAX call
	$("#faceted-search-form input:not(#searchTextInput), #sorting-select").change(function() 
	{
		if(!globalQueueRequests)
		{
			console.log('got first request');
			globalQueueRequests = 1;
			nextId = "";
			requestQueue = setTimeout(getRollcalls, 50);
		}
		else
		{
			console.log('got another one, clearing.');
			clearTimeout(requestQueue);
			nextID = "";
			requestQueue = setTimeout(getRollcalls, 50);
		}
		//getRollcalls();
	});

	// Prevent to do a AJAX call everytime we update the search bar
	$("#faceted-search-form").submit(function(event) 
	{
		event.preventDefault();
		nextId = "";
		getRollcalls();
	});

      // Display the download excel button
      $(document.body).on("change", "#download-rollcalls-form :input", function() {
        showDownload();
      });

      function showDownload () {
        if ($("#download-rollcalls-form input:checkbox:checked").length > 0) {
            $("#download-btn").fadeIn();
        }
        else {
            $("#download-btn").fadeOut();
        }
      }

      // Toggle panel icons
      function toggleChevron(e) {
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
      if($('#fromDate').val()  || $("#toDate").val()) {
        $("#facet-date").collapse('show');
      }
      if($('#fromCongress').val()  || $("#toCongress").val()) {
        $("#facet-congress").collapse('show');
      }
      if($('#support').slider('getValue')!=[0,100]) {
	$('#facet-support').collapse('show');
      }
  });

function unselectAll()
{
	$("input[name='ids']").attr('checked', false);
	$("#download-btn").fadeOut();
}


function exportVote()
{
	console.log($('#download-rollcalls-form').serialize());
}
