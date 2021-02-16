$(document).ready(() => {
	let hasLoadedFooter = 0;
	setTimeout(() => {
		// If there's not going to be a scroll, then set a fixed footer.
		if ($(document).height() < $(window).height() * 1.2 &&
			typeof attachSingleFooter !== 'undefined' &&
			attachSingleFooter == 1) {
			hasLoadedFooter = 1;
			$("#footer").addClass("fixed_footer").fadeIn();
			return;
		}

		// If there is going to be a scroll, then set the regular footer.
		$(window).scroll(() => {
			if (($(window).scrollTop() >= $(window).height() * 0.5 ||
				$(window).scrollTop() >= $(document).height() * 0.75) &&
				!hasLoadedFooter) {
				hasLoadedFooter = 1;
				$("#footer").fadeIn();
			}
		});
	}, 250);
});
