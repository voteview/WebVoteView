'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,queue,committee_param,congressNum,maxCongress,colorSchemes */

function getGetOrdinal(n) {
	var s = ["th","st","nd","rd"],
	v = n % 100;
	return n + (s[(v-20)%10] || s[v] || s[0]);
}

var dimChart, sizeChart;
var committeeData = null;
var currentSort = 'role';

function partyColor(partyCode) {
	if (partyCode === 100) return colorSchemes['blue'][0];   // Democrat
	if (partyCode === 200) return colorSchemes['red'][0];    // Republican
	return colorSchemes['grey'][0];
}

function partyColorLight(partyCode) {
	if (partyCode === 100) return colorSchemes['blue'][1];
	if (partyCode === 200) return colorSchemes['red'][1];
	return colorSchemes['grey'][1];
}

function partyName(partyCode) {
	if (partyCode === 100) return 'Democrat';
	if (partyCode === 200) return 'Republican';
	return 'Other';
}

function buildPage(error, data, congMedians) {
	if (error) {
		$('#loading-container').html('<h3>Committee not found.</h3>');
		console.error(error);
		return;
	}

	committeeData = data;
	var congresses = data.congresses;

	// Set page title
	var chamberLabel = data.chamber === 'Joint' ? 'Joint' :
		data.chamber === 'House' ? 'House' : 'Senate';
	$('#committee-name').html(chamberLabel + ' Committee on ' + data.short_name);
	document.title = 'Voteview | ' + chamberLabel + ' ' + data.short_name;

	// Name variants
	if (data.name_variants && data.name_variants.length > 0) {
		$('#name-variants').html('Also known as: ' + data.name_variants.join(', '));
	}

	// Build ideology chart
	buildIdeologyChart(congresses, congMedians);

	// Build size chart
	buildSizeChart(congresses);

	// Build roster for current congress
	var latestCong = congresses[congresses.length - 1];
	if (latestCong && latestCong.roster) {
		renderRoster(latestCong.roster);
	}

	$('#loading-container').delay(200).slideUp(100);
	$('#content').fadeIn();
}

function buildIdeologyChart(congresses, congMedians) {
	// Prepare scatter data: each member score as a point
	var scatterData = [];
	var lineData = [];

	congresses.forEach(function(c) {
		if (c.grandMedian !== null && c.grandMedian !== undefined) {
			lineData.push({
				congress: c.congress,
				committeeMedian: c.grandMedian,
				congressMedian: c.congressMedian || 0
			});
		}

		if (c.grandSet) {
			// We don't have per-member party in grandSet, so use them as generic points
			c.grandSet.forEach(function(score) {
				scatterData.push({
					x: c.congress,
					y: score
				});
			});
		}
	});

	if (lineData.length === 0) {
		$('#dim-chart').html('<p style="color:#888;">No ideology data available for this committee.</p>');
		return;
	}

	var minCong = congresses[0].congress;
	var maxCong = congresses[congresses.length - 1].congress;

	// Chart dimensions
	var chartWidth = Math.min(1140, Math.max(900, Math.round($('#wbv-header').width() * 0.92)));
	var chartHeight = Math.max(280, Math.round(chartWidth / 2.9));

	// Build using DC.js
	var ndx = crossfilter(lineData);
	var congressDim = ndx.dimension(function(d) { return d.congress; });
	var committeeMedianGroup = congressDim.group().reduceSum(function(d) { return d.committeeMedian; });
	var congressMedianGroup = congressDim.group().reduceSum(function(d) { return d.congressMedian; });

	// Scatter
	var scatterNdx = crossfilter(scatterData);
	var scatterDim = scatterNdx.dimension(function(d) { return [d.x, d.y]; });
	var scatterGroup = scatterDim.group();

	// X-axis ticks every 10 congresses
	var xTickValues = [];
	for (var t = 6; t < maxCong; t += 10) { xTickValues.push(t); }
	if (maxCong - xTickValues[xTickValues.length - 1] > 5) {
		xTickValues.push(xTickValues[xTickValues.length - 1] + 5);
	}

	dimChart = dc.compositeChart('#dim-chart');

	dimChart
		.width(chartWidth)
		.height(chartHeight)
		.dimension(congressDim)
		.brushOn(false)
		.shareTitle(false)
		.renderTitle(false)
		.x(d3.scale.linear().domain([Math.max(1, minCong - 1), maxCong + 1]))
		.y(d3.scale.linear().domain([-1.0, 1.0]))
		.margins({top: 10, right: 20, bottom: 40, left: 60})
		.compose([
			dc.scatterPlot(dimChart)
				.group(scatterGroup)
				.colors('#92c5de')
				.symbolSize(3),
			dc.lineChart(dimChart)
				.group(committeeMedianGroup)
				.colors(['#333333'])
				.interpolate('basis')
				.defined(function(d) { return d.y !== 0 && d.y > -900; }),
			dc.lineChart(dimChart)
				.group(congressMedianGroup)
				.colors(['#D3D3D3'])
				.interpolate('basis')
				.defined(function(d) { return d.y !== 0 && d.y > -900; })
		])
		.on('postRender', function() {
			d3.select('#dim-chart svg').select('g.sub')
				.selectAll('path.symbol').attr('opacity', '0.4');
		})
		.xAxisLabel('Year', 40)
		.yAxisLabel('Ideology')
		.xAxis().tickValues(xTickValues)
			.tickFormat(function(v) { return (1787 + 2 * v) + 1; });

	// Add legend
	var svgEl = d3.select('#dim-chart');

	dc.renderAll();

	// Post-render: add simple legend below chart
	var legendDiv = $('<div></div>').css({'margin-top': '5px', 'font-size': '12px', 'color': '#666'});
	legendDiv.append('<span style="display:inline-block;width:20px;height:3px;background:#333;margin-right:5px;vertical-align:middle;"></span> Committee Median &nbsp;&nbsp;');
	legendDiv.append('<span style="display:inline-block;width:20px;height:3px;background:#D3D3D3;margin-right:5px;vertical-align:middle;"></span> Congress Median &nbsp;&nbsp;');
	legendDiv.append('<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#92c5de;margin-right:5px;vertical-align:middle;opacity:0.5;"></span> Member Ideology Range');
	$('#dim-chart').append(legendDiv);

	// Y-axis sublabels
	var dimSvg = d3.select('#dim-chart svg');
	var yConservative = dimSvg.select('g').insert('text', '.axis_text');
	yConservative
		.attr('transform', 'translate(36, 80), rotate(-90), scale(0.8, 0.8)')
		.attr('fill', '#666666')
		.attr('text-anchor', 'right')
		.text('Conservative');

	var gX = dimSvg.select('g.x');
	if (gX.node()) {
		var lowerY = d3.transform(gX.attr('transform')).translate[1] - 10;
		var yLiberal = dimSvg.select('g').insert('text', '.axis_text');
		yLiberal
			.attr('transform', 'translate(36, ' + lowerY + '), rotate(-90), scale(0.8, 0.8)')
			.attr('fill', '#666666')
			.attr('text-anchor', 'right')
			.text('Liberal');
	}
}

