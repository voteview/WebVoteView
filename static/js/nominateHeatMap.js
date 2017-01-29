// cdf and erf from http://stackoverflow.com/questions/14846767/std-normal-cdf-normal-cdf-or-error-function

function cdf(x,mean,variance) {
    return 0.5 * (1 + erf((x - mean) / (Math.sqrt(2 * variance))));
}

function erf(x) {
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // constants
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var p  =  0.3275911;

    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y; // erf(-x) = -erf(x);
}

function nomProbYea(x1,x2,m1,m2,s1,s2,w,b) {
    var Uy = b*( Math.exp( -Math.pow(x1-m1+s1,2) - w*w*Math.pow(x2-m2+s2,2)));
    var Un = b*( Math.exp( -Math.pow(x1-m1-s1,2) - w*w*Math.pow(x2-m2-s2,2)));
    return( cdf( Uy-Un, 0.0, 1.0) );
}

function lopsidedHeatmap(svg,w,width,height,colorRamp,pctYea) {
    var nominateScale = {x: d3.scale.linear().domain([-1,1]).range([0,width]) ,
			 y: d3.scale.linear().domain([-1,1]).range([height,0]) };
    var nominateScaleR = {x: d3.scale.linear().range([-1,1]).domain([0,width]) ,
                          y: d3.scale.linear().range([1,-1]).domain([0,height]) };
    var colorScale = d3.scale.linear()
	.domain([0,1])
	.range(colorRamp);
    svg.append("ellipse")
        .attr("stroke","grey")
        .attr("cx", nominateScale.x(0))
        .attr("cy", nominateScale.y(0))
        .attr("rx", nominateScale.x(1)/2)
        .attr("ry", nominateScale.y(-1)/2)
        .attr("fill",colorScale(pctYea));
}

function nominateHeatmap(svg,m1,m2,s1,s2,b,w,width,height,cells,colorRamp) {
    //div for tooltip to live in...
    var SQRT3 = Math.sqrt(3);

    var nominateScale = {x: d3.scale.linear().domain([-1,1]).range([0,width]) ,
			 y: d3.scale.linear().domain([-1,1]).range([height,0]) };

    var nominateScaleR = {x: d3.scale.linear().range([-1,1]).domain([0,width]) ,
                          y: d3.scale.linear().range([1,-1]).domain([0,height]) };
   
    var colorScale = d3.scale.linear()
	.domain([0,1])
	.range(colorRamp);

    //Calculate the center positions of each hexagon	
    var points = [];
    var odd = true;
    var x1unit = 2.0/cells * SQRT3;
    var x2unit = 2.0/cells ;

    console.log("Precomputing heat map hexes.");
    for (var x2 = -1-x2unit; x2 <= 1+x2unit; x2+=x2unit*3/4/w) {
	var offset = odd ? 0 : x1unit/4.0; 
	for (var x1 = offset; x1 <= Math.sqrt(1+2.2*x1unit-x2*x2); x1+=x1unit/2) {
	    points.push({x:nominateScale.x( x1), y:nominateScale.y(x2), p:nomProbYea( x1,x2,m1,m2,s1,s2,w,b)});
	    points.push({x:nominateScale.x(-x1), y:nominateScale.y(x2), p:nomProbYea(-x1,x2,m1,m2,s1,s2,w,b)});
	}
	odd = !odd;
    }

	console.log("Hexes precomputed: "+points.length);
	points = $.grep(points, function(p) { return(p.p>0.05); });
	console.log("Post-pruning hexes: "+points.length);

    //Set the hexagon radius
    var hexRadius = width/cells/2.0 + 1;
    var hexagonPoly=[[0,-1/w],[SQRT3/2,0.5/w],[0,1/w],[-SQRT3/2,0.5/w],[-SQRT3/2,-0.5/w],[0,-1/w],[SQRT3/2,-0.5/w]];
    var hexagonPath = "m" + hexagonPoly.map(function(p){return [p[0]*hexRadius, p[1]*hexRadius*w].join(",")}).join("l") + "z";

    svg.append("clipPath")
	.attr("id", "ellipse-clip") 
	.append("ellipse")
	.attr("cx", nominateScale.x(0))
	.attr("cy", nominateScale.y(0))
	.attr("rx", nominateScale.x(1)/2)
	.attr("ry", nominateScale.y(-1)/2);

    // For tooltip/rollover interactivity
    levline = d3.select("#hm_prob_lev_line");
    var levscale = d3.scale.linear().range([height*0.97, 0]).domain([0, 100]);

    //Start drawing the hexagons
    svg.append("g")
	.selectAll(".hexagon")
	.data( points )
	.enter().append("path")
	.attr("class", "hexagon")
	.attr("d", function (d) {
		return "M" + d.x + "," + d.y + hexagonPath;; })
	.attr("clip-path", "url(#ellipse-clip)")
	.attr("stroke-width", "0px")
	.style("fill", function (d,i) {
	       return colorScale(d.p);
	});

    svg.append("ellipse").attr("cx", nominateScale.x(0))
	.attr("cy", nominateScale.y(0))
                    .attr("rx", nominateScale.x(1)/2)
                    .attr("ry", nominateScale.y(-1)/2)
                    .attr("fill","none")
                    .attr("stroke","gray").attr("stroke-width","1px");   
    // Add cutline
    var b = -s1/(s2*w*w + 0.0005);
    var a = m2 - b*m1;

    svg.append("line")
	.attr("x1",nominateScale.x(-1))
	.attr("x2",nominateScale.x(1))
	.attr("y1",nominateScale.y(a-b))
	.attr("y2",nominateScale.y(a+b))
	.attr("stroke","black")
	.attr("stroke-width",2)
	.attr("clip-path", "url(#ellipse-clip)");
}




