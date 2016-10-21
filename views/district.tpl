% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase('base.tpl', title='District View', extra_css=['map.css', 'scatter.css'])
% include('header.tpl')

<div class="container">
	<h2>THIS PAGE HAS NOT BEEN LAID OUT YET. NO UI OR DESIGN WORK HAS BEEN DONE.</h2>

	<h3>Your District Through History</h3>
	Enter your address or click the map pin below to the begin:<br/>

	Address: <input type="text" id="addressInput"> <input type="button" value="Go" onclick="javascript:latLongWrapper();"> <span id="addressCorrected"></span>
	<br/>
	<div id="warnings" style="display:none;"></div>
	<div id="lookupLoad" style="display:none;">Address matched. Loading members...</div>
	<div id="resultsMembers"></div>
</div>
<script>
	if(navigator.geolocation)
	{
		console.log('html5 location support.');
		function success(position)
		{
			console.log(position.coords);
		}
		function error()
		{
			return;
		}
		navigator.geolocation.getCurrentPosition(success, error);
	}

	function latLongWrapper()
	{
		$("#warnings").hide();
		$("#lookupLoad").hide();
		$("#resultsMembers").hide().html("");
		$("#addressCorrected").html("");
		setTimeout(doLatLong, 20);
	}

	function doLatLong()
	{
		$.ajax({
			dataType: "JSON",
			url: "/api/geocode?q="+$("#addressInput").val(),
			success: function(data, status, xhr)
			{
				if(data["status"])
				{	
					$("#warnings").html("");
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
						$("#addressCorrected").html("<strong>Address Lookup:</strong> "+data["formatted_address"]);
					}
					$("#lookupLoad").fadeIn();
					doMembers(data["lat"], data["lng"]);
				}
			}
		});
	}

	function doMembers(lat, lng)
	{
		$.ajax({
			dataType: "JSON",
			url: "/api/districtLookup?lat="+lat+"&long="+lng,
			success: function(data, status, xhr)
			{
				$("#lookupLoad").fadeOut();
				console.log("ok good");
				var table = $("<table><thead><tr><td>Congress</td><td>District</td><td>Party</td><td>Member</td></tr></thead></table>");
				var tbody = $("<tbody></tbody>");
				$.each(data["results"], function(k, v)
				{
					console.log(v);
					var tr = $("<tr></tr>").on("click",function(){window.location='/person/'+v["icpsr"];});
					$("<td>"+v["congress"]+"</td>").appendTo(tr);
					$("<td>"+v["state_abbrev"]+"-"+v["district_code"]+"</td>").appendTo(tr);
					$("<td>"+v["party_name"]+"</td>").appendTo(tr);
					$("<td><a href=\"/person/"+v["icpsr"]+"\">"+v["bioname"]+"</a></td>").appendTo(tr);
					tr.appendTo(tbody);
				});
				tbody.appendTo(table);
				table.appendTo($("#resultsMembers"));
				$("#resultsMembers").fadeIn();
			}
		});
	}
</script>
<script>var congressNum=114;</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>