function buildSizeChart(congresses) {
	var chartWidth = Math.min(1140, Math.max(900, Math.round($('#wbv-header').width() * 0.92)));
	var chartHeight = 200;

	// Build stacked bar data
	var barData = congresses.map(function(c) {
		var dems = (c.partyBreakdown && c.partyBreakdown['100']) || 0;
		var reps = (c.partyBreakdown && c.partyBreakdown['200']) || 0;
		var other = c.nMembers - dems - reps;
		return {
			congress: c.congress,
			dem: dems,
			rep: reps,
			other: Math.max(0, other)
		};
	});

	if (barData.length === 0) return;

	var minCong = barData[0].congress;
	var maxCong = barData[barData.length - 1].congress;

	var margin = {top: 10, right: 20, bottom: 40, left: 60};
	var width = chartWidth - margin.left - margin.right;
	var height = chartHeight - margin.top - margin.bottom;

	var svg = d3.select('#size-chart').append('svg')
		.attr('width', chartWidth)
		.attr('height', chartHeight)
		.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	var x = d3.scale.linear()
		.domain([minCong - 0.5, maxCong + 0.5])
		.range([0, width]);

	var maxMembers = d3.max(barData, function(d) { return d.dem + d.rep + d.other; });
	var y = d3.scale.linear()
		.domain([0, maxMembers * 1.1])
		.range([height, 0]);

	// Bar width based on density
	var barWidth = Math.max(1, Math.min(12, Math.floor(width / (maxCong - minCong + 2))));

	// Draw stacked bars
	barData.forEach(function(d) {
		var xPos = x(d.congress) - barWidth / 2;

		// Democrats (bottom)
		if (d.dem > 0) {
			svg.append('rect')
				.attr('x', xPos)
				.attr('y', y(d.dem))
				.attr('width', barWidth)
				.attr('height', height - y(d.dem))
				.attr('fill', '#0571b0');
		}

		// Republicans (middle)
		if (d.rep > 0) {
			svg.append('rect')
				.attr('x', xPos)
				.attr('y', y(d.dem + d.rep))
				.attr('width', barWidth)
				.attr('height', y(d.dem) - y(d.dem + d.rep))
				.attr('fill', '#ca0020');
		}

		// Other (top)
		if (d.other > 0) {
			svg.append('rect')
				.attr('x', xPos)
				.attr('y', y(d.dem + d.rep + d.other))
				.attr('width', barWidth)
				.attr('height', y(d.dem + d.rep) - y(d.dem + d.rep + d.other))
				.attr('fill', '#404040');
		}
	});

	// X axis
	var xTickValues = [];
	for (var t = 6; t < maxCong; t += 10) { xTickValues.push(t); }
	if (maxCong - xTickValues[xTickValues.length - 1] > 5) {
		xTickValues.push(xTickValues[xTickValues.length - 1] + 5);
	}

	var xAxis = d3.svg.axis().scale(x).orient('bottom')
		.tickValues(xTickValues)
		.tickFormat(function(v) { return (1787 + 2 * v) + 1; });

	svg.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + height + ')')
		.call(xAxis);

	svg.append('text')
		.attr('transform', 'translate(' + (width / 2) + ',' + (height + 35) + ')')
		.style('text-anchor', 'middle')
		.style('font-size', '12px')
		.text('Year');

	// Y axis
	var yAxis = d3.svg.axis().scale(y).orient('left').ticks(5);
	svg.append('g')
		.attr('class', 'y axis')
		.call(yAxis);

	svg.append('text')
		.attr('transform', 'rotate(-90)')
		.attr('y', -45)
		.attr('x', -(height / 2))
		.style('text-anchor', 'middle')
		.style('font-size', '12px')
		.text('Members');

	// Legend
	var legendDiv = $('<div></div>').css({'margin-top': '5px', 'font-size': '12px', 'color': '#666'});
	legendDiv.append('<span style="display:inline-block;width:12px;height:12px;background:#0571b0;margin-right:5px;vertical-align:middle;"></span> Democrat &nbsp;&nbsp;');
	legendDiv.append('<span style="display:inline-block;width:12px;height:12px;background:#ca0020;margin-right:5px;vertical-align:middle;"></span> Republican &nbsp;&nbsp;');
	legendDiv.append('<span style="display:inline-block;width:12px;height:12px;background:#404040;margin-right:5px;vertical-align:middle;"></span> Other');
	$('#size-chart').append(legendDiv);
}

