var tooltipIdeology = $("<div></div>").addClass("d3-tip").css("visibility","hidden").attr("id","tooltipIdeology").appendTo(document.body);

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
	$("#perm_link_holder").html("");
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
	$("#submit-geolocation").click(function(event)
	{
		event.preventDefault();
		getLocation();
	});
	if($("#cachedLat").val()) { myLat = $("#cachedLat").val(); }
	if($("#cachedLong").val()) { myLong = $("#cachedLong").val(); }
	if($("#addressInput").val()) { setTimeout(function(){latLongWrapper();},1000); }
	$("ul#testData li").on("click",function(){ loadText(this.innerHTML); });
	$("ul.notableExamples li").on("click",function(){ loadText(this.innerHTML); });
	deoGeolocation();
});

function doGeolocation()
{
	if(navigator.geolocation)
	{
		globalEnableLocation=1;
		console.log('html5 location support detected.');
		$("#locationButton").css("display", "table-cell");
		function success(position)
		{
			clearTimeout(slowTimer);
			myLat = position.coords.latitude;
			myLong = position.coords.longitude;
			$("#cachedLat").val(myLat);
			$("#cachedLong").val(myLong);
			$("#addressInput").val("MY LOCATION");
			resetResults();
			$("#loadProgress").show().html("<strong>Loading...</strong> Location matched, looking up historical representatives... <img src=\"/static/img/loading.gif\" style=\"width:16px;\">");
			doMembers(myLat, myLong);
		}
		function error()
		{
			clearTimeout(slowTimer);
			resetResults();
			$("#warnings").html("").show();
			var errorDiv = $("<div></div>").addClass("alert alert-danger").html("<strong>Error:</strong> Error looking up your location. Most commonly this occurs because you are having internet connection trouble or you have privacy settings designed to block web access to your location.");
			errorDiv.appendTo($("#warnings"));

			return;
		}
		function getLocation(event)
		{
			console.log('doing html5 geolocation lookup on user request');
			resetResults();
			$("#loadProgress").show().html("<strong>Loading...</strong> Looking up your current location... <img src=\"/static/img/loading.gif\" style=\"width:16px;\">");
			slowTimer = setTimeout(function() { $("#loadProgress").html($("#loadProgress").html()+"<br/>This process seems to be taking an unusually long time to complete. The delay is related to your internet connection, router, or web browser and is not connected to our server."); }, 5000);
			navigator.geolocation.getCurrentPosition(success, error);
		}
		$("#geolocationTutorial").show();
	}
}

function latLongWrapper()
{
	console.log('wrapper translates box input to geocode.');
	resetResults();
	if($("#addressInput").val()=="")
	{
		$("#warnings").html("").show();
		var errorDiv = $("<div></div>").addClass("alert alert-danger").html("<strong>Error:</strong> No address specified.");
		errorDiv.appendTo($("#warnings"));
		return;
	}
	else if($("#addressInput").val()=="MAP CENTER" && cachedCoords.length==2)
	{
		setTimeout(function(){doMembers(cachedCoords[0], cachedCoords[1])}, 20);
	}
	else if($("#addressInput").val()=="MY LOCATION" && globalEnableLocation && $("#cachedLat").val() && $("#cachedLong").val()) { doMembers(parseFloat($("#cachedLat").val()), parseFloat($("#cachedLong").val())); }
	else if($("#addressInput").val()=="MY LOCATION")
	{
		$("#warnings").html("").show();
		var errorDiv = $("<div></div>").addClass("alert alert-danger").html("<strong>Error:</strong> Error accessing your location, either due to internet connectivity or privacy settings. Please manually type an address to continue.");
		errorDiv.appendTo($("#warnings"));
	}
	else
	{
		$("#loadProgress").show().html("<strong>Loading...</strong> Matching address to map coordinates... <img src=\"/static/img/loading.gif\" style=\"width:16px;\">");
		window.history.pushState({"search": $("#addressInput").val()}, "Search for "+$("#addressInput").val(), "/district/"+$("#addressInput").val());
		window.onpopstate = function(event)
		{
			$("#addressInput").val(event.state["search"]);
			latLongWrapper();
		}
		setTimeout(doLatLong, 20);
	}
}

	function doLatLong()
	{
		console.log('sending an address to the geocoder.');
		$.ajax({
			dataType: "JSON",
			url: "/api/geocode?q="+$("#addressInput").val(),
			success: function(data, status, xhr)
			{
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
					if(data["warnings"]!=undefined && data["warnings"].length)
					{
						$("#warnings").html("");
						var warningDiv = $("<div></div>").addClass("alert alert-warning").html("<strong>Warning:</strong> "+data["warnings"][0]);
						warningDiv.appendTo($("#warnings"));
						$("#warnings").fadeIn();
					}
					$("#addressCorrected").html("<strong>Address Lookup:</strong><br/><small>"+data["formatted_address"]+"</small>");
					$("#loadProgress").html("<strong>Loading...</strong> Address matched, looking up historical representatives... <img src=\"/static/img/loading.gif\" style=\"width:16px;\">");
					doMembers(data["lat"], data["lng"]);
				}
			}
		});
	}

