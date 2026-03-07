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
var congressLookup = {};
var currentSort = 'name';
var opacityTimer;
var resultCache = null;
var selectedCongress = null;
var eW = 0, eH = 0;

var baseToolTip = d3.select('body')
	.append('div')
	.attr('class', 'd3-tip')
	.attr('id', 'committeeTooltip')
	.style('visibility', 'hidden');

function partyName(partyCode) {
	if (partyCode === 100) return 'Democrat';
	if (partyCode === 200) return 'Republican';
	return 'Other';
}

// Tooltip content for ideology chart (matches party.js ideologyTooltip)
function committeeIdeologyTooltip(lineType, d) {
	var name;
	if (lineType === 'dem') name = 'Democrat Committee Members';
	else if (lineType === 'rep') name = 'Republican Committee Members';
	else name = 'Congressional Median (Midpoint)';

	var suffixNote = (lineType === 'congress') ?
		'<br/><br/>The Congressional Median is unstable (swings back and ' +
		'forth) as control of the House and Senate change.' : '';

	return getGetOrdinal(d.x) + ' Congress &gt; ' +
		'<strong>' + name + '</strong>' +
		'<br/><br/><em>Median Ideology Score</em>: ' +
		Math.round(d.y * 100) / 100 +
		'<br/><br/><em>How to Interpret Ideology Scores:</em><br/>' +
		'These scores show how liberal or conservative members are on a scale ' +
		'from -1 (Very Liberal) to +1 (Very Conservative). The scores provided ' +
		'are the median--mid-point--member of the committee.' +
		suffixNote;
}

function buildPage(error, data, congMedians) {
	if (error) {
		$('#loading-container').html('<h3>Committee not found.</h3>');
		console.error(error);
		return;
	}

	committeeData = data;
	var congresses = data.congresses;

	var chamberLabel = data.chamber === 'Joint' ? 'Joint' :
		data.chamber === 'House' ? 'House' : 'Senate';
	$('#committee-name').html(chamberLabel + ' Committee on ' + data.short_name);
	document.title = 'Voteview | ' + chamberLabel + ' ' + data.short_name;

	if (data.name_variants && data.name_variants.length > 0) {
		$('#name-variants').html('Also known as: ' + data.name_variants.join(', '));
	}

	buildIdeologyChart(congresses, congMedians);
	buildSizeChart(congresses);
	dc.renderAll();

	// Attach tooltips to ideology chart elements (matches party.js:481-561)
	addIdeologyTooltips();

	// Size chart legend
	var sLegend = $('<div></div>').css({'margin-top': '2px', 'font-size': '12px', 'color': '#666'});
	sLegend.append('<span style="display:inline-block;width:12px;height:12px;background:#0571b0;margin-right:4px;vertical-align:middle;"></span> Democrat &nbsp;&nbsp;');
	sLegend.append('<span style="display:inline-block;width:12px;height:12px;background:#ca0020;margin-right:4px;vertical-align:middle;"></span> Republican &nbsp;&nbsp;');
	sLegend.append('<span style="display:inline-block;width:12px;height:12px;background:#404040;margin-right:4px;vertical-align:middle;"></span> Other');
	$('#size-chart').append(sLegend);

	// Load roster for latest congress via API
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

	var year = 1787 + 2 * congress;
	$('#roster-congress-label').html(
		getGetOrdinal(congress) + ' Congress (' + year + '-' + (year + 1) + ')'
	);

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
	d3.select('#size-chart svg').selectAll('rect.bar').each(function(d) {
		d3.select(this).attr('opacity', d.x === congress ? 1.0 : 0.5);
	});
}

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
				return a.nominate == undefined ? 1 : b.nominate == undefined ? -1 :
					a.nominate.dim1 == undefined ? 1 : b.nominate.dim1 == undefined ? -1 :
					a.nominate.dim1 > b.nominate.dim1 ? 1 : -1;
			});
		} else if (currentSort === 'elected') {
			rC.sort(function(a, b) {
				return a.min_elected == undefined ? 1 : b.min_elected == undefined ? -1 :
					(a.min_elected === b.min_elected) ? (a.bioname > b.bioname ? 1 : -1) :
					(a.min_elected > b.min_elected ? 1 : -1);
			});
		}

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Liberal</strong> <span class="glyphicon glyphicon-arrow-down"></span>').appendTo($('#memberList'));
		} else if (currentSort === 'elected') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Senior</strong> <span class="glyphicon glyphicon-arrow-down"></span>').appendTo($('#memberList'));
		}

		$.each(rC, function(k, v) {
			if (currentSort === 'nominate' && v.nominate == undefined) return;
			constructPlot(v);
		});

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Conservative</strong> <span class="glyphicon glyphicon-arrow-up"></span>').appendTo($('#memberList'));
		} else if (currentSort === 'elected') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Junior</strong> <span class="glyphicon glyphicon-arrow-up"></span>').appendTo($('#memberList'));
		}
		$('#memberList').fadeIn(200);
	});
}

