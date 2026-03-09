'use strict';

/* jshint globalstrict: true */
/* global d3,queue,congressNum */

function getGetOrdinal(n) {
	var s = ["th","st","nd","rd"],
	v = n % 100;
	return n + (s[(v-20)%10] || s[v] || s[0]);
}

var allCommittees = [];
var selectedGlanceCongress = congressNum;

function generateCommitteeList(committees) {
	allCommittees = committees;
	applyFilters();

	// Wire up chamber filter buttons
	$('#chamber-filter button').click(function() {
		$('#chamber-filter button').removeClass('btn-primary active').addClass('btn-default');
		$(this).removeClass('btn-default').addClass('btn-primary active');
		applyFilters();
	});

	// Wire up search
	$('#committee-search').on('input', function() {
		applyFilters();
	});

	// Wire up active-only checkbox
	$('#show-active-only').change(function() {
		applyFilters();
	});

	// Wire up congress selector
	$('#congress-go').click(function() {
		var val = parseInt($('#congress-selector').val());
		if (!isNaN(val) && val >= 1 && val <= congressNum) {
			selectedGlanceCongress = val;
			applyFilters();
		}
	});
	$('#congress-selector').on('keypress', function(e) {
		if (e.which === 13) { $('#congress-go').click(); }
	});

	$("#loading-container").delay(200).slideUp(100);
	$("#content").fadeIn();
}

function applyFilters() {
	var chamber = $('#chamber-filter button.active').attr('data-chamber');
	var search = $('#committee-search').val().toLowerCase().trim();
	var activeOnly = $('#show-active-only').is(':checked');
	var isHistorical = selectedGlanceCongress < congressNum;

	var filtered = allCommittees.filter(function(c) {
		if (chamber !== 'all' && c.chamber !== chamber) return false;
		if (search && c.short_name.toLowerCase().indexOf(search) === -1) return false;
		// "Active" means active as of the selected congress
		if (activeOnly && (c.min_congress > selectedGlanceCongress || c.max_congress < selectedGlanceCongress)) return false;
		if (!activeOnly && isHistorical) {
			// Still filter to committees that existed by the selected congress
			// (don't show committees that started after)
		}
		return true;
	});

	renderTable(filtered, isHistorical);
}

function renderTable(committees, isHistorical) {
	$('#committees_list').empty();

	// Sort: active (relative to selected congress) first, then by short_name
	committees.sort(function(a, b) {
		var aActive = (a.min_congress <= selectedGlanceCongress && a.max_congress >= selectedGlanceCongress) ? 1 : 0;
		var bActive = (b.min_congress <= selectedGlanceCongress && b.max_congress >= selectedGlanceCongress) ? 1 : 0;
		if (bActive !== aActive) return bActive - aActive;
		// Among active: sort by name
		if (aActive) return a.short_name.localeCompare(b.short_name);
		// Among defunct: sort by max_congress desc, then name
		if (b.max_congress !== a.max_congress) return b.max_congress - a.max_congress;
		return a.short_name.localeCompare(b.short_name);
	});

	if (committees.length === 0) {
		$('#committees_list').append('<p>No committees match your filters.</p>');
		return;
	}

	// Find max members for scaling the composition bar
	var maxMembers = 0;
	committees.forEach(function(c) {
		if (c.current_members > maxMembers) maxMembers = c.current_members;
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
		var isActive = c.min_congress <= selectedGlanceCongress && c.max_congress >= selectedGlanceCongress;

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
		} else if (isActive) {
			congLabel = getGetOrdinal(c.min_congress) + ' onward';
		} else {
			congLabel = getGetOrdinal(c.min_congress) + '-' + getGetOrdinal(c.max_congress);
		}
		$('<td></td>').html(congLabel)
			.attr('data-sort-value', c.min_congress)
			.addClass('col-md-2')
			.appendTo(row);

		// Members — only show current data when viewing current congress
		var showCurrentData = isActive && !isHistorical;
		$('<td></td>').html(showCurrentData ? c.current_members : '&mdash;')
			.attr('data-sort-value', showCurrentData ? (c.current_members || 0) : 0)
			.addClass('col-md-1')
			.appendTo(row);

		// Party composition stacked bar
		var compCell = $('<td></td>').addClass('col-md-5').attr('data-sort-value', i);
		if (showCurrentData && c.current_party_breakdown && c.current_members > 0) {
			var pb = c.current_party_breakdown;
			var dems = pb['100'] || 0;
			var reps = pb['200'] || 0;
			var other = c.current_members - dems - reps;
			var totalWidth = Math.round(200 * c.current_members / maxMembers);

			var barContainer = $('<div></div>')
				.css({'display': 'inline-flex', 'height': '16px', 'border-radius': '2px', 'overflow': 'hidden'});

			if (dems > 0) {
				$('<div></div>')
					.css({'width': Math.round(totalWidth * dems / c.current_members) + 'px',
						'background-color': '#0571b0'})
					.attr('title', 'Democrat: ' + dems)
					.appendTo(barContainer);
			}
			if (reps > 0) {
				$('<div></div>')
					.css({'width': Math.round(totalWidth * reps / c.current_members) + 'px',
						'background-color': '#ca0020'})
					.attr('title', 'Republican: ' + reps)
					.appendTo(barContainer);
			}
			if (other > 0) {
				$('<div></div>')
					.css({'width': Math.max(2, Math.round(totalWidth * other / c.current_members)) + 'px',
						'background-color': '#404040'})
					.attr('title', 'Other: ' + other)
					.appendTo(barContainer);
			}

			barContainer.appendTo(compCell);

			// Counts label
			$('<span></span>')
				.css({'margin-left': '8px', 'font-size': '11px', 'color': '#888'})
				.html(dems + 'D / ' + reps + 'R' + (other > 0 ? ' / ' + other + 'O' : ''))
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
	.await(function(error, committees) {
		if (error) {
			$('#loading-container').html('<h3>Error loading committee data.</h3>');
			console.error(error);
			return;
		}
		generateCommitteeList(committees);
	});