function compareSort(a, b)
{
	if(a.congress > b.congress) { return -1; }
	else if(a.congress < b.congress) { return 1; }
	else
	{
		if(a.party_noun < b.party_noun) { return -1; }
		else if(a.party_noun > b.party_noun) { return 1; }
		else
		{
			if(a.bioname < b.bioname) { return -1; }
			else { return 1; }
		}
	}
}

function precisionRound(num, p)
{
	return +(Math.round(num+"e+"+p)+"e-"+p);
}

	var globalMap;
	var markerSet = [];
	var cachedCoords = [];
	var initialLoad=0;
	var markerPos;
	function doMembers(lat, lng)
	{
		// We started a load, so don't fire the map move event while we're loading
		initialLoad = 1;
		// Cache the lookup coordinates to make the map mover work
		cachedCoords = [lat, lng];
 		markerPos = {lat: lat, lng: lng};
		var map = new google.maps.Map(document.getElementById("google_map"), 
						{zoom: 12, minZoom: 7, maxZoom: 12, 
						center: markerPos, disableDefaultUI: true, 
						scrollwheel: false, draggable: true, 
						zoomControl: true});
		globalMap = map;
		// Put the marker in the lat/long
		var marker = new google.maps.Marker({position: markerPos, map: map});
		markerSet.push(marker);

		$.ajax({
			dataType: "JSON",
			url: "/api/districtLookup?lat="+lat+"&long="+lng,
			success: function(data, status, xhr)
			{
				$("#loadProgress").fadeOut();

				if(data["resCurr"]!=undefined && data["resCurr"].length)
				{
					$("<h4>Current Congressperson and Senators</h4>").appendTo("#resultsMembers");
					var memberList = $("<ul></ul>").attr("id","memberList").addClass("geography");
					memberList.appendTo("#resultsMembers");
					$.each(data["resCurr"], function(k,v)
					{
						constructPlot(v, 0, ["name", "party", "chamber", "elected"]);
					});
				}

				var permLink = $("<a></a>").attr("href","/district/"+encodeURI($("#addressInput").val())).html("Permanent Link to this address search.");
				permLink.appendTo($("#perm_link_holder"));

				$("<h4>Historical Representatives</h4>").appendTo("#resultsMembers");
				var table = $("<table><thead><tr><th>Congress</th><th>District</th><th>Ideology</th><th>Party</th><th>Member</th></tr></thead></table>")
						.addClass("table table-hover dc-data-table");
				var tbody = $("<tbody></tbody>");

				// For visual design, we do a pocket algorithm; save the last guy, compare to current guy, see what's changed.
				var lastResult = {};
				var myResults = data["results"].sort(compareSort);

				$.each(myResults, function(k, v)
				{
					// Check to see if we have other members at the same time
					var multiMember=0;
					if(v["congress"]<90)
					{	
						var howMany = $.grep(myResults, function(n,i) { return (n["congress"]==v["congress"]); });
						if(howMany.length>1) { multiMember=1; }
					}

					// Explainers for weird edge cases (partition/joining or the Civil War)
					if(lastResult["congress"] > 38 && lastResult["congress"] <= 45 && v["congress"] < 37 && v["congress"] >= 30)
					{
						var civilWarDiv = $("<div></div>")
								.addClass("alert alert-info")
								.html("<strong>United States Civil War</strong>: " + v["state"] + " does not seat a delegation in the US Congress.");
						var tr = $("<tr></tr>");
						var td = $("<td colspan=\"5\"></td>");
						civilWarDiv.appendTo(td);
						td.appendTo(tr);
						tr.appendTo(tbody);
					}
					if(lastResult["state"] == "Maryland" && Math.abs(v["congress"] - lastResult["congress"]) > 20)
					{
						var maryDiv = $("<div></div>")
								.addClass("alert alert-info")
								.html("<strong>D.C.</strong>: The changing shapes of congressional districts occasionally include the address you entered in Maryland. As above, Voteview.com does not track D.C. delegates.");
						var tr = $("<tr></tr>");
						var td = $("<td colspan=\"5\"></td>");
						maryDiv.appendTo(td);
						td.appendTo(tr);
						tr.appendTo(tbody);
					}
					if(lastResult["state"]=="West Virginia" && v["state"]=="Virginia")
					{
						var virgDiv = $("<div></div>")
								.addClass("alert alert-info")
								.html("<strong>United States Civil War</strong>: West Virginia breaks away from Virginia to form a new state.");
						var tr = $("<tr></tr>");
						var td = $("<td colspan=\"5\"></td>");
						virgDiv.appendTo(td);
						td.appendTo(tr);
						tr.appendTo(tbody);
					}
					if(lastResult["state"]=="Maine" && v["state"]=="Massachusetts")
					{
						var maineDiv = $("<div></div>")
								.addClass("alert alert-info")
								.html("<strong>1820</strong>: Maine votes to secede from Massachusetts and is admitted to the union as a state.");
						var tr = $("<tr></tr>");
						var td = $("<td colspan=\"5\"></td>");
						maineDiv.appendTo(td);
						td.appendTo(tr);
						tr.appendTo(tbody);
					}


					var tr = $("<tr></tr>").on("click",function(){window.location='/person/'+v["icpsr"]+"/"+v["seo_name"];});
					dateSet = congToYears(v["congress"]);
					
					if(v["nominate"]!=undefined && v["nominate"]["dim1"]!=undefined) { var nomOffset = Math.floor((v["nominate"]["dim1"]+1.01)*50); }

					$("<td></td>")
						.html(getGetOrdinal(v["congress"]) + " (" + dateSet[0] + "-" + dateSet[1].toString().substr(2,2) + ")")
						.appendTo(tr);
					$("<td></td>")
						.html(v["state_abbrev"] + "-" + lzPad(v["district_code"]))
						.addClass("district").appendTo(tr);

					if(v["nominate"]!=undefined && v["nominate"]["dim1"]!=undefined)
					{
						var nomDiv = $("<span></span>")
								.addClass("nom_ideology")
								.addClass("geo_nom_" + v["party_color"])
								.css("width",nomOffset+"%");
						var holdingTD = $("<td></td>").addClass("ideology");
						nomDiv.appendTo(holdingTD);
						holdingTD.appendTo(tr);
					}
					else
					{
						$("<td></td>").appendTo(tr);
					}

					$("<td></td>").html(v["party_noun"]).addClass("party").appendTo(tr);

					$("<td></td>").html("<a href=\"/person/"+v["icpsr"]+"/"+v["seo_name"]+"\">"+v["bioname"]+"</a>").appendTo(tr);

					// Use a closure to pin tooltips onto each row. 
					(function(v){
						tr.on("mouseover", function()
						{
							console.log($(this).children(".ideology").offset().left);
							$("#tooltipIdeology").html("");
							var ideologyTooltip = "<strong>DW-NOMINATE</strong>: " + v["nominate"]["dim1"] + "<br/><small>Scores from -1 (Very Liberal) to 1 (Very Conservative)</small>";
							if(v["nominate"]!=undefined) { $("#tooltipIdeology").html(ideologyTooltip); }
							else { $("#tooltipIdeology").html("<strong>No Ideology Score</strong>"); }

							$("#tooltipIdeology").removeClass().addClass("d3-tip");
							$("#tooltipIdeology").css("left",($(this).children(".ideology").offset().left - $("#tooltipIdeology").width() - 25)+"px");
							$("#tooltipIdeology").css("top",$(this).offset().top+"px");
							$("#tooltipIdeology").css("visibility","visible");			
						});
						tr.on("mouseout",function() { $("#tooltipIdeology").css("visibility","hidden"); });
					})(v);

					tr.appendTo(tbody);

					lastResult = v;
				});
				tbody.appendTo(table);
				table.appendTo($("#resultsMembers"));
				//permLink.appendTo($("#resultsMembers"));
				$("#resultsMembers").fadeIn();
			}
		});

		$.ajax({
			dataType: "JSON",
			url: "/api/districtPolygonLookup?lat="+lat+"&long="+lng,
			success: drawMapDistrictPolygon
			});

	}


