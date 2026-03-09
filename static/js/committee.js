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
var committeePartyInfo = null;
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
	.style('visibility', 'hidden')
	.style('position', 'absolute')
	.style('z-index', '200');

function partyName(partyCode) {
	if (partyCode === 100) return 'Democrat';
	if (partyCode === 200) return 'Republican';
	return 'Other';
}

// Tooltip content for ideology chart (matches party.js ideologyTooltip)
function committeeIdeologyTooltip(lineType, d) {
	var name;
	var pi = committeePartyInfo;
	if (lineType === 'dem') name = (pi ? pi.libName : 'Liberal-side') + ' Committee Members';
	else if (lineType === 'rep') name = (pi ? pi.conName : 'Conservative-side') + ' Committee Members';
	else if (lineType === 'committee') name = 'Committee Median (All Members)';
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

	// Predecessor/successor links
	if (data.predecessors && data.predecessors.length > 0) {
		var predHtml = 'Replaced: ';
		predHtml += data.predecessors.map(function(p) {
			var link = '<a href="/committees/' + p.slug + '">' + p.short_name + '</a>';
			return p.note ? link + ' <span style="color:#888;">(' + p.note + ')</span>' : link;
		}).join(', ');
		$('#succession-links').append('<p>' + predHtml + '</p>');
	}
	if (data.successors && data.successors.length > 0) {
		var succHtml = 'Replaced by: ';
		succHtml += data.successors.map(function(s) {
			var link = '<a href="/committees/' + s.slug + '">' + s.short_name + '</a>';
			return s.note ? link + ' <span style="color:#888;">(' + s.note + ')</span>' : link;
		}).join(', ');
		$('#succession-links').append('<p>' + succHtml + '</p>');
	}

	// Store min/max congress for selector bounds
	var allCongs = congresses.map(function(c) { return c.congress; });
	var committeeMinCong = d3.min(allCongs);
	var committeeMaxCong = d3.max(allCongs);

	buildIdeologyChart(congresses, congMedians);
	buildSizeChart(congresses);
	dc.renderAll();

	// Attach tooltips to ideology chart elements (matches party.js:481-561)
	addIdeologyTooltips();

	// Recolor scatter dots and bars to match per-congress party colors
	recolorByParty();

	// Ideology chart legend (uses dynamic party colors/names)
	var pi = committeePartyInfo || {libName: 'Liberal-side', conName: 'Conservative-side',
		libPrimary: '#0571b0', libLight: '#92c5de', conPrimary: '#ca0020', conLight: '#f4a582'};
	var iLegend = $('<div></div>').css({'margin-top': '2px', 'font-size': '12px', 'color': '#666'});
	iLegend.append('<span style="display:inline-block;width:16px;height:3px;background:' + pi.libPrimary + ';margin-right:4px;vertical-align:middle;"></span> ' + pi.libName + ' Median &nbsp;&nbsp;');
	iLegend.append('<span style="display:inline-block;width:16px;height:3px;background:' + pi.conPrimary + ';margin-right:4px;vertical-align:middle;"></span> ' + pi.conName + ' Median &nbsp;&nbsp;');
	iLegend.append('<span style="display:inline-block;width:16px;height:3px;background:#333333;margin-right:4px;vertical-align:middle;"></span> Committee Median &nbsp;&nbsp;');
	iLegend.append('<span style="display:inline-block;width:16px;height:3px;background:#D3D3D3;margin-right:4px;vertical-align:middle;"></span> Congressional Median &nbsp;&nbsp;');
	iLegend.append('<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + pi.libLight + ';margin-right:4px;vertical-align:middle;"></span> ' + pi.libName + ' Members &nbsp;&nbsp;');
	iLegend.append('<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + pi.conLight + ';margin-right:4px;vertical-align:middle;"></span> ' + pi.conName + ' Members');
	$('#dim-chart').append(iLegend);

	// Bump axis label font sizes
	d3.selectAll('#dim-chart .x.axis-label, #dim-chart .y.axis-label').style('font-size', '13px');
	d3.selectAll('#size-chart .x.axis-label, #size-chart .y.axis-label').style('font-size', '13px');

	// Size chart legend (uses dynamic party colors/names)
	var sp = committeePartyInfo || {};
	var sLegend = $('<div></div>').css({'margin-top': '2px', 'font-size': '12px', 'color': '#666'});
	sLegend.append('<span style="display:inline-block;width:12px;height:12px;background:' + (sp.p1Primary || '#0571b0') + ';margin-right:4px;vertical-align:middle;"></span> ' + (sp.p1Name || 'Party 1') + ' &nbsp;&nbsp;');
	sLegend.append('<span style="display:inline-block;width:12px;height:12px;background:' + (sp.p2Primary || '#ca0020') + ';margin-right:4px;vertical-align:middle;"></span> ' + (sp.p2Name || 'Party 2') + ' &nbsp;&nbsp;');
	sLegend.append('<span style="display:inline-block;width:12px;height:12px;background:#404040;margin-right:4px;vertical-align:middle;"></span> Other');
	$('#size-chart').append(sLegend);

	// Wire congress selector inputs
	$('#congNum').val(committeeMaxCong);
	$('#yearNum').val(1787 + 2 * committeeMaxCong);
	$('#congNum').attr({'min': committeeMinCong, 'max': committeeMaxCong});
	$('#yearNum').attr({'min': 1787 + 2 * committeeMinCong, 'max': 1787 + 2 * committeeMaxCong});

	// Load roster for latest congress via API
	var latestCong = congresses[congresses.length - 1];
	if (latestCong) {
		switchCongress(latestCong.congress);
	}

	$('#loading-container').delay(200).slideUp(100);
	$('#content').fadeIn();
}

function switchCongress(congress) {
	congress = parseInt(congress);
	if (isNaN(congress)) return;
	selectedCongress = congress;
	highlightBar(congress);

	var year = 1787 + 2 * congress;
	$('#roster-congress-label').html(
		getGetOrdinal(congress) + ' Congress (' + year + '-' + (year + 1) + ')'
	);

	// Sync congress selector inputs
	$('#congNum').val(congress);
	$('#yearNum').val(year);

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

function switchCongressFromYear(year) {
	year = parseInt(year);
	if (isNaN(year)) return;
	var congress = Math.floor((year - 1787) / 2);
	switchCongress(congress);
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
				// Priority: Chair > Ranking Member > Vice Chair > others by rank
				var roleOrd = function(r) {
					if (r === 'Chair') return 0;
					if (r === 'Ranking Member') return 1;
					if (r === 'Vice Chair') return 2;
					return 3;
				};
				var aRole = roleOrd(a.role);
				var bRole = roleOrd(b.role);
				if (aRole !== bRole) return aRole - bRole;
				var aRank = (a.rank != null && a.rank > 0) ? a.rank : 9999;
				var bRank = (b.rank != null && b.rank > 0) ? b.rank : 9999;
				if (aRank !== bRank) return aRank - bRank;
				return a.bioname > b.bioname ? 1 : -1;
			});
		}

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Liberal</strong> <span class="glyphicon glyphicon-arrow-down"></span>').appendTo($('#memberList'));
		} else if (currentSort === 'elected') {
			$('<li></li>').addClass('memberBox').html('<strong>Highest Rank</strong> <span class="glyphicon glyphicon-arrow-down"></span>').appendTo($('#memberList'));
		}

		$.each(rC, function(k, v) {
			if (currentSort === 'nominate' && v.nominate == undefined) return;
			constructPlot(v);
		});

		if (currentSort === 'nominate') {
			$('<li></li>').addClass('memberBox').html('<strong>Most Conservative</strong> <span class="glyphicon glyphicon-arrow-up"></span>').appendTo($('#memberList'));
		} else if (currentSort === 'elected') {
			$('<li></li>').addClass('memberBox').html('<strong>Lowest Rank</strong> <span class="glyphicon glyphicon-arrow-up"></span>').appendTo($('#memberList'));
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
	if (member.role && member.role !== 'Member') {
		bioTextInner += member.role;
	} else if (member.rank != null && member.rank > 0) {
		bioTextInner += 'Rank: ' + member.rank;
	} else if (member.min_elected != undefined) {
		bioTextInner += 'Elected ' + member.min_elected;
	}
	$('<span></span>').html(bioTextInner).appendTo(linkBox);
	linkBox.appendTo(memberBox);
	memberBox.appendTo($('#memberList'));
}