function constructPlot(member) {
	if (member.bioname == undefined) return;
	var memberBox = $('<li></li>').addClass('memberResultBox').addClass('columnResultBox').addClass('namePad5');
	if (member.icpsr) {
		memberBox.attr('id', member.icpsr).css('cursor', 'pointer')
			.click(function() { window.location = '/person/' + member.icpsr; });
	}
	var linkBox = $('<a></a>').attr('href', member.icpsr ? '/person/' + member.icpsr : '#').attr('class', 'nohover');
	var imgUrl = member.image_url || 'silhouette.png';
	$('<img />').addClass('pull-left').addClass('bio').addClass('memberPad10')
		.attr('src', '/static/img/bios/' + imgUrl).appendTo(linkBox);

	var bioTextInner = '<strong>' + member.bioname + '</strong><br/>';
	if (member.party_noun) bioTextInner += member.party_noun + '<br/>';
	else if (member.party_code) bioTextInner += partyName(member.party_code) + '<br/>';
	var fullState = (typeof stateMap !== 'undefined' && stateMap[member.state_abbrev]) ?
		stateMap[member.state_abbrev] : (member.state_abbrev || '');
	if (fullState) bioTextInner += fullState + '<br/>';
	if (member.min_elected != undefined) bioTextInner += 'Elected ' + member.min_elected;
	$('<span></span>').html(bioTextInner).appendTo(linkBox);
	linkBox.appendTo(memberBox);
	memberBox.appendTo($('#memberList'));
}

// Ideology chart tooltip on lines/circles (matches party.js:481-561)
function addIdeologyTooltips() {
	if (!dimChart) return;

	// Map g.sub index to line type
	// Compose order: 0=demScatter, 1=repScatter, 2=demLine, 3=repLine, 4=congressLine
	var lineTypes = [null, null, 'dem', 'rep', 'congress'];
	var colorClasses = [null, null, 'blue', 'red', 'grey'];

	var i = 0;
	d3.select('#dim-chart svg').selectAll('g.sub').each(function() {
		var lineType = lineTypes[i];
		var colorClass = colorClasses[i];

		if (lineType) {
			var tempFuncOverride = function(d) {
				(function(lt, cc, obj) {
					d3.select(obj).attr('r', 10);
					d3.select(obj).on('mouseover', function(d) {
						var dUse;
						if (d3.select(obj).attr('class') === 'line') {
							var d3MouseCoords = d3.mouse(this);
							var d3CanvasWidth = d3.select('#dim-chart svg')
								.select('g.sub').node().getBBox().width;
							var currCong = Math.ceil(
								maxCongress * d3MouseCoords[0] / d3CanvasWidth);
							dUse = d.values[currCong - 1];
						} else {
							dUse = d;
						}

						if (!dUse || dUse.y < -900) return;

						clearTimeout(opacityTimer);
						baseToolTip.html(committeeIdeologyTooltip(lt, dUse));
						$('#committeeTooltip').removeClass()
							.addClass('d3-tip').addClass(cc);
						eH = baseToolTip.style('height');
						eW = baseToolTip.style('width');
						baseToolTip.style('visibility', 'visible');
					})
					.on('mouseout', function() {
						opacityTimer = setTimeout(function() {
							baseToolTip.style('visibility', 'hidden');
						}, 100);
					})
					.on('mousemove', function() {
						clearTimeout(opacityTimer);
						baseToolTip
							.style('top', (d3.event.pageY + 32) + 'px')
							.style('left', (d3.event.pageX -
								(parseInt(eW.substr(0, eW.length - 2)) / 2)) + 'px');
					});
				})(lineType, colorClass, this);
			};

			d3.select(this)
				.selectAll('.dc-tooltip-list .dc-tooltip circle')
				.each(tempFuncOverride);
			d3.select(this)
				.selectAll('.stack-list g.stack path.line')
				.each(tempFuncOverride);
		}

		// Set scatter opacity
		if (i === 0 || i === 1) {
			d3.select(this).selectAll('path.symbol').attr('opacity', '0.5');
		}

		i++;
	});
}

