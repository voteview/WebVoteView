	var maxZoom = 20; // Set this to override max/min zoom
	var minZoom = 0.25; // Set this to override max/min zoom
	var incrementZoom = 0.25;
	var zoom = 1;
	var dimX = 890;
	var dimY = 500;
	var panX = 0;
	var panY = 0;
	var panThrottle = 0;

	function zoomCSS()
	{
		if(zoom>=10) { d3.selectAll(".district").classed('zoomed3', true).classed('zoomed2',false); }
		else if(zoom>=4) { d3.selectAll(".district").classed('zoomed2', true).classed('zoomed1',false).classed('zoomed3',false); }
		else if(zoom>=2) { d3.selectAll(".district").classed('zoomed1',true).classed('zoomed2',false); }
		else { d3.selectAll(".district").classed('zoomed1', false); }
	}

	function resetZoom()
	{
		zoom=1;
		doZoom(0);
	}

	function doZoom(dir)
	{
		extentXOld = dimX/zoom;
		extentYOld = dimY/zoom;
		centerX = panX+(extentXOld/2);
		centerY = panY+(extentYOld/2);

		var zoomMult = 1;
		if(zoom>=10) { zoomMult = 20; }
		else if(zoom>=3) { zoomMult = 4; }
		else if(zoom>=1) { zoomMult = 2; }
		else { zoomMult = 1; }

		if(dir==1) { zoom=zoom+(incrementZoom*zoomMult); }
		else { zoom=zoom-(incrementZoom*zoomMult); }
		if(zoom<=minZoom) { zoom=minZoom; $("#zoomOut").fadeOut(); }
		else { $("#zoomOut").fadeIn(); }
		if(zoom>=maxZoom) 
		{ 
			zoom=maxZoom; 
			$("#zoomIn").prop('disabled',true).delay(4000).fadeOut(); 
		}
		else { $("#zoomIn").prop('disabled',false).fadeIn(); }

		zoomCSS();

		extentX = dimX/zoom;
		extentY = dimY/zoom

		newPanX = centerX-(extentX/2);
		newPanY = centerY-(extentY/2);
		panX = newPanX;
		panY = newPanY;

		filterPans();
	}

	function doPanX(dest)
	{
		if(panThrottle) { return; }
		panX = dest["value"];
		filterPans();
	}

	function doPanY(dest)
	{
		if(panThrottle) { return; }
		panY = dest["value"];
		filterPans();
	}

	function filterPans()
	{
		if(zoom>1)
		{
			if(panX<0) { panX=0; }
			if(panY<0) { panY=0; }
			if(panX > dimX-(dimX/zoom)) { panX = dimX-(dimX/zoom); }
			if(panY > dimY-(dimY/zoom)) { panY = dimY-(dimY/zoom); }

			$("#panX").fadeIn();
			$("#panY").fadeIn();

			panThrottle=1;

			$("#ex2").slider("setAttribute","max",dimX-(dimX/zoom));
			$("#ex2").slider("setValue", panX, true);

			$("#ex1").slider("setAttribute","max",dimY-(dimY/zoom));
			$("#ex1").slider("setValue", panY, true);

			panThrottle=0;
		}
		else if(zoom==1)
		{
			panX = 0;
			panY = 0;
			$("#panX").fadeOut();
			$("#panY").fadeOut();			
		}
		else
		{
			panX = 0 - ((dimX/zoom)-dimX)/2;
			panY = 0 - ((dimY/zoom)-dimY)/2;
			$("#panX").fadeOut();
			$("#panY").fadeOut();
		}
		$("#map-chart > svg")[0].setAttribute("viewBox",panX+" "+panY+" "+extentX+" "+extentY);
	}

	$('#ex1').slider({}).on('slide', doPanY);
	$('#ex2').slider({}).on('slide', doPanX);
	$("#panX").hide();
	$("#panY").hide();
