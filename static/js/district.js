// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

function congToYears(n) { return [1787+(2*n), 1787+(2*n)+2]; }

function lzPad(t)
{
	if(parseInt(t)<10) { return "0"+t; }
	else { return t; }
}

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
				var lastICPSR = 0;
				$.each(data["results"], function(k, v)
				{
					var tr = $("<tr></tr>").on("click",function(){window.location='/person/'+v["icpsr"];});
					if(lastICPSR!=parseInt(v["icpsr"]))
					{
						$("<td>"+getGetOrdinal(v["congress"])+" ("+congToYears(v["congress"])[0]+"-"+congToYears(v["congress"])[1]+")</td>").appendTo(tr);
						$("<td>"+v["state_abbrev"]+"-"+lzPad(v["district_code"])+"</td>").appendTo(tr);
						$("<td>"+v["party_noun"]+"</td>").css("border-left","3px solid "+colorSchemes[v["party_color"]][0]).appendTo(tr);
						$("<td><a href=\"/person/"+v["icpsr"]+"\">"+v["bioname"]+"</a></td>").appendTo(tr);
						lastICPSR = parseInt(v["icpsr"]);
					}
					else
					{
						$("<td>"+getGetOrdinal(v["congress"])+" ("+congToYears(v["congress"])[0]+"-"+congToYears(v["congress"])[1]+")</td>").appendTo(tr);
						$("<td>"+v["state_abbrev"]+"-"+lzPad(v["district_code"])+"</td>").appendTo(tr);
						$("<td></td>").css("border-left","3px solid "+colorSchemes[v["party_color"]][0]).appendTo(tr);
						$("<td></td>").appendTo(tr);

					}
					tr.appendTo(tbody);
				});
				tbody.appendTo(table);
				table.appendTo($("#resultsMembers"));
				$("#resultsMembers").fadeIn();
			}
		});
	}
