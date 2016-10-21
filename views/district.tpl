% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase('base.tpl', title='District View', extra_css=['map.css', 'scatter.css'])
% include('header.tpl')

<div class="container">
	<h2>THIS PAGE HAS NOT BEEN LAID OUT YET. NO UI OR DESIGN WORK HAS BEEN DONE.</h2>

	Sample test addresses:<br/>
	<ul style="columns:4;">
		<li>12040 Louise Ave, Los Angeles, CA</li>
		<li>6000 S Sepulveda Blvd, Culver City, CA</li>
		<li>222 S Milton Rd, Flagstaff, AZ</li>
		<li>5649 Lauretta St, San Diego, CA</li>
		<li>206 Washington St SW, Atlanta, GA, 30334</li>
		<li>150 Rideau St, Ottawa, Ontario, CA</li>
		<li>161 Caruso Ave, Glendale, CA</li>
		<li>3111 World Dr, Orlando, FL</li>
		<li>1101 W Sligh Ave, Tampa, FL</li>
		<li>226 W 46th St, New York, NY</li>
		<li>1234 Urb Los Olmos, Ponce, PR, 00731</li>
		<li>Av. De Diego, San Juan, Puerto Rico</li>
		<li>1245 Pale San Vitores Rd, Tamuning, Guam</li>
		<li>6450 Coki Point, St. Thomas, USVI</li>
		<li>P.O. Box 504272, Mariana Islands</li>
		<li>3222 main highway, pago pago tutuila, american samoa</li>
		<li>1600 pennsylvania ave, washington dc</li>
	</ul>

	<h3>Your District Through History</h3>
	Enter your address or click the map pin below to the begin:<br/><br/>

	<form id="submit-address-form" action="." method="post">
	<div class="col-md-1" style="padding-top:5px;padding-bottom:5px;">
		<strong>Address:</strong> 
	</div>
	<div class="col-md-6">
		<div class="input-group">
			<input type="text" id="addressInput" class="form-control" placeholder="Enter an address or ZIP code.">
			<div class="input-group-btn">
				<button id="submit-search-string" class="btn btn-primary"><span class="glyphicon glyphicon-search"></span></button>
			</div>
		</div>
	</div>
	<div class="col-md-5" id="addressCorrected">
	</div>
	</form>
</div>
<div class="container" style="padding-top:10px; padding-bottom: 30px;">
	<div id="warnings" style="display:none;"></div>
	<div id="loadProgress" style="display:none;"></div>
	<div id="resultsMembers"></div>
</div>
<script>
	var cacheAddress = ""
	$(document).ready(function(){
		$("#submit-address-form").submit(function(event)
		{
			event.preventDefault();
			latLongWrapper();
		});
		if($("#addressInput").val()) { latLongWrapper(); }
	});

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
		$("#loadProgress").show().html("<strong>Loading...</strong> Matching address to map coordinates... <img src=\"static/img/loading.gif\" style=\"width:16px;\">");
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
					console.log(v);
					var tr = $("<tr></tr>").on("click",function(){window.location='/person/'+v["icpsr"];});
					$("<td>"+v["congress"]+"</td>").appendTo(tr);
					$("<td>"+v["state_abbrev"]+"-"+v["district_code"]+"</td>").appendTo(tr);
					$("<td>"+v["party_noun"]+"</td>").appendTo(tr);

/*					var 
        var memberBox = $("<li></li>")  .addClass("memberResultBox")
                                        .attr("id",member["icpsr"]).click(function(){window.location='/person/'+member["icpsr"];})
                                        .css("break-inside","avoid-column")
                                        .css("overflow","hidden").css("padding-right","5px");
        var linkBox = $("<a></a>").attr("href","/person/"+member["icpsr"]).attr("class","nohover").css("display", "block;");
        var imgBox = $("<img />").css("width","80px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
                                        .attr("src","/static/img/bios/"+member["bioImgURL"]);
        var bioText = $("<span></span>").css("font-size","0.9em").css("padding-right","0px")
                                        .html("<strong>"+memberNameFinal+"</strong><br/>"+member["party_noun"]+"<br/><!--<img src=\"/static/img/states/"+member["state_abbrev"]+".pn$
        imgBox.appendTo(linkBox);
        bioText.appendTo(linkBox);
        linkBox.appendTo(memberBox);*/

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

