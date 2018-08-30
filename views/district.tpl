% devserver=int(open("./server.txt","r").read().strip())
% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase('base.tpl', title='District View', extra_css=['map.css', 'scatter.css'])
% include('header.tpl')

<div class="container">
	<div class="row">
		<div class="col-md-12">
		<h3>Representing places through time</h3>
	
		% if devserver:
		<a href="#" onclick="javascript:$('#testData').css('overflow','auto').css('height','400px'); return false;">+</a> 
		Dev Server Test Addresses.
		<ul class="notableExamples" id="testData">
			<li>12040 Louise Ave, Los Angeles, CA</li>
			<li>206 Washington St SW, Atlanta, GA, 30334</li>
			<li>150 Rideau St, Ottawa, Ontario, CA</li>
			<li>3111 World Dr, Orlando, FL</li>
			<li>120 e 4th st, juneau</li>
			<li>415 S. Beretania Street Honolulu, Hawaii</li>
			<li>	900 Court Street NE, Salem, Oregon, US</li>
			<li>416 Sid Snyder Avenue SW, Olympia</li>
			<li>600 Dexter Ave, Montgomery, AL 36130</li>
			<li>500 Woodlane St, Little Rock, AR</li>
			<li>222 S Milton Rd, Flagstaff, AZ</li>
			<li> 200 E Colfax Ave, Denver, CO</li>
			<li> 210 Capitol Ave, Hartford, CT 06106</li>
			<li>141 Mullett Run St, milford, de</li>
			<li>226 W 46th St, New York, NY</li>
			<li> 700 W Jefferson St, Boise</li>
			<li>geographic center of the united states</li>
			<li>1007 E Grand, Des Moines, IA</li>
			<li>700 Capital Ave, Frankfort, KY</li>
			<li>bourbon st, new orleans</li>
			<li><strong>augusta, me</strong></li>
			<li>1900 Kanawha Boulevard East, Charleston, West Virginia</li>
			<li>100 State Cir, Annapolis, MD</li>
			<li>24 Beacon St, Boston, MA</li>
			<li>100 N Capitol Ave, Lansing, MI 48933</li>
			<li>75 Rev Dr Martin Luther King Jr Boulevard., St Paul, MN</li>
			<li>400 High St, Jackson, MS</li>
			<li>201 W Capitol Ave, Jefferson City, MO </li>
			<li>Helena, MT</li>
			<li>1445 K St, Lincoln, NE</li>
			<li>101 N Carson St, Carson City, NV</li>
			<li>107 North Main Street, Concord, NH</li>
			<li>125 W State St, Trenton, NJ</li>
			<li>490 Old Santa Fe Trail, Santa Fe, NM</li>
			<li>1 E Edenton St, Raleigh, NC</li>
			<li>600 E Boulevard Ave, Bismarck, ND</li>
			<li>Ohio</li>
			<li>2300 N Lincoln Blvd, Oklahoma City</li>
			<li>900 Court St NE, Salem, OR</li>
			<li>501 N 3rd St, Harrisburg, PA</li>
			<li> 82 Smith St, Providence, RI</li>
			<li>1100 Gervais St, Columbia, SC </li>
			<li>500 E Capitol Ave, Pierre, SD</li>
			<li>600 Charlotte Ave, Nashville, TN</li>
			<li>1100 Congress Ave, Austin</li>
			<li>valley of the gods</li>
			<li>115 State St, Montpelier, VT</li>
			<li>1000 Bank St, Richmond, VA</li>
			<li>West Virginia State Capitol, Charleston, WV</li>
			<li>2 E Main, Madison, WI</li>
			<li>yellowstone national park</li>
			<li>1234 Urb Los Olmos, Ponce, PR, 00731</li>
			<li>1245 Pale San Vitores Rd, Tamuning, Guam</li>
			<li>6450 Coki Point, St. Thomas, USVI</li>
			<li>P.O. Box 504272, Mariana Islands</li>
			<li>3222 main highway, pago pago tutuila, american samoa</li>
			<li>1600 pennsylvania ave, washington dc</li>
		</ul>
		% end

		<p>
			To find all of the house members who have represented a particular place through history, 
			enter the address <span id="geolocationTutorial">or click the map pin to search your current location</span>.  
			For fun, click on one of the notable example addresses below:
		</p>	


		<ul class="notableExamples">
			<li>520 Chestnut St, Philadelphia, PA 19106</li>
			<li>19 N Square, Boston, MA 02113</li>
			<li>3003 W Casino Rd, Everett, WA 98204</li>
			<li>2120 James M Wood Blvd, Los Angeles, CA 90006</li>
			<li>3302 Grand Ave. Louisville, KY</li>
			<li>11350 Constitution Hwy, VA 22957</li>
			<li>Window Rock, AZ 86515</li>
			<li>300 Alamo Plaza, San Antonio, TX 78205</li>
			<li>1060 W Addison St, Chicago, IL 60613</li>
		</ul>
	
		<p>
			<small><em>Privacy Notice: Voteview.com uses this information solely to fulfill your request. Address information is not logged, saved, or stored.</em></small>
		</p>
		</div>
	</div>
	<div class="row">
		<form id="submit-address-form" action="." method="post">
			<div class="col-md-1" class="address_marker">
				<strong>Address:</strong> 
			</div>
			<div class="col-md-7">
			<div class="input-group">
				<div class="input-group-btn" id="locationButton">
					<button id="submit-geolocation" type="button" class="btn btn-primary"><span class="glyphicon glyphicon-map-marker"></span></button>
				</div>
				<input type="text" id="addressInput" 
					class="form-control" placeholder="Enter an address or ZIP code."
	% if len(search):
					value="{{search}}"
	% end
				>

				<div class="input-group-btn">
					<button id="submit-search-string" class="btn btn-primary"><span class="glyphicon glyphicon-search"></span></button>
				</div>
				<input type="hidden" id="cachedLat"> <input type="hidden" id="cachedLong">
			</div>
			</div>
			<div class="col-md-4" id="addressCorrected">
			</div>
		</form>
	</div>
	<div class="row">
		<div class="col-md-8">
			<div id="warnings"></div>
			<div id="loadProgress"></div>
			<div id="resultsMembers"></div>
		</div>
		<div class="col-md-4" id="mapContainer">
			<div id="google_map"</div>
			<br/>
			<div id="perm_link_holder"></div>
		</div>

	</div>
</div>

<script>
var congressNum=114;
var mapParties = 1;
var nomDWeight = {{dimweight}};
var nomBeta = {{ nomBeta }};
var predefinedSearch = "{{ search }}";
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/sprintf.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/decorate.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/district.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/memberTable.js"></script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDHpW18spAq_48_xICFApSrUttTzcWBDA8"></script>
