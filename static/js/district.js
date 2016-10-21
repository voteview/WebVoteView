	$(document).ready(function(){
		$("#submit-address-form").submit(function(event)
		{
			event.preventDefault();
			latLongWrapper();
		});
		if($("#addressInput").val()) { latLongWrapper(); }
	});

	var myLat, myLong;
	if(navigator.geolocation)
	{
		console.log('html5 location support.');
		function success(position)
		{
			console.log(position.coords);
			myLat = position.coords.latitude;
			myLong = position.coords.longitude;
			$("#geolocationTutorial").show();
			$("#addressInput").val("MY LOCATION");
			doMembers(myLat, myLong);
		}
		function error()
		{
			return;
		}
		navigator.geolocation.getCurrentPosition(success, error);
	}

	function latLongWrapper()
	{
		if($("#addressInput").val()=="MY LOCATION" && myLat!=undefined && myLong!=undefined) { doMembers(myLat, myLong); }
		else
		{
			$("#warnings").hide();
			$("#loadProgress").show().html("<strong>Loading...</strong> Matching address to map coordinates... <img src=\"static/img/loading.gif\" style=\"width:16px;\">");
			$("#resultsMembers").hide().html("");
			$("#addressCorrected").html("");
			$("#google_map").html("");
			setTimeout(doLatLong, 20);
		}
	}

	function doLatLong()
	{
		$.ajax({
			dataType: "JSON",
			url: "/api/geocode?q="+$("#addressInput").val(),
			success: function(data, status, xhr)
			{
				console.log(data);
				if(data["status"])
				{	
					$("#warnings").html("");
					$("#loadProgress").fadeOut();
					console.log("Error! Oh no!");
					var errorDiv = $("<div></div>").addClass("alert alert-danger").html("<strong>Error:</strong> "+data["error_message"])
					errorDiv.appendTo($("#warnings"));
					$("#warnings").fadeIn();
					return;
				}
				else
				{
					console.log(data);
					if(data["warnings"]!=undefined && data["warnings"].length)
					{
						$("#warnings").html("");
						var warningDiv = $("<div></div>").addClass("alert alert-warning").html("<strong>Warning:</strong> "+data["warnings"][0]);
						warningDiv.appendTo($("#warnings"));
						$("#warnings").fadeIn();
					}
					$("#addressCorrected").html("<strong>Address Lookup:</strong><br/><small>"+data["formatted_address"]+"</small>");
					$("#loadProgress").html("<strong>Loading...</strong> Address matched, looking up historical representatives... <img src=\"static/img/loading.gif\" style=\"width:16px;\">");
					doMembers(data["lat"], data["lng"]);
				}
			}
		});
	}

	function doMembers(lat, lng)
	{
		var markerPos = {lat: lat, lng: lng};
		var map = new google.maps.Map(document.getElementById("google_map"), {zoom: 12, center: markerPos, disableDefaultUI: true});
		var market = new google.maps.Marker({position: markerPos, map: map});

		$.ajax({
			dataType: "JSON",
			url: "/api/districtLookup?lat="+lat+"&long="+lng,
			success: function(data, status, xhr)
			{
				$("#loadProgress").fadeOut();
				console.log("ok good");
				var table = $("<table><thead><tr><th>Congress</th><th>District</th><th>Party</th><th>Member</th></tr></thead></table>")
						.addClass("table table-hover dc-data-table");
				var tbody = $("<tbody></tbody>");
				$.each(data["results"], function(k, v)
				{
					var tr = $("<tr></tr>").on("click",function(){window.location='/person/'+v["icpsr"];});
					$("<td>"+v["congress"]+"</td>").appendTo(tr);
					$("<td>"+v["state_abbrev"]+"-"+v["district_code"]+"</td>").appendTo(tr);
					$("<td>"+v["party_noun"]+"</td>").appendTo(tr);

					$("<td><a href=\"/person/"+v["icpsr"]+"\">"+v["bioname"]+"</a></td>").appendTo(tr);
					tr.appendTo(tbody);
				});
				tbody.appendTo(table);
				table.appendTo($("#resultsMembers"));
				$("#resultsMembers").fadeIn();
			}
		});
	}
