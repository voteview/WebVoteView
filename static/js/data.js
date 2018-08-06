function updateDownloadLink()
{
	var file_formats = {
		"members": ["csv", "json", "dat"],
		"parties": ["csv", "json"],
		"votes": ["csv", "json", "ord"],
		"rollcalls": ["csv", "json", "dat"]
	};

	var long_desc = {
		"members": "This data includes basic biographical information (state, district, party, name) and ideological scores for members of the selected congresses.",
		"parties": "This data includes ideological mean and median scores for congressional parties in the selected congresses and chambers.",
		"votes": "This data includes every vote taken by every member in the selected congresses and chambers along with the probability we assign to the member taking the position they did. Members are indexed by their ICPSR ID number.",
		"rollcalls": "This data includes the result and ideological parameters of every vote taken in the selected congresses and chambers. This is information about the vote itself, not individual members positions. Please select \"Member Votes\" for information about individual member positions."
	};

	var reset_selected = 0;
	$("#format option").each(function() {
		if(file_formats[$("#source").val()].includes($(this).val())) {
			$(this).css({"display": "block"});
		} else {
			$(this).css({"display": "none"});
			if($(this).val() == $("#format").val()) {
				reset_selected = 1;
			}
		}
	});
	if(reset_selected) $("#format").val("csv");

	var base_url = "/static/data/out/";
	url = base_url + $("#source").val() + "/" + $("#chamber").val() + $("#congress").val() + "_" + $("#source").val() + "." + $("#format").val();
	$("#download_link").attr({"href": url});

	$("#data_download_desc").html(
		"<strong>" + $("#source option:selected").html() + "</strong><br/>" + long_desc[$("#source").val()] + "<br/><br/><a href=\"/articles/data_help_" + $("#source").val() + "\">Click here for help using this data</a>"
	);
}

$(document).ready(updateDownloadLink);