function nominateHeatkey(key,h,colors) {
    var w = 80;
    key.attr("width", w).attr("height", h*1.1);
    var legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "100%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
    legend.append("stop").attr("offset", "0%").attr("stop-color", colors[1]).attr("stop-opacity", 1);
    legend.append("stop").attr("offset", "100%").attr("stop-color", colors[0]).attr("stop-opacity", 1);
    key.append("rect").attr("width", 0.2*w).attr("height", h*0.97).style("stroke","#CCCCCC").style("fill", "url(#gradient)").attr("transform", "translate(0,10)");
    var y = d3.scale.linear().range([h*0.97, 0]).domain([0, 100]);
    var yAxis = d3.svg.axis().scale(y).orient("right");
    key.append("g").attr("class", "y hm_axis").attr("transform", "translate(25,10)").call(yAxis).append("text").attr("transform", "rotate(-90)").attr("y", 30).attr("dy", ".71em").style("text-anchor", "end").text("Probability of Yea Vote");

    key.append("line")
	.attr("x1",0)
	.attr("x2",0.2*w)
	.attr("y1",y(45))
	.attr("y2",y(45))
	.attr("stroke-width","0px")
	.attr("stroke","black")
	.attr("id","hm_prob_lev_line");
}


// TESTING


// var margin = {
//	top: 10,
//	right: 10,
//	bottom: 10,
//	left: 10
//};

//var w = 0.41;
//var width=600;
//var height=width*w;
//var colorRamp = ["#FFFFFF","#FFFF8E"];

//var svg = d3.select("#heat_map").append("svg")
//	.attr("width", width + margin.left + margin.right)
//	.attr("height", height + margin.top + margin.bottom)
//	.append("g")
//	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//var leg = d3.select("#hm_legend").append("svg").attr("align","right")

//nominateHeatkey(leg,h=height*0.66,colorRamp);
//nominateHeatmap(svg, 0.5, 0.0, 0.3, 0.0, 7.1, w, width, cells=40, colorRamp=colorRamp);
