$(document).ready(function()
{
	var hasLoadedFooter=0;
	setTimeout(function()
	{
		$(window).scroll(function() { // Scroll listener
			if(($(window).scrollTop() >= $(window).height()*0.5 || $(window).scrollTop() >= $(document).height()*0.75) && !hasLoadedFooter)
			{
				hasLoadedFooter=1;
				$("#footer").show().fadeIn();
			}
		});
	},250);
});
