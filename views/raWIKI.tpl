<body style="margin:0;padding:0;">
	<div style="position:fixed; width:100%;height:100%; margin-left:100px; border:0;" frameborder="0">
		<iframe src="http://en.m.wikipedia.org/wiki/{{person["wiki"]}}" style="width:100%;height:100%;"></iframe>
	</div>

	<div style="position:fixed;left:0px;width:300px;top:0px;height:100%;overflow:hidden;padding:10px;margin-right:10px;border-right:3px solid black;background-color:white;clear:none;z-index:100;">
		<!--<img src="/static/img/wiki/{{str(person["icpsr"]).zfill(6)}}.jpg" style="max-height:350px;max-width:300px;margin:0 auto 0 auto;"> -->
		<h1>{{person["bioName"]}} ({{person["icpsr"]}})</h1>
		<strong>{{person["partyname"]}}</strong> {{person["stateName"]}} {{person["cqlabel"]}}<br/>
		% if "born" in person:
		Born: {{person["born"]}}
		% end
		 - 
		% if "died" in person:
		Died: {{person["died"]}}<br/>
		% end
		% if "bio" in person:
		<br/>
		<em>{{" ".join(person["bio"].split()[0:200])}}</em>
		% end

		<br/><br/>
	</div>

		<div style="position:fixed;width:300px;left:0px;bottom:0px;height:85px;border:0;z-index:110;background-color:white;">
			<form action="/ra/wiki" method="POST" style="float:left;">
				<input type="hidden" name="icpsrId" value="{{person["icpsr"]}}">
				<input type="hidden" name="status" value="1">
				<input type="submit" style="padding:10px;width:150px;height:70px;font-size:40px;font-weight:2100;background-color:green;color:white;float:left;" value="MATCH">
			</form>
			<form action="/ra/wiki" method="POST" style="float:right;">
				<input type="hidden" name="icpsrId" value="{{person["icpsr"]}}">
				<input type="hidden" name="status" value="-1">
				<input type="submit" style="padding:10px;width:100px;height:70px;font-size:40px;font-weight:2100;background-color:red;color:white;float:right;" value="BAD">
			</form>
		</div>

</body>
