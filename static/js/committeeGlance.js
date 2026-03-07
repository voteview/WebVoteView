'use strict';

/* jshint globalstrict: true */
/* global d3,queue,congressNum */

function getGetOrdinal(n) {
	var s = ["th","st","nd","rd"],
	v = n % 100;
	return n + (s[(v-20)%10] || s[v] || s[0]);
}

var allCommittees = [];

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

	$("#loading-container").delay(200).slideUp(100);
	$("#content").fadeIn();
}

function applyFilters() {
	var chamber = $('#chamber-filter button.active').attr('data-chamber');
	var search = $('#committee-search').val().toLowerCase().trim();
	var activeOnly = $('#show-active-only').is(':checked');

	var filtered = allCommittees.filter(function(c) {
		if (chamber !== 'all' && c.chamber !== chamber) return false;
		if (search && c.short_name.toLowerCase().indexOf(search) === -1) return false;
		if (activeOnly && c.max_congress < congressNum) return false;
		return true;
	});

	renderTable(filtered);
}

function renderTable(committees) {
	$('#committees_list').empty();

	// Sort: active first (by max_congress desc), then by short_name
	committees.sort(function(a, b) {
		var aActive = a.max_congress >= congressNum ? 1 : 0;
		var bActive = b.max_congress >= congressNum ? 1 : 0;
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

	var table = $('<table></table>').attr('id', 'committeeTable').addClass('table');

	// Header
	var thead = $('<thead></thead>');
	var headerRow = $('<tr></tr>').addClass('row committee_row');
	$('<th></th>').html('Committee Name').addClass('col-md-3').appendTo(headerRow);
	$('<th></th>').html('Chamber').addClass('col-md-1').appendTo(headerRow);
	$('<th></th>').html('Congresses').addClass('col-md-2').appendTo(headerRow);
	$('<th></th>').html('Members').addClass('col-md-1').appendTo(headerRow);
	$('<th></th>').html('Activity').addClass('col-md-5').appendTo(headerRow);
	headerRow.appendTo(thead);
	thead.appendTo(table);

	var tbody = $('<tbody></tbody>');

	for (var i = 0; i < committees.length; i++) {
		var c = committees[i];
		var isActive = c.max_congress >= congressNum;

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
		var chamberLabel = c.chamber;
		$('<td></td>').html(chamberLabel)
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

		// Members (current or last known)
		$('<td></td>').html(isActive ? c.current_members : '&mdash;')
			.attr('data-sort-value', c.current_members || 0)
			.addClass('col-md-1')
			.appendTo(row);

		// Activity timeline bar
		var leftPad = Math.round(100 * (c.min_congress - 1) / congressNum) + '%';
		var width = Math.max(1, Math.round(100 * (c.max_congress - c.min_congress + 1) / congressNum)) + '%';

		var barColor = c.chamber === 'House' ? '#0571b0' :
		               c.chamber === 'Senate' ? '#ca0020' :
		               '#7b3294';
		if (!isActive) barColor = '#999';

		var timelineCell = $('<td></td>').addClass('col-md-5').attr('data-sort-value', i);
		var timelineBar = $('<div></div>')
			.css('margin-left', leftPad)
			.css('width', width)
			.css('height', '16px')
			.css('background-color', barColor)
			.css('border-radius', '2px')
			.css('opacity', isActive ? 1.0 : 0.5);
		timelineBar.appendTo(timelineCell);
		timelineCell.appendTo(row);

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
