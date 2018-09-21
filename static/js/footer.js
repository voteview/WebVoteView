$(document).ready(function()
{
	var hasLoadedFooter=0;
	setTimeout(function()
	{
		if($(document).height() < $(window).height() * 1.2 && typeof attachSingleFooter !== 'undefined' && attachSingleFooter == 1) 
		{
			hasLoadedFooter=1;
			$("#footer").addClass("fixed_footer").fadeIn();
			return;
		}
		$(window).scroll(function() { // Scroll listener
			if(($(window).scrollTop() >= $(window).height()*0.5 || $(window).scrollTop() >= $(document).height()*0.75) && !hasLoadedFooter)
			{
				hasLoadedFooter=1;
				$("#footer").fadeIn();
			}
		});
	},250);
});