function drawMapDistrictPolygon(data, status, xhr)
{
	// From StackOverflow, single Google can't let you get a polygon's bounds
	google.maps.Polygon.prototype.getBounds = function(bounds) 
	{
		if(bounds == null) var bounds = new google.maps.LatLngBounds();
		var paths = this.getPaths();
		for (var i = 0; i < paths.getLength(); i++) 
		{
			path = paths.getAt(i);
			for (var ii = 0; ii < path.getLength(); ii++) bounds.extend(path.getAt(ii));
		}
		return bounds;
	}

	// Draw congressional district polygon.
	if(data["polygon"] == undefined || !data["polygon"].length) return;

	var tempBounds = new google.maps.LatLngBounds();
	var poly_color = ["#FF0000", "#FF0000"];
	console.log("Drawing district polygon in map.");
	for(var j in data["polygon"])
	{
		var new_poly;

		// Data has different levels of nestedness.
		if(data["polygon"][j].length == 1) new_poly = data["polygon"][j][0];
		else new_poly = data["polygon"][j];

		var polygonData = [];
		for(var i=0; i!=new_poly.length; i++) polygonData.push({"lat": new_poly[i][1], "lng": new_poly[i][0]});
		var districtPolygon = new google.maps.Polygon({
			paths: polygonData,
			strokeColor: poly_color[0],
			strokeOpacity: 0.8,
			strokeWeight: 2,
			fillColor: poly_color[1],
			fillOpacity: 0.2
		});
		districtPolygon.setMap(globalMap); 
		// Get polygon bounds for this polygon
		tempBounds = districtPolygon.getBounds(tempBounds);
	}

	// Zoom out to the appropriate zoom to fill the polygon.
	globalMap.fitBounds(tempBounds);
	globalMap.setCenter(markerPos);
	globalMap.setZoom(globalMap.getZoom() + 1);
}