function resort(sortB) {
	currentSort = sortB;
	var latestCong = committeeData.congresses[committeeData.congresses.length - 1];
	if (latestCong && latestCong.roster) {
		renderRoster(latestCong.roster);
	}
}

function renderRoster(roster) {
	$('#memberList').fadeOut(200, function() {
		$('#memberList').html('');

		var sorted = roster.slice();
		if (currentSort === 'name') {
			sorted.sort(function(a, b) { return a.bioname > b.bioname ? 1 : -1; });
		} else if (currentSort === 'state') {
			sorted.sort(function(a, b) {
				return a.state_abbrev === b.state_abbrev ?
					(a.bioname > b.bioname ? 1 : -1) :
					(a.state_abbrev > b.state_abbrev ? 1 : -1);
			});
		} else if (currentSort === 'nominate') {
			sorted.sort(function(a, b) {
				if (a.nominate == null) return 1;
				if (b.nominate == null) return -1;
				return a.nominate - b.nominate;
			});
		} else if (currentSort === 'role') {
			var roleOrder = {'Chair': 0, 'Chairman': 0, 'Chairwoman': 0,
				'Vice Chair': 1, 'Vice Chairman': 1, 'Vice Chairwoman': 1,
				'Ranking Member': 2, 'Member': 9};
			sorted.sort(function(a, b) {
				var ra = roleOrder[a.role] !== undefined ? roleOrder[a.role] : 5;
				var rb = roleOrder[b.role] !== undefined ? roleOrder[b.role] : 5;
				if (ra !== rb) return ra - rb;
				return (a.rank || 999) - (b.rank || 999);
			});
		}

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Liberal</strong> <span class="glyphicon glyphicon-arrow-down"></span>').appendTo($('#memberList'));
		}

		sorted.forEach(function(m) {
			var memberBox = $('<li></li>').addClass('memberResultBox columnResultBox namePad5');

			if (m.icpsr) {
				memberBox.css('cursor', 'pointer').click(function() {
					window.location = '/person/' + m.icpsr;
				});
			}

			var linkBox = $('<a></a>').attr('href', m.icpsr ? '/person/' + m.icpsr : '#').attr('class', 'nohover');

			// Image
			if (m.image_url) {
				$('<img />').addClass('pull-left bio memberPad10')
					.attr('src', '/static/img/bios/' + m.image_url)
					.appendTo(linkBox);
			}

			// Bio text
			var bioText = '<strong>' + m.bioname + '</strong><br/>';
			bioText += partyName(m.party_code) + '<br/>';
			bioText += (m.state_abbrev || '') + '<br/>';
			if (m.role && m.role !== 'Member') {
				bioText += '<em>' + m.role + '</em><br/>';
			}
			if (m.nominate != null) {
				bioText += 'NOMINATE: ' + m.nominate.toFixed(3);
			}

			$('<span></span>').html(bioText).appendTo(linkBox);
			linkBox.appendTo(memberBox);
			memberBox.appendTo($('#memberList'));
		});

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Conservative</strong> <span class="glyphicon glyphicon-arrow-up"></span>').appendTo($('#memberList'));
		}

		$('#memberList').fadeIn(200);
	});
}

// Load data
var q = queue()
	.defer(d3.json, '/static/committeejson/' + committee_param + '.json')
	.defer(d3.json, '/static/committeejson/congress_medians.json')
	.await(buildPage);
