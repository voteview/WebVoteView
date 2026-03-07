'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,queue,committee_param,congressNum,maxCongress,colorSchemes */

function getGetOrdinal(n) {
	var s = ["th","st","nd","rd"],
	v = n % 100;
	return n + (s[(v-20)%10] || s[v] || s[0]);
}

var dimChart;
var committeeData = null;
var congressLookup = {};
var currentSort = 'name';
var opacityTimer;
var resultCache = null;
var selectedCongress = null;

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

	// Build charts
	buildIdeologyChart(congresses, congMedians);
	buildSizeChart(congresses);
	dc.renderAll();

	// Tooltip overlay (after dc.renderAll so it sits on top)
	addIdeologyTooltip();
	postRenderIdeologyChart();

	// Load roster for latest congress via API (matches party tab pattern)
	var latestCong = congresses[congresses.length - 1];
	if (latestCong) {
		switchCongress(latestCong.congress);
	}

	$('#loading-container').delay(200).slideUp(100);
	$('#content').fadeIn();
}

function switchCongress(congress) {
	selectedCongress = congress;
	highlightBar(congress);

	// Update roster header
	var year = 1787 + 2 * congress;
	$('#roster-congress-label').html(
		getGetOrdinal(congress) + ' Congress (' + year + '-' + (year + 1) + ')'
	);

	// Load roster via API (matches party tab: party.js:568-577)
	$.ajax({
		dataType: 'JSON',
		url: '/api/getmembersbycommittee?short_name=' +
			encodeURIComponent(committeeData.short_name) +
			'&chamber=' + encodeURIComponent(committeeData.chamber) +
			'&congress=' + congress,
		success: function(data) {
			resultCache = data;
			writeBioTable();
		}
	});
}

function highlightBar(congress) {
	d3.select('#size-chart svg').selectAll('.bar-group').each(function(d) {
		d3.select(this).selectAll('rect')
			.attr('opacity', d.congress === congress ? 1.0 : 0.5);
	});
}

// Roster rendering (matches party tab: memberTable.js constructPlot)
function resort(sortB) {
	currentSort = sortB;
	writeBioTable();
}

function writeBioTable() {
	if (!resultCache || !resultCache.results) return;

	var rC = resultCache.results;
	$('#memberList').fadeOut(200, function() {
		$('#memberList').html('');

		if (!rC.length) {
			$('#memberList').html('<li>No members found for this congress.</li>');
			$('#memberList').fadeIn(200);
			return;
		}

		// Sort (matches memberTable.js writeBioTable)
		if (currentSort === 'name') {
			rC.sort(function(a, b) { return a.bioname > b.bioname ? 1 : -1; });
		} else if (currentSort === 'state') {
			rC.sort(function(a, b) {
				return (a.state_abbrev === b.state_abbrev) ?
					(a.bioname > b.bioname ? 1 : -1) :
					(a.state_abbrev > b.state_abbrev ? 1 : -1);
			});
		} else if (currentSort === 'nominate') {
			rC.sort(function(a, b) {
				return a.nominate == undefined ? 1 :
					b.nominate == undefined ? -1 :
					a.nominate.dim1 == undefined ? 1 :
					b.nominate.dim1 == undefined ? -1 :
					a.nominate.dim1 > b.nominate.dim1 ? 1 : -1;
			});
		} else if (currentSort === 'elected') {
			rC.sort(function(a, b) {
				return a.min_elected == undefined ? 1 :
					b.min_elected == undefined ? -1 :
					(a.min_elected === b.min_elected) ?
					(a.bioname > b.bioname ? 1 : -1) :
					(a.min_elected > b.min_elected ? 1 : -1);
			});
		}

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox')
				.html('<strong>Most Liberal</strong> <span class="glyphicon glyphicon-arrow-down"></span>')
				.appendTo($('#memberList'));
		} else if (currentSort === 'elected') {
			$('<li></li>').addClass('memberBox')
				.html('<strong>Most Senior</strong> <span class="glyphicon glyphicon-arrow-down"></span>')
				.appendTo($('#memberList'));
		}

		$.each(rC, function(k, v) {
			if (currentSort === 'nominate' && v.nominate == undefined) return;
			constructPlot(v);
		});

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox')
				.html('<strong>Most Conservative</strong> <span class="glyphicon glyphicon-arrow-up"></span>')
				.appendTo($('#memberList'));
		} else if (currentSort === 'elected') {
			$('<li></li>').addClass('memberBox')
				.html('<strong>Most Junior</strong> <span class="glyphicon glyphicon-arrow-up"></span>')
				.appendTo($('#memberList'));
		}

		$('#memberList').fadeIn(200);
	});
}