// Ideology chart tooltip on lines/circles (matches party.js:481-561)
function addIdeologyTooltips() {
	if (!dimChart) return;

	// Map g.sub index to line type
	// Compose order: 0=demScatter, 1=repScatter, 2=demLine, 3=repLine, 4=congressLine, 5=committeeLine
	var lineTypes = [null, null, 'dem', 'rep', 'congress', 'committee'];
	var colorClasses = [null, null, 'blue', 'red', 'grey', 'grey'];

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

// Resolve party color scheme name to hex colors [primary, light]
function partyColorScheme(colorName) {
	var scheme = colorSchemes[colorName] || colorSchemes['grey'];
	return {primary: scheme[0], light: scheme[1]};
}

function buildIdeologyChart(congresses, congMedians) {
	// Determine party colors from data (find MOST RECENT congress with both parties)
	var libColor = 'blue', conColor = 'red';
	var libName = 'Democrat', conName = 'Republican';
	for (var ci = congresses.length - 1; ci >= 0; ci--) {
		var cc = congresses[ci];
		if (cc.demColor && cc.repColor) {
			libColor = cc.demColor;
			conColor = cc.repColor;
			libName = cc.demName || libName;
			conName = cc.repName || conName;
			break;
		}
	}
	var libHex = partyColorScheme(libColor);
	var conHex = partyColorScheme(conColor);

	// Store for legend/tooltip
	committeePartyInfo = {
		libName: libName, conName: conName,
		libPrimary: libHex.primary, libLight: libHex.light,
		conPrimary: conHex.primary, conLight: conHex.light
	};

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
			congressMedian: c.congressMedian != null ? c.congressMedian : -999,
			grandMedian: c.grandMedian != null ? c.grandMedian : -999
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

	var chartHeight = 350;

	// Determine committee's congress range for x-axis
	var minCong = d3.min(lineData, function(d) { return d.congress; });
	var maxCong = d3.max(lineData, function(d) { return d.congress; });

	// Line data crossfilter
	var ndx = crossfilter(lineData);
	var congressDim = ndx.dimension(function(d) { return d.congress; });
	var demMedianGroup = congressDim.group().reduceSum(function(d) { return d.demMedian; });
	var repMedianGroup = congressDim.group().reduceSum(function(d) { return d.repMedian; });
	var congressMedianGroup = congressDim.group().reduceSum(function(d) { return d.congressMedian; });
	var grandMedianGroup = congressDim.group().reduceSum(function(d) { return d.grandMedian; });

	// Scatter crossfilters (separate, like party.js)
	var demScatterNdx = crossfilter(demScatterData);
	var demScatterDim = demScatterNdx.dimension(function(d) { return [+d.x, +d.y]; });
	var demScatterGroup = demScatterDim.group();

	var repScatterNdx = crossfilter(repScatterData);
	var repScatterDim = repScatterNdx.dimension(function(d) { return [+d.x, +d.y]; });
	var repScatterGroup = repScatterDim.group();

	// X-axis ticks: adaptive step based on committee's span
	var congSpan = maxCong - minCong;
	var tickStep = congSpan > 40 ? 10 : 5;
	var xTickValues = [];
	var firstTick = Math.ceil(minCong / tickStep) * tickStep;
	for (var t = firstTick; t <= maxCong; t += tickStep) { xTickValues.push(t); }

	dimChart = dc.compositeChart('#dim-chart');

	dimChart
		.width(1160)
		.height(chartHeight)
		.dimension(congressDim)
		.brushOn(false)
		.renderTitle(false)
		.x(d3.scale.linear().domain([minCong - 1, maxCong + 1]))
		.y(d3.scale.linear().domain([-1.0, 1.0]))
		.margins({top: 0, left: 50, bottom: 50, right: 50})
		.compose([
			// 0: Liberal-side scatter (light)
			dc.scatterPlot(dimChart)
				.dimension(demScatterDim)
				.group(demScatterGroup)
				.colors(libHex.light)
				.symbolSize(3),
			// 1: Conservative-side scatter (light)
			dc.scatterPlot(dimChart)
				.dimension(repScatterDim)
				.group(repScatterGroup)
				.colors(conHex.light)
				.symbolSize(3),
			// 2: Liberal-side median line
			dc.lineChart(dimChart)
				.group(demMedianGroup)
				.colors([libHex.primary])
				.interpolate('basis')
				.defined(function(d) { return d.y > -900; }),
			// 3: Conservative-side median line
			dc.lineChart(dimChart)
				.group(repMedianGroup)
				.colors([conHex.primary])
				.interpolate('basis')
				.defined(function(d) { return d.y > -900; }),
			// 4: Congress median line (grey)
			dc.lineChart(dimChart)
				.group(congressMedianGroup)
				.colors(['#D3D3D3'])
				.interpolate('basis')
				.defined(function(d) { return d.y > -900; }),
			// 5: Committee median line (dark grey)
			dc.lineChart(dimChart)
				.group(grandMedianGroup)
				.colors(['#333333'])
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
	// Stack by per-congress top-2 parties (dynamic, not hardcoded Dem/Rep)
	var barData = congresses.map(function(c) {
		var pb = c.partyBreakdown || {};
		var p1Code = c.party1Code != null ? String(c.party1Code) : '100';
		var p2Code = c.party2Code != null ? String(c.party2Code) : '200';
		var p1 = pb[p1Code] || 0;
		var p2 = pb[p2Code] || 0;
		return {
			congress: c.congress,
			party1: p1,
			party2: p2,
			other: Math.max(0, c.nMembers - p1 - p2)
		};
	});

	if (barData.length === 0) return;

	// Get party names/colors from most recent congress (for legend)
	var p1Name = 'Party 1', p2Name = 'Party 2';
	var p1Color = 'blue', p2Color = 'red';
	for (var i = congresses.length - 1; i >= 0; i--) {
		if (congresses[i].party1Code != null) {
			p1Name = congresses[i].party1Name || p1Name;
			p2Name = congresses[i].party2Name || p2Name;
			p1Color = congresses[i].party1Color || p1Color;
			p2Color = congresses[i].party2Color || p2Color;
			break;
		}
	}
	var p1Hex = partyColorScheme(p1Color).primary;
	var p2Hex = partyColorScheme(p2Color).primary;

	// Store for size chart legend
	committeePartyInfo = committeePartyInfo || {};
	committeePartyInfo.p1Name = p1Name;
	committeePartyInfo.p2Name = p2Name;
	committeePartyInfo.p1Primary = p1Hex;
	committeePartyInfo.p2Primary = p2Hex;

	var maxMembers = d3.max(barData, function(d) { return d.party1 + d.party2 + d.other; });
	var minCong = d3.min(barData, function(d) { return d.congress; });
	var maxCong = d3.max(barData, function(d) { return d.congress; });

	var ndx = crossfilter(barData);
	var congressDim = ndx.dimension(function(d) { return d.congress; });
	var p1Group = congressDim.group().reduceSum(function(d) { return d.party1; });
	var p2Group = congressDim.group().reduceSum(function(d) { return d.party2; });
	var otherGroup = congressDim.group().reduceSum(function(d) { return d.other; });

	var congSpan = maxCong - minCong;
	var tickStep = congSpan > 40 ? 10 : 5;
	var xTickValues = [];
	var firstTick = Math.ceil(minCong / tickStep) * tickStep;
	for (var t = firstTick; t <= maxCong; t += tickStep) { xTickValues.push(t); }

	sizeChart = dc.barChart('#size-chart');

	sizeChart
		.width(1160)
		.height(180)
		.dimension(congressDim)
		.group(p1Group, p1Name)
		.stack(p2Group, p2Name)
		.stack(otherGroup, 'Other')
		.ordinalColors([p1Hex, p2Hex, '#404040'])
		.brushOn(false)
		.renderTitle(false)
		.x(d3.scale.linear().domain([minCong - 1, maxCong + 1]))
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

// Recolor chart elements based on per-congress party colors
function recolorByParty() {
	if (!committeeData) return;

	// Build per-congress color lookup
	var congColors = {};
	committeeData.congresses.forEach(function(c) {
		congColors[c.congress] = {
			demLight: partyColorScheme(c.demColor || 'blue').light,
			repLight: partyColorScheme(c.repColor || 'red').light,
			p1Primary: partyColorScheme(c.party1Color || 'blue').primary,
			p2Primary: partyColorScheme(c.party2Color || 'red').primary
		};
	});

	// Recolor ideology scatter dots per congress
	var subIdx = 0;
	d3.select('#dim-chart svg').selectAll('g.sub').each(function() {
		if (subIdx === 0) {
			d3.select(this).selectAll('path.symbol').each(function(d) {
				var cong = d.key ? d.key[0] : null;
				if (cong && congColors[cong]) {
					d3.select(this).style('fill', congColors[cong].demLight);
				}
			});
		} else if (subIdx === 1) {
			d3.select(this).selectAll('path.symbol').each(function(d) {
				var cong = d.key ? d.key[0] : null;
				if (cong && congColors[cong]) {
					d3.select(this).style('fill', congColors[cong].repLight);
				}
			});
		}
		subIdx++;
	});

	// Recolor size chart bars per congress
	var stackIdx = 0;
	d3.select('#size-chart svg').selectAll('g.stack').each(function() {
		var si = stackIdx;
		d3.select(this).selectAll('rect.bar').each(function(d) {
			var cong = d.x;
			if (cong && congColors[cong]) {
				if (si === 0) d3.select(this).style('fill', congColors[cong].p1Primary);
				else if (si === 1) d3.select(this).style('fill', congColors[cong].p2Primary);
			}
		});
		stackIdx++;
	});
}

// Load data
var q = queue()
	.defer(d3.json, '/static/committeejson/' + committee_param + '.json')
	.defer(d3.json, '/static/committeejson/congress_medians.json')
	.await(buildPage);
