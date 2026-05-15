'use strict';

/* jshint globalstrict: true */
/* global d3,queue,congressNum */

function getGetOrdinal(n) {
	var s = ["th","st","nd","rd"],
	v = n % 100;
	return n + (s[(v-20)%10] || s[v] || s[0]);
}

var allCommittees = [];
var committeeHistory = {};
var partyCodeInfo = {};
var selectedGlanceCongress = congressNum;

function partyAbbrev(name) {
	if (name === 'Democrat' || name === 'Democrat-Republican') return 'D';
	if (name === 'Republican') return 'R';
	return name.substring(0, 4).trim();
}

function generateCommitteeList(committees, history) {
	allCommittees = committees;
	committeeHistory = history.committees;
	partyCodeInfo = history.party_codes;
	applyFilters();

	// Wire up chamber filter buttons
	$('#chamber-filter button').click(function() {
		$('#chamber-filter button').removeClass('btn-primary active').addClass('btn-default');
		$(this).removeClass('btn-default').addClass('btn-primary active');
		applyFilters();
	});

	// Wire up congress selector
	$('#congress-selector').change(function() {
		var val = parseInt($(this).val());
		if (!isNaN(val) && val >= 1 && val <= congressNum) {
			selectedGlanceCongress = val;
			applyFilters();
		}
	});

	$("#loading-container").delay(200).slideUp(100);
	$("#content").fadeIn();
}

function applyFilters() {
	var chamber = $('#chamber-filter button.active').attr('data-chamber');

	var filtered = allCommittees.filter(function(c) {
		if (chamber !== 'all' && c.chamber !== chamber) return false;
		// Only show committees active in the selected congress
		if (c.min_congress > selectedGlanceCongress || c.max_congress < selectedGlanceCongress) return false;
		return true;
	});

	renderTable(filtered);
}

function renderTable(committees) {
	$('#committees_list').empty();

	// Sort alphabetically by name (all shown committees are active in selected congress)
	committees.sort(function(a, b) {
		return a.short_name.localeCompare(b.short_name);
	});

	if (committees.length === 0) {
		$('#committees_list').append('<p>No committees match your filters.</p>');
		return;
	}

	// Gather per-congress member counts for scaling the composition bar
	var maxMembers = 0;
	committees.forEach(function(c) {
		var hist = committeeHistory[c.slug];
		var entry = hist && hist[String(selectedGlanceCongress)];
		var n = entry ? entry.n : 0;
		if (n > maxMembers) maxMembers = n;
	});

	var table = $('<table></table>').attr('id', 'committeeTable').addClass('table');

	// Header
	var thead = $('<thead></thead>');
	var headerRow = $('<tr></tr>').addClass('row committee_row');
	$('<th></th>').html('Committee Name').addClass('col-md-3').appendTo(headerRow);
	$('<th></th>').html('Chamber').addClass('col-md-1').appendTo(headerRow);
	$('<th></th>').html('Congresses').addClass('col-md-2').appendTo(headerRow);
	$('<th></th>').html('Members').addClass('col-md-1').appendTo(headerRow);
	$('<th></th>').html('Party Composition').addClass('col-md-5').appendTo(headerRow);
	headerRow.appendTo(thead);
	thead.appendTo(table);

	var tbody = $('<tbody></tbody>');

	for (var i = 0; i < committees.length; i++) {
		var c = committees[i];

		// Look up historical data for selected congress
		var hist = committeeHistory[c.slug];
		var entry = hist && hist[String(selectedGlanceCongress)];
		var nMembers = entry ? entry.n : null;
		var partyBreakdown = entry ? entry.pb : null;

		var row = $('<tr></tr>')
			.addClass('row committee_row')
			.attr('data-slug', c.slug);

		// Name
		var nameCell = $('<td></td>').addClass('col-md-3');
		$('<a></a>')
			.attr('href', '/committees/' + c.slug)
			.html(c.short_name)
			.appendTo(nameCell);
		nameCell.appendTo(row);

		// Chamber
		$('<td></td>').html(c.chamber)
			.addClass('col-md-1')
			.appendTo(row);

		// Congresses
		var congLabel;
		if (c.min_congress === c.max_congress) {
			congLabel = getGetOrdinal(c.min_congress);
		} else if (c.max_congress >= congressNum) {
			congLabel = getGetOrdinal(c.min_congress) + ' onward';
		} else {
			congLabel = getGetOrdinal(c.min_congress) + '-' + getGetOrdinal(c.max_congress);
		}
		$('<td></td>').html(congLabel)
			.attr('data-sort-value', c.min_congress)
			.addClass('col-md-2')
			.appendTo(row);

		// Members
		$('<td></td>').html(nMembers !== null ? nMembers : '&mdash;')
			.attr('data-sort-value', nMembers !== null ? nMembers : 0)
			.addClass('col-md-1')
			.appendTo(row);

		// Party composition stacked bar
		var compCell = $('<td></td>').addClass('col-md-5').attr('data-sort-value', i);
		if (nMembers && partyBreakdown && maxMembers > 0) {
			var pb = partyBreakdown;
			var totalWidth = Math.round(200 * nMembers / maxMembers);

			// Build sorted list of parties: known parties by count desc, then unknowns
			var parties = [];
			var knownTotal = 0;
			Object.keys(pb).forEach(function(code) {
				var count = pb[code] || 0;
				if (!count) return;
				var info = partyCodeInfo[String(code)];
				parties.push({
					code: code,
					count: count,
					name: info ? info.name : 'Other',
					hex: info ? info.hex : '#404040'
				});
				knownTotal += count;
			});
			parties.sort(function(a, b) { return b.count - a.count; });

			var barContainer = $('<div></div>')
				.css({'display': 'inline-flex', 'height': '16px', 'border-radius': '2px', 'overflow': 'hidden'});

			var labelParts = [];
			parties.forEach(function(p) {
				var w = Math.max(2, Math.round(totalWidth * p.count / nMembers));
				$('<div></div>')
					.css({'width': w + 'px', 'background-color': p.hex})
					.attr('title', p.name + ': ' + p.count)
					.appendTo(barContainer);
				labelParts.push(p.count + partyAbbrev(p.name));
			});

			barContainer.appendTo(compCell);

			$('<span></span>')
				.css({'margin-left': '8px', 'font-size': '11px', 'color': '#888'})
				.html(labelParts.join(' / '))
				.appendTo(compCell);
		} else {
			compCell.html('&mdash;');
		}
		compCell.appendTo(row);

		row.click(function() {
			window.location = '/committees/' + $(this).attr('data-slug');
		});
		row.appendTo(tbody);
	}

	tbody.appendTo(table);
	table.appendTo($('#committees_list'));

	// Apply tablesorter
	$.tablesorter.addParser({
		id: 'data',
		is: function() { return false; },
		format: function(s, table, cell) {
			return $(cell).attr('data-sort-value');
		},
		type: 'numeric'
	});

	$('#committeeTable').tablesorter({
		headers: {
			2: { sorter: 'data' },
			3: { sorter: 'data' },
			4: { sorter: 'data' }
		}
	});
}

// Load data
var q = queue()
	.defer(d3.json, '/static/committeejson/committees.json')
	.defer(d3.json, '/static/committees_history.json')
	.await(function(error, committees, history) {
		if (error) {
			$('#loading-container').html('<h3>Error loading committee data.</h3>');
			console.error(error);
			return;
		}
		generateCommitteeList(committees, history);
	});
