  $(document).ready(
    function(){
      var page = 1;

      // Get the initial list of rollcalls and replace all elements in the container with them
      function getRollcalls(){
        $.ajax({
          type: "POST",
          url: "api/search/",
          data: $('#faceted-search-form').serialize() + '&sort=' + $("#sorting-select").val(),
          beforeSend:function(){
            $('#results-list').html('<div id="loading-container"><h2 id="container">Loading...</h2><img src="{{ STATIC_URL }}img/loading.gif" alt="Loading..." /></div>');
          },
          success: function(res, status, xhr) {
            $("#results-number").html(xhr.getResponseHeader("rollcall_number") + " rollcalls");
            $("#results-list").html(res);
           }
          });
          $("#download-btn").hide();
        }

      // Get a rollcalls page and append them to the container
      function getRollcallsPage(){
        $.ajax({
          type: "POST",
          url: "api/search/",
          data: $('#faceted-search-form').serialize() + '&sort=' + $("#sorting-select").val() + '&page=' + page,
          beforeSend:function(){
            $('#next-page').html('Loading...').attr('disabled', 'disabled');
          },
          success: function(res, status, xhr) {
            $("#results-list").append(res);
            $('#next-page').html('Load more').removeAttr('disabled');
           }
          });
        }

      // Initial call to the function
      getRollcalls();

      // Pagination
      $("#next-page").click(function(e){
        e.preventDefault();
        page = page + 1;
        getRollcallsPage();
      });

      // On form change we reset the search and do the initial AJAX call
      $("#faceted-search-form input:not(#searchTextInput), #sorting-select").change(function() {
          page = 1;
          getRollcalls();
      });

      // Prevent to do a AJAX call everytime we update the search bar
      $("#faceted-search-form").submit(function(event) {
        event.preventDefault();
        page = 1;
        getRollcalls();
      });

      // Display the download excel button
      $(document.body).on("change", "#download-rollcalls-form :input", function() {
        showDownload();
      });

      function showDownload () {
        if ($("#download-rollcalls-form input:checkbox:checked").length > 0) {
            $("#download-btn").show();
        }
        else {
          console.log("pirate");
            $("#download-btn").hide();
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
      if($('#facet-peltzman input[type=checkbox]:checked').length) {
        $("#facet-peltzman").collapse('show');
      }
      if($('#fromDate').val()  || $("#toDate").val()) {
        $("#facet-date").collapse('show');
      }
      if($('#fromSession').val()  || $("#toSession").val()) {
        $("#facet-session").collapse('show');
      }
  });
