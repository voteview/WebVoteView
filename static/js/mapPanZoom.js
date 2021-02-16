let maxZoom = 20; // Set this to override max/min zoom
let minZoom = 0.25; // Set this to override max/min zoom
let incrementZoom = 0.25;
let zoom = 1;
let dimX = 890;
let dimY = 500;
let panX = 0;
let panY = 0;
let panThrottle = 0;

function zoomCSS()
{
	const zoomClass =
		(zoom >= 10) ? "stroke4" :
		(zoom >= 4) ? "stroke3" :
		(zoom >= 2) ? "stroke2" : "stroke1";
	d3.selectAll(".district").attr("class", `district ${zoomClass}`);
}

function resetZoom()
{
	zoom = 1;
	doZoom(0);
}

function doZoom(dir)
{
	extentXOld = dimX / zoom;
	extentYOld = dimY / zoom;
	centerX = panX + (extentXOld / 2);
	centerY = panY + (extentYOld / 2);

	const zoomMult =
		(zoom >= 10) ? 20 :
		(zoom >= 3) ? 4 :
		(zoom >= 1) ? 2 : 1;

	// dir is 1 or -1.
	zoom = zoom + (dir * (incrementZoom * zoomMult));

	// Clamp to minimum zoom
	if(zoom <= minZoom) { zoom = minZoom; $("#zoomOut").fadeOut(); }
	else { $("#zoomOut").fadeIn(); }

	if(zoom >= maxZoom)
	{
		zoom = maxZoom;
		$("#zoomIn")
			.prop('disabled', true)
			.delay(4000)
			.fadeOut();
	} else {
		$("#zoomIn")
			.prop('disabled', false)
			.fadeIn();
	}

	zoomCSS();

	// How large will the new coords be?
	extentX = dimX / zoom;
	extentY = dimY / zoom
	newPanX = centerX - (extentX / 2);
	newPanY = centerY - (extentY / 2);
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
	if(zoom > 1)
	{
		if(panX < 0) { panX = 0; }
		if(panY < 0) { panY = 0; }
		if(panX > dimX - (dimX / zoom)) { panX = dimX - (dimX / zoom); }
		if(panY > dimY - (dimY / zoom)) { panY = dimY - (dimY / zoom); }

		$("#panX").fadeIn();
		$("#panY").fadeIn();

		panThrottle = 1;

		$("#ex2").slider("setAttribute", "max", dimX - (dimX / zoom));
		$("#ex2").slider("setValue", panX, true);

		$("#ex1").slider("setAttribute", "max", dimY - (dimY / zoom));
		$("#ex1").slider("setValue", panY, true);

		panThrottle = 0;
	} else if(zoom == 1) {
		panX = 0;
		panY = 0;
		$("#panX").fadeOut();
		$("#panY").fadeOut();
	} else {
		panX = 0 - ((dimX / zoom) - dimX) / 2;
		panY = 0 - ((dimY / zoom) - dimY) / 2;
		$("#panX").fadeOut();
		$("#panY").fadeOut();
	}

	// Okay, good to go -- set the pan and zoom.
	$("#map-chart > svg")[0].setAttribute(
		"viewBox",
		`${panX} ${panY} ${extentX} ${extentY}`);
}

// Setup initial triggers
$('#ex1').slider({}).on('slide', doPanY);
$('#ex2').slider({}).on('slide', doPanX);
$("#panX").hide();
$("#panY").hide();