// Matches memberTable.js constructPlot exactly
function constructPlot(member) {
	if (member.bioname == undefined) return;

	var memberBox = $('<li></li>')
		.addClass('memberResultBox').addClass('columnResultBox').addClass('namePad5');

	if (member.icpsr) {
		memberBox.attr('id', member.icpsr)
			.css('cursor', 'pointer')
			.click(function() { window.location = '/person/' + member.icpsr; });
	}

	var linkBox = $('<a></a>')
		.attr('href', member.icpsr ? '/person/' + member.icpsr : '#')
		.attr('class', 'nohover');

	// Image (matches search_members.py:237-241 pattern)
	var imgUrl = member.image_url || 'silhouette.png';
	$('<img />').addClass('pull-left').addClass('bio').addClass('memberPad10')
		.attr('src', '/static/img/bios/' + imgUrl)
		.appendTo(linkBox);

	// Bio text (matches party tab: Name, Party, State, Elected)
	var bioTextInner = '<strong>' + member.bioname + '</strong><br/>';

	if (member.party_noun) {
		bioTextInner += member.party_noun + '<br/>';
	} else if (member.party_code) {
		bioTextInner += partyName(member.party_code) + '<br/>';
	}

	// Full state name (using stateMap from stateMeta.js)
	var fullState = (typeof stateMap !== 'undefined' && stateMap[member.state_abbrev]) ?
		stateMap[member.state_abbrev] : (member.state_abbrev || '');
	if (fullState) bioTextInner += fullState + '<br/>';

	// Elected year (matches party tab: memberTable.js:170-174)
	if (member.min_elected != undefined) {
		bioTextInner += 'Elected ' + member.min_elected;
	}

	$('<span></span>').html(bioTextInner).appendTo(linkBox);
	linkBox.appendTo(memberBox);
	memberBox.appendTo($('#memberList'));
}

function addIdeologyTooltip() {
	if (!dimChart) return;
	var baseToolTip = d3.select('#committeeTooltip');
	if (!baseToolTip.node()) return;

	var svg = d3.select('#dim-chart svg');
	if (!svg.node()) return;

	var margins = dimChart.margins();
	var innerWidth = dimChart.width() - margins.left - margins.right;
	var innerHeight = dimChart.height() - margins.top - margins.bottom;

	// Overlay rect appended directly to SVG (last child = on top)
	var overlay = svg.append('rect')
		.attr('x', margins.left)
		.attr('y', margins.top)
		.attr('width', innerWidth)
		.attr('height', innerHeight)
		.style('fill', 'none')
		.style('pointer-events', 'all');

	overlay.on('mousemove', function() {
		var mousePos = d3.mouse(this);
		var xScale = dimChart.x();
		var congress = Math.round(xScale.invert(mousePos[0] - margins.left));
		var info = congressLookup[congress];
		if (!info) {
			baseToolTip.style('visibility', 'hidden');
			return;
		}

		clearTimeout(opacityTimer);
		var year = 1787 + 2 * congress;
		var html = '<p><strong>' + getGetOrdinal(congress) + ' Congress</strong> (' + year + '-' + (year + 1) + ')</p>';
		html += '<p><em>Committee Median Ideology</em>: ' + (info.committeeMedian != null ? (Math.round(info.committeeMedian * 100) / 100) : 'N/A') + '</p>';
		html += '<p><em>Congress Median</em>: ' + (info.congressMedian != null ? (Math.round(info.congressMedian * 100) / 100) : 'N/A') + '</p>';
		html += '<p><em>Members</em>: ' + info.nMembers + '</p>';

		baseToolTip.html(html);
		baseToolTip.style('visibility', 'visible')
			.style('top', (d3.event.pageY + 20) + 'px')
			.style('left', (d3.event.pageX - 80) + 'px');
	})
	.on('mouseout', function() {
		opacityTimer = setTimeout(function() {
			baseToolTip.style('visibility', 'hidden');
		}, 100);
	});
}

