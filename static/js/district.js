// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
var myLat, myLong;
var slowTimer;
var globalEnableLocation = 0;

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

function loadText(t)
{
	$("#addressInput").val(t);
	latLongWrapper();	
}

function resetResults()
{
	$("#resultsMembers").hide().html("");
	$("#addressCorrected").html("");
	$("#google_map").html("");
	$("#warnings").hide().html("");
	$("#loadProgress").hide().html("");
}

	$(document).ready(function(){
		$("#addressInput").on("focus",function() {
			if($("#addressInput").val()=="MY LOCATION") { $("#addressInput").val(""); }
		});
		$("#submit-address-form").submit(function(event)
		{
			event.preventDefault();
			latLongWrapper();
		});
		if($("#cachedLat").val()) { myLat = $("#cachedLat").val(); }
		if($("#cachedLong").val()) { myLong = $("#cachedLong").val(); }
		if($("#addressInput").val()) { setTimeout(function(){latLongWrapper();},1000); }
		$("ul#testData li").on("click",function(){ console.log($(this).val()); loadText(this.innerHTML); });
	});

	if(navigator.geolocation)
	{
		globalEnableLocation=1;
		console.log('html5 location support.');
		$("#locationButton").show();
		function success(position)
		{
			clearTimeout(slowTimer);
			console.log(position.coords);
			myLat = position.coords.latitude;
			myLong = position.coords.longitude;
			$("#cachedLat").val(myLat);
			$("#cachedLong").val(myLong);
			$("#addressInput").val("MY LOCATION");
			resetResults();
			$("#loadProgress").show().html("<strong>Loading...</strong> Location matched, looking up historical representatives... <img src=\"static/img/loading.gif\" style=\"width:16px;\">");
			doMembers(myLat, myLong);
		}
		function error()
		{
			clearTimeout(slowTimer);
			resetResults();
			$("#loadProgress").show().html("<strong>Error:</strong> Error looking up your location. Most commonly this occurs because you are having internet connection trouble or you have privacy settings designed to block web access to your location.");
			return;
		}
		function getLocation()
		{
			resetResults();
			$("#loadProgress").show().html("<strong>Loading...</strong> Looking up your current location... <img src=\"static/img/loading.gif\" style=\"width:16px;\">");
			console.log('show 2');
			slowTimer = setTimeout(function() { $("#loadProgress").html($("#loadProgress").html()+"<br/>This process seems to be taking an unusually long time to complete. The delay is related to your internet connection, router, or web browser and is not connected to our server."); }, 5000);
			navigator.geolocation.getCurrentPosition(success, error);
		}
		$("#geolocationTutorial").show();
	}

	function latLongWrapper()
	{
		resetResults();
		if($("#addressInput").val()=="MY LOCATION" && globalEnableLocation && $("#cachedLat").val() && $("#cachedLong").val()) { doMembers(parseFloat($("#cachedLat").val()), parseFloat($("#cachedLong").val())); }
		else if($("#addressInput").val()=="MY LOCATION")
		{
			$("#warnings").html("").show();
			var errorDiv = $("<div></div>").addClass("alert alert-danger").html("<strong>Error:</strong> Error accessing your location, either due to internet connectivity or privacy settings. Please manually type an address to continue.");
			errorDiv.appendTo($("#warnings"));
		}
		else
		{
			$("#loadProgress").show().html("<strong>Loading...</strong> Matching address to map coordinates... <img src=\"static/img/loading.gif\" style=\"width:16px;\">");
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
		var map = new google.maps.Map(document.getElementById("google_map"), {zoom: 12, center: markerPos, disableDefaultUI: true, scrollwheel: false, draggable: false});
		var market = new google.maps.Marker({position: markerPos, map: map});

		$.ajax({
			dataType: "JSON",
			url: "/api/districtLookup?lat="+lat+"&long="+lng,
			success: function(data, status, xhr)
			{
				$("#loadProgress").fadeOut();
				console.log("ok good");
				if(data["resCurr"].length)
				{
					$("<h4>Current Congressperson and Senators</h4>").appendTo("#resultsMembers");
					var memberList = $("<ul></ul>").css("columns","auto 3")
								.css("list-style-type","none").css("overflow","auto")
								.css("width","100%").css("margin-left",0).css("padding-left",0).css("margin-bottom","15px")
								.css("display","block").attr("id","memberList");
					memberList.appendTo("#resultsMembers");
					//boxDiv.appendTo("#resultsMembers")
					$.each(data["resCurr"], function(k,v)
					{
						constructPlot(v, 0);
					});
				}

				$("<h4>Historical Representatives</h4>").appendTo("#resultsMembers");
				var table = $("<table><thead><tr><th>Congress</th><th>District</th><th>Party</th><th>Member</th></tr></thead></table>")
						.addClass("table table-hover dc-data-table");
				var tbody = $("<tbody></tbody>");
				var lastICPSR = 0;
				var lastCong = 0;
				var lastState = ""
				$.each(data["results"], function(k, v)
				{
					if(lastCong>38 && v["congress"]<37)
					{
						var civilWarDiv = $("<div></div>").addClass("alert alert-info").html("<strong>United States Civil War</strong>: "+v["state"]+" does not seat a delegation in the US Congress.");
						var tr = $("<tr></tr>");
						var td = $("<td colspan=\"4\"></td>");
						civilWarDiv.appendTo(td);
						td.appendTo(tr);
						tr.appendTo(tbody);
					}
					if(lastState=="West Virginia" && v["state"]=="Virginia")
					{
						var virgDiv = $("<div></div>").addClass("alert alert-info").html("<strong>United States Civil War</strong>: West Virginia breaks away from Virginia to form a new state.");
						var tr = $("<tr></tr>");
						var td = $("<td colspan=\"4\"></td>");
						virgDiv.appendTo(td);
						td.appendTo(tr);
						tr.appendTo(tbody);
					}
					if(lastState=="Maine" && v["state"]=="Massachusetts")
					{
						var maineDiv = $("<div></div>").addClass("alert alert-info").html("<strong>1820</strong>: Maine votes to secede from Massachusetts and is admitted to the union as a state.");
						var tr = $("<tr></tr>");
						var td = $("<td colspan=\"4\"></td>");
						maineDiv.appendTo(td);
						td.appendTo(tr);
						tr.appendTo(tbody);
					}

					lastCong = parseInt(v["congress"]);
					lastState = v["state"];
					var tr = $("<tr></tr>").on("click",function(){window.location='/person/'+v["icpsr"];});
					dateSet = congToYears(v["congress"]);
					console.log(dateSet[0].toString().substr(2,2));
					if(lastICPSR!=parseInt(v["icpsr"]))
					{
						$("<td>"+getGetOrdinal(v["congress"])+" ("+dateSet[0]+"-"+dateSet[1].toString().substr(2,2)+")</td>").appendTo(tr);
						$("<td>"+v["state_abbrev"]+"-"+lzPad(v["district_code"])+"</td>").appendTo(tr);
						$("<td>"+v["party_noun"]+"</td>").css("border-left","3px solid "+colorSchemes[v["party_color"]][0]).appendTo(tr);
						$("<td><a href=\"/person/"+v["icpsr"]+"\">"+v["bioname"]+"</a></td>").appendTo(tr);
						lastICPSR = parseInt(v["icpsr"]);
					}
					else
					{
						$("<td>"+getGetOrdinal(v["congress"])+" ("+dateSet[0]+"-"+dateSet[1].toString().substr(2,2)+")</td>").appendTo(tr);
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