function buildIdeologyChart(congresses, congMedians) {
	// Prepare party-separated data
	var lineData = [];
	var demScatterData = [];
	var repScatterData = [];

	congresses.forEach(function(c) {
		congressLookup[c.congress] = {
			committeeMedian: c.grandMedian,
			congressMedian: c.congressMedian,
			nMembers: c.nMembers
		};

		lineData.push({
			congress: c.congress,
			demMedian: c.demMedian != null ? c.demMedian : -999,
			repMedian: c.repMedian != null ? c.repMedian : -999,
			congressMedian: c.congressMedian != null ? c.congressMedian : -999
		});

		if (c.demSet) {
			c.demSet.forEach(function(s) {
				demScatterData.push({x: c.congress, y: s});
			});
		}
		if (c.repSet) {
			c.repSet.forEach(function(s) {
				repScatterData.push({x: c.congress, y: s});
			});
		}
	});

	if (lineData.length === 0) {
		$('#dim-chart').html('<p style="color:#888;">No ideology data available.</p>');
		return;
	}

	var chartHeight = 250;

	// Line data crossfilter
	var ndx = crossfilter(lineData);
	var congressDim = ndx.dimension(function(d) { return d.congress; });
	var demMedianGroup = congressDim.group().reduceSum(function(d) { return d.demMedian; });
	var repMedianGroup = congressDim.group().reduceSum(function(d) { return d.repMedian; });
	var congressMedianGroup = congressDim.group().reduceSum(function(d) { return d.congressMedian; });

	// Scatter crossfilters (separate, like party.js)
	var demScatterNdx = crossfilter(demScatterData);
	var demScatterDim = demScatterNdx.dimension(function(d) { return [+d.x, +d.y]; });
	var demScatterGroup = demScatterDim.group();

	var repScatterNdx = crossfilter(repScatterData);
	var repScatterDim = repScatterNdx.dimension(function(d) { return [+d.x, +d.y]; });
	var repScatterGroup = repScatterDim.group();

	// X-axis ticks (matches party tab)
	var xTickValues = [];
	for (var t = 6; t < maxCongress; t += 10) { xTickValues.push(t); }
	if (maxCongress - xTickValues[xTickValues.length - 1] > 5) {
		xTickValues.push(xTickValues[xTickValues.length - 1] + 5);
	}

	dimChart = dc.compositeChart('#dim-chart');

	dimChart
		.width(1160)
		.height(chartHeight)
		.dimension(congressDim)
		.brushOn(false)
		.renderTitle(false)
		.x(d3.scale.linear().domain([0, maxCongress + 1]))
		.y(d3.scale.linear().domain([-1.0, 1.0]))
		.margins({top: 0, left: 50, bottom: 50, right: 50})
		.compose([
			// 0: Dem scatter (light blue)
			dc.scatterPlot(dimChart)
				.dimension(demScatterDim)
				.group(demScatterGroup)
				.colors('#92c5de')
				.symbolSize(3),
			// 1: Rep scatter (light red)
			dc.scatterPlot(dimChart)
				.dimension(repScatterDim)
				.group(repScatterGroup)
				.colors('#f4a582')
				.symbolSize(3),
			// 2: Dem median line (blue)
			dc.lineChart(dimChart)
				.group(demMedianGroup)
				.colors(['#0571b0'])
				.interpolate('basis')
				.defined(function(d) { return d.y > -900; }),
			// 3: Rep median line (red)
			dc.lineChart(dimChart)
				.group(repMedianGroup)
				.colors(['#ca0020'])
				.interpolate('basis')
				.defined(function(d) { return d.y > -900; }),
			// 4: Congress median line (grey)
			dc.lineChart(dimChart)
				.group(congressMedianGroup)
				.colors(['#D3D3D3'])
				.interpolate('basis')
				.defined(function(d) { return d.y > -900; })
		])
		.xAxisLabel('Year')
		.yAxisLabel('Liberal - Conservative')
		.xAxis().tickValues(xTickValues).tickFormat(function(v) {
			return (1787 + 2 * v) + 1;
		});
}

function buildSizeChart(congresses) {
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

	var maxMembers = d3.max(barData, function(d) { return d.dem + d.rep + d.other; });

	var ndx = crossfilter(barData);
	var congressDim = ndx.dimension(function(d) { return d.congress; });
	var demGroup = congressDim.group().reduceSum(function(d) { return d.dem; });
	var repGroup = congressDim.group().reduceSum(function(d) { return d.rep; });
	var otherGroup = congressDim.group().reduceSum(function(d) { return d.other; });

	var xTickValues = [];
	for (var t = 6; t < maxCongress; t += 10) { xTickValues.push(t); }
	if (maxCongress - xTickValues[xTickValues.length - 1] > 5) {
		xTickValues.push(xTickValues[xTickValues.length - 1] + 5);
	}

	sizeChart = dc.barChart('#size-chart');

	sizeChart
		.width(1160)
		.height(180)
		.dimension(congressDim)
		.group(demGroup, 'Democrat')
		.stack(repGroup, 'Republican')
		.stack(otherGroup, 'Other')
		.ordinalColors(['#0571b0', '#ca0020', '#404040'])
		.brushOn(false)
		.renderTitle(false)
		.x(d3.scale.linear().domain([0, maxCongress + 1]))
		.y(d3.scale.linear().domain([0, maxMembers + 2]))
		.on('renderlet.click', function(chart) {
			chart.selectAll('rect.bar').on('click.custom', function(d) {
				switchCongress(d.x);
			});
		})
		.margins({top: 0, left: 50, bottom: 50, right: 50})
		.xAxisLabel('Year').yAxisLabel('Members')
		.xAxis().tickValues(xTickValues).tickFormat(function(v) {
			return (1787 + 2 * v) + 1;
		});

	sizeChart.yAxis().ticks(5).tickFormat(d3.format('d'));
}

// Load data
var q = queue()
	.defer(d3.json, '/static/committeejson/' + committee_param + '.json')
	.defer(d3.json, '/static/committeejson/congress_medians.json')
	.await(buildPage);