function buildIdeologyChart(congresses, congMedians) {
	var scatterData = [];
	var lineData = [];

	congresses.forEach(function(c) {
		congressLookup[c.congress] = {
			committeeMedian: c.grandMedian,
			congressMedian: c.congressMedian,
			nMembers: c.nMembers
		};

		if (c.grandMedian !== null && c.grandMedian !== undefined) {
			lineData.push({
				congress: c.congress,
				committeeMedian: c.grandMedian,
				congressMedian: c.congressMedian || 0
			});
		}

		if (c.grandSet) {
			c.grandSet.forEach(function(score) {
				scatterData.push({ x: c.congress, y: score });
			});
		}
	});

	if (lineData.length === 0) {
		$('#dim-chart').html('<p style="color:#888;">No ideology data available for this committee.</p>');
		return;
	}

	var minCong = congresses[0].congress;
	var maxCong = congresses[congresses.length - 1].congress;

	var chartWidth = Math.min(1140, Math.max(900, Math.round($('#wbv-header').width() * 0.92)));
	var chartHeight = Math.max(280, Math.round(chartWidth / 2.9));

	// Tooltip div
	d3.select('body').append('div')
		.attr('class', 'd3-tip')
		.attr('id', 'committeeTooltip')
		.style('visibility', 'hidden');

	var ndx = crossfilter(lineData);
	var congressDim = ndx.dimension(function(d) { return d.congress; });
	var committeeMedianGroup = congressDim.group().reduceSum(function(d) { return d.committeeMedian; });
	var congressMedianGroup = congressDim.group().reduceSum(function(d) { return d.congressMedian; });

	var scatterNdx = crossfilter(scatterData);
	var scatterDim = scatterNdx.dimension(function(d) { return [d.x, d.y]; });
	var scatterGroup = scatterDim.group();

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
}

