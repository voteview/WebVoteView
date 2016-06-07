	var maxZoom = 5; // Set this to override max/min zoom
	var minZoom = 0.25; // Set this to override max/min zoom
	var zoom = 1;
	var dimX = 890;
	var dimY = 500;
	var panX = 0;
	var panY = 0;
	var panThrottle = 0;

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

		if(dir==1) { zoom=zoom+0.25; }
		else if(dir==-1) { zoom=zoom-0.25; }
		if(zoom<=minZoom) { zoom=minZoom; $("#zoomOut").fadeOut(); }
		else { $("#zoomOut").fadeIn(); }
		if(zoom>=maxZoom) { zoom=maxZoom; $("#zoomIn").fadeOut(); }
		else { $("#zoomIn").fadeIn(); }
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
