% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase('base.tpl', title='District View', extra_css=['map.css', 'scatter.css'])
% include('header.tpl')

<div class="container">
	Sample test addresses:<br/>
	<ul style="columns:3;" id="testData">
		<li>12040 Louise Ave, Los Angeles, CA</li>
		<li>222 S Milton Rd, Flagstaff, AZ</li>
		<li>206 Washington St SW, Atlanta, GA, 30334</li>
		<li>150 Rideau St, Ottawa, Ontario, CA</li>
		<li>3111 World Dr, Orlando, FL</li>
		<li>120 e 4th st, juneau</li>
		<li>415 S. Beretania Street Honolulu, Hawaii</li>
		<li>	900 Court Street NE, Salem, Oregon, US</li>
		<li>416 Sid Snyder Avenue SW, Olympia</li>
		<li>600 Dexter Ave, Montgomery, AL 36130</li>
		<li>500 Woodlane St, Little Rock, AR</li>
		<li> 200 E Colfax Ave, Denver, CO</li>
		<li> 210 Capitol Ave, Hartford, CT 06106</li>
		<li>141 Mullett Run St, milford, de</li>
		<li>226 W 46th St, New York, NY</li>
		<li> 700 W Jefferson St, Boise</li>
		<li>geographic center of the united states</li>
		<li>1007 E Grand, Des Moines, IA</li>
		<li>700 Capital Ave, Frankfort, KY</li>
		<li>bourbon st, new orleans</li>
		<li style="font-weight:700;">augusta, me</li>
		<li>1900 Kanawha Boulevard East, Charleston, West Virginia</li>
		<li>100 State Cir, Annapolis, MD</li>
		<li>24 Beacon St, Boston, MA</li>
		<li>1234 Urb Los Olmos, Ponce, PR, 00731</li>
		<li>1245 Pale San Vitores Rd, Tamuning, Guam</li>
		<li>6450 Coki Point, St. Thomas, USVI</li>
		<li>P.O. Box 504272, Mariana Islands</li>
		<li>3222 main highway, pago pago tutuila, american samoa</li>
		<li>1600 pennsylvania ave, washington dc</li>
	</ul>

	<h3>Your District Through History</h3>
	To see who has represented you through history, enter your address <span id="geolocationTutorial" style="display:none;">or click the map pin below</span> to begin:<br/>
	<small><em>Privacy Notice: Voteview.com uses this information solely to fulfill your request. Address information is not logged, saved, or stored.</em></small><br/><br/>

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
	<div class="col-md-7">
		<div id="warnings" style="display:none;"></div>
		<div id="loadProgress" style="display:none;"></div>
		<div id="resultsMembers"></div>
	</div>
	<div class="col-md-5" style="height:300px;">
		<div id="google_map" style="width:100%;height:100%;"></div>
	</div>
</div>
<script>var congressNum=114;</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/district.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/memberTable.js"></script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDHpW18spAq_48_xICFApSrUttTzcWBDA8"></script>