function postRenderIdeologyChart() {
	var legendDiv = $('<div></div>').css({'margin-top': '5px', 'font-size': '12px', 'color': '#666'});
	legendDiv.append('<span style="display:inline-block;width:20px;height:3px;background:#333;margin-right:5px;vertical-align:middle;"></span> Committee Median &nbsp;&nbsp;');
	legendDiv.append('<span style="display:inline-block;width:20px;height:3px;background:#D3D3D3;margin-right:5px;vertical-align:middle;"></span> Congress Median &nbsp;&nbsp;');
	legendDiv.append('<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#92c5de;margin-right:5px;vertical-align:middle;opacity:0.5;"></span> Member Ideology Range');
	$('#dim-chart').append(legendDiv);

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
	var chartHeight = 180;
	var margins = {top: 10, right: 20, bottom: 40, left: 60};
	var innerWidth = chartWidth - margins.left - margins.right;
	var innerHeight = chartHeight - margins.top - margins.bottom;

	var barData = congresses.map(function(c) {
		var pb = c.partyBreakdown || {};
		var dem = pb['100'] || 0;
		var rep = pb['200'] || 0;
		return {
			congress: c.congress,
			dem: dem,
			rep: rep,
			other: Math.max(0, c.nMembers - dem - rep)
		};
	});

	if (barData.length === 0) return;

	var minCong = barData[0].congress;
	var maxCong = barData[barData.length - 1].congress;
	var maxMembers = d3.max(barData, function(d) { return d.dem + d.rep + d.other; });

	var svg = d3.select('#size-chart').append('svg')
		.attr('width', chartWidth)
		.attr('height', chartHeight);

	var g = svg.append('g')
		.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

	var x = d3.scale.linear()
		.domain([Math.max(1, minCong - 1), maxCong + 1])
		.range([0, innerWidth]);

	var y = d3.scale.linear()
		.domain([0, maxMembers + 2])
		.range([innerHeight, 0]);

	var barWidth = Math.max(1, Math.floor(innerWidth / (maxCong - minCong + 3)) - 1);

	// Draw stacked bars (clickable, like party tab: party.js:199-203)
	var bars = g.selectAll('.bar-group')
		.data(barData)
		.enter()
		.append('g')
		.attr('class', 'bar-group')
		.attr('transform', function(d) {
			return 'translate(' + (x(d.congress) - barWidth / 2) + ',0)';
		})
		.style('cursor', 'pointer')
		.on('click', function(d) {
			switchCongress(d.congress);
		});

	// Democrat (bottom, blue)
	bars.append('rect')
		.attr('y', function(d) { return y(d.dem); })
		.attr('width', barWidth)
		.attr('height', function(d) { return innerHeight - y(d.dem); })
		.attr('fill', '#0571b0');

	// Republican (stacked above dem, red)
	bars.append('rect')
		.attr('y', function(d) { return y(d.dem + d.rep); })
		.attr('width', barWidth)
		.attr('height', function(d) { return y(d.dem) - y(d.dem + d.rep); })
		.attr('fill', '#ca0020');

	// Other (stacked on top, grey)
	bars.filter(function(d) { return d.other > 0; })
		.append('rect')
		.attr('y', function(d) { return y(d.dem + d.rep + d.other); })
		.attr('width', barWidth)
		.attr('height', function(d) { return y(d.dem + d.rep) - y(d.dem + d.rep + d.other); })
		.attr('fill', '#404040');

	// X axis
	var xTickValues = [];
	for (var t = 6; t < maxCong; t += 10) { xTickValues.push(t); }
	if (maxCong - xTickValues[xTickValues.length - 1] > 5) {
		xTickValues.push(xTickValues[xTickValues.length - 1] + 5);
	}

	g.append('g')
		.attr('class', 'x axis')
		.attr('transform', 'translate(0,' + innerHeight + ')')
		.call(d3.svg.axis().scale(x).orient('bottom')
			.tickValues(xTickValues)
			.tickFormat(function(v) { return (1787 + 2 * v) + 1; }));

	g.append('g')
		.attr('class', 'y axis')
		.call(d3.svg.axis().scale(y).orient('left')
			.ticks(5).tickFormat(d3.format('d')));

	// Axis labels
	svg.append('text')
		.attr('transform', 'translate(' + (chartWidth / 2) + ',' + (chartHeight - 2) + ')')
		.style('text-anchor', 'middle')
		.style('font-size', '12px')
		.text('Year');

	svg.append('text')
		.attr('transform', 'translate(15,' + (margins.top + innerHeight / 2) + ') rotate(-90)')
		.style('text-anchor', 'middle')
		.style('font-size', '12px')
		.text('Members');

	// Legend
	var legendG = svg.append('g')
		.attr('transform', 'translate(' + (margins.left + 10) + ',' + (margins.top + 2) + ')');

	var legendItems = [
		{color: '#0571b0', label: 'Democrat'},
		{color: '#ca0020', label: 'Republican'},
		{color: '#404040', label: 'Other'}
	];
	legendItems.forEach(function(item, i) {
		legendG.append('rect')
			.attr('x', i * 100)
			.attr('width', 12)
			.attr('height', 12)
			.attr('fill', item.color);
		legendG.append('text')
			.attr('x', i * 100 + 16)
			.attr('y', 10)
			.style('font-size', '11px')
			.style('fill', '#666')
			.text(item.label);
	});
}

// Load data
var q = queue()
	.defer(d3.json, '/static/committeejson/' + committee_param + '.json')
	.defer(d3.json, '/static/committeejson/congress_medians.json')
	.await(buildPage);
